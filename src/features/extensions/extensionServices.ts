import { getFeatureFlags } from '../../domain/featureFlags';

export interface SyncConsentState {
  consented: boolean;
  lastSyncedAt?: string;
  conflictPolicy: 'local_wins' | 'latest_timestamp';
}

export interface CommentModerationItem {
  id: string;
  segmentId: string;
  authorAlias: string;
  body: string;
  reportedCount: number;
  isBlockedAuthor: boolean;
}

const BLOCKED_WORDS = ['욕설', '비방', '광고'];

export function isCommentAllowed(body: string): boolean {
  const lower = body.toLowerCase();
  return body.trim().length > 0 && !BLOCKED_WORDS.some((w) => lower.includes(w));
}

export function filterModeratedComments(
  comments: CommentModerationItem[],
  blockedAuthors: Set<string>
): CommentModerationItem[] {
  return comments.filter((c) => !blockedAuthors.has(c.authorAlias) && c.reportedCount < 3);
}

export const SUBSCRIPTION_PLANS_HYPOTHESIS = [
  { id: 'plus-monthly', label: '월간 마음스크롤 Plus (가설)', priceKrw: 4900, period: '월' },
  { id: 'plus-yearly', label: '연간 마음스크롤 Plus (가설)', priceKrw: 39000, period: '년' },
] as const;

export function getExtensionAvailability() {
  return getFeatureFlags();
}
