import * as SQLite from 'expo-sqlite';
import {
  isRightsApprovedForDistribution,
  normalizeNfc,
  normalizeSearchQuery,
  shouldRecordReadingEvent,
} from '../domain/readingRules';
import type {
  Annotation,
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
  SegmentText,
  Work,
} from '../domain/types';
import { DEFAULT_SETTINGS } from './inMemoryRepository';
import { OPEN_CONTENT_PACK } from './openContentPack';
import type { AppRepository, PersonalDataBackup, SearchResultItem } from './repository';

/**
 * Native SQLite Repository:
 * - Public scripture DB (`scripture_public.db`) and Private user DB (`personal_private.db`) are physically separated.
 * - Transactional migrations preserve user data across app and content updates.
 */
export class SqliteRepository implements AppRepository {
  private publicDb: SQLite.SQLiteDatabase | null = null;
  private privateDb: SQLite.SQLiteDatabase | null = null;
  private readonly allowSyntheticInDev: boolean;

  constructor(options: { allowSyntheticInDev?: boolean } = { allowSyntheticInDev: true }) {
    this.allowSyntheticInDev = options.allowSyntheticInDev ?? true;
  }

  async initialize(pack: ContentPack = OPEN_CONTENT_PACK): Promise<void> {
    this.publicDb = await SQLite.openDatabaseAsync('scripture_public.db');
    this.privateDb = await SQLite.openDatabaseAsync('personal_private.db');

    await this.migratePublicDb(this.publicDb);
    await this.migratePrivateDb(this.privateDb);

    const existingVer = await this.publicDb.getFirstAsync<{ value: string }>(
      "SELECT value FROM pack_meta WHERE key = 'content_pack_version'"
    );
    if (existingVer?.value !== pack.manifest.version) {
      await this.upgradeContentPack(pack);
    }
  }

  private async migratePublicDb(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS works (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          subtitle TEXT,
          tradition TEXT NOT NULL,
          type TEXT NOT NULL,
          total_segments INTEGER NOT NULL,
          description TEXT
        );
        CREATE TABLE IF NOT EXISTS licenses (
          edition_id TEXT PRIMARY KEY NOT NULL,
          work_id TEXT NOT NULL,
          translator TEXT NOT NULL,
          source_url TEXT NOT NULL,
          source_revision TEXT NOT NULL,
          license TEXT NOT NULL,
          permission_evidence TEXT NOT NULL,
          allow_redistribution INTEGER NOT NULL,
          allow_commercial INTEGER NOT NULL,
          allow_adaptation INTEGER NOT NULL,
          allow_share INTEGER NOT NULL,
          allow_tts INTEGER NOT NULL,
          allow_ai_processing INTEGER NOT NULL,
          reviewed_at TEXT NOT NULL,
          reviewer TEXT NOT NULL,
          status TEXT NOT NULL,
          is_synthetic INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS editions (
          id TEXT PRIMARY KEY NOT NULL,
          work_id TEXT NOT NULL,
          lang TEXT NOT NULL,
          label TEXT NOT NULL,
          translator TEXT NOT NULL,
          license_id TEXT NOT NULL,
          source_revision TEXT NOT NULL,
          is_original INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sections (
          id TEXT PRIMARY KEY NOT NULL,
          work_id TEXT NOT NULL,
          parent_id TEXT,
          ordinal INTEGER NOT NULL,
          title TEXT NOT NULL,
          source_ref TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS segments (
          id TEXT PRIMARY KEY NOT NULL,
          work_id TEXT NOT NULL,
          section_id TEXT NOT NULL,
          ordinal INTEGER NOT NULL,
          source_ref TEXT NOT NULL,
          topics_json TEXT NOT NULL,
          UNIQUE(work_id, ordinal)
        );
        CREATE TABLE IF NOT EXISTS segment_texts (
          segment_id TEXT NOT NULL,
          edition_id TEXT NOT NULL,
          text TEXT NOT NULL,
          paraphrase TEXT,
          review_status TEXT NOT NULL,
          PRIMARY KEY(segment_id, edition_id)
        );
        CREATE TABLE IF NOT EXISTS segment_alignment (
          from_id TEXT NOT NULL,
          to_id TEXT NOT NULL,
          relationship TEXT NOT NULL,
          PRIMARY KEY(from_id, to_id)
        );
        CREATE TABLE IF NOT EXISTS annotations (
          id TEXT PRIMARY KEY NOT NULL,
          segment_id TEXT NOT NULL,
          edition_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          title TEXT,
          body TEXT NOT NULL,
          source TEXT NOT NULL,
          uncertainty_note TEXT,
          review_status TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS related_links (
          id TEXT PRIMARY KEY NOT NULL,
          from_id TEXT NOT NULL,
          to_id TEXT NOT NULL,
          type TEXT NOT NULL,
          target_title TEXT NOT NULL,
          target_ref TEXT NOT NULL,
          evidence TEXT NOT NULL,
          review_status TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS plans (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          duration_days INTEGER NOT NULL,
          daily_target INTEGER NOT NULL,
          work_id TEXT NOT NULL,
          description TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS plan_items (
          id TEXT PRIMARY KEY NOT NULL,
          plan_id TEXT NOT NULL,
          day_number INTEGER NOT NULL,
          segment_ids_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pack_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        PRAGMA user_version = 1;
      `);
    });
  }

  private async migratePrivateDb(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          profile_id TEXT NOT NULL,
          segment_id TEXT NOT NULL,
          edition_id TEXT NOT NULL,
          folder TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY(profile_id, segment_id)
        );
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY NOT NULL,
          profile_id TEXT NOT NULL,
          segment_id TEXT NOT NULL,
          body TEXT NOT NULL,
          tags_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reading_progress (
          profile_id TEXT NOT NULL,
          work_id TEXT NOT NULL,
          edition_id TEXT NOT NULL,
          segment_id TEXT NOT NULL,
          offset INTEGER NOT NULL DEFAULT 0,
          mode TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY(profile_id, work_id, mode)
        );
        CREATE TABLE IF NOT EXISTS reading_events (
          id TEXT PRIMARY KEY NOT NULL,
          profile_id TEXT NOT NULL,
          segment_id TEXT NOT NULL,
          local_day TEXT NOT NULL,
          mode TEXT NOT NULL,
          dwell_ms INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(profile_id, segment_id, local_day, mode)
        );
        CREATE TABLE IF NOT EXISTS plan_progress (
          profile_id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          started_at TEXT NOT NULL,
          completed_days_json TEXT NOT NULL,
          completed_segment_ids_json TEXT NOT NULL,
          reminder_enabled INTEGER NOT NULL DEFAULT 0,
          reminder_hour INTEGER NOT NULL DEFAULT 8,
          reminder_minute INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(profile_id, plan_id)
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY NOT NULL,
          value_json TEXT NOT NULL
        );
        PRAGMA user_version = 1;
      `);
    });
  }

  private ensureDbs(): { pub: SQLite.SQLiteDatabase; priv: SQLite.SQLiteDatabase } {
    if (!this.publicDb || !this.privateDb) {
      throw new Error('SqliteRepository is not initialized.');
    }
    return { pub: this.publicDb, priv: this.privateDb };
  }

  async upgradeContentPack(pack: ContentPack): Promise<{ migratedProgressCount: number }> {
    const { pub, priv } = this.ensureDbs();
    const approvedEditionIds = new Set(
      pack.manifest.entries
        .filter((e) => isRightsApprovedForDistribution(e, { allowSyntheticInDev: this.allowSyntheticInDev }))
        .map((e) => e.editionId)
    );

    await pub.withTransactionAsync(async () => {
      await pub.execAsync(`
        DELETE FROM works;
        DELETE FROM licenses;
        DELETE FROM editions;
        DELETE FROM sections;
        DELETE FROM segments;
        DELETE FROM segment_texts;
        DELETE FROM segment_alignment;
        DELETE FROM annotations;
        DELETE FROM related_links;
        DELETE FROM plans;
        DELETE FROM plan_items;
      `);

      for (const w of pack.works) {
        await pub.runAsync(
          'INSERT INTO works (id, title, subtitle, tradition, type, total_segments, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
          w.id,
          normalizeNfc(w.title),
          w.subtitle ?? null,
          w.tradition,
          w.type,
          w.totalSegments,
          w.description ?? null
        );
      }

      for (const entry of pack.manifest.entries) {
        await pub.runAsync(
          `INSERT INTO licenses (
            edition_id, work_id, translator, source_url, source_revision, license,
            permission_evidence, allow_redistribution, allow_commercial, allow_adaptation,
            allow_share, allow_tts, allow_ai_processing, reviewed_at, reviewer, status, is_synthetic
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          entry.editionId,
          entry.workId,
          entry.translator,
          entry.sourceUrl,
          entry.sourceRevision,
          entry.license,
          entry.permissionEvidence,
          entry.allowRedistribution ? 1 : 0,
          entry.allowCommercial ? 1 : 0,
          entry.allowAdaptation ? 1 : 0,
          entry.allowShare ? 1 : 0,
          entry.allowTTS ? 1 : 0,
          entry.allowAIProcessing ? 1 : 0,
          entry.reviewedAt,
          entry.reviewer,
          entry.status,
          entry.isSyntheticTestFixture ? 1 : 0
        );
      }

      for (const ed of pack.editions) {
        if (!approvedEditionIds.has(ed.id)) continue;
        await pub.runAsync(
          'INSERT INTO editions (id, work_id, lang, label, translator, license_id, source_revision, is_original) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ed.id,
          ed.workId,
          ed.lang,
          ed.label,
          ed.translator,
          ed.licenseId,
          ed.sourceRevision,
          ed.isOriginal ? 1 : 0
        );
      }

      for (const sec of pack.sections) {
        await pub.runAsync(
          'INSERT INTO sections (id, work_id, parent_id, ordinal, title, source_ref) VALUES (?, ?, ?, ?, ?, ?)',
          sec.id,
          sec.workId,
          sec.parentId,
          sec.ordinal,
          normalizeNfc(sec.title),
          sec.sourceRef
        );
      }

      for (const seg of pack.segments) {
        await pub.runAsync(
          'INSERT INTO segments (id, work_id, section_id, ordinal, source_ref, topics_json) VALUES (?, ?, ?, ?, ?, ?)',
          seg.id,
          seg.workId,
          seg.sectionId,
          seg.ordinal,
          normalizeNfc(seg.sourceRef),
          JSON.stringify(seg.topics)
        );
      }

      for (const st of pack.segmentTexts) {
        if (!approvedEditionIds.has(st.editionId)) continue;
        await pub.runAsync(
          'INSERT INTO segment_texts (segment_id, edition_id, text, paraphrase, review_status) VALUES (?, ?, ?, ?, ?)',
          st.segmentId,
          st.editionId,
          normalizeNfc(st.text),
          st.paraphrase ? normalizeNfc(st.paraphrase) : null,
          st.reviewStatus
        );
      }

      for (const al of pack.alignments) {
        await pub.runAsync(
          'INSERT INTO segment_alignment (from_id, to_id, relationship) VALUES (?, ?, ?)',
          al.fromId,
          al.toId,
          al.relationship
        );
      }

      for (const ann of pack.annotations) {
        await pub.runAsync(
          'INSERT INTO annotations (id, segment_id, edition_id, kind, title, body, source, uncertainty_note, review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          ann.id,
          ann.segmentId,
          ann.editionId,
          ann.kind,
          ann.title ?? null,
          normalizeNfc(ann.body),
          ann.source,
          ann.uncertaintyNote ?? null,
          ann.reviewStatus
        );
      }

      for (const link of pack.relatedLinks) {
        await pub.runAsync(
          'INSERT INTO related_links (id, from_id, to_id, type, target_title, target_ref, evidence, review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          link.id,
          link.fromId,
          link.toId,
          link.type,
          link.targetTitle,
          link.targetRef,
          link.evidence,
          link.reviewStatus
        );
      }

      for (const plan of pack.plans) {
        await pub.runAsync(
          'INSERT INTO plans (id, title, duration_days, daily_target, work_id, description) VALUES (?, ?, ?, ?, ?, ?)',
          plan.id,
          plan.title,
          plan.durationDays,
          plan.dailyTarget,
          plan.workId,
          plan.description
        );
      }

      for (const item of pack.planItems) {
        await pub.runAsync(
          'INSERT INTO plan_items (id, plan_id, day_number, segment_ids_json) VALUES (?, ?, ?, ?)',
          item.id,
          item.planId,
          item.dayNumber,
          JSON.stringify(item.segmentIds)
        );
      }

      await pub.runAsync(
        `INSERT INTO pack_meta (key, value) VALUES ('content_pack_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        pack.manifest.version
      );
    });

    // Preserve and remap reading_progress via segment_alignment if needed
    let migratedProgressCount = 0;
    const progRows = await priv.getAllAsync<{ profile_id: string; work_id: string; mode: string; segment_id: string }>(
      'SELECT profile_id, work_id, mode, segment_id FROM reading_progress'
    );
    for (const row of progRows) {
      const exists = await pub.getFirstAsync<{ id: string }>('SELECT id FROM segments WHERE id = ?', row.segment_id);
      if (!exists) {
        const mapped = await pub.getFirstAsync<{ to_id: string }>(
          'SELECT to_id FROM segment_alignment WHERE from_id = ?',
          row.segment_id
        );
        if (mapped) {
          await priv.runAsync(
            'UPDATE reading_progress SET segment_id = ? WHERE profile_id = ? AND work_id = ? AND mode = ?',
            mapped.to_id,
            row.profile_id,
            row.work_id,
            row.mode
          );
          migratedProgressCount += 1;
        }
      }
    }

    return { migratedProgressCount };
  }

  async getWorks(): Promise<Work[]> {
    const { pub } = this.ensureDbs();
    const rows = await pub.getAllAsync<Record<string, unknown>>('SELECT * FROM works');
    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      subtitle: r.subtitle ? String(r.subtitle) : undefined,
      tradition: r.tradition as Work['tradition'],
      type: r.type as Work['type'],
      totalSegments: Number(r.total_segments),
      description: r.description ? String(r.description) : undefined,
    }));
  }

  async getWorkById(workId: string): Promise<Work | undefined> {
    const works = await this.getWorks();
    return works.find((w) => w.id === workId);
  }

  async getEditionsForWork(workId: string): Promise<Edition[]> {
    const { pub } = this.ensureDbs();
    const rows = await pub.getAllAsync<Record<string, unknown>>('SELECT * FROM editions WHERE work_id = ?', workId);
    return rows.map((r) => ({
      id: String(r.id),
      workId: String(r.work_id),
      lang: r.lang as Edition['lang'],
      label: String(r.label),
      translator: String(r.translator),
      licenseId: String(r.license_id),
      sourceRevision: String(r.source_revision),
      isOriginal: Number(r.is_original) === 1,
    }));
  }

  async getSectionsForWork(workId: string): Promise<Section[]> {
    const { pub } = this.ensureDbs();
    const rows = await pub.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM sections WHERE work_id = ? ORDER BY ordinal ASC',
      workId
    );
    return rows.map((r) => ({
      id: String(r.id),
      workId: String(r.work_id),
      parentId: r.parent_id ? String(r.parent_id) : null,
      ordinal: Number(r.ordinal),
      title: String(r.title),
      sourceRef: String(r.source_ref),
    }));
  }

  async getSegmentsForWork(workId: string): Promise<Segment[]> {
    const { pub } = this.ensureDbs();
    const rows = await pub.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM segments WHERE work_id = ? ORDER BY ordinal ASC',
      workId
    );
    return rows.map(this.mapSegmentRow);
  }

  async getSegmentsByTopic(topic: string): Promise<Segment[]> {
    const { pub } = this.ensureDbs();
    const rows = await pub.getAllAsync<Record<string, unknown>>('SELECT * FROM segments ORDER BY ordinal ASC');
    return rows.map(this.mapSegmentRow).filter((s) => s.topics.includes(topic));
  }

  async getSegmentById(segmentId: string): Promise<Segment | undefined> {
    const { pub } = this.ensureDbs();
    const row = await pub.getFirstAsync<Record<string, unknown>>('SELECT * FROM segments WHERE id = ?', segmentId);
    return row ? this.mapSegmentRow(row) : undefined;
  }

  private mapSegmentRow(r: Record<string, unknown>): Segment {
    return {
      id: String(r.id),
      workId: String(r.work_id),
      sectionId: String(r.section_id),
      ordinal: Number(r.ordinal),
      sourceRef: String(r.source_ref),
      topics: JSON.parse(String(r.topics_json)) as string[],
    };
  }

  async getSegmentText(segmentId: string, editionId: string): Promise<SegmentText | undefined> {
    const { pub } = this.ensureDbs();
    const row = await pub.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM segment_texts WHERE segment_id = ? AND edition_id = ? AND review_status = 'approved'",
      segmentId,
      editionId
    );
    if (!row) return undefined;
    return {
      segmentId: String(row.segment_id),
      editionId: String(row.edition_id),
      text: String(row.text),
      paraphrase: row.paraphrase ? String(row.paraphrase) : undefined,
      reviewStatus: 'approved',
    };
  }

  async getOriginalTextForSegment(
    segmentId: string,
    workId: string
  ): Promise<{ edition: Edition; segmentText: SegmentText } | undefined> {
    const editions = await this.getEditionsForWork(workId);
    const orig = editions.find((e) => e.isOriginal);
    if (!orig) return undefined;
    const st = await this.getSegmentText(segmentId, orig.id);
    if (!st) return undefined;
    return { edition: orig, segmentText: st };
  }

  private mapLicenseRow(r: Record<string, unknown>): RightsManifestEntry {
    return {
      workId: String(r.work_id),
      editionId: String(r.edition_id),
      translator: String(r.translator),
      sourceUrl: String(r.source_url),
      sourceRevision: String(r.source_revision),
      license: String(r.license),
      permissionEvidence: String(r.permission_evidence),
      allowRedistribution: Number(r.allow_redistribution) === 1,
      allowCommercial: Number(r.allow_commercial) === 1,
      allowAdaptation: Number(r.allow_adaptation) === 1,
      allowShare: Number(r.allow_share) === 1,
      allowTTS: Number(r.allow_tts) === 1,
      allowAIProcessing: Number(r.allow_ai_processing) === 1,
      reviewedAt: String(r.reviewed_at),
      reviewer: String(r.reviewer),
      status: r.status as RightsManifestEntry['status'],
      isSyntheticTestFixture: Number(r.is_synthetic) === 1,
    };
  }

  async getRightsForEdition(editionId: string): Promise<RightsManifestEntry | undefined> {
    const { pub } = this.ensureDbs();
    const r = await pub.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM licenses WHERE edition_id = ?',
      editionId
    );
    return r ? this.mapLicenseRow(r) : undefined;
  }

  async getAllRightsEntries(): Promise<RightsManifestEntry[]> {
    const { pub } = this.ensureDbs();
    const rows = await pub.getAllAsync<Record<string, unknown>>('SELECT * FROM licenses');
    return rows.map((r) => this.mapLicenseRow(r));
  }

  async getApprovedAnnotations(segmentId: string, editionId?: string): Promise<Annotation[]> {
    const { pub } = this.ensureDbs();
    const rows = editionId
      ? await pub.getAllAsync<Record<string, unknown>>(
          "SELECT * FROM annotations WHERE segment_id = ? AND edition_id = ? AND review_status = 'approved'",
          segmentId,
          editionId
        )
      : await pub.getAllAsync<Record<string, unknown>>(
          "SELECT * FROM annotations WHERE segment_id = ? AND review_status = 'approved'",
          segmentId
        );
    return rows.map((r) => ({
      id: String(r.id),
      segmentId: String(r.segment_id),
      editionId: String(r.edition_id),
      kind: r.kind as Annotation['kind'],
      title: r.title ? String(r.title) : undefined,
      body: String(r.body),
      source: String(r.source),
      uncertaintyNote: r.uncertainty_note ? String(r.uncertainty_note) : undefined,
      reviewStatus: 'approved',
    }));
  }

  async getApprovedRelatedLinks(segmentId: string): Promise<RelatedLink[]> {
    const { pub } = this.ensureDbs();
    const rows = await pub.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM related_links WHERE from_id = ? AND review_status = 'approved'",
      segmentId
    );
    return rows.map((r) => ({
      id: String(r.id),
      fromId: String(r.from_id),
      toId: String(r.to_id),
      type: r.type as RelatedLink['type'],
      targetTitle: String(r.target_title),
      targetRef: String(r.target_ref),
      evidence: String(r.evidence),
      reviewStatus: 'approved',
    }));
  }

  async searchSegments(query: string, editionId?: string): Promise<SearchResultItem[]> {
    const q = normalizeSearchQuery(query);
    if (!q) return [];
    const works = await this.getWorks();
    const results: SearchResultItem[] = [];

    for (const work of works) {
      const editions = await this.getEditionsForWork(work.id);
      const targetEd = editionId
        ? editions.find((e) => e.id === editionId)
        : editions.find((e) => !e.isOriginal) ?? editions[0];
      if (!targetEd) continue;

      const segments = await this.getSegmentsForWork(work.id);
      for (const seg of segments) {
        const st = await this.getSegmentText(seg.id, targetEd.id);
        if (!st) continue;
        if (normalizeSearchQuery(st.text).includes(q)) {
          results.push({ segment: seg, work, edition: targetEd, segmentText: st, matchedField: 'text' });
        } else if (normalizeSearchQuery(seg.sourceRef).includes(q)) {
          results.push({ segment: seg, work, edition: targetEd, segmentText: st, matchedField: 'source_ref' });
        } else if (normalizeSearchQuery(work.title).includes(q)) {
          results.push({ segment: seg, work, edition: targetEd, segmentText: st, matchedField: 'work_title' });
        }
      }
    }
    return results;
  }

  async getBookmarks(profileId: string): Promise<Bookmark[]> {
    const { priv } = this.ensureDbs();
    const rows = await priv.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM bookmarks WHERE profile_id = ? ORDER BY created_at DESC',
      profileId
    );
    return rows.map((r) => ({
      profileId: String(r.profile_id),
      segmentId: String(r.segment_id),
      editionId: String(r.edition_id),
      folder: String(r.folder),
      createdAt: String(r.created_at),
    }));
  }

  async isBookmarked(profileId: string, segmentId: string): Promise<boolean> {
    const { priv } = this.ensureDbs();
    const row = await priv.getFirstAsync<{ segment_id: string }>(
      'SELECT segment_id FROM bookmarks WHERE profile_id = ? AND segment_id = ?',
      profileId,
      segmentId
    );
    return Boolean(row);
  }

  async toggleBookmark(
    profileId: string,
    segmentId: string,
    editionId: string,
    folder = '기본 모음'
  ): Promise<boolean> {
    const { priv } = this.ensureDbs();
    const exists = await this.isBookmarked(profileId, segmentId);
    if (exists) {
      await priv.runAsync('DELETE FROM bookmarks WHERE profile_id = ? AND segment_id = ?', profileId, segmentId);
      return false;
    }
    await priv.runAsync(
      'INSERT INTO bookmarks (profile_id, segment_id, edition_id, folder, created_at) VALUES (?, ?, ?, ?, ?)',
      profileId,
      segmentId,
      editionId,
      folder,
      new Date().toISOString()
    );
    return true;
  }

  async getNotes(profileId: string, segmentId?: string): Promise<Note[]> {
    const { priv } = this.ensureDbs();
    const rows = segmentId
      ? await priv.getAllAsync<Record<string, unknown>>(
          'SELECT * FROM notes WHERE profile_id = ? AND segment_id = ? ORDER BY updated_at DESC',
          profileId,
          segmentId
        )
      : await priv.getAllAsync<Record<string, unknown>>(
          'SELECT * FROM notes WHERE profile_id = ? ORDER BY updated_at DESC',
          profileId
        );
    return rows.map((r) => ({
      id: String(r.id),
      profileId: String(r.profile_id),
      segmentId: String(r.segment_id),
      body: String(r.body),
      tags: JSON.parse(String(r.tags_json)) as string[],
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }

  async saveNote(
    profileId: string,
    segmentId: string,
    body: string,
    tags: string[] = [],
    noteId?: string
  ): Promise<Note> {
    const { priv } = this.ensureDbs();
    const now = new Date().toISOString();
    const cleanBody = normalizeNfc(body.trim());

    if (noteId) {
      await priv.runAsync(
        'UPDATE notes SET body = ?, tags_json = ?, updated_at = ? WHERE id = ? AND profile_id = ?',
        cleanBody,
        JSON.stringify(tags),
        now,
        noteId,
        profileId
      );
      const updated = (await this.getNotes(profileId, segmentId)).find((n) => n.id === noteId);
      if (updated) return updated;
    }

    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await priv.runAsync(
      'INSERT INTO notes (id, profile_id, segment_id, body, tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id,
      profileId,
      segmentId,
      cleanBody,
      JSON.stringify(tags),
      now,
      now
    );
    return { id, profileId, segmentId, body: cleanBody, tags, createdAt: now, updatedAt: now };
  }

  async deleteNote(profileId: string, noteId: string): Promise<void> {
    const { priv } = this.ensureDbs();
    await priv.runAsync('DELETE FROM notes WHERE profile_id = ? AND id = ?', profileId, noteId);
  }

  async getReadingProgress(
    profileId: string,
    workId: string,
    mode: ReadingMode
  ): Promise<ReadingProgress | undefined> {
    const { priv } = this.ensureDbs();
    const r = await priv.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM reading_progress WHERE profile_id = ? AND work_id = ? AND mode = ?',
      profileId,
      workId,
      mode
    );
    return r ? this.mapProgressRow(r) : undefined;
  }

  async getLatestReadingProgress(profileId: string): Promise<ReadingProgress | undefined> {
    const { priv } = this.ensureDbs();
    const r = await priv.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM reading_progress WHERE profile_id = ? ORDER BY updated_at DESC LIMIT 1',
      profileId
    );
    return r ? this.mapProgressRow(r) : undefined;
  }

  private mapProgressRow(r: Record<string, unknown>): ReadingProgress {
    return {
      profileId: String(r.profile_id),
      workId: String(r.work_id),
      editionId: String(r.edition_id),
      segmentId: String(r.segment_id),
      offset: Number(r.offset),
      mode: r.mode as ReadingMode,
      updatedAt: String(r.updated_at),
    };
  }

  async saveReadingProgress(progress: ReadingProgress): Promise<void> {
    const { priv } = this.ensureDbs();
    await priv.runAsync(
      `INSERT INTO reading_progress (profile_id, work_id, edition_id, segment_id, offset, mode, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(profile_id, work_id, mode) DO UPDATE SET
         edition_id = excluded.edition_id,
         segment_id = excluded.segment_id,
         offset = excluded.offset,
         updated_at = excluded.updated_at`,
      progress.profileId,
      progress.workId,
      progress.editionId,
      progress.segmentId,
      progress.offset,
      progress.mode,
      progress.updatedAt
    );
  }

  async recordReadingEvent(params: {
    profileId: string;
    segmentId: string;
    localDay: string;
    mode: ReadingMode;
    dwellMs: number;
    isManual?: boolean;
  }): Promise<boolean> {
    const { priv } = this.ensureDbs();
    const existingRows = await priv.getAllAsync<{ segment_id: string; local_day: string; mode: string }>(
      'SELECT segment_id, local_day, mode FROM reading_events WHERE profile_id = ? AND local_day = ?',
      params.profileId,
      params.localDay
    );
    const existingKeys = new Set(existingRows.map((r) => `${r.segment_id}::${r.local_day}::${r.mode}`));
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

    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await priv.runAsync(
      'INSERT OR IGNORE INTO reading_events (id, profile_id, segment_id, local_day, mode, dwell_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id,
      params.profileId,
      params.segmentId,
      params.localDay,
      params.mode,
      params.dwellMs,
      new Date().toISOString()
    );
    return true;
  }

  async getReadingEvents(profileId: string): Promise<ReadingEvent[]> {
    const { priv } = this.ensureDbs();
    const rows = await priv.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM reading_events WHERE profile_id = ? ORDER BY created_at DESC',
      profileId
    );
    return rows.map((r) => ({
      id: String(r.id),
      profileId: String(r.profile_id),
      segmentId: String(r.segment_id),
      localDay: String(r.local_day),
      mode: r.mode as ReadingMode,
      dwellMs: Number(r.dwell_ms),
      createdAt: String(r.created_at),
    }));
  }

  async getPlans(): Promise<ReadingPlan[]> {
    const { pub } = this.ensureDbs();
    const rows = await pub.getAllAsync<Record<string, unknown>>('SELECT * FROM plans');
    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      durationDays: Number(r.duration_days) as ReadingPlan['durationDays'],
      dailyTarget: Number(r.daily_target),
      workId: String(r.work_id),
      description: String(r.description),
    }));
  }

  async getPlanItems(planId: string): Promise<PlanItem[]> {
    const { pub } = this.ensureDbs();
    const rows = await pub.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM plan_items WHERE plan_id = ? ORDER BY day_number ASC',
      planId
    );
    return rows.map((r) => ({
      id: String(r.id),
      planId: String(r.plan_id),
      dayNumber: Number(r.day_number),
      segmentIds: JSON.parse(String(r.segment_ids_json)) as string[],
    }));
  }

  async getPlanProgress(profileId: string, planId: string): Promise<PlanProgress | undefined> {
    const { priv } = this.ensureDbs();
    const r = await priv.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM plan_progress WHERE profile_id = ? AND plan_id = ?',
      profileId,
      planId
    );
    if (!r) return undefined;
    return {
      profileId: String(r.profile_id),
      planId: String(r.plan_id),
      startedAt: String(r.started_at),
      completedDays: JSON.parse(String(r.completed_days_json)) as number[],
      completedSegmentIds: JSON.parse(String(r.completed_segment_ids_json)) as string[],
      reminderEnabled: Number(r.reminder_enabled) === 1,
      reminderHour: Number(r.reminder_hour),
      reminderMinute: Number(r.reminder_minute),
    };
  }

  async startPlan(profileId: string, planId: string): Promise<PlanProgress> {
    const existing = await this.getPlanProgress(profileId, planId);
    if (existing) return existing;
    const { priv } = this.ensureDbs();
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
    await priv.runAsync(
      `INSERT INTO plan_progress (profile_id, plan_id, started_at, completed_days_json, completed_segment_ids_json, reminder_enabled, reminder_hour, reminder_minute)
       VALUES (?, ?, ?, '[]', '[]', 0, 8, 0)`,
      profileId,
      planId,
      created.startedAt
    );
    return created;
  }

  async completePlanDay(
    profileId: string,
    planId: string,
    dayNumber: number,
    segmentIds: string[]
  ): Promise<PlanProgress> {
    const prog = await this.startPlan(profileId, planId);
    const days = Array.from(new Set([...prog.completedDays, dayNumber]));
    const segs = Array.from(new Set([...prog.completedSegmentIds, ...segmentIds]));
    const { priv } = this.ensureDbs();
    await priv.runAsync(
      'UPDATE plan_progress SET completed_days_json = ?, completed_segment_ids_json = ? WHERE profile_id = ? AND plan_id = ?',
      JSON.stringify(days),
      JSON.stringify(segs),
      profileId,
      planId
    );
    return { ...prog, completedDays: days, completedSegmentIds: segs };
  }

  async updatePlanReminder(
    profileId: string,
    planId: string,
    enabled: boolean,
    hour: number,
    minute: number
  ): Promise<PlanProgress> {
    const prog = await this.startPlan(profileId, planId);
    const { priv } = this.ensureDbs();
    await priv.runAsync(
      'UPDATE plan_progress SET reminder_enabled = ?, reminder_hour = ?, reminder_minute = ? WHERE profile_id = ? AND plan_id = ?',
      enabled ? 1 : 0,
      hour,
      minute,
      profileId,
      planId
    );
    return { ...prog, reminderEnabled: enabled, reminderHour: hour, reminderMinute: minute };
  }

  async getSettings(): Promise<AppSettings> {
    const { priv } = this.ensureDbs();
    const row = await priv.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM settings WHERE key = 'app_settings'"
    );
    if (!row) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value_json) as Partial<AppSettings>) };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const { priv } = this.ensureDbs();
    await priv.runAsync(
      `INSERT INTO settings (key, value_json) VALUES ('app_settings', ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
      JSON.stringify(settings)
    );
  }

  async exportPersonalData(profileId: string): Promise<PersonalDataBackup> {
    const { priv } = this.ensureDbs();
    const progRows = await priv.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM reading_progress WHERE profile_id = ?',
      profileId
    );
    const planRows = await priv.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM plan_progress WHERE profile_id = ?',
      profileId
    );
    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      profileId,
      bookmarks: await this.getBookmarks(profileId),
      notes: await this.getNotes(profileId),
      readingProgress: progRows.map((r) => this.mapProgressRow(r)),
      readingEvents: await this.getReadingEvents(profileId),
      planProgress: planRows.map((r) => ({
        profileId: String(r.profile_id),
        planId: String(r.plan_id),
        startedAt: String(r.started_at),
        completedDays: JSON.parse(String(r.completed_days_json)) as number[],
        completedSegmentIds: JSON.parse(String(r.completed_segment_ids_json)) as string[],
        reminderEnabled: Number(r.reminder_enabled) === 1,
        reminderHour: Number(r.reminder_hour),
        reminderMinute: Number(r.reminder_minute),
      })),
      settings: await this.getSettings(),
    };
  }

  async importPersonalData(backup: PersonalDataBackup): Promise<void> {
    if (!backup || typeof backup !== 'object' || typeof backup.profileId !== 'string') {
      throw new Error('올바른 백업 JSON 형식이 아닙니다.');
    }
    const { priv } = this.ensureDbs();
    const pid = backup.profileId;
    await priv.withTransactionAsync(async () => {
      await priv.runAsync('DELETE FROM bookmarks WHERE profile_id = ?', pid);
      await priv.runAsync('DELETE FROM notes WHERE profile_id = ?', pid);
      await priv.runAsync('DELETE FROM reading_progress WHERE profile_id = ?', pid);
      await priv.runAsync('DELETE FROM reading_events WHERE profile_id = ?', pid);
      await priv.runAsync('DELETE FROM plan_progress WHERE profile_id = ?', pid);

      for (const bm of backup.bookmarks ?? []) {
        await priv.runAsync(
          'INSERT OR IGNORE INTO bookmarks (profile_id, segment_id, edition_id, folder, created_at) VALUES (?, ?, ?, ?, ?)',
          bm.profileId,
          bm.segmentId,
          bm.editionId,
          bm.folder,
          bm.createdAt
        );
      }
      for (const n of backup.notes ?? []) {
        await priv.runAsync(
          'INSERT OR REPLACE INTO notes (id, profile_id, segment_id, body, tags_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          n.id,
          n.profileId,
          n.segmentId,
          normalizeNfc(n.body),
          JSON.stringify(n.tags ?? []),
          n.createdAt,
          n.updatedAt
        );
      }
      for (const p of backup.readingProgress ?? []) {
        await priv.runAsync(
          'INSERT OR REPLACE INTO reading_progress (profile_id, work_id, edition_id, segment_id, offset, mode, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          p.profileId,
          p.workId,
          p.editionId,
          p.segmentId,
          p.offset,
          p.mode,
          p.updatedAt
        );
      }
      for (const e of backup.readingEvents ?? []) {
        await priv.runAsync(
          'INSERT OR IGNORE INTO reading_events (id, profile_id, segment_id, local_day, mode, dwell_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          e.id,
          e.profileId,
          e.segmentId,
          e.localDay,
          e.mode,
          e.dwellMs,
          e.createdAt
        );
      }
      for (const pp of backup.planProgress ?? []) {
        await priv.runAsync(
          `INSERT OR REPLACE INTO plan_progress (profile_id, plan_id, started_at, completed_days_json, completed_segment_ids_json, reminder_enabled, reminder_hour, reminder_minute)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          pp.profileId,
          pp.planId,
          pp.startedAt,
          JSON.stringify(pp.completedDays ?? []),
          JSON.stringify(pp.completedSegmentIds ?? []),
          pp.reminderEnabled ? 1 : 0,
          pp.reminderHour,
          pp.reminderMinute
        );
      }
      if (backup.settings) {
        await priv.runAsync(
          `INSERT INTO settings (key, value_json) VALUES ('app_settings', ?)
           ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
          JSON.stringify({ ...DEFAULT_SETTINGS, ...backup.settings })
        );
      }
    });
  }

  async deleteAllPersonalData(profileId: string): Promise<void> {
    const { priv } = this.ensureDbs();
    await priv.withTransactionAsync(async () => {
      await priv.runAsync('DELETE FROM bookmarks WHERE profile_id = ?', profileId);
      await priv.runAsync('DELETE FROM notes WHERE profile_id = ?', profileId);
      await priv.runAsync('DELETE FROM reading_progress WHERE profile_id = ?', profileId);
      await priv.runAsync('DELETE FROM reading_events WHERE profile_id = ?', profileId);
      await priv.runAsync('DELETE FROM plan_progress WHERE profile_id = ?', profileId);
      await priv.runAsync("DELETE FROM settings WHERE key = 'app_settings'");
    });
  }
}
