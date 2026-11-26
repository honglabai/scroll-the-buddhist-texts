import {
  filterApprovedAnnotations,
  filterApprovedRelatedLinks,
  filterApprovedSegmentText,
  isRightsApprovedForDistribution,
  normalizeNfc,
  normalizeSearchQuery,
  shouldRecordReadingEvent,
} from '../domain/readingRules';
import type {
  Annotation,
  AppLanguage,
  AppSettings,
  Bookmark,
  ContentPack,
  Edition,
  Note,
  PlanItem,
  PlanProgress,
  ReadingEvent,
  ReadingMode,
  ReadingPlan,
  ReadingProgress,
  RelatedLink,
  RightsManifestEntry,
  Section,
  Segment,
  SegmentAlignment,
  SegmentText,
  Work,
} from '../domain/types';
import type { AppRepository, PersonalDataBackup, SearchResultItem } from './repository';
import { OPEN_CONTENT_PACK } from './openContentPack';

const WEB_STORAGE_KEY = 'dharma_scroll_personal_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  appLanguage: 'ko',
  fontScaleLevel: 3,
  fontStyle: 'sans',
  themeMode: 'system',
  lineHeightMultiplier: 1.55,
  reduceMotion: false,
  ttsRate: 0.95,
  selectedEditionByWork: {
    'work-diamond': 'ed-diamond-ko-ws',
    'work-heart': 'ed-heart-ko-ws',
    'work-cheonsu': 'ed-cheonsu-ko-ws',
    'work-dhp': 'ed-dhp-en-sujato',
    'work-kp': 'ed-work-kp-en-sujato',
    'work-sn56-11': 'ed-work-sn56-11-en-sujato',
    'work-snp': 'ed-work-snp-en-sujato',
    'work-iti': 'ed-work-iti-en-sujato',
    'work-ud': 'ed-work-ud-en-sujato',
  },
  scrollBackdropEnabled: false,
  pageArtworkOverrides: {},
};

export class InMemoryRepository implements AppRepository {
  private works: Work[] = [];
  private editions: Edition[] = [];
  private sections: Section[] = [];
  private segments: Segment[] = [];
  private segmentTexts: SegmentText[] = [];
  private alignments: SegmentAlignment[] = [];
  private annotations: Annotation[] = [];
  private relatedLinks: RelatedLink[] = [];
  private rightsByEdition = new Map<string, RightsManifestEntry>();
  private plans: ReadingPlan[] = [];
  private planItems: PlanItem[] = [];

  private bookmarks: Bookmark[] = [];
  private notes: Note[] = [];
  private readingProgress: ReadingProgress[] = [];
  private readingEvents: ReadingEvent[] = [];
  private planProgress: PlanProgress[] = [];
  private settings: AppSettings = { ...DEFAULT_SETTINGS };

  private readonly allowSyntheticInDev: boolean;

  constructor(options: { allowSyntheticInDev?: boolean } = { allowSyntheticInDev: true }) {
    this.allowSyntheticInDev = options.allowSyntheticInDev ?? true;
  }

  async initialize(pack: ContentPack = OPEN_CONTENT_PACK): Promise<void> {
    this.loadPublicPack(pack);
    this.loadPersonalFromWebStorage();
  }

  private loadPublicPack(pack: ContentPack): void {
    this.rightsByEdition.clear();
    for (const entry of pack.manifest.entries) {
      this.rightsByEdition.set(entry.editionId, entry);
    }

    const approvedEditionIds = new Set(
      pack.manifest.entries
        .filter((e) => isRightsApprovedForDistribution(e, { allowSyntheticInDev: this.allowSyntheticInDev }))
        .map((e) => e.editionId)
    );

    this.works = [...pack.works];
    this.editions = pack.editions.filter((ed) => approvedEditionIds.has(ed.id));
    this.sections = [...pack.sections];
    this.segments = [...pack.segments].sort((a, b) => a.ordinal - b.ordinal);
    this.segmentTexts = pack.segmentTexts
      .filter((st) => approvedEditionIds.has(st.editionId))
      .map((st) => ({
        ...st,
        text: normalizeNfc(st.text),
        paraphrase: st.paraphrase ? normalizeNfc(st.paraphrase) : undefined,
      }));
    this.alignments = [...pack.alignments];
    this.annotations = [...pack.annotations];
    this.relatedLinks = [...pack.relatedLinks];
    this.plans = [...pack.plans];
    this.planItems = [...pack.planItems];
  }

  async upgradeContentPack(pack: ContentPack): Promise<{ migratedProgressCount: number }> {
    this.loadPublicPack(pack);
    const alignmentMap = new Map<string, string>();
    for (const al of this.alignments) {
      alignmentMap.set(al.fromId, al.toId);
    }
    const validSegmentIds = new Set(this.segments.map((s) => s.id));
    let migratedProgressCount = 0;

    this.readingProgress = this.readingProgress.map((prog) => {
      if (validSegmentIds.has(prog.segmentId)) return prog;
      const mapped = alignmentMap.get(prog.segmentId);
      if (mapped && validSegmentIds.has(mapped)) {
        migratedProgressCount += 1;
        return { ...prog, segmentId: mapped };
      }
      return prog;
    });

    this.savePersonalToWebStorage();
    return { migratedProgressCount };
  }

  private loadPersonalFromWebStorage(): void {
    try {
      const storage = (globalThis as { localStorage?: Storage }).localStorage;
      if (!storage) return;
      const raw = storage.getItem(WEB_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersonalDataBackup>;
      if (Array.isArray(parsed.bookmarks)) this.bookmarks = parsed.bookmarks;
      if (Array.isArray(parsed.notes)) this.notes = parsed.notes;
      if (Array.isArray(parsed.readingProgress)) this.readingProgress = parsed.readingProgress;
      if (Array.isArray(parsed.readingEvents)) this.readingEvents = parsed.readingEvents;
      if (Array.isArray(parsed.planProgress)) this.planProgress = parsed.planProgress;
      if (parsed.settings) this.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
    } catch {
      // Ignore malformed storage
    }
  }

  private savePersonalToWebStorage(): void {
    try {
      const storage = (globalThis as { localStorage?: Storage }).localStorage;
      if (!storage) return;
      const backup: PersonalDataBackup = {
        exportedAt: new Date().toISOString(),
        version: 1,
        profileId: 'local',
        bookmarks: this.bookmarks,
        notes: this.notes,
        readingProgress: this.readingProgress,
        readingEvents: this.readingEvents,
        planProgress: this.planProgress,
        settings: this.settings,
      };
      storage.setItem(WEB_STORAGE_KEY, JSON.stringify(backup));
    } catch {
      // Ignore storage quota errors
    }
  }

  async getWorks(): Promise<Work[]> {
    return [...this.works];
  }

  async getAllEditions(): Promise<Edition[]> {
    return [...this.editions];
  }

  async getWorkById(workId: string): Promise<Work | undefined> {
    return this.works.find((w) => w.id === workId);
  }

  async getEditionsForWork(workId: string): Promise<Edition[]> {
    return this.editions.filter((e) => e.workId === workId);
  }

  async getSectionsForWork(workId: string): Promise<Section[]> {
    return this.sections.filter((s) => s.workId === workId).sort((a, b) => a.ordinal - b.ordinal);
  }

  async getSegmentsForWork(workId: string): Promise<Segment[]> {
    return this.segments.filter((s) => s.workId === workId).sort((a, b) => a.ordinal - b.ordinal);
  }

  async getSegmentsByTopic(topic: string): Promise<Segment[]> {
    return this.segments.filter((s) => s.topics.includes(topic));
  }

  async getSegmentById(segmentId: string): Promise<Segment | undefined> {
    return this.segments.find((s) => s.id === segmentId);
  }

  async getSegmentText(segmentId: string, editionId: string): Promise<SegmentText | undefined> {
    const found = this.segmentTexts.find(
      (st) => st.segmentId === segmentId && st.editionId === editionId
    );
    return filterApprovedSegmentText(found);
  }

  async getOriginalTextForSegment(
    segmentId: string,
    workId: string
  ): Promise<{ edition: Edition; segmentText: SegmentText } | undefined> {
    const originalEdition = this.editions.find((e) => e.workId === workId && e.isOriginal);
    if (!originalEdition) return undefined;
    const st = await this.getSegmentText(segmentId, originalEdition.id);
    if (!st) return undefined;
    return { edition: originalEdition, segmentText: st };
  }

  async getRightsForEdition(editionId: string): Promise<RightsManifestEntry | undefined> {
    return this.rightsByEdition.get(editionId);
  }

  async getAllRightsEntries(): Promise<RightsManifestEntry[]> {
    return Array.from(this.rightsByEdition.values());
  }

  async getApprovedAnnotations(segmentId: string, editionId?: string): Promise<Annotation[]> {
    const filtered = this.annotations.filter(
      (a) => a.segmentId === segmentId && (!editionId || a.editionId === editionId)
    );
    return filterApprovedAnnotations(filtered);
  }

  async getApprovedRelatedLinks(segmentId: string): Promise<RelatedLink[]> {
    const filtered = this.relatedLinks.filter((l) => l.fromId === segmentId);
    return filterApprovedRelatedLinks(filtered);
  }

  async searchSegments(query: string, editionId?: string, langFilter?: AppLanguage): Promise<SearchResultItem[]> {
    const q = normalizeSearchQuery(query);
    if (!q) return [];
    const results: SearchResultItem[] = [];

    for (const seg of this.segments) {
      const work = this.works.find((w) => w.id === seg.workId);
      if (!work) continue;

      const candidateEditions = editionId
        ? this.editions.filter((e) => e.id === editionId && e.workId === work.id)
        : langFilter
          ? this.editions.filter((e) => e.workId === work.id && e.lang === langFilter)
          : this.editions.filter((e) => e.workId === work.id && !e.isOriginal);

      const targetEdition = langFilter
        ? candidateEditions[0]
        : candidateEditions[0] ?? this.editions.find((e) => e.workId === work.id);
      if (!targetEdition) continue;

      const st = await this.getSegmentText(seg.id, targetEdition.id);
      if (!st) continue;

      const textNorm = normalizeSearchQuery(st.text);
      const refStr = langFilter === 'en' ? (seg.sourceRefEn ?? seg.sourceRef) : seg.sourceRef;
      const titleStr = langFilter === 'en' ? (work.titleEn ?? work.title) : work.title;
      const refNorm = normalizeSearchQuery(refStr);
      const titleNorm = normalizeSearchQuery(titleStr);

      if (textNorm.includes(q)) {
        results.push({ segment: seg, work, edition: targetEdition, segmentText: st, matchedField: 'text' });
      } else if (refNorm.includes(q)) {
        results.push({ segment: seg, work, edition: targetEdition, segmentText: st, matchedField: 'source_ref' });
      } else if (titleNorm.includes(q)) {
        results.push({ segment: seg, work, edition: targetEdition, segmentText: st, matchedField: 'work_title' });
      }
    }
    return results;
  }

  async getBookmarks(profileId: string): Promise<Bookmark[]> {
    return this.bookmarks.filter((b) => b.profileId === profileId);
  }

  async isBookmarked(profileId: string, segmentId: string): Promise<boolean> {
    return this.bookmarks.some((b) => b.profileId === profileId && b.segmentId === segmentId);
  }

  async toggleBookmark(
    profileId: string,
    segmentId: string,
    editionId: string,
    folder = '기본 모음'
  ): Promise<boolean> {
    const idx = this.bookmarks.findIndex(
      (b) => b.profileId === profileId && b.segmentId === segmentId
    );
    if (idx >= 0) {
      this.bookmarks.splice(idx, 1);
      this.savePersonalToWebStorage();
      return false;
    }
    this.bookmarks.unshift({
      profileId,
      segmentId,
      editionId,
      folder,
      createdAt: new Date().toISOString(),
    });
    this.savePersonalToWebStorage();
    return true;
  }

  async getNotes(profileId: string, segmentId?: string): Promise<Note[]> {
    return this.notes
      .filter((n) => n.profileId === profileId && (!segmentId || n.segmentId === segmentId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveNote(
    profileId: string,
    segmentId: string,
    body: string,
    tags: string[] = [],
    noteId?: string
  ): Promise<Note> {
    const now = new Date().toISOString();
    const normalizedBody = normalizeNfc(body.trim());
    if (noteId) {
      const existing = this.notes.find((n) => n.id === noteId && n.profileId === profileId);
      if (existing) {
        existing.body = normalizedBody;
        existing.tags = [...tags];
        existing.updatedAt = now;
        this.savePersonalToWebStorage();
        return existing;
      }
    }
    const created: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      profileId,
      segmentId,
      body: normalizedBody,
      tags: [...tags],
      createdAt: now,
      updatedAt: now,
    };
    this.notes.unshift(created);
    this.savePersonalToWebStorage();
    return created;
  }

  async deleteNote(profileId: string, noteId: string): Promise<void> {
    this.notes = this.notes.filter((n) => !(n.profileId === profileId && n.id === noteId));
    this.savePersonalToWebStorage();
  }

  async getReadingProgress(
    profileId: string,
    workId: string,
    mode: ReadingMode
  ): Promise<ReadingProgress | undefined> {
    return this.readingProgress.find(
      (p) => p.profileId === profileId && p.workId === workId && p.mode === mode
    );
  }

  async getLatestReadingProgress(profileId: string): Promise<ReadingProgress | undefined> {
    return [...this.readingProgress]
      .filter((p) => p.profileId === profileId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }

  async saveReadingProgress(progress: ReadingProgress): Promise<void> {
    const idx = this.readingProgress.findIndex(
      (p) =>
        p.profileId === progress.profileId &&
        p.workId === progress.workId &&
        p.mode === progress.mode
    );
    if (idx >= 0) {
      this.readingProgress[idx] = { ...progress };
    } else {
      this.readingProgress.push({ ...progress });
    }
    this.savePersonalToWebStorage();
  }

  async recordReadingEvent(params: {
    profileId: string;
    segmentId: string;
    localDay: string;
    mode: ReadingMode;
    dwellMs: number;
    isManual?: boolean;
  }): Promise<boolean> {
    const existingKeys = new Set(
      this.readingEvents
        .filter((e) => e.profileId === params.profileId)
        .map((e) => `${e.segmentId}::${e.localDay}::${e.mode}`)
    );

    if (
      !shouldRecordReadingEvent({
        dwellMs: params.dwellMs,
        isManual: params.isManual,
        existingKeys,
        segmentId: params.segmentId,
        localDay: params.localDay,
        mode: params.mode,
      })
    ) {
      return false;
    }

    this.readingEvents.push({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      profileId: params.profileId,
      segmentId: params.segmentId,
      localDay: params.localDay,
      mode: params.mode,
      dwellMs: params.dwellMs,
      createdAt: new Date().toISOString(),
    });
    this.savePersonalToWebStorage();
    return true;
  }

  async getReadingEvents(profileId: string): Promise<ReadingEvent[]> {
    return this.readingEvents.filter((e) => e.profileId === profileId);
  }

  async getPlans(): Promise<ReadingPlan[]> {
    return [...this.plans];
  }

  async getPlanItems(planId: string): Promise<PlanItem[]> {
    return this.planItems.filter((i) => i.planId === planId).sort((a, b) => a.dayNumber - b.dayNumber);
  }

  async getPlanProgress(profileId: string, planId: string): Promise<PlanProgress | undefined> {
    return this.planProgress.find((p) => p.profileId === profileId && p.planId === planId);
  }

  async startPlan(profileId: string, planId: string): Promise<PlanProgress> {
    const existing = await this.getPlanProgress(profileId, planId);
    if (existing) return existing;
    const created: PlanProgress = {
      profileId,
      planId,
      startedAt: new Date().toISOString(),
      completedDays: [],
      completedSegmentIds: [],
      reminderEnabled: false,
      reminderHour: 8,
      reminderMinute: 0,
    };
    this.planProgress.push(created);
    this.savePersonalToWebStorage();
    return created;
  }

  async completePlanDay(
    profileId: string,
    planId: string,
    dayNumber: number,
    segmentIds: string[]
  ): Promise<PlanProgress> {
    const prog = await this.startPlan(profileId, planId);
    if (!prog.completedDays.includes(dayNumber)) {
      prog.completedDays.push(dayNumber);
    }
    for (const sid of segmentIds) {
      if (!prog.completedSegmentIds.includes(sid)) {
        prog.completedSegmentIds.push(sid);
      }
    }
    this.savePersonalToWebStorage();
    return { ...prog };
  }

  async updatePlanReminder(
    profileId: string,
    planId: string,
    enabled: boolean,
    hour: number,
    minute: number
  ): Promise<PlanProgress> {
    const prog = await this.startPlan(profileId, planId);
    prog.reminderEnabled = enabled;
    prog.reminderHour = hour;
    prog.reminderMinute = minute;
    this.savePersonalToWebStorage();
    return { ...prog };
  }

  async getSettings(): Promise<AppSettings> {
    return { ...this.settings, selectedEditionByWork: { ...this.settings.selectedEditionByWork } };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.settings = { ...settings, selectedEditionByWork: { ...settings.selectedEditionByWork } };
    this.savePersonalToWebStorage();
  }

  async exportPersonalData(profileId: string): Promise<PersonalDataBackup> {
    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      profileId,
      bookmarks: await this.getBookmarks(profileId),
      notes: await this.getNotes(profileId),
      readingProgress: this.readingProgress.filter((p) => p.profileId === profileId),
      readingEvents: await this.getReadingEvents(profileId),
      planProgress: this.planProgress.filter((p) => p.profileId === profileId),
      settings: await this.getSettings(),
    };
  }

  async importPersonalData(backup: PersonalDataBackup): Promise<void> {
    if (!backup || typeof backup !== 'object' || typeof backup.profileId !== 'string') {
      throw new Error('올바른 백업 JSON 형식이 아닙니다.');
    }
    const pid = backup.profileId;
    if (Array.isArray(backup.bookmarks)) {
      this.bookmarks = [
        ...this.bookmarks.filter((b) => b.profileId !== pid),
        ...backup.bookmarks,
      ];
    }
    if (Array.isArray(backup.notes)) {
      this.notes = [...this.notes.filter((n) => n.profileId !== pid), ...backup.notes];
    }
    if (Array.isArray(backup.readingProgress)) {
      this.readingProgress = [
        ...this.readingProgress.filter((p) => p.profileId !== pid),
        ...backup.readingProgress,
      ];
    }
    if (Array.isArray(backup.readingEvents)) {
      this.readingEvents = [
        ...this.readingEvents.filter((e) => e.profileId !== pid),
        ...backup.readingEvents,
      ];
    }
    if (Array.isArray(backup.planProgress)) {
      this.planProgress = [
        ...this.planProgress.filter((p) => p.profileId !== pid),
        ...backup.planProgress,
      ];
    }
    if (backup.settings) {
      this.settings = { ...DEFAULT_SETTINGS, ...backup.settings };
    }
    this.savePersonalToWebStorage();
  }

  async deleteAllPersonalData(profileId: string): Promise<void> {
    this.bookmarks = this.bookmarks.filter((b) => b.profileId !== profileId);
    this.notes = this.notes.filter((n) => n.profileId !== profileId);
    this.readingProgress = this.readingProgress.filter((p) => p.profileId !== profileId);
    this.readingEvents = this.readingEvents.filter((e) => e.profileId !== profileId);
    this.planProgress = this.planProgress.filter((p) => p.profileId !== profileId);
    this.settings = { ...DEFAULT_SETTINGS };
    this.savePersonalToWebStorage();
  }
}
