import * as Speech from 'expo-speech';
import { canReadWithTTS } from '../domain/readingRules';
import type { RightsManifestEntry } from '../domain/types';

export interface TtsSpeakResult {
  started: boolean;
  reason?: string;
}

export async function speakSegment(params: {
  text: string;
  lang: 'ko' | 'pi' | 'zh' | 'en';
  rate: number;
  voiceId?: string;
  rights: RightsManifestEntry | undefined;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (err: Error) => void;
}): Promise<TtsSpeakResult> {
  if (!canReadWithTTS(params.rights)) {
    return {
      started: false,
      reason: '이 판본은 권리 조건에 따라 음성 낭독(TTS)이 지원되지 않습니다.',
    };
  }

  const languageMap: Record<string, string> = {
    ko: 'ko-KR',
    en: 'en-US',
    zh: 'zh-CN',
    pi: 'en-US',
  };

  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const targetLang = languageMap[params.lang] ?? 'ko-KR';
    const hasVoice =
      voices.length === 0 ||
      voices.some((v) => v.language.toLowerCase().startsWith(targetLang.slice(0, 2).toLowerCase()));

    if (!hasVoice) {
      return {
        started: false,
        reason: `기기에 ${targetLang} 음성 데이터가 설치되어 있지 않습니다.`,
      };
    }

    await Speech.stop();
    Speech.speak(params.text, {
      language: targetLang,
      rate: Math.min(1.6, Math.max(0.5, params.rate)),
      voice: params.voiceId,
      onDone: params.onDone,
      onStopped: params.onStopped,
      onError: params.onError,
    });
    return { started: true };
  } catch (err) {
    return {
      started: false,
      reason: err instanceof Error ? err.message : '음성 재생을 시작할 수 없습니다.',
    };
  }
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Speech.stop();
  } catch {
    // Ignore stop errors on unsupported platforms
  }
}
