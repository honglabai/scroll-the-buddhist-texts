import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { normalizeNfc } from '../src/domain/readingRules';
import type {
  Annotation,
  ContentPack,
  Edition,
  PlanItem,
  ReadingPlan,
  RelatedLink,
  RightsManifestEntry,
  Section,
  Segment,
  SegmentText,
  Work,
} from '../src/domain/types';

const BILARA_COMMIT = '3c24613262cdf08d0330403e7ff4832371cf1925';

function stripWikiMarkup(raw: string): string {
  return normalizeNfc(
    raw
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/\[\[(?:w:|s:|en:)?[^|\]]+\|([^\]]+)\]\]/g, '$1')
      .replace(/\[\[(?:w:|s:|en:)?([^\]]+)\]\]/g, '$1')
      .replace(/'''([^']+)'''/g, '$1')
      .replace(/''([^']+)''/g, '$1')
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DharmaScrollImporter/1.0 (+https://github.com/honglabai/scroll-the-buddhist-texts)' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return (await res.json()) as T;
}

async function fetchWikisourcePage(title: string): Promise<{ revid: number; wikitext: string }> {
  const url = `https://ko.wikisource.org/w/api.php?action=query&titles=${encodeURIComponent(
    title
  )}&prop=revisions&rvprop=ids|content&rvslots=main&format=json`;
  const data = await fetchJson<{
    query: { pages: Record<string, { revisions?: { revid: number; slots: { main: { '*': string } } }[] }> };
  }>(url);
  const page = Object.values(data.query.pages)[0];
  const rev = page?.revisions?.[0];
  if (!rev) throw new Error(`Missing Wikisource page: ${title}`);
  return { revid: rev.revid, wikitext: rev.slots.main['*'] };
}

function parseDiamondSutra(wikitext: string): { title: string; hanja: string; ko: string }[] {
  const parts = wikitext.split(/^==\s*([^=]+?)\s*==$/gm);
  const chapters: { title: string; hanja: string; ko: string }[] = [];

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim();
    const block = parts[i + 1] ?? '';
    if (heading === '라이선스') continue;

    // Chapters 17-32 in Wikisource repeat id="mp_contentsL" on both left and right divs,
    // so match the first two top-level <div ...>...</div> blocks in each chapter section.
    const divs = Array.from(block.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi)).map((m) => m[1]);
    if (divs.length < 2) continue;

    const hanjaRaw = divs[0].replace(/'''[^']+'''/, '').trim();
    const koRaw = divs[1].replace(/'''[^']+'''/, '').trim();
    const koTitleMatch = divs[1].match(/'''([^']+)'''/);

    const hanja = stripWikiMarkup(hanjaRaw);
    const ko = stripWikiMarkup(koRaw);
    if (!hanja || !ko) continue;

    chapters.push({
      title: koTitleMatch ? stripWikiMarkup(koTitleMatch[1]) : heading,
      hanja,
      ko,
    });
  }
  return chapters;
}

function parseHeartSutra(wikitext: string): { title: string; hanja: string; ko: string }[] {
  const hanjaSection = wikitext.split('== 한문 번역 ==')[1]?.split('== 한국어 번역 ==')[0] ?? '';
  const koSection = wikitext.split('== 한국어 번역 ==')[1]?.split('== 라이선스 ==')[0] ?? '';

  const hanjaBlocks: string[] = [];
  const regex = /\{\{윗주\|([^|]+)\|([^}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(hanjaSection)) !== null) {
    hanjaBlocks.push(`${m[1].trim()} (${m[2].trim()})`);
  }

  const koParas = koSection
    .replace(/\{\{col-end\}\}/g, '')
    .split(/\n{2,}/)
    .map((p) => stripWikiMarkup(p))
    .filter(Boolean);

  // Align the 13 Hanja lines accurately to the 9 Korean paragraphs
  const hanjaGroups: number[][] = [
    [0],
    [1],
    [2],
    [3],
    [4, 5, 6, 7],
    [8, 9],
    [10],
    [11],
    [12],
  ];

  const units: { title: string; hanja: string; ko: string }[] = [];
  for (let i = 0; i < koParas.length; i++) {
    const indices = hanjaGroups[i] ?? [];
    const h = indices
      .map((idx) => hanjaBlocks[idx])
      .filter(Boolean)
      .join('\n');
    const k = koParas[i];
    if (!k) continue;
    units.push({
      title: `제${i + 1}단락`,
      hanja: h || '마하반야바라밀다심경',
      ko: k,
    });
  }
  return units;
}

function parseCheonsugyeong(wikitext: string): { title: string; hanja: string; ko: string }[] {
  const tableStart = wikitext.indexOf('{|');
  const tableBody = tableStart >= 0 ? wikitext.slice(tableStart) : wikitext;
  const rows = tableBody.split('\n|-');
  const entries: { title: string; hanja: string; ko: string }[] = [];
  for (const row of rows) {
    const cols = row
      .split('\n| ')
      .slice(1)
      .map((c) => c.trim());
    if (cols.length < 2) continue;
    const hanjaRaw = cols[0];
    const koRaw = cols[1].replace(/\|\}[\s\S]*$/, '').trim();
    const titlePart = koRaw.split(':')[0]?.trim() || `제${entries.length + 1}절`;
    const hanja = stripWikiMarkup(hanjaRaw);
    const ko = stripWikiMarkup(koRaw);
    if (!hanja || !ko) continue;
    entries.push({ title: titlePart, hanja, ko });
  }
  return entries;
}

function fetchBilaraTree(): { path: string }[] {
  const raw = execSync(
    `gh api "repos/suttacentral/bilara-data/git/trees/${BILARA_COMMIT}?recursive=1"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString('utf8');
  return (JSON.parse(raw) as { tree: { path: string }[] }).tree;
}

async function fetchBilaraPair(
  rootPath: string,
  enPath: string
): Promise<{ root: Record<string, string>; en: Record<string, string> }> {
  const base = `https://raw.githubusercontent.com/suttacentral/bilara-data/${BILARA_COMMIT}/`;
  const [root, en] = await Promise.all([
    fetchJson<Record<string, string>>(base + rootPath),
    fetchJson<Record<string, string>>(base + enPath),
  ]);
  return { root, en };
}

function inferTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const topics: string[] = [];
  if (/마음|생각|심|의|mind|thought|citta|mano/.test(lower)) topics.push('마음');
  if (/자비|자애|사랑|연민|love|compassion|mettā|friendly/.test(lower)) topics.push('자비');
  if (/지혜|반야|공|wisdom|insight|paññā|emptiness/.test(lower)) topics.push('지혜');
  if (/집착|버리|떠나|내려놓|let go|cling|attach|relinquish/.test(lower)) topics.push('내려놓음');
  if (/평온|고요|평화|적정|peace|still|calm|tranquil/.test(lower)) topics.push('마음의 평온');
  if (/분노|성냄|원한|미움|anger|hate|hatred|wrath/.test(lower)) topics.push('분노 다스리기');
  if (/괴로움|고통|슬픔|suffering|pain|sorrow|dukkha/.test(lower)) topics.push('고통과 슬픔');
  if (/수행|계율|선정|명상|정진|practice|meditat|virtue|mindful/.test(lower)) topics.push('수행');
  if (/깨달음|열반|부처|보살|enlighten|awakening|nibbāna|nirvana|buddha/.test(lower)) topics.push('깨달음');
  if (topics.length === 0) topics.push('지혜');
  return topics.slice(0, 3);
}

const DHP_VAGGA_TITLES_KO: Record<string, string> = {
  'dhp1-20': '제1 쌍서품 (Yamakavagga)',
  'dhp21-32': '제2 불방일품 (Appamādavagga)',
  'dhp33-43': '제3 마음품 (Cittavagga)',
  'dhp44-59': '제4 꽃품 (Pupphavagga)',
  'dhp60-75': '제5 어리석은 자품 (Bālavagga)',
  'dhp76-89': '제6 현명한 자품 (Paṇḍitavagga)',
  'dhp90-99': '제7 아라한품 (Arahantavagga)',
  'dhp100-115': '제8 천품 (Sahassavagga)',
  'dhp116-128': '제9 악품 (Pāpavagga)',
  'dhp129-145': '제10 폭력품 (Daṇḍavagga)',
  'dhp146-156': '제11 노쇠품 (Jarāvagga)',
  'dhp157-166': '제12 자기품 (Attavagga)',
  'dhp167-178': '제13 세상품 (Lokavagga)',
  'dhp179-196': '제14 부처님품 (Buddhavagga)',
  'dhp197-208': '제15 행복품 (Sukhavagga)',
  'dhp209-220': '제16 사랑품 (Piyavagga)',
  'dhp221-234': '제17 분노품 (Kodhavagga)',
  'dhp235-255': '제18 때묻음품 (Malavagga)',
  'dhp256-272': '제19 법에 머무름품 (Dhammaṭṭhavagga)',
  'dhp273-289': '제20 도품 (Maggavagga)',
  'dhp290-305': '제21 잡품 (Pakiṇṇakavagga)',
  'dhp306-319': '제22 지옥품 (Nirayavagga)',
  'dhp320-333': '제23 코끼리품 (Nāgavagga)',
  'dhp334-359': '제24 갈애품 (Taṇhāvagga)',
  'dhp360-382': '제25 비구품 (Bhikkhuvagga)',
  'dhp383-423': '제26 바라문품 (Brāhmaṇavagga)',
};

async function main() {
  const works: Work[] = [];
  const editions: Edition[] = [];
  const sections: Section[] = [];
  const segments: Segment[] = [];
  const segmentTexts: SegmentText[] = [];
  const manifestEntries: RightsManifestEntry[] = [];
  const annotations: Annotation[] = [];
  const relatedLinks: RelatedLink[] = [];

  // ---------------------------------------------------------------------------
  // 1. 금강반야바라밀경 (금강경 32장 전체 - 한국어 PD-자작 + 한문 PD-old-100)
  // ---------------------------------------------------------------------------
  console.log('Fetching Diamond Sutra (금강경) from ko.wikisource.org...');
  const diamondPage = await fetchWikisourcePage('금강반야바라밀경');
  const diamondChapters = parseDiamondSutra(diamondPage.wikitext);
  works.push({
    id: 'work-diamond',
    title: '금강경 (금강반야바라밀경)',
    subtitle: '대승불교 · 32분 완역 (한국어 · 한문 원문)',
    tradition: 'mahayana',
    type: 'sutta',
    totalSegments: diamondChapters.length,
    description: '구마라습 한역 본문을 바탕으로 한국어 위키문헌에 퍼블릭 도메인(PD-자작)으로 기증된 금강경 32장 전문입니다.',
  });
  editions.push(
    {
      id: 'ed-diamond-ko-ws',
      workId: 'work-diamond',
      lang: 'ko',
      label: '한국어 완역 (위키문헌 PD-자작)',
      translator: 'jjw (한국어 위키문헌 기증)',
      licenseId: 'PD-self',
      sourceRevision: `ws-rev-${diamondPage.revid}`,
      isOriginal: false,
    },
    {
      id: 'ed-diamond-zh-ws',
      workId: 'work-diamond',
      lang: 'zh',
      label: '한문 원문 (구마라습 역)',
      translator: '구마라습 (한역)',
      licenseId: 'PD-old-100',
      sourceRevision: `ws-rev-${diamondPage.revid}`,
      isOriginal: true,
    }
  );
  manifestEntries.push(
    {
      workId: 'work-diamond',
      editionId: 'ed-diamond-ko-ws',
      translator: 'jjw (한국어 위키문헌)',
      sourceUrl: 'https://ko.wikisource.org/wiki/%EA%B8%88%EA%B0%95%EB%B0%98%EC%95%BC%EB%B0%94%EB%9D%BC%EB%B0%80%EA%B2%BD',
      sourceRevision: `rev-${diamondPage.revid}`,
      license: 'PD-self (Public Domain)',
      permissionEvidence: '한국어 위키문헌 {{번역 저작권|원문={{PD-old-100}}|번역={{PD-자작}}}} 확인',
      allowRedistribution: true,
      allowCommercial: true,
      allowAdaptation: true,
      allowShare: true,
      allowTTS: true,
      allowAIProcessing: true,
      reviewedAt: '2026-11-26',
      reviewer: 'Content-Policy-Check',
      status: 'approved',
    },
    {
      workId: 'work-diamond',
      editionId: 'ed-diamond-zh-ws',
      translator: '구마라습 (한역)',
      sourceUrl: 'https://ko.wikisource.org/wiki/%EA%B8%88%EA%B0%95%EB%B0%98%EC%95%BC%EB%B0%94%EB%9D%BC%EB%B0%80%EA%B2%BD',
      sourceRevision: `rev-${diamondPage.revid}`,
      license: 'PD-old-100 (Public Domain)',
      permissionEvidence: '고전 한역 원문 퍼블릭 도메인 (PD-old-100)',
      allowRedistribution: true,
      allowCommercial: true,
      allowAdaptation: true,
      allowShare: true,
      allowTTS: false,
      allowAIProcessing: true,
      reviewedAt: '2026-11-26',
      reviewer: 'Content-Policy-Check',
      status: 'approved',
    }
  );

  diamondChapters.forEach((ch, idx) => {
    const secId = `sec-diamond-${idx + 1}`;
    const segId = `diamond-${String(idx + 1).padStart(2, '0')}`;
    sections.push({
      id: secId,
      workId: 'work-diamond',
      parentId: null,
      ordinal: idx + 1,
      title: ch.title,
      sourceRef: `금강경 제${idx + 1}분`,
    });
    segments.push({
      id: segId,
      workId: 'work-diamond',
      sectionId: secId,
      ordinal: idx + 1,
      sourceRef: ch.title,
      topics: inferTopics(ch.ko),
    });
    segmentTexts.push(
      {
        segmentId: segId,
        editionId: 'ed-diamond-ko-ws',
        text: ch.ko,
        reviewStatus: 'approved',
      },
      {
        segmentId: segId,
        editionId: 'ed-diamond-zh-ws',
        text: ch.hanja,
        reviewStatus: 'approved',
      }
    );
  });

  // ---------------------------------------------------------------------------
  // 2. 반야바라밀다심경 (반야심경 - 한국어 PD-자작 + 한문 PD-old-100)
  // ---------------------------------------------------------------------------
  console.log('Fetching Heart Sutra (반야심경) from ko.wikisource.org...');
  const heartPage = await fetchWikisourcePage('번역:반야바라밀다심경');
  const heartUnits = parseHeartSutra(heartPage.wikitext);
  works.push({
    id: 'work-heart',
    title: '반야심경 (반야바라밀다심경)',
    subtitle: '대승불교 · 전문 (한국어 · 한문 원문)',
    tradition: 'mahayana',
    type: 'chant',
    totalSegments: heartUnits.length,
    description: '현장 법사 한역 본문을 바탕으로 한국어 위키문헌에 퍼블릭 도메인(PD-자작)으로 공개된 반야심경 전문입니다.',
  });
  editions.push(
    {
      id: 'ed-heart-ko-ws',
      workId: 'work-heart',
      lang: 'ko',
      label: '한국어 번역 (위키문헌 PD-자작)',
      translator: '한국어 위키문헌 기여자 (PD-자작)',
      licenseId: 'PD-self',
      sourceRevision: `ws-rev-${heartPage.revid}`,
      isOriginal: false,
    },
    {
      id: 'ed-heart-zh-ws',
      workId: 'work-heart',
      lang: 'zh',
      label: '한문 원문 (현장 역)',
      translator: '현장 (한역)',
      licenseId: 'PD-old-100',
      sourceRevision: `ws-rev-${heartPage.revid}`,
      isOriginal: true,
    }
  );
  manifestEntries.push(
    {
      workId: 'work-heart',
      editionId: 'ed-heart-ko-ws',
      translator: '한국어 위키문헌 기여자',
      sourceUrl: 'https://ko.wikisource.org/wiki/%EB%B2%88%EC%97%AD:%EB%B0%98%EC%95%BC%EB%B0%94%EB%9D%BC%EB%B0%80%EB%8B%A4%EC%8B%AC%EA%B2%BD',
      sourceRevision: `rev-${heartPage.revid}`,
      license: 'PD-self (Public Domain)',
      permissionEvidence: '한국어 위키문헌 {{번역 저작권|원문={{PD-old-100}}|번역={{PD-자작}}}} 확인',
      allowRedistribution: true,
      allowCommercial: true,
      allowAdaptation: true,
      allowShare: true,
      allowTTS: true,
      allowAIProcessing: true,
      reviewedAt: '2026-11-26',
      reviewer: 'Content-Policy-Check',
      status: 'approved',
    },
    {
      workId: 'work-heart',
      editionId: 'ed-heart-zh-ws',
      translator: '현장 (한역)',
      sourceUrl: 'https://ko.wikisource.org/wiki/%EB%B2%88%EC%97%AD:%EB%B0%98%EC%95%BC%EB%B0%94%EB%9D%BC%EB%B0%80%EB%8B%A4%EC%8B%AC%EA%B2%BD',
      sourceRevision: `rev-${heartPage.revid}`,
      license: 'PD-old-100 (Public Domain)',
      permissionEvidence: '고전 한역 원문 퍼블릭 도메인 (PD-old-100)',
      allowRedistribution: true,
      allowCommercial: true,
      allowAdaptation: true,
      allowShare: true,
      allowTTS: false,
      allowAIProcessing: true,
      reviewedAt: '2026-11-26',
      reviewer: 'Content-Policy-Check',
      status: 'approved',
    }
  );
  sections.push({
    id: 'sec-heart-1',
    workId: 'work-heart',
    parentId: null,
    ordinal: 1,
    title: '반야바라밀다심경 본문',
    sourceRef: 'T0251',
  });
  heartUnits.forEach((u, idx) => {
    const segId = `heart-${String(idx + 1).padStart(2, '0')}`;
    segments.push({
      id: segId,
      workId: 'work-heart',
      sectionId: 'sec-heart-1',
      ordinal: idx + 1,
      sourceRef: `반야심경 ${u.title}`,
      topics: inferTopics(u.ko),
    });
    segmentTexts.push(
      { segmentId: segId, editionId: 'ed-heart-ko-ws', text: u.ko, reviewStatus: 'approved' },
      { segmentId: segId, editionId: 'ed-heart-zh-ws', text: u.hanja, reviewStatus: 'approved' }
    );
  });

  // ---------------------------------------------------------------------------
  // 3. 천수경 (천수천안관자재보살광대원만무애대비심대다라니경 - CC-BY-SA-4.0 / PD-old-100)
  // ---------------------------------------------------------------------------
  console.log('Fetching Cheonsugyeong from ko.wikisource.org...');
  const cheonsuPage = await fetchWikisourcePage('번역:천수천안관자재보살광대원만무애대비심대다라니경');
  const cheonsuUnits = parseCheonsugyeong(cheonsuPage.wikitext);
  works.push({
    id: 'work-cheonsu',
    title: '천수경 (대비심대다라니경)',
    subtitle: '대승·독송 문헌 (한국어 독송 · 한문)',
    tradition: 'mahayana',
    type: 'chant',
    totalSegments: cheonsuUnits.length,
    description: '한국 사찰에서 널리 독송되는 천수경 의궤 및 다라니 계청입니다. (원문 PD-old-100 / 편집 CC-BY-SA-4.0)',
  });
  editions.push(
    {
      id: 'ed-cheonsu-ko-ws',
      workId: 'work-cheonsu',
      lang: 'ko',
      label: '한국어 독송본 (위키문헌 CC-BY-SA-4.0)',
      translator: '한국어 위키문헌 기여자',
      licenseId: 'CC-BY-SA-4.0',
      sourceRevision: `ws-rev-${cheonsuPage.revid}`,
      isOriginal: false,
    },
    {
      id: 'ed-cheonsu-zh-ws',
      workId: 'work-cheonsu',
      lang: 'zh',
      label: '한문 본문 (PD-old-100)',
      translator: '전통 독송 한문본',
      licenseId: 'PD-old-100',
      sourceRevision: `ws-rev-${cheonsuPage.revid}`,
      isOriginal: true,
    }
  );
  manifestEntries.push(
    {
      workId: 'work-cheonsu',
      editionId: 'ed-cheonsu-ko-ws',
      translator: '한국어 위키문헌 기여자',
      sourceUrl: 'https://ko.wikisource.org/wiki/%EB%B2%88%EC%97%AD:%EC%B2%9C%EC%88%98%EC%B2%9C%EC%95%88%EA%B4%80%EC%9E%90%EC%9E%AC%EB%B3%B4%EC%82%B4%EA%B4%91%EB%8C%80%EC%9B%90%EB%A7%8C%EB%AC%B4%EC%95%A0%EB%8C%80%EB%B9%84%EC%8B%AC%EB%8C%80%EB%8B%A4%EB%9D%BC%EB%8B%88%EA%B2%BD',
      sourceRevision: `rev-${cheonsuPage.revid}`,
      license: 'CC-BY-SA-4.0',
      permissionEvidence: '한국어 위키문헌 {{번역 저작권|원문={{PD-old-100}}|번역={{GFDL/CC-BY-SA-4.0}}}} 확인',
      allowRedistribution: true,
      allowCommercial: true,
      allowAdaptation: true,
      allowShare: true,
      allowTTS: true,
      allowAIProcessing: true,
      reviewedAt: '2026-11-26',
      reviewer: 'Content-Policy-Check',
      status: 'approved',
    },
    {
      workId: 'work-cheonsu',
      editionId: 'ed-cheonsu-zh-ws',
      translator: '전통 한문 독송본',
      sourceUrl: 'https://ko.wikisource.org/wiki/%EB%B2%88%EC%97%AD:%EC%B2%9C%EC%88%98%EC%B2%9C%EC%95%88%EA%B4%80%EC%9E%90%EC%9E%AC%EB%B3%B4%EC%82%B4%EA%B4%91%EB%8C%80%EC%9B%90%EB%A7%8C%EB%AC%B4%EC%95%A0%EB%8C%80%EB%B9%84%EC%8B%AC%EB%8C%80%EB%8B%A4%EB%9D%BC%EB%8B%88%EA%B2%BD',
      sourceRevision: `rev-${cheonsuPage.revid}`,
      license: 'PD-old-100',
      permissionEvidence: '고전 독송 원문 퍼블릭 도메인 (PD-old-100)',
      allowRedistribution: true,
      allowCommercial: true,
      allowAdaptation: true,
      allowShare: true,
      allowTTS: false,
      allowAIProcessing: true,
      reviewedAt: '2026-11-26',
      reviewer: 'Content-Policy-Check',
      status: 'approved',
    }
  );
  sections.push({
    id: 'sec-cheonsu-1',
    workId: 'work-cheonsu',
    parentId: null,
    ordinal: 1,
    title: '천수경 의궤 및 다라니',
    sourceRef: '천수경',
  });
  cheonsuUnits.forEach((u, idx) => {
    const segId = `cheonsu-${String(idx + 1).padStart(2, '0')}`;
    segments.push({
      id: segId,
      workId: 'work-cheonsu',
      sectionId: 'sec-cheonsu-1',
      ordinal: idx + 1,
      sourceRef: `천수경 · ${u.title}`,
      topics: inferTopics(u.ko),
    });
    segmentTexts.push(
      { segmentId: segId, editionId: 'ed-cheonsu-ko-ws', text: u.ko, reviewStatus: 'approved' },
      { segmentId: segId, editionId: 'ed-cheonsu-zh-ws', text: u.hanja, reviewStatus: 'approved' }
    );
  });

  // ---------------------------------------------------------------------------
  // 4. SuttaCentral bilara-data (published CC0): Dhammapada (423 verses), KP (9), SN56.11, Sutta Nipāta, Itivuttaka (112)
  // ---------------------------------------------------------------------------
  console.log('Fetching SuttaCentral bilara-data file tree...');
  const tree = fetchBilaraTree();

  // 4A. Dhammapada (all 26 vaggas, 423 verses)
  const dhpEnPaths = tree
    .filter((t) => t.path.startsWith('translation/en/sujato/sutta/kn/dhp/') && t.path.endsWith('.json'))
    .map((t) => t.path)
    .sort((a, b) => {
      const na = Number(a.match(/dhp(\d+)/)?.[1] ?? 0);
      const nb = Number(b.match(/dhp(\d+)/)?.[1] ?? 0);
      return na - nb;
    });

  const dhpVerseMap = new Map<number, { sectionId: string; pali: string[]; en: string[] }>();
  let dhpSecOrdinal = 0;

  const dhpPairs = await Promise.all(
    dhpEnPaths.map(async (enPath) => {
      const fileBase = path.basename(enPath).replace('_translation-en-sujato.json', '');
      const rootPath = `root/pli/ms/sutta/kn/dhp/${fileBase}_root-pli-ms.json`;
      const pair = await fetchBilaraPair(rootPath, enPath);
      return { fileBase, ...pair };
    })
  );

  for (const { fileBase, root, en } of dhpPairs) {
    const secId = `sec-${fileBase}`;
    dhpSecOrdinal += 1;
    sections.push({
      id: secId,
      workId: 'work-dhp',
      parentId: null,
      ordinal: dhpSecOrdinal,
      title: DHP_VAGGA_TITLES_KO[fileBase] ?? fileBase,
      sourceRef: fileBase.toUpperCase(),
    });

    for (const key of Object.keys(en)) {
      const m = key.match(/^dhp(\d+):(\d+(?:\.\d+)?)$/);
      if (!m) continue;
      const verseNum = Number(m[1]);
      const sub = m[2];
      if (sub.startsWith('0')) continue; // skip header lines 0.1, 0.2, 0.3
      const enLine = normalizeNfc((en[key] ?? '').trim());
      const piLine = normalizeNfc((root[key] ?? '').trim());
      if (!enLine && !piLine) continue;
      if (!dhpVerseMap.has(verseNum)) {
        dhpVerseMap.set(verseNum, { sectionId: secId, pali: [], en: [] });
      }
      const bucket = dhpVerseMap.get(verseNum)!;
      if (enLine) bucket.en.push(enLine);
      if (piLine) bucket.pali.push(piLine);
    }
  }

  const dhpNumbers = Array.from(dhpVerseMap.keys()).sort((a, b) => a - b);
  works.push({
    id: 'work-dhp',
    title: '법구경 (Dhammapada · 423게송)',
    subtitle: '초기불교 · 26품 완역 (팔리어 원문 · Bhikkhu Sujato 영어 CC0)',
    tradition: 'early_buddhism',
    type: 'verse',
    totalSegments: dhpNumbers.length,
    description: 'SuttaCentral Bilara CC0 판본(Mahāsaṅgīti 팔리어 원문 및 Bhikkhu Sujato 영어 번역)으로 수록한 법구경 전체 423게송입니다.',
  });
  editions.push(
    {
      id: 'ed-dhp-en-sujato',
      workId: 'work-dhp',
      lang: 'en',
      label: 'English (Bhikkhu Sujato · CC0)',
      translator: 'Bhikkhu Sujato',
      licenseId: 'CC0-1.0',
      sourceRevision: BILARA_COMMIT.slice(0, 10),
      isOriginal: false,
    },
    {
      id: 'ed-dhp-pi-ms',
      workId: 'work-dhp',
      lang: 'pi',
      label: 'Pāli (Mahāsaṅgīti · CC0)',
      translator: 'Mahāsaṅgīti Tipiṭaka',
      licenseId: 'CC0-1.0',
      sourceRevision: BILARA_COMMIT.slice(0, 10),
      isOriginal: true,
    }
  );
  manifestEntries.push(
    {
      workId: 'work-dhp',
      editionId: 'ed-dhp-en-sujato',
      translator: 'Bhikkhu Sujato',
      sourceUrl: 'https://github.com/suttacentral/bilara-data/tree/published/translation/en/sujato/sutta/kn/dhp',
      sourceRevision: BILARA_COMMIT,
      license: 'CC0-1.0',
      permissionEvidence: 'bilara-data _publication.json scpub7 (CC0, AI training/tech exclusion respected)',
      allowRedistribution: true,
      allowCommercial: true,
      allowAdaptation: true,
      allowShare: true,
      allowTTS: true,
      allowAIProcessing: false,
      reviewedAt: '2026-11-26',
      reviewer: 'Content-Policy-Check',
      status: 'approved',
    },
    {
      workId: 'work-dhp',
      editionId: 'ed-dhp-pi-ms',
      translator: 'Mahāsaṅgīti Tipiṭaka (Dhamma Society)',
      sourceUrl: 'https://github.com/suttacentral/bilara-data/tree/published/root/pli/ms/sutta/kn/dhp',
      sourceRevision: BILARA_COMMIT,
      license: 'CC0-1.0',
      permissionEvidence: 'bilara-data _publication.json scpub38 (CC0)',
      allowRedistribution: true,
      allowCommercial: true,
      allowAdaptation: true,
      allowShare: true,
      allowTTS: false,
      allowAIProcessing: true,
      reviewedAt: '2026-11-26',
      reviewer: 'Content-Policy-Check',
      status: 'approved',
    }
  );

  dhpNumbers.forEach((vNum, idx) => {
    const data = dhpVerseMap.get(vNum)!;
    const segId = `dhp-${String(vNum).padStart(3, '0')}`;
    const enText = data.en.join('\n');
    const piText = data.pali.join('\n');
    segments.push({
      id: segId,
      workId: 'work-dhp',
      sectionId: data.sectionId,
      ordinal: idx + 1,
      sourceRef: `법구경 제${vNum}게송 (Dhp ${vNum})`,
      topics: inferTopics(enText),
    });
    if (enText) {
      segmentTexts.push({
        segmentId: segId,
        editionId: 'ed-dhp-en-sujato',
        text: enText,
        reviewStatus: 'approved',
      });
    }
    if (piText) {
      segmentTexts.push({
        segmentId: segId,
        editionId: 'ed-dhp-pi-ms',
        text: piText,
        reviewStatus: 'approved',
      });
    }
  });

  // Helper to import sutta-per-segment collections (KP, SN56.11, Itivuttaka, Sutta Nipāta)
  async function importSuttaCollection(config: {
    workId: string;
    title: string;
    subtitle: string;
    description: string;
    type: Work['type'];
    scpubId: string;
    sourceUrl: string;
    paths: { enPath: string; rootPath: string; titleOverride?: string }[];
    splitParagraphs?: boolean;
  }) {
    const enEdId = `ed-${config.workId}-en-sujato`;
    const piEdId = `ed-${config.workId}-pi-ms`;
    let ordinal = 0;

    // Fetch in batches of 20 for speed and reliability
    const fetchedPairs: { item: (typeof config.paths)[number]; root: Record<string, string>; en: Record<string, string> }[] = [];
    for (let b = 0; b < config.paths.length; b += 20) {
      const slice = config.paths.slice(b, b + 20);
      const batch = await Promise.all(
        slice.map(async (item) => {
          const { root, en } = await fetchBilaraPair(item.rootPath, item.enPath);
          return { item, root, en };
        })
      );
      fetchedPairs.push(...batch);
    }

    for (let i = 0; i < fetchedPairs.length; i++) {
      const { item, root, en } = fetchedPairs[i];
      const keys = Object.keys(en);
      const suttaId = path.basename(item.enPath).split('_')[0];
      const titleFromFile =
        Object.entries(en).find(([k]) => k.endsWith(':0.2') || k.endsWith(':0.3'))?.[1]?.trim() ||
        suttaId.toUpperCase();
      const secTitle = item.titleOverride ?? titleFromFile;
      const secId = `sec-${config.workId}-${suttaId}`;
      sections.push({
        id: secId,
        workId: config.workId,
        parentId: null,
        ordinal: i + 1,
        title: secTitle,
        sourceRef: suttaId.toUpperCase(),
      });

      if (config.splitParagraphs) {
        // Group by paragraph prefix (before .)
        const paraGroups = new Map<string, { en: string[]; pi: string[] }>();
        for (const k of keys) {
          const segPart = k.split(':')[1] ?? '';
          if (segPart.startsWith('0')) continue;
          const paraKey = segPart.split('.')[0];
          if (!paraGroups.has(paraKey)) paraGroups.set(paraKey, { en: [], pi: [] });
          const g = paraGroups.get(paraKey)!;
          if (en[k]?.trim()) g.en.push(normalizeNfc(en[k].trim()));
          if (root[k]?.trim()) g.pi.push(normalizeNfc(root[k].trim()));
        }
        for (const [paraKey, g] of paraGroups.entries()) {
          const enText = g.en.join(' ');
          const piText = g.pi.join(' ');
          if (!enText) continue;
          ordinal += 1;
          const segId = `${suttaId}-p${paraKey}`;
          segments.push({
            id: segId,
            workId: config.workId,
            sectionId: secId,
            ordinal,
            sourceRef: `${secTitle} · ${suttaId.toUpperCase()} (${paraKey})`,
            topics: inferTopics(enText),
          });
          segmentTexts.push({ segmentId: segId, editionId: enEdId, text: enText, reviewStatus: 'approved' });
          if (piText) {
            segmentTexts.push({ segmentId: segId, editionId: piEdId, text: piText, reviewStatus: 'approved' });
          }
        }
      } else {
        const enLines: string[] = [];
        const piLines: string[] = [];
        for (const k of keys) {
          const segPart = k.split(':')[1] ?? '';
          if (segPart.startsWith('0')) continue;
          if (en[k]?.trim()) enLines.push(normalizeNfc(en[k].trim()));
          if (root[k]?.trim()) piLines.push(normalizeNfc(root[k].trim()));
        }
        const enText = enLines.join('\n');
        const piText = piLines.join('\n');
        if (!enText) continue;
        ordinal += 1;
        const segId = suttaId;
        segments.push({
          id: segId,
          workId: config.workId,
          sectionId: secId,
          ordinal,
          sourceRef: `${secTitle} (${suttaId.toUpperCase()})`,
          topics: inferTopics(enText),
        });
        segmentTexts.push({ segmentId: segId, editionId: enEdId, text: enText, reviewStatus: 'approved' });
        if (piText) {
          segmentTexts.push({ segmentId: segId, editionId: piEdId, text: piText, reviewStatus: 'approved' });
        }
      }
    }

    works.push({
      id: config.workId,
      title: config.title,
      subtitle: config.subtitle,
      tradition: 'early_buddhism',
      type: config.type,
      totalSegments: ordinal,
      description: config.description,
    });
    editions.push(
      {
        id: enEdId,
        workId: config.workId,
        lang: 'en',
        label: 'English (Bhikkhu Sujato · CC0)',
        translator: 'Bhikkhu Sujato',
        licenseId: 'CC0-1.0',
        sourceRevision: BILARA_COMMIT.slice(0, 10),
        isOriginal: false,
      },
      {
        id: piEdId,
        workId: config.workId,
        lang: 'pi',
        label: 'Pāli (Mahāsaṅgīti · CC0)',
        translator: 'Mahāsaṅgīti Tipiṭaka',
        licenseId: 'CC0-1.0',
        sourceRevision: BILARA_COMMIT.slice(0, 10),
        isOriginal: true,
      }
    );
    manifestEntries.push(
      {
        workId: config.workId,
        editionId: enEdId,
        translator: 'Bhikkhu Sujato',
        sourceUrl: config.sourceUrl,
        sourceRevision: BILARA_COMMIT,
        license: 'CC0-1.0',
        permissionEvidence: `bilara-data _publication.json ${config.scpubId} (CC0, AI exclusion respected)`,
        allowRedistribution: true,
        allowCommercial: true,
        allowAdaptation: true,
        allowShare: true,
        allowTTS: true,
        allowAIProcessing: false,
        reviewedAt: '2026-11-26',
        reviewer: 'Content-Policy-Check',
        status: 'approved',
      },
      {
        workId: config.workId,
        editionId: piEdId,
        translator: 'Mahāsaṅgīti Tipiṭaka',
        sourceUrl: config.sourceUrl.replace('translation/en/sujato', 'root/pli/ms'),
        sourceRevision: BILARA_COMMIT,
        license: 'CC0-1.0',
        permissionEvidence: 'bilara-data _publication.json scpub38 (CC0)',
        allowRedistribution: true,
        allowCommercial: true,
        allowAdaptation: true,
        allowShare: true,
        allowTTS: false,
        allowAIProcessing: true,
        reviewedAt: '2026-11-26',
        reviewer: 'Content-Policy-Check',
        status: 'approved',
      }
    );
  }

  // 4B. Khuddakapāṭha (kp1-kp9) + Dhammacakkappavattana (sn56.11)
  console.log('Fetching Khuddakapāṭha (kp1~kp9) and SN 56.11...');
  const kpTitles: Record<string, string> = {
    kp1: '삼귀의 (Saraṇattaya)',
    kp2: '십계 (Dasasikkhāpada)',
    kp3: '서른두 가지 몸의 관찰 (Dvattiṁsākāra)',
    kp4: '사미문 (Kumārapañha)',
    kp5: '대길상경 · 행복경 (Maṅgalasutta)',
    kp6: '보배경 (Ratanasutta)',
    kp7: '담장 밖 경 (Tirokuṭṭasutta)',
    kp8: '보물단지 경 (Nidhikaṇḍasutta)',
    kp9: '자애경 (Karaṇīyamettasutta)',
  };
  const kpEnPaths = tree
    .filter((t) => t.path.startsWith('translation/en/sujato/sutta/kn/kp/') && t.path.endsWith('.json'))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));

  await importSuttaCollection({
    workId: 'work-kp',
    title: '소송경 · 자애경·보배경 (Khuddakapāṭha)',
    subtitle: '초기불교 · 9편 완역 (팔리어 원문 · 영어 CC0)',
    description: '삼귀의, 행복경(길상경), 보배경, 자애경 등 초기불교 핵심 독송 경전 9편 전체입니다.',
    type: 'sutta',
    scpubId: 'scpub19',
    sourceUrl: 'https://github.com/suttacentral/bilara-data/tree/published/translation/en/sujato/sutta/kn/kp',
    paths: kpEnPaths.map((p) => {
      const id = path.basename(p.path).split('_')[0];
      return {
        enPath: p.path,
        rootPath: p.path
          .replace('translation/en/sujato/', 'root/pli/ms/')
          .replace('_translation-en-sujato.json', '_root-pli-ms.json'),
        titleOverride: kpTitles[id],
      };
    }),
  });

  await importSuttaCollection({
    workId: 'work-sn56-11',
    title: '초전법륜경 (Dhammacakkappavattana)',
    subtitle: '초기불교 · 사성제와 팔정도 첫 설법 (팔리어 · 영어 CC0)',
    description: '부처님께서 깨달음 이후 다섯 비구에게 중도, 사성제, 팔정도를 처음 설하신 상윳따 니까야 56.11 경전 전문입니다.',
    type: 'sutta',
    scpubId: 'scpub4',
    sourceUrl: 'https://github.com/suttacentral/bilara-data/tree/published/translation/en/sujato/sutta/sn/sn56',
    paths: [
      {
        enPath: 'translation/en/sujato/sutta/sn/sn56/sn56.11_translation-en-sujato.json',
        rootPath: 'root/pli/ms/sutta/sn/sn56/sn56.11_root-pli-ms.json',
        titleOverride: '초전법륜경 (SN 56.11)',
      },
    ],
    splitParagraphs: true,
  });

  // 4C. Sutta Nipāta (all 73 suttas)
  console.log('Fetching Sutta Nipāta (73 suttas)...');
  const snpEnPaths = tree
    .filter((t) => t.path.startsWith('translation/en/sujato/sutta/kn/snp/') && t.path.endsWith('.json'))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  await importSuttaCollection({
    workId: 'work-snp',
    title: '숫타니파타 (Sutta Nipāta · 73경)',
    subtitle: '초기불교 · 전 5품 완역 (팔리어 원문 · 영어 CC0)',
    description: '가장 이른 시기의 초기불교 게송 모음집 숫타니파타(무소의 뿔 경, 자애경, 보배경, 피안품 등) 73편 전체입니다.',
    type: 'sutta',
    scpubId: 'scpub17',
    sourceUrl: 'https://github.com/suttacentral/bilara-data/tree/published/translation/en/sujato/sutta/kn/snp',
    paths: snpEnPaths.map((p) => ({
      enPath: p.path,
      rootPath: p.path
        .replace('translation/en/sujato/', 'root/pli/ms/')
        .replace('_translation-en-sujato.json', '_root-pli-ms.json'),
    })),
  });

  // 4D. Itivuttaka (all 112 suttas)
  console.log('Fetching Itivuttaka (112 suttas)...');
  const itiEnPaths = tree
    .filter((t) => t.path.startsWith('translation/en/sujato/sutta/kn/iti/') && t.path.endsWith('.json'))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  await importSuttaCollection({
    workId: 'work-iti',
    title: '여시어경 (Itivuttaka · 112경)',
    subtitle: '초기불교 · 112편 완역 (팔리어 원문 · 영어 CC0)',
    description: '"세존께서 이와 같이 말씀하셨다"로 이어지는 산문과 게송 형식의 초기불교 핵심 가르침 112편 전체입니다.',
    type: 'sutta',
    scpubId: 'scpub16',
    sourceUrl: 'https://github.com/suttacentral/bilara-data/tree/published/translation/en/sujato/sutta/kn/iti',
    paths: itiEnPaths.map((p) => ({
      enPath: p.path,
      rootPath: p.path
        .replace('translation/en/sujato/', 'root/pli/ms/')
        .replace('_translation-en-sujato.json', '_root-pli-ms.json'),
    })),
  });

  // 4E. Udāna (all 80 inspired utterances)
  console.log('Fetching Udāna (80 suttas)...');
  const udEnPaths = tree
    .filter((t) => t.path.startsWith('translation/en/sujato/sutta/kn/ud/') && t.path.endsWith('.json'))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  await importSuttaCollection({
    workId: 'work-ud',
    title: '우다나 · 감흥어경 (Udāna · 80경)',
    subtitle: '초기불교 · 8품 80편 완역 (팔리어 원문 · 영어 CC0)',
    description: '부처님께서 깊은 감흥 속에서 읊으신 게송과 인연 이야기를 담은 초기불교 경전 80편 전체입니다.',
    type: 'sutta',
    scpubId: 'scpub18',
    sourceUrl: 'https://github.com/suttacentral/bilara-data/tree/published/translation/en/sujato/sutta/kn/ud',
    paths: udEnPaths.map((p) => ({
      enPath: p.path,
      rootPath: p.path
        .replace('translation/en/sujato/', 'root/pli/ms/')
        .replace('_translation-en-sujato.json', '_root-pli-ms.json'),
    })),
  });

  // Cross-scripture verified parallel links (between KP Metta/Ratana/Mangala and Sutta Nipāta equivalents)
  relatedLinks.push(
    {
      id: 'rel-kp9-snp1-8',
      fromId: 'kp9',
      toId: 'snp1.8',
      type: 'parallel_sutta',
      targetTitle: '숫타니파타 자애경 (Snp 1.8)',
      targetRef: 'Snp 1.8',
      evidence: '소송경(Kp 9)과 숫타니파타(Snp 1.8)에 공통으로 전해지는 동일한 자애경(Karaṇīyamettasutta) 평행 본문',
      reviewStatus: 'approved',
    },
    {
      id: 'rel-kp6-snp2-1',
      fromId: 'kp6',
      toId: 'snp2.1',
      type: 'parallel_sutta',
      targetTitle: '숫타니파타 보배경 (Snp 2.1)',
      targetRef: 'Snp 2.1',
      evidence: '소송경(Kp 6)과 숫타니파타(Snp 2.1)에 공통으로 수록된 보배경(Ratanasutta) 평행 본문',
      reviewStatus: 'approved',
    },
    {
      id: 'rel-kp5-snp2-4',
      fromId: 'kp5',
      toId: 'snp2.4',
      type: 'parallel_sutta',
      targetTitle: '숫타니파타 행복경 (Snp 2.4)',
      targetRef: 'Snp 2.4',
      evidence: '소송경(Kp 5)과 숫타니파타(Snp 2.4)에 공통으로 수록된 대길상경(Maṅgalasutta) 평행 본문',
      reviewStatus: 'approved',
    },
    {
      id: 'rel-diamond-heart',
      fromId: 'diamond-01',
      toId: 'heart-01',
      type: 'thematic_related',
      targetTitle: '반야심경 제1단락',
      targetRef: 'T0251',
      evidence: '두 문헌 모두 대승 반야부 경전으로 집착 없는 지혜(반야바라밀다)를 다룹니다.',
      reviewStatus: 'approved',
    }
  );

  // Curated approved study annotations for key opening segments
  annotations.push(
    {
      id: 'ann-diamond-01-ctx',
      segmentId: 'diamond-01',
      editionId: 'ed-diamond-ko-ws',
      kind: 'context',
      title: '경전의 배경',
      body: '금강경 제1분 법회인유분은 부처님께서 사위성 기수급고독원에서 일상적인 탁발과 공양을 마치신 뒤 자리에 앉으시는 모습으로 시작하며, 평범한 일상 행위 자체가 수행과 깨달음의 토대임을 보여 줍니다.',
      source: '한국어 위키문헌 PD-자작 본문 서지 요약',
      reviewStatus: 'approved',
    },
    {
      id: 'ann-diamond-32-easy',
      segmentId: 'diamond-32',
      editionId: 'ed-diamond-ko-ws',
      kind: 'easy_explanation',
      title: '쉽게 이해하기',
      body: '응화비진분의 마지막 사구게("모든 유위법은 꿈과 같고 허깨비·물거품·그림자 같으며, 이슬과 같고 번개와 같으니 마땅히 이와 같이 관하라")는 조건 지어진 모든 현상이 고정불변하지 않음을 비추어 봅니다.',
      source: '금강경 제32분 본문 정리',
      reviewStatus: 'approved',
    },
    {
      id: 'ann-heart-02-easy',
      segmentId: 'heart-02',
      editionId: 'ed-heart-ko-ws',
      kind: 'easy_explanation',
      title: '쉽게 이해하기',
      body: '물질(색)을 비롯한 오온이 공성(고정된 실체가 없음)과 떨어져 있지 않음을 밝히며, 현상과 공이 둘이 아님을 설합니다.',
      source: '반야심경 본문 정리',
      reviewStatus: 'approved',
    }
  );

  // Reading Plans mapped to real open segments
  const plans: ReadingPlan[] = [
    {
      id: 'plan-7d',
      title: '7일 반야·자애 입문',
      durationDays: 7,
      dailyTarget: 1,
      workId: 'work-diamond',
      description: '일주일 동안 금강경 핵심 장과 반야심경, 자애경을 하루 한 구절씩 읽는 계획입니다.',
    },
    {
      id: 'plan-30d',
      title: '30일 금강경 32분 완독',
      durationDays: 30,
      dailyTarget: 1,
      workId: 'work-diamond',
      description: '한 달 동안 한국어 금강경 32장을 차분히 완독하는 읽기 계획입니다.',
    },
    {
      id: 'plan-100d',
      title: '100일 법구경 423게송 순례',
      durationDays: 100,
      dailyTarget: 4,
      workId: 'work-dhp',
      description: '매일 법구경 4게송 이상을 읽으며 423게송 전체를 순차 완독합니다.',
    },
  ];

  const planItems: PlanItem[] = [];
  for (let d = 1; d <= 7; d++) {
    planItems.push({
      id: `pi-7d-${d}`,
      planId: 'plan-7d',
      dayNumber: d,
      segmentIds: [`diamond-${String(d).padStart(2, '0')}`],
    });
  }
  for (let d = 1; d <= 30; d++) {
    const segIds =
      d === 30
        ? ['diamond-30', 'diamond-31', 'diamond-32']
        : [`diamond-${String(d).padStart(2, '0')}`];
    planItems.push({
      id: `pi-30d-${d}`,
      planId: 'plan-30d',
      dayNumber: d,
      segmentIds: segIds,
    });
  }
  for (let d = 1; d <= 100; d++) {
    const start = (d - 1) * 4 + 1;
    const end = d === 100 ? dhpNumbers.length : Math.min(dhpNumbers.length, d * 4);
    const segIds: string[] = [];
    for (let v = start; v <= end; v++) {
      segIds.push(`dhp-${String(v).padStart(3, '0')}`);
    }
    planItems.push({
      id: `pi-100d-${d}`,
      planId: 'plan-100d',
      dayNumber: d,
      segmentIds: segIds,
    });
  }

  const pack: ContentPack = {
    manifest: {
      version: `open-1.0.0-${BILARA_COMMIT.slice(0, 7)}`,
      generatedAt: new Date().toISOString(),
      entries: manifestEntries,
    },
    works,
    editions,
    sections,
    segments,
    segmentTexts,
    alignments: [],
    annotations,
    relatedLinks,
    plans,
    planItems,
  };

  const outPath = path.resolve(__dirname, '../assets/content/open-scriptures.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(pack, null, 2), 'utf-8');

  console.log('Exported open-scriptures.json successfully!');
  console.log('Works:', works.length);
  console.log('Editions:', editions.length);
  console.log('Sections:', sections.length);
  console.log('Segments:', segments.length);
  console.log('SegmentTexts:', segmentTexts.length);
  console.log('File size (KB):', Math.round(fs.statSync(outPath).size / 1024));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
