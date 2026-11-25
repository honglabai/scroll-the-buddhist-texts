export type Tradition = 'early_buddhism' | 'mahayana' | 'korean_treatise';
export type WorkType = 'sutta' | 'verse' | 'treatise' | 'chant';
export type ReviewStatus = 'approved' | 'pending' | 'draft' | 'rejected';
export type RightsStatus = 'approved' | 'pending' | 'denied' | 'unknown';
export type AnnotationKind =
  | 'easy_explanation'
  | 'context'
  | 'original_term'
  | 'doctrinal_meaning'
  | 'daily_practice';
export type RelatedLinkType = 'parallel_sutta' | 'thematic_related';
export type ReadingMode = 'sequential' | 'topic';
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontScaleLevel = 1 | 2 | 3 | 4 | 5;

export interface RightsManifestEntry {
  workId: string;
  editionId: string;
  translator: string;
  sourceUrl: string;
  sourceRevision: string;
  license: string;
  permissionEvidence: string;
  allowRedistribution: boolean;
  allowCommercial: boolean;
  allowAdaptation: boolean;
  allowShare: boolean;
  allowTTS: boolean;
  allowAIProcessing: boolean;
  reviewedAt: string;
  reviewer: string;
  status: RightsStatus;
  isSyntheticTestFixture?: boolean;
}

export interface RightsManifest {
  version: string;
  generatedAt: string;
  entries: RightsManifestEntry[];
}

export interface Work {
  id: string;
  title: string;
  subtitle?: string;
  tradition: Tradition;
  type: WorkType;
  totalSegments: number;
  description?: string;
}

export interface Edition {
  id: string;
  workId: string;
  lang: 'ko' | 'pi' | 'zh' | 'en';
  label: string;
  translator: string;
  licenseId: string;
  sourceRevision: string;
  isOriginal: boolean;
}

export interface Section {
  id: string;
  workId: string;
  parentId: string | null;
  ordinal: number;
  title: string;
  sourceRef: string;
}

export interface Segment {
  id: string;
  workId: string;
  sectionId: string;
  ordinal: number;
  sourceRef: string;
  topics: string[];
}

export interface SegmentText {
  segmentId: string;
  editionId: string;
  text: string;
  paraphrase?: string;
  reviewStatus: ReviewStatus;
}

export interface SegmentAlignment {
  fromId: string;
  toId: string;
  relationship: '1:1' | '1:N' | 'N:1' | 'split' | 'merged';
}

export interface Annotation {
  id: string;
  segmentId: string;
  editionId: string;
  kind: AnnotationKind;
  title?: string;
  body: string;
  source: string;
  uncertaintyNote?: string;
  reviewStatus: ReviewStatus;
}

export interface RelatedLink {
  id: string;
  fromId: string;
  toId: string;
  type: RelatedLinkType;
  targetTitle: string;
  targetRef: string;
  evidence: string;
  reviewStatus: ReviewStatus;
}

export interface Bookmark {
  profileId: string;
  segmentId: string;
  editionId: string;
  folder: string;
  createdAt: string;
}

export interface Note {
  id: string;
  profileId: string;
  segmentId: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReadingProgress {
  profileId: string;
  workId: string;
  editionId: string;
  segmentId: string;
  offset: number;
  mode: ReadingMode;
  updatedAt: string;
}

export interface ReadingEvent {
  id: string;
  profileId: string;
  segmentId: string;
  localDay: string; // YYYY-MM-DD in user local timezone
  mode: ReadingMode;
  dwellMs: number;
  createdAt: string;
}

export interface ReadingPlan {
  id: string;
  title: string;
  durationDays: 7 | 30 | 100;
  dailyTarget: number;
  workId: string;
  description: string;
}

export interface PlanItem {
  id: string;
  planId: string;
  dayNumber: number;
  segmentIds: string[];
}

export interface PlanProgress {
  profileId: string;
  planId: string;
  startedAt: string;
  completedDays: number[];
  completedSegmentIds: string[];
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

export interface AppSettings {
  fontScaleLevel: FontScaleLevel;
  fontStyle: 'sans' | 'serif';
  themeMode: ThemeMode;
  lineHeightMultiplier: number;
  reduceMotion: boolean;
  ttsRate: number;
  ttsVoiceId?: string;
  selectedEditionByWork: Record<string, string>;
  activeTopic?: string;
}

export interface ContentPack {
  manifest: RightsManifest;
  works: Work[];
  editions: Edition[];
  sections: Section[];
  segments: Segment[];
  segmentTexts: SegmentText[];
  alignments: SegmentAlignment[];
  annotations: Annotation[];
  relatedLinks: RelatedLink[];
  plans: ReadingPlan[];
  planItems: PlanItem[];
}

export interface VerseViewItem {
  segment: Segment;
  work: Work;
  section?: Section;
  edition: Edition;
  segmentText: SegmentText;
  originalText?: SegmentText;
  originalEdition?: Edition;
  rights: RightsManifestEntry;
  isBookmarked: boolean;
  hasNote: boolean;
}

export interface AIStudyRequest {
  segmentId: string;
  editionId: string;
  question?: string;
  mode: 'summary' | 'context' | 'terms' | 'practice' | 'qa';
}

export interface AICitation {
  segmentId: string;
  editionId: string;
  sourceRef: string;
  excerpt: string;
}

export interface AIStudyResponse {
  summary: string;
  context: string;
  terms: { term: string; explanation: string }[];
  practicalReflection: string;
  citations: AICitation[];
  uncertainty: string;
  isMocked: boolean;
  generatedByAI: true;
}
