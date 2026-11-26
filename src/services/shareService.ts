import { Share } from 'react-native';
import { canShareSegmentText } from '../domain/readingRules';
import type { AppLanguage, Edition, RightsManifestEntry, Segment, SegmentText, Work } from '../domain/types';
import {
  getLocalizedEditionLabel,
  getLocalizedSourceRef,
  getLocalizedTranslator,
  getLocalizedWorkTitle,
} from '../i18n/strings';

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
  appLanguage?: AppLanguage;
}): SharePayload {
  const { work, segment, edition, segmentText, rights, appLanguage = 'ko' } = params;
  const allowText = canShareSegmentText(rights);
  const workTitle = getLocalizedWorkTitle(work, appLanguage);
  const sourceRef = getLocalizedSourceRef(segment, appLanguage);
  const edLabel = getLocalizedEditionLabel(edition, appLanguage);
  const translator = getLocalizedTranslator(edition, appLanguage);
  const isEn = appLanguage === 'en';
  const sourceFallback = isEn ? 'See license info' : '확인 필요';
  const citation = isEn
    ? `${workTitle} · ${sourceRef}\nEdition: ${edLabel} (${translator})\nSource: ${rights?.sourceUrl ?? sourceFallback}`
    : `${workTitle} · ${sourceRef}\n판본: ${edLabel} (${translator})\n출처: ${rights?.sourceUrl ?? sourceFallback}`;

  if (!allowText) {
    return {
      title: `${workTitle} - ${sourceRef}`,
      message: isEn
        ? `${citation}\n\n[Rights Notice] Redistribution of passage body is restricted for this edition, so only attribution link is shared.`
        : `${citation}\n\n[권리 안내] 이 판본은 원문 본문 공유가 제한되어 출처 링크만 공유합니다.`,
      textIncluded: false,
    };
  }

  return {
    title: `${workTitle} - ${sourceRef}`,
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
  appLanguage?: AppLanguage;
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
