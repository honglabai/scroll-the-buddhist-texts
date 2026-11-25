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

export interface SearchResultItem {
  segment: Segment;
  work: Work;
  edition: Edition;
  segmentText: SegmentText;
  matchedField: 'work_title' | 'source_ref' | 'text';
}

export interface PersonalDataBackup {
  exportedAt: string;
  version: number;
  profileId: string;
  bookmarks: Bookmark[];
  notes: Note[];
  readingProgress: ReadingProgress[];
  readingEvents: ReadingEvent[];
  planProgress: PlanProgress[];
  settings: AppSettings;
}

export interface AppRepository {
  initialize(pack?: ContentPack): Promise<void>;
  upgradeContentPack(pack: ContentPack): Promise<{ migratedProgressCount: number }>;

  // Scripture & Rights (Public DB)
  getWorks(): Promise<Work[]>;
  getWorkById(workId: string): Promise<Work | undefined>;
  getEditionsForWork(workId: string): Promise<Edition[]>;
  getSectionsForWork(workId: string): Promise<Section[]>;
  getSegmentsForWork(workId: string): Promise<Segment[]>;
  getSegmentsByTopic(topic: string): Promise<Segment[]>;
  getSegmentById(segmentId: string): Promise<Segment | undefined>;
  getSegmentText(segmentId: string, editionId: string): Promise<SegmentText | undefined>;
  getOriginalTextForSegment(
    segmentId: string,
    workId: string
  ): Promise<{ edition: Edition; segmentText: SegmentText } | undefined>;
  getRightsForEdition(editionId: string): Promise<RightsManifestEntry | undefined>;
  getAllRightsEntries(): Promise<RightsManifestEntry[]>;

  // Study (Approved only)
  getApprovedAnnotations(segmentId: string, editionId?: string): Promise<Annotation[]>;
  getApprovedRelatedLinks(segmentId: string): Promise<RelatedLink[]>;

  // Search
  searchSegments(query: string, editionId?: string): Promise<SearchResultItem[]>;

  // Bookmarks (Private DB)
  getBookmarks(profileId: string): Promise<Bookmark[]>;
  isBookmarked(profileId: string, segmentId: string): Promise<boolean>;
  toggleBookmark(profileId: string, segmentId: string, editionId: string, folder?: string): Promise<boolean>;

  // Notes (Private DB)
  getNotes(profileId: string, segmentId?: string): Promise<Note[]>;
  saveNote(profileId: string, segmentId: string, body: string, tags?: string[], noteId?: string): Promise<Note>;
  deleteNote(profileId: string, noteId: string): Promise<void>;

  // Reading Progress & Events (Private DB)
  getReadingProgress(profileId: string, workId: string, mode: ReadingMode): Promise<ReadingProgress | undefined>;
  getLatestReadingProgress(profileId: string): Promise<ReadingProgress | undefined>;
  saveReadingProgress(progress: ReadingProgress): Promise<void>;
  recordReadingEvent(params: {
    profileId: string;
    segmentId: string;
    localDay: string;
    mode: ReadingMode;
    dwellMs: number;
    isManual?: boolean;
  }): Promise<boolean>;
  getReadingEvents(profileId: string): Promise<ReadingEvent[]>;

  // Plans (Public plans + Private progress)
  getPlans(): Promise<ReadingPlan[]>;
  getPlanItems(planId: string): Promise<PlanItem[]>;
  getPlanProgress(profileId: string, planId: string): Promise<PlanProgress | undefined>;
  startPlan(profileId: string, planId: string): Promise<PlanProgress>;
  completePlanDay(profileId: string, planId: string, dayNumber: number, segmentIds: string[]): Promise<PlanProgress>;
  updatePlanReminder(
    profileId: string,
    planId: string,
    enabled: boolean,
    hour: number,
    minute: number
  ): Promise<PlanProgress>;

  // Settings & Privacy
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  exportPersonalData(profileId: string): Promise<PersonalDataBackup>;
  importPersonalData(backup: PersonalDataBackup): Promise<void>;
  deleteAllPersonalData(profileId: string): Promise<void>;
}
