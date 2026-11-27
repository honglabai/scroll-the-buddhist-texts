import fs from 'node:fs';
import path from 'node:path';
import { normalizeNfc } from '../src/domain/readingRules';
import type {
  Annotation,
  ContentPack,
  Edition,
  PlanItem,
  ReadingPlan,
  RightsManifestEntry,
  Section,
  Segment,
  SegmentText,
  Work,
} from '../src/domain/types';

export interface BulgyodaejeonCardRecord {
  id: string;
  part_id: number;
  printed_start: number | null;
  printed_end: number | null;
  source_ko: string;
  source_en: string;
  speaker_ko: string;
  speaker_en: string;
  topics: string;
  normalized_ocr: string;
  app_paraphrase: string;
  translation_ko: string;
  app_paraphrase_en: string;
  translation_en: string;
}

const BD_PARTS: Record<number, { title: string; titleEn: string; sourceRef: string }> = {
  1: { title: '제1품 서품', titleEn: 'Part 1 · Preface', sourceRef: '제1품 서품 (1~15쪽)' },
  2: { title: '제2품 교리강령품', titleEn: 'Part 2 · Core Doctrine', sourceRef: '제2품 교리강령품 (16~55쪽)' },
  3: { title: '제3품 불타품', titleEn: 'Part 3 · The Buddha', sourceRef: '제3품 불타품 (56~122쪽)' },
  4: { title: '제4품 신앙품', titleEn: 'Part 4 · Faith & Resolve', sourceRef: '제4품 신앙품 (123~203쪽)' },
  5: { title: '제5품 업연품', titleEn: 'Part 5 · Karma & Conditions', sourceRef: '제5품 업연품 (204~302쪽)' },
  6: { title: '제6품 자치품', titleEn: 'Part 6 · Self-Cultivation', sourceRef: '제6품 자치품 (303~574쪽)' },
  7: { title: '제7품 대치품', titleEn: 'Part 7 · Remedies & Ethics', sourceRef: '제7품 대치품 (575~758쪽)' },
  8: { title: '제8품 포교품', titleEn: 'Part 8 · Sharing the Dharma', sourceRef: '제8품 포교품 (759~776쪽)' },
  9: { title: '제9품 구경품', titleEn: 'Part 9 · Ultimate Liberation', sourceRef: '제9품 구경품 (777~800쪽)' },
};

function formatPrintedRange(
  startPrinted: number | null,
  endPrinted: number | null
): { ko: string; en: string } {
  const s = startPrinted ?? 1;
  const e = endPrinted ?? s;
  if (s === e) {
    return { ko: `${s}쪽`, en: `p. ${s}` };
  }
  return { ko: `${s}~${e}쪽`, en: `pp. ${s}–${e}` };
}

function main() {
  const cardsPath = path.resolve(process.cwd(), 'assets/content/bulgyodaejeon-cards.json');
  const packPath = path.resolve(process.cwd(), 'assets/content/open-scriptures.json');

  const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf-8')) as BulgyodaejeonCardRecord[];
  const existing = JSON.parse(fs.readFileSync(packPath, 'utf-8')) as ContentPack;

  const WORK_ID = 'work-bulgyodaejeon';
  const ED_KO = 'ed-bulgyodaejeon-ko';
  const ED_EN = 'ed-bulgyodaejeon-en';
  const ED_LZH = 'ed-bulgyodaejeon-lzh';

  const work: Work = {
    id: WORK_ID,
    tradition: 'korean_treatise',
    type: 'treatise',
    title: normalizeNfc('불교대전 (만해 한용운 · 1914)'),
    titleEn: 'Bulgyodaejeon · Grand Buddhist Canon (1914)',
    subtitle: normalizeNfc(`만해 한용운 편찬 · 전 9품 ${cards.length}선`),
    subtitleEn: `Compiled by Manhae Han Yong-un · ${cards.length} Essential Passages`,
    description: normalizeNfc(
      `1914년 만해 한용운 선생이 경·율·논 대장경에서 핵심 가르침을 가려 엮은 『불교대전』 제1품 서품부터 제9품 구경품까지, 1914년 초판 원문을 바탕으로 독자 번역·정리한 ${cards.length}개 말씀 카드입니다.`
    ),
    descriptionEn: `Compiled in 1914 by Master Manhae Han Yong-un across all nine parts of Bulgyodaejeon. Includes ${cards.length} passages separating concise card quotes, faithful modern translations, 1914 source text, speaker notes, and original page citations.`,
    totalSegments: cards.length,
  };

  const editions: Edition[] = [
    {
      id: ED_KO,
      workId: WORK_ID,
      lang: 'ko',
      label: normalizeNfc('불교대전 현대어 · 짧은 말씀 (1914 원문 기반 초안)'),
      labelEn: 'Bulgyodaejeon Korean Translation Draft',
      translator: normalizeNfc('만해 한용운 원편(1914) · 불교대전 DB v1.0 독자 현대어 초안'),
      translatorEn: 'Compiled by Han Yong-un (1914) · Independent Modern Korean Draft',
      licenseId: 'PD-old-100',
      sourceRevision: 'bd-1914-v1.1',
      isOriginal: false,
    },
    {
      id: ED_EN,
      workId: WORK_ID,
      lang: 'en',
      label: `Bulgyodaejeon English Edition (${cards.length} Passages)`,
      labelEn: `Bulgyodaejeon English Edition (${cards.length} Passages)`,
      translator: 'Compiled by Han Yong-un (1914) · Bulgyodaejeon DB English Draft',
      translatorEn: 'Compiled by Han Yong-un (1914) · English Rendering',
      licenseId: 'PD-old-100',
      sourceRevision: 'bd-1914-v1.1',
      isOriginal: false,
    },
    {
      id: ED_LZH,
      workId: WORK_ID,
      lang: 'zh',
      label: normalizeNfc('1914년 범어사 초판 원문 (국한문)'),
      labelEn: '1914 Original Classical Text',
      translator: normalizeNfc('만해 한용운 편찬 (1914)'),
      translatorEn: 'Manhae Han Yong-un (1914)',
      licenseId: 'PD-old-100',
      sourceRevision: 'bd-1914-kmo000012117',
      isOriginal: true,
    },
  ];

  const rightsEntries: RightsManifestEntry[] = editions.map((ed) => ({
    workId: WORK_ID,
    editionId: ed.id,
    translator: ed.translator,
    sourceUrl: 'https://nl.go.kr/aiocr/project/conversion/7902?page.page=28&pass=true',
    sourceRevision: ed.sourceRevision,
    license: ed.isOriginal ? 'PD-old-100' : 'PD-old-100 / Project-Original-Draft',
    permissionEvidence: normalizeNfc(
      '1914년 범어사 발행 한용운(1879-1944) 원편 『불교대전』 사후 70년 이상 경과 퍼블릭 도메인 원문 및 현대 상업 출판 번역 미사용 자체 DB 초안(내부·앱 시연 통합본)'
    ),
    allowRedistribution: true,
    allowCommercial: false,
    allowAdaptation: true,
    allowShare: true,
    allowTTS: !ed.isOriginal,
    allowAIProcessing: true,
    reviewedAt: '2026-11-27',
    reviewer: 'honglabai (Bulgyodaejeon_DB_v1)',
    status: 'approved',
    isSyntheticTestFixture: false,
  }));

  const usedParts = Array.from(new Set(cards.map((c) => c.part_id))).sort((a, b) => a - b);
  const sections: Section[] = usedParts.map((partId) => {
    const meta = BD_PARTS[partId] ?? {
      title: `제${partId}품`,
      titleEn: `Part ${partId}`,
      sourceRef: `제${partId}품`,
    };
    return {
      id: `sec-bd-part-${partId}`,
      workId: WORK_ID,
      parentId: null,
      ordinal: partId,
      title: normalizeNfc(meta.title),
      titleEn: meta.titleEn,
      sourceRef: normalizeNfc(meta.sourceRef),
    };
  });

  const segments: Segment[] = [];
  const segmentTexts: SegmentText[] = [];
  const annotations: Annotation[] = [];

  cards.forEach((row, index) => {
    const segId = `bd-${String(index + 1).padStart(2, '0')}`;
    const pageInfo = formatPrintedRange(row.printed_start, row.printed_end);
    const partMeta = BD_PARTS[row.part_id] ?? { title: `제${row.part_id}품`, titleEn: `Part ${row.part_id}` };
    const srcKo = row.source_ko.trim();
    const srcEn = row.source_en.trim();
    const topicsArr = row.topics
      .split(',')
      .map((t) => normalizeNfc(t.trim()))
      .filter(Boolean);
    if (!topicsArr.includes('불교대전')) topicsArr.push('불교대전');

    segments.push({
      id: segId,
      workId: WORK_ID,
      sectionId: `sec-bd-part-${row.part_id}`,
      ordinal: index + 1,
      sourceRef: normalizeNfc(`${srcKo} · 불교대전 ${pageInfo.ko}`),
      sourceRefEn: `${srcEn} · Bulgyodaejeon ${pageInfo.en}`,
      topics: topicsArr,
    });

    segmentTexts.push(
      {
        segmentId: segId,
        editionId: ED_KO,
        text: normalizeNfc(row.translation_ko.trim()),
        paraphrase: normalizeNfc(row.app_paraphrase.trim()),
        reviewStatus: 'approved',
      },
      {
        segmentId: segId,
        editionId: ED_EN,
        text: normalizeNfc(row.translation_en.trim()),
        paraphrase: normalizeNfc(row.app_paraphrase_en.trim()),
        reviewStatus: 'approved',
      },
      {
        segmentId: segId,
        editionId: ED_LZH,
        text: normalizeNfc(row.normalized_ocr.trim()),
        reviewStatus: 'approved',
      }
    );

    annotations.push(
      {
        id: `ann-${segId}-easy`,
        segmentId: segId,
        editionId: ED_KO,
        kind: 'easy_explanation',
        title: normalizeNfc('말씀의 요지와 현대어 전문'),
        titleEn: 'Core Teaching & Modern Translation',
        body: normalizeNfc(
          `[짧은 말씀] ${row.app_paraphrase.trim()}\n\n[현대어 충실 번역 초안] ${row.translation_ko.trim()}`
        ),
        bodyEn: `[Short Teaching] ${row.app_paraphrase_en.trim()}\n\n[Full Passage] ${row.translation_en.trim()}`,
        source: normalizeNfc(`${partMeta.title} · ${srcKo} · 불교대전 ${pageInfo.ko}`),
        sourceEn: `${partMeta.titleEn} · ${srcEn} · Bulgyodaejeon ${pageInfo.en}`,
        uncertaintyNote: normalizeNfc(
          '1914년 한용운 편찬 원문을 바탕으로 작성한 현대어 초안(전문가 감수 전 · 현대 출판 번역 미사용)입니다.'
        ),
        uncertaintyNoteEn:
          'Draft prepared directly from the 1914 Han Yong-un edition without copying copyrighted modern translations.',
        reviewStatus: 'approved',
      },
      {
        id: `ann-${segId}-context`,
        segmentId: segId,
        editionId: ED_KO,
        kind: 'context',
        title: normalizeNfc('문헌 출처 · 화자 · 원문 대조 정보'),
        titleEn: 'Source Citation, Speaker & Textual Note',
        body: normalizeNfc(
          `• 편제: ${partMeta.title}\n• 인용 문헌: ${srcKo}\n• 화자 구분: ${row.speaker_ko}\n• 원본 위치: 불교대전 인쇄면 ${pageInfo.ko} (DB ID: ${row.id})\n• 원칙 안내: 논서·보살·제자 설명과 부처님 말씀을 임의로 합치지 않고 분리 표기했습니다.`
        ),
        bodyEn: `• Division: ${partMeta.titleEn}\n• Cited Text: ${srcEn}\n• Speaker Note: ${row.speaker_en}\n• Original Page: Bulgyodaejeon ${pageInfo.en} (ID: ${row.id})\n• Separation Principle: Commentary, bodhisattva, and sūtra speakers are preserved without conflation.`,
        source: normalizeNfc(`불교대전 1914 DB (${row.id})`),
        sourceEn: `Bulgyodaejeon 1914 DB (${row.id})`,
        reviewStatus: 'approved',
      }
    );
  });

  const planId = 'plan-bd-30';
  const dailyTarget = Math.max(1, Math.ceil(segments.length / 30));
  const bdPlan: ReadingPlan = {
    id: planId,
    title: normalizeNfc(`30일 불교대전 ${segments.length}선 사유`),
    titleEn: `30-Day Bulgyodaejeon (${segments.length} Passages)`,
    description: normalizeNfc(
      `만해 한용운 선생의 『불교대전』 제1품~제9품 핵심 말씀 ${segments.length}편을 30일간 하루 ${dailyTarget}편씩 스와이프하며 음미하는 계획입니다.`
    ),
    descriptionEn: `Swipe through ${segments.length} passages across all nine parts of Master Han Yong-un’s Bulgyodaejeon at ${dailyTarget} teachings per day.`,
    workId: WORK_ID,
    durationDays: 30,
    dailyTarget,
  };

  const bdPlanItems: PlanItem[] = [];
  for (let dayIdx = 0; dayIdx < 30; dayIdx++) {
    const daySegs = segments
      .slice(dayIdx * dailyTarget, (dayIdx + 1) * dailyTarget)
      .map((s) => s.id);
    if (daySegs.length > 0) {
      bdPlanItems.push({
        id: `pi-${planId}-${dayIdx + 1}`,
        planId,
        dayNumber: dayIdx + 1,
        segmentIds: daySegs,
      });
    }
  }

  const prevWorks = existing.works.filter((w) => w.id !== WORK_ID);
  const prevEditions = existing.editions.filter((e) => e.workId !== WORK_ID);
  const prevRights = existing.manifest.entries.filter((e) => e.workId !== WORK_ID);
  const prevSections = existing.sections.filter((s) => s.workId !== WORK_ID);
  const prevSegments = existing.segments.filter((s) => s.workId !== WORK_ID);
  const prevBdSegIds = new Set(
    existing.segments.filter((s) => s.workId === WORK_ID).map((s) => s.id)
  );
  const newSegIds = new Set(segments.map((s) => s.id));
  const prevTexts = existing.segmentTexts.filter(
    (t) => !prevBdSegIds.has(t.segmentId) && !newSegIds.has(t.segmentId)
  );
  const prevAnns = existing.annotations.filter(
    (a) => !prevBdSegIds.has(a.segmentId) && !newSegIds.has(a.segmentId)
  );
  const prevPlans = existing.plans.filter((p) => p.id !== planId);
  const prevPlanItems = existing.planItems.filter((pi) => pi.planId !== planId);

  const nextPack: ContentPack = {
    manifest: {
      ...existing.manifest,
      version: existing.manifest.version ?? '1.0.0',
      generatedAt: '2026-11-27',
      entries: [...rightsEntries, ...prevRights],
    } as ContentPack['manifest'],
    works: [work, ...prevWorks],
    editions: [...editions, ...prevEditions],
    sections: [...sections, ...prevSections],
    segments: [...segments, ...prevSegments],
    segmentTexts: [...segmentTexts, ...prevTexts],
    alignments: existing.alignments,
    annotations: [...annotations, ...prevAnns],
    relatedLinks: existing.relatedLinks,
    plans: [bdPlan, ...prevPlans],
    planItems: [...bdPlanItems, ...prevPlanItems],
  };

  fs.writeFileSync(packPath, JSON.stringify(nextPack, null, 2), 'utf-8');
  console.log(
    `Imported Bulgyodaejeon (${segments.length} passages across ${sections.length} parts). Total works=${nextPack.works.length}, editions=${nextPack.editions.length}, segments=${nextPack.segments.length}, plans=${nextPack.plans.length}.`
  );
}

main();
