import type {
  Annotation,
  RelatedLink,
  RightsManifestEntry,
  SegmentText,
} from './types';

export const MIN_DWELL_MS_FOR_READ_EVENT = 2000;

export const TOPICS: readonly { id: string; label: string }[] = [
  { id: '마음', label: '마음' },
  { id: '자비', label: '자비' },
  { id: '지혜', label: '지혜' },
  { id: '내려놓음', label: '내려놓음' },
  { id: '마음의 평온', label: '마음의 평온' },
  { id: '분노 다스리기', label: '분노 다스리기' },
  { id: '고통과 슬픔', label: '고통과 슬픔' },
  { id: '인간관계', label: '인간관계' },
  { id: '삶과 죽음', label: '삶과 죽음' },
  { id: '행복과 감사', label: '행복과 감사' },
  { id: '인내와 용기', label: '인내와 용기' },
  { id: '깨달음', label: '깨달음' },
  { id: '수행', label: '수행' },
  { id: '잠들기 전', label: '잠들기 전' },
];

/** Unicode NFC normalization for consistent Korean search and storage. */
export function normalizeNfc(input: string): string {
  return input.normalize('NFC');
}

/** Normalize search query (NFC + trim + collapse whitespace + lowercase). */
export function normalizeSearchQuery(query: string): string {
  return normalizeNfc(query).trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Format local date YYYY-MM-DD in the device's local timezone (handles midnight boundary). */
export function formatLocalDay(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Determine whether a rights entry permits inclusion in production/active reading. */
export function isRightsApprovedForDistribution(
  entry: RightsManifestEntry | undefined,
  options: { allowSyntheticInDev?: boolean } = {}
): boolean {
  if (!entry) return false;
  if (entry.status !== 'approved') return false;
  if (entry.isSyntheticTestFixture && !options.allowSyntheticInDev) {
    return false;
  }
  return entry.allowRedistribution;
}

export function canShareSegmentText(entry: RightsManifestEntry | undefined): boolean {
  return Boolean(entry && entry.status === 'approved' && entry.allowShare);
}

export function canReadWithTTS(entry: RightsManifestEntry | undefined): boolean {
  return Boolean(entry && entry.status === 'approved' && entry.allowTTS);
}

export function canProcessWithAI(entry: RightsManifestEntry | undefined): boolean {
  return Boolean(entry && entry.status === 'approved' && entry.allowAIProcessing);
}

/** Filter out unapproved segment texts, annotations, and related links. */
export function filterApprovedSegmentText(text: SegmentText | undefined): SegmentText | undefined {
  if (!text || text.reviewStatus !== 'approved') return undefined;
  return text;
}

export function filterApprovedAnnotations(annotations: Annotation[]): Annotation[] {
  return annotations.filter((item) => item.reviewStatus === 'approved');
}

export function filterApprovedRelatedLinks(links: RelatedLink[]): RelatedLink[] {
  return links.filter((item) => item.reviewStatus === 'approved');
}

/** Deduplicate reading events by (segmentId, localDay, mode) and enforce minimum dwell time unless manual. */
export function shouldRecordReadingEvent(params: {
  dwellMs: number;
  isManual?: boolean;
  existingKeys: Set<string>;
  segmentId: string;
  localDay: string;
  mode: string;
}): boolean {
  if (!params.isManual && params.dwellMs < MIN_DWELL_MS_FOR_READ_EVENT) {
    return false;
  }
  const key = `${params.segmentId}::${params.localDay}::${params.mode}`;
  return !params.existingKeys.has(key);
}
