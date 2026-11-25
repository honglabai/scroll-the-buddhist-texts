import { canProcessWithAI, normalizeNfc } from '../domain/readingRules';
import type {
  AIStudyRequest,
  AIStudyResponse,
  Annotation,
  RightsManifestEntry,
  Segment,
  SegmentText,
} from '../domain/types';

export const MAX_AI_QUESTION_LENGTH = 300;
export const MAX_AI_REQUESTS_PER_MINUTE = 10;
export const DAILY_AI_COST_CAP_KRW = 100;

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now/i,
  /새\s*경전.*만들어/i,
  /원문을\s*창작/i,
  /api\s*key/i,
];

export interface CorpusDocument {
  segment: Segment;
  segmentText: SegmentText;
  rights: RightsManifestEntry;
  annotations: Annotation[];
}

export function detectPromptInjection(question: string | undefined): boolean {
  if (!question) return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(question));
}

export function validateAIResponseGrounding(
  response: AIStudyResponse,
  allowedCorpus: Map<string, CorpusDocument>
): { valid: boolean; reason?: string } {
  if (!response.generatedByAI) {
    return { valid: false, reason: 'AI 생성 표시가 누락되었습니다.' };
  }
  if (!response.citations || response.citations.length === 0) {
    return { valid: false, reason: '인용 출처가 없는 AI 응답은 차단됩니다.' };
  }

  for (const cite of response.citations) {
    const key = `${cite.segmentId}::${cite.editionId}`;
    const doc = allowedCorpus.get(key);
    if (!doc) {
      return { valid: false, reason: `존재하지 않거나 AI 처리 권한이 없는 인용(${key})입니다.` };
    }
    if (!canProcessWithAI(doc.rights)) {
      return { valid: false, reason: `권리상 AI 처리가 금지된 판본(${cite.editionId})입니다.` };
    }
    const normalizedText = normalizeNfc(doc.segmentText.text);
    const normalizedExcerpt = normalizeNfc(cite.excerpt);
    if (!normalizedExcerpt || !normalizedText.includes(normalizedExcerpt)) {
      return { valid: false, reason: `인용 발췌문이 원문 근거와 일치하지 않습니다(${cite.segmentId}).` };
    }
  }

  return { valid: true };
}

export class AIStudyService {
  private readonly cache = new Map<string, AIStudyResponse>();
  private requestTimestamps: number[] = [];
  private dailySpentKrw = 0;
  private readonly corpusVersion = '1.0.0-synthetic';

  async query(params: {
    request: AIStudyRequest;
    corpus: CorpusDocument[];
  }): Promise<{ ok: true; data: AIStudyResponse } | { ok: false; error: string }> {
    const { request, corpus } = params;

    // 1. Input length & prompt injection defense
    if (request.question && request.question.length > MAX_AI_QUESTION_LENGTH) {
      return {
        ok: false,
        error: `질문 길이는 ${MAX_AI_QUESTION_LENGTH}자를 초과할 수 없습니다.`,
      };
    }
    if (detectPromptInjection(request.question)) {
      return {
        ok: false,
        error: '허용되지 않는 질의 패턴이 감지되었습니다. 경전 구절의 의미나 맥락에 대해 질문해 주세요.',
      };
    }

    // 2. Rate limit & cost cap
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((ts) => now - ts < 60_000);
    if (this.requestTimestamps.length >= MAX_AI_REQUESTS_PER_MINUTE) {
      return {
        ok: false,
        error: '요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.',
      };
    }
    if (this.dailySpentKrw >= DAILY_AI_COST_CAP_KRW) {
      return {
        ok: false,
        error: '일일 AI 탐색 상한에 도달했습니다. 기본 검수 해설과 원문 읽기는 계속 이용하실 수 있습니다.',
      };
    }

    // 3. Build AI-approved corpus map (strictly excluding non-AI-approved editions)
    const allowedCorpus = new Map<string, CorpusDocument>();
    for (const doc of corpus) {
      if (canProcessWithAI(doc.rights) && doc.segmentText.reviewStatus === 'approved') {
        allowedCorpus.set(`${doc.segment.id}::${doc.segmentText.editionId}`, doc);
      }
    }

    const targetKey = `${request.segmentId}::${request.editionId}`;
    const targetDoc = allowedCorpus.get(targetKey);
    if (!targetDoc) {
      return {
        ok: false,
        error: '이 판본은 AI 처리 권한이 없거나 승인된 근거 데이터가 부족합니다.',
      };
    }

    // 4. Cache lookup
    const cacheKey = `${this.corpusVersion}::${targetKey}::${request.mode}::${request.question ?? ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ok: true, data: cached };
    }

    this.requestTimestamps.push(now);
    this.dailySpentKrw += 2;

    // 5. Gateway call or development mock grounded strictly in targetDoc
    const gatewayUrl = process.env.EXPO_PUBLIC_AI_GATEWAY_URL;
    let response: AIStudyResponse;

    if (gatewayUrl) {
      try {
        const res = await fetch(gatewayUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segmentId: request.segmentId,
            editionId: request.editionId,
            mode: request.mode,
            question: request.question,
          }),
        });
        if (!res.ok) {
          return { ok: false, error: 'AI 서버 응답 오류가 발생했습니다. 기본 해설을 이용해 주세요.' };
        }
        response = (await res.json()) as AIStudyResponse;
      } catch {
        return { ok: false, error: '오프라인 상태이거나 AI 서버에 연결할 수 없습니다.' };
      }
    } else {
      response = this.buildGroundedDevMock(request, targetDoc);
    }

    // 6. Strict output grounding & citation validation
    const verification = validateAIResponseGrounding(response, allowedCorpus);
    if (!verification.valid) {
      return {
        ok: false,
        error: `AI 응답 검증 실패: ${verification.reason}`,
      };
    }

    this.cache.set(cacheKey, response);
    return { ok: true, data: response };
  }

  private buildGroundedDevMock(request: AIStudyRequest, doc: CorpusDocument): AIStudyResponse {
    const approvedAnns = doc.annotations.filter((a) => a.reviewStatus === 'approved');
    const easy = approvedAnns.find((a) => a.kind === 'easy_explanation')?.body;
    const context = approvedAnns.find((a) => a.kind === 'context')?.body;
    const term = approvedAnns.find((a) => a.kind === 'original_term')?.body;
    const practice = approvedAnns.find((a) => a.kind === 'daily_practice')?.body;

    const excerpt = doc.segmentText.text.slice(0, Math.min(36, doc.segmentText.text.length));

    return {
      summary:
        request.question && request.question.trim().length > 0
          ? `[개발용 모의 AI 응답] 질문("${request.question.trim()}")에 대해 '${doc.segment.sourceRef}' 본문을 근거로 살펴보면: ${easy ?? doc.segmentText.text}`
          : `[개발용 모의 AI 응답] ${easy ?? doc.segmentText.text}`,
      context:
        context ??
        `${doc.segment.sourceRef}의 문맥을 중심으로 읽으며, 특정 종파의 단일 해석으로 단정하지 않고 원문 맥락을 참고합니다.`,
      terms: term
        ? [{ term: '원어 참고', explanation: term }]
        : [{ term: '판본 기준', explanation: `${doc.rights.translator} (${doc.rights.license})` }],
      practicalReflection:
        practice ?? '오늘 하루 이 구절의 핵심 문장을 마음속에 한 번 떠올려 보시기 바랍니다.',
      citations: [
        {
          segmentId: doc.segment.id,
          editionId: doc.segmentText.editionId,
          sourceRef: doc.segment.sourceRef,
          excerpt,
        },
      ],
      uncertainty:
        '이 해설은 승인된 판본 근거에 기반한 AI 보조 설명이며, 경전 원문 자체가 아닙니다. 전통별 해석 차이가 있을 수 있습니다.',
      isMocked: true,
      generatedByAI: true,
    };
  }
}
