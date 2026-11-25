import { Share } from 'react-native';
import { canShareSegmentText } from '../domain/readingRules';
import type { Edition, RightsManifestEntry, Segment, SegmentText, Work } from '../domain/types';

export interface SharePayload {
  title: string;
  message: string;
  textIncluded: boolean;
}

export function buildSharePayload(params: {
  work: Work;
  segment: Segment;
  edition: Edition;
  segmentText: SegmentText;
  rights: RightsManifestEntry | undefined;
}): SharePayload {
  const { work, segment, edition, segmentText, rights } = params;
  const allowText = canShareSegmentText(rights);
  const citation = `${work.title} · ${segment.sourceRef}\n판본: ${edition.label} (${edition.translator})\n출처: ${rights?.sourceUrl ?? '확인 필요'}`;

  if (!allowText) {
    return {
      title: `${work.title} - ${segment.sourceRef}`,
      message: `${citation}\n\n[권리 안내] 이 판본은 원문 본문 공유가 제한되어 출처 링크만 공유합니다.`,
      textIncluded: false,
    };
  }

  return {
    title: `${work.title} - ${segment.sourceRef}`,
    message: `"${segmentText.text}"\n\n— ${citation}`,
    textIncluded: true,
  };
}

export async function shareVerse(params: {
  work: Work;
  segment: Segment;
  edition: Edition;
  segmentText: SegmentText;
  rights: RightsManifestEntry | undefined;
}): Promise<{ shared: boolean; textIncluded: boolean }> {
  const payload = buildSharePayload(params);
  const result = await Share.share({
    title: payload.title,
    message: payload.message,
  });
  return {
    shared: result.action !== Share.dismissedAction,
    textIncluded: payload.textIncluded,
  };
}
