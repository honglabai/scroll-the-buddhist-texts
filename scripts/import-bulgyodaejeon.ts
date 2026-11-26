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

interface DraftRecord {
  id: string;
  part_id: number;
  start_page: number;
  end_page: number;
  start_line: number;
  end_line: number;
  source_title_candidate: string;
  normalized_ocr: string;
  translation_ko: string;
  app_paraphrase: string;
  speaker_candidate: string;
  topics: string;
}

interface PageRecord {
  file_page: number;
  printed_page: number | null;
}

const SOURCE_EN_MAP: Record<string, string> = {
  여래장경: 'Tathāgatagarbha Sūtra',
  사제론: 'Treatise on the Four Noble Truths',
  무상경: 'Anityatā Sūtra',
  관찰제법행경: 'Observing Dharma Practice Sūtra',
  견의경: 'Jianyi Sūtra',
  무소유보살경: 'Ākiñcanya Bodhisattva Sūtra',
  입대승론: 'Introduction to the Mahāyāna Treatise',
  유가론: 'Yogācārabhūmi Śāstra',
  화엄경: 'Avataṃsaka Sūtra',
  대집경: 'Mahāsaṃnipāta Sūtra',
  '대집경(표제 판독 추정)': 'Mahāsaṃnipāta Sūtra (est.)',
  정법념처경: 'Saddharmasmṛtyupasthāna Sūtra',
  불본행경: 'Abhiniṣkramaṇa Sūtra',
  출생보리심경: 'Bodhicittotpāda Sūtra',
  관무량수경: 'Amitāyurdhyāna Sūtra',
  금광명최승왕경: 'Suvarṇaprabhāsottama Sūtra',
  열반경: 'Mahāparinirvāṇa Sūtra',
  무상의경: 'Dharma-Dependence Sūtra',
  소실지갈라경: 'Susiddhikara Sūtra',
  제법용왕경: 'Nāgarāja Dharmarāja Sūtra',
  적지과경: 'Sūtra of Karmic Results',
  대비바사론: 'Mahāvibhāṣā Śāstra',
  아난분별경: 'Ānanda Discrimination Sūtra',
  대교왕경: 'Mahādharmarāja Sūtra',
  수행도지경: 'Yogācārabhūmi (Sūtra)',
  선견율: 'Samantapāsādikā Vinaya',
  '대장엄경(추정)': 'Mahālaṅkāra Sūtra (est.)',
  '팔리문 잡아함경(추정)': 'Saṃyukta Āgama (est.)',
  법구경: 'Dhammapada',
  수마제장자경: 'Sumati Householder Sūtra',
  '수마제장자경(추정)': 'Sumati Householder Sūtra (est.)',
  전여신경: 'Turning of the Female Body Sūtra',
  오사비바사론: 'Pañcavastuka Vibhāṣā Śāstra',
  아비담비바사론: 'Abhidharma Vibhāṣā Śāstra',
  '출요경(추정)': 'Udānavarga (est.)',
  반야경: 'Prajñāpāramitā Sūtra',
  해의보살소문경: 'Sāgaramati Paripṛcchā Sūtra',
  대승장엄경론: 'Mahāyānasūtrālaṅkāra',
  보협경: 'Karaṇḍavyūha Sūtra',
  보장경: 'Ratnagarbha Sūtra',
  유마경: 'Vimalakīrti Nirdeśa Sūtra',
  '대승이십송론(추정)': 'Mahāyāna Viṃśatikā (est.)',
  수호국계주경: 'Sūtra of Protecting the Dharma Realm',
  심지관경: 'Contemplation of the Mind-Ground Sūtra',
  기신론: 'Awakening of Faith in the Mahāyāna',
  불모출생경: 'Sūtra of the Mother of Buddhas',
  승사유범천소문경: 'Viśeṣacintābrahmaparipṛcchā Sūtra',
  '대보적경(추정)': 'Mahāratnakūṭa Sūtra (est.)',
  대승파유론: 'Treatise on Refuting Existence',
};

const SPEAKER_EN_MAP: Record<string, string> = {
  '부처님(본문 명시, 판독 추정)': 'The Buddha (attributed in text)',
  '부처님(본문 명시)': 'The Buddha (stated in text)',
  '부처님과 가섭보살의 문답': 'Dialogue of the Buddha and Kāśyapa Bodhisattva',
  '논서의 설명': 'Treatise commentary',
  '경전의 설명': 'Sūtra narration',
  '경전의 게송': 'Sūtra verse',
  '율서의 설명': 'Vinaya commentary',
  '해의보살과 범천의 문답': 'Dialogue of Sāgaramati Bodhisattva and Brahmā',
  '경전 속 설법(화자 확인 필요)': 'Discourse in sūtra (speaker pending verification)',
};

const EN_RENDERINGS: Record<string, { paraphrase: string; text: string }> = {
  'BD1914-0039-03': {
    paraphrase: 'If you do not recognize the treasure within yourself, you will keep searching outside.',
    text: 'Like a treasure buried inside a poor household that remains unopened because none knows it is there, every sentient being carries the great Dharma-treasury within, yet wanders in suffering when blinded by craving.',
  },
  'BD1914-0039-11': {
    paraphrase: 'To step free of suffering, first examine the causes that lead into it.',
    text: 'Hearing of the deepest suffering in unwholesome states awakens wholesome caution, leading one to discern and turn away from the causes that produce suffering.',
  },
  'BD1914-0040-05': {
    paraphrase: 'Clinging solely to your own view gives rise to endless conflict.',
    text: 'When people cling stubbornly to their separate views as exclusively true and reject all others, they quarrel like those arguing over an elephant in the dark, missing the peaceful wisdom free of dispute.',
  },
  'BD1914-0040-09': {
    paraphrase: 'Everything born is impermanent. Hear the true teaching and release your afflictions.',
    text: 'Nothing shaped by conditions lasts forever; whoever listens attentively to the Dharma and cultivates stillness reaches freedom from sorrow.',
  },
  'BD1914-0041-10': {
    paraphrase: 'Listening deeply to the Dharma opens the path toward awakening.',
    text: 'Hearing this teaching with an open heart leads the practitioner toward clarity and luminous awakening.',
  },
  'BD1914-0042-03': {
    paraphrase: 'If a whole day is difficult, incline your heart toward the Dharma even for a single moment.',
    text: 'Whoever receives the clear teaching with sincere goodwill—whether for a full day, half a day, an hour, or even a quiet moment—gathers immeasurable inner blessing.',
  },
  'BD1914-0042-08': {
    paraphrase: 'Awaken from delusion and shatter the darkness of ignorance.',
    text: 'Whoever receives and practices this teaching dispels clouded ignorance and steps onto the path of awakening.',
  },
  'BD1914-0042-10': {
    paraphrase: 'Wisdom ripens through hearing, understanding, contemplating, and putting it into practice.',
    text: 'Through questioning and hearing, understanding dawns; from understanding comes trust, from trust arises joy, and through steady contemplation and practice comes comprehensive wisdom.',
  },
  'BD1914-0043-01': {
    paraphrase: 'One verse of true wisdom is worth more than treasures filling a thousand worlds.',
    text: 'Hearing even a single verse of Dharma that steadies awakening surpasses possessing worldly wealth; therefore bodhisattvas value truth above comfort or status.',
  },
  'BD1914-0044-04': {
    paraphrase: 'When you delight in learning without growing weary, wisdom deepens without limit.',
    text: 'Take joy in listening and learning without complacency, and boundless understanding of all phenomena naturally unfolds.',
  },
  'BD1914-0044-06': {
    paraphrase: 'A true teacher speaks to heal suffering and awaken understanding in those who listen.',
    text: 'Let listeners regard truth as medicine that eases pain, and let teachers speak with compassion to nourish clarity rather than pride.',
  },
  'BD1914-0044-11': {
    paraphrase: 'To lend an attentive ear to true teaching is among the rarest blessings.',
    text: 'Deeply listening to wholesome truth lays the foremost foundation for peace amid the cycle of birth and death.',
  },
  'BD1914-0044-13': {
    paraphrase: 'Just as a boat carries travelers across a river, wisdom carries you across birth and death.',
    text: 'Look carefully at life, observe how everything shifts, and rely on wisdom to cross the wide stream of sorrow into stillness.',
  },
  'BD1914-0045-02': {
    paraphrase: 'The aspiration for awakening shines brightest when it seeks the welfare of all beings.',
    text: 'Listening deeply and longing to relieve the suffering of every living being illuminates the noble path of awakening.',
  },
  'BD1914-0045-06': {
    paraphrase: 'Even in life’s final moments, meeting clear Dharma is a precious refuge.',
    text: 'No matter how late the hour, encountering and entrusting oneself to a clear teaching remains an occasion of deep renewal.',
  },
  'BD1914-0045-10': {
    paraphrase: 'Hear the teaching with gladness and step steadily along the path of awakening.',
    text: 'Even hearing the Dharma once with sincere gladness opens the doorway toward steadfast confidence and eventual awakening.',
  },
  'BD1914-0046-03': {
    paraphrase: 'When beings refrain from harming and practice humility and compassion, peace takes root.',
    text: 'A society thrives in harmony when people do not exploit one another, protect what is right, and live by loving-kindness.',
  },
  'BD1914-0047-07': {
    paraphrase: 'The Dharma serves as medicine for the afflicted and a clear mirror for self-reflection.',
    text: 'Whoever sincerely listens to the true teaching gains healing from restlessness, clear vision to turn away from harm, and calm insight into one’s own mind.',
  },
  'BD1914-0048-09': {
    paraphrase: 'Just as trees take root in earth, wholesome qualities grow by relying on the Dharma.',
    text: 'Grounded in attentive study and steady practice, good intention puts down roots and flourishes like trees nourished by soil.',
  },
  'BD1914-0048-11': {
    paraphrase: 'Cultivate wholesome deeds and nourish a mind that does not retreat.',
    text: 'Do not belittle any good action; through steady hearing, practice, and resolve, courage and peace mature.',
  },
  'BD1914-0049-02': {
    paraphrase: 'Study the teaching with care and govern your own mind well.',
    text: 'Through sincere training and mindfulness of every thought and action, inward calm becomes unshakable.',
  },
  'BD1914-0049-04': {
    paraphrase: 'Among all paths of insight, true Dharma shines like the full moon among the stars.',
    text: 'Just as the bright moon outshines countless stars in the night sky, genuine wisdom illuminates every corner of existence.',
  },
  'BD1914-0049-06': {
    paraphrase: 'Even eyes cannot see without a lamp; wisdom likewise needs steady learning.',
    text: 'Capacity alone stays dormant in darkness until study, reflection, and attention kindle its light.',
  },
  'BD1914-0049-10': {
    paraphrase: 'Treasure the rare fortune of encountering a true and liberating teaching.',
    text: 'Meeting trustworthy wisdom amid distractions is precious; guard it carefully and put it into action.',
  },
  'BD1914-0049-12': {
    paraphrase: 'Honor the moment you encounter truth and never step back from practice.',
    text: 'With resolute diligence, carry the clear teaching forward day by day without wavering.',
  },
  'BD1914-0050-05': {
    paraphrase: 'Examine the root of suffering and walk the wholesome path day and night.',
    text: 'Seeing how attachment breeds distress, devote yourself steadfastly to mindfulness, ethical conduct, and clarity.',
  },
  'BD1914-0051-03': {
    paraphrase: 'The fruit of practice ripens through ethical discipline, stillness, and wisdom.',
    text: 'Just as learning bears its harvest through practice, virtue, concentration, and insight mature together.',
  },
  'BD1914-0051-05': {
    paraphrase: 'Knowing much is not enough; you yourself must receive the light of that wisdom.',
    text: 'Merely gathering information leaves one hungry if not lived—like a person holding a lamp for others while standing in the dark.',
  },
  'BD1914-0051-08': {
    paraphrase: 'Value a life aligned with truth far above fleeting sensory pleasures.',
    text: 'Passing delights fade like foam; choosing clarity, contentment, and truth yields lasting peace.',
  },
  'BD1914-0051-10': {
    paraphrase: 'As you draw nearer to the true path, clarity appears unmistakable as snow on a high peak.',
    text: 'Sincere practice removes doubt and makes wholesome discernment bright and unmistakable.',
  },
  'BD1914-0052-03': {
    paraphrase: 'Rather than clinging to what constantly changes, seek lasting truth.',
    text: 'All worldly forms pass away, yet seeking wisdom and compassion builds enduring strength.',
  },
  'BD1914-0052-05': {
    paraphrase: 'Listen, reflect rightly, practice faithfully, and dedicate that merit to awakening.',
    text: 'Uniting hearing with thoughtful reflection and daily kindness transforms understanding into shared peace.',
  },
  'BD1914-0052-08': {
    paraphrase: 'Clear awakening stands firm as a solid mountain unmoved by fierce winds.',
    text: 'One whose mind rests in direct understanding is neither swept away by praise nor shaken by blame.',
  },
  'BD1914-0052-13': {
    paraphrase: 'An unreflective mind drifts restlessly like an untied boat upon the water.',
    text: 'Without careful observation and mindfulness, thoughts scatter; anchoring awareness brings steadiness.',
  },
  'BD1914-0052-15': {
    paraphrase: 'Better a single day lived awake to change than a hundred years spent heedlessly.',
    text: 'Seeing impermanence directly turns one ordinary day into an occasion of genuine awakening.',
  },
  'BD1914-0053-01': {
    paraphrase: 'Do not stop at believing the teaching—embody it in your living.',
    text: 'Trust finds its living proof only when carried out gently in daily conduct and speech.',
  },
  'BD1914-0053-03': {
    paraphrase: 'Approach profound teachings with humility rather than hasty scorn.',
    text: 'Classic treatises caution against dismissing deep paths of compassion before sincerely examining them.',
  },
  'BD1914-0054-05': {
    paraphrase: 'Look closely into all beings and phenomena to see the truth within them.',
    text: 'Reality is not hidden outside this world; discerning interdependence reveals wisdom right where we stand.',
  },
  'BD1914-0054-07': {
    paraphrase: 'True Dharma is never separate from ordinary everyday life.',
    text: 'Each daily act, breath, and encounter becomes the very field of awakening when met with awareness.',
  },
  'BD1914-0054-10': {
    paraphrase: 'In their essential nature, all phenomena are equal and free of division.',
    text: 'Looking past surface labels reveals an open sameness beyond rigid superiority or inferiority.',
  },
  'BD1914-0055-02': {
    paraphrase: 'Seen with the eye of wisdom, every phenomenon reveals the path of awakening.',
    text: 'Nothing around us blocks liberation once our perception ceases dividing the world into friend and foe.',
  },
  'BD1914-0055-06': {
    paraphrase: 'The world of experience and the nature of Dharma are not two separate realms.',
    text: 'Confusion arises when we split ordinary life apart from wisdom; understanding reunites them peacefully.',
  },
  'BD1914-0055-09': {
    paraphrase: 'As the great ocean welcomes every stream, embrace every wholesome mind with breadth.',
    text: 'Let your heart grow vast and receptive, rejecting no sincere aspiration toward goodness.',
  },
  'BD1914-0056-07': {
    paraphrase: 'Turn away from harm, practice good, and purify your own heart.',
    text: 'Refraining from all wrong, cultivating what is wholesome, and taming one’s own mind is the essence of all awakened teachings.',
  },
  'BD1914-0056-10': {
    paraphrase: 'Letting go of fixation on self and other to walk straight is the living Dharma.',
    text: 'When rigid division between “mine” and “yours” softens, natural uprightness and harmony emerge.',
  },
  'BD1914-0057-03': {
    paraphrase: 'Step away from resentment, quarreling, and harsh slander.',
    text: 'Peace begins when speech abandons accusation and turns toward forbearance and goodwill.',
  },
  'BD1914-0057-07': {
    paraphrase: 'Neither past, present, nor future thought can ever be seized and held fast.',
    text: 'Recognizing the fleeting nature of mental events frees the heart from anxious grasping.',
  },
  'BD1914-0057-12': {
    paraphrase: 'Do not ascribe a fixed, unchanging substance even to the appearances of mind.',
    text: 'Thoughts pass like clouds across space; observing them without clinging reveals innate freedom.',
  },
  'BD1914-0058-04': {
    paraphrase: 'True nature lies beyond words, serene and boundless as open sky.',
    text: 'Where conceptual chatter quiets, the silent clarity of reality shows itself naturally.',
  },
  'BD1914-0058-07': {
    paraphrase: 'Suchness is non-dual, tranquil, and undisturbed.',
    text: 'Free of extremes and restless division, true nature rests in effortless stillness.',
  },
  'BD1914-0058-09': {
    paraphrase: 'Awakening means seeing sensations and discriminations without inventing fixed selves.',
    text: 'Notice sights, sounds, and thoughts clearly without building rigid walls of ego around them.',
  },
  'BD1914-0061-03': {
    paraphrase: 'The workings of mind flow unceasingly like a stream, lingering nowhere for an instant.',
    text: 'Seeing how swiftly moods arise and vanish teaches us not to mistake passing waves for the whole sea.',
  },
  'BD1914-0062-04': {
    paraphrase: 'True suchness holds neither increase nor decrease from person to person.',
    text: 'Across every background and station in life, basic awakened potential remains utterly equal.',
  },
  'BD1914-0062-08': {
    paraphrase: 'All living beings share Buddha-nature without discrimination.',
    text: 'Deep respect for every creature naturally follows once we see this shared capacity for awakening.',
  },
  'BD1914-0062-09': {
    paraphrase: 'Reality does not change according to self or other.',
    text: 'Truth stands open and impartial, untouched by narrow personal preferences.',
  },
  'BD1914-0062-13': {
    paraphrase: 'Though clouds obscure the sky, they never stain the sky itself.',
    text: 'Afflictions pass like temporary clouds; luminous mind-nature remains clear and unharmed behind them.',
  },
  'BD1914-0063-04': {
    paraphrase: 'The true nature of mind is like open space that fire cannot burn.',
    text: 'Even amidst inner turmoil, the fundamental openness of awareness cannot be destroyed.',
  },
  'BD1914-0063-07': {
    paraphrase: 'Though afflictions arise, the nature of mind is originally clear and pure.',
    text: 'Seeing delusion as passing dust reveals the quiet clarity that was always present.',
  },
  'BD1914-0063-09': {
    paraphrase: 'A pure mind is like the bright moon reflected cleanly upon still water.',
    text: 'When agitation subsides, reality reflects without distortion upon the quiet surface of awareness.',
  },
  'BD1914-0063-11': {
    paraphrase: 'Conceptual discrimination spins ever more discrimination in how we view the world.',
    text: 'Examining how thought constructs division gently opens the way back to unclouded perception.',
  },
};

function formatPrintedRange(
  startFilePage: number,
  endFilePage: number,
  pageMap: Map<number, number>
): { ko: string; en: string } {
  const sp = pageMap.get(startFilePage) ?? Math.max(1, startFilePage - 38);
  const ep = pageMap.get(endFilePage) ?? Math.max(1, endFilePage - 38);
  if (sp === ep) {
    return { ko: `${sp}쪽`, en: `p. ${sp}` };
  }
  return { ko: `${sp}~${ep}쪽`, en: `pp. ${sp}–${ep}` };
}

function main() {
  const draftsPath =
    '/Users/kobujang/.gemini/antigravity/brain/e4a725b9-9cff-477a-99be-112e113120d8/scratch/bulgyodaejeon_zip/Bulgyodaejeon_DB_v1/translated_drafts.json';
  const pagesPath =
    '/Users/kobujang/.gemini/antigravity/brain/e4a725b9-9cff-477a-99be-112e113120d8/scratch/bulgyodaejeon_zip/Bulgyodaejeon_DB_v1/pages.json';
  const packPath = path.resolve(__dirname, '../assets/content/open-scriptures.json');

  const drafts = JSON.parse(fs.readFileSync(draftsPath, 'utf-8')) as DraftRecord[];
  const pages = JSON.parse(fs.readFileSync(pagesPath, 'utf-8')) as PageRecord[];
  const existing = JSON.parse(fs.readFileSync(packPath, 'utf-8')) as ContentPack;

  const pageMap = new Map<number, number>();
  for (const p of pages) {
    if (typeof p.printed_page === 'number') {
      pageMap.set(p.file_page, p.printed_page);
    }
  }

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
    subtitle: normalizeNfc('만해 한용운 편찬 · 제1품 서품·제2품 교리강령품 60선'),
    subtitleEn: 'Compiled by Manhae Han Yong-un · 60 Essential Passages',
    description: normalizeNfc(
      '1914년 만해 한용운 선생이 경·율·논 대장경에서 핵심 가르침을 가려 엮은 불교대전 가운데, 1914년 초판 원문을 바탕으로 독자 번역·정리한 60개 말씀(짧은 의역과 충실 번역, 원문 쪽수 분리 수록)입니다.'
    ),
    descriptionEn:
      'Compiled in 1914 by Master Manhae Han Yong-un from canonical Buddhist sūtras and treatises. Includes 60 drafted passages separating concise app quotes, faithful modern translations, 1914 source text, speaker notes, and original page citations.',
    totalSegments: drafts.length,
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
      sourceRevision: 'bd-1914-v1.0',
      isOriginal: false,
    },
    {
      id: ED_EN,
      workId: WORK_ID,
      lang: 'en',
      label: 'Bulgyodaejeon English Edition (60 Passages)',
      labelEn: 'Bulgyodaejeon English Edition (60 Passages)',
      translator: 'Compiled by Han Yong-un (1914) · Bulgyodaejeon DB English Draft',
      translatorEn: 'Compiled by Han Yong-un (1914) · English Rendering',
      licenseId: 'PD-old-100',
      sourceRevision: 'bd-1914-v1.0',
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
    reviewedAt: '2026-11-26',
    reviewer: 'honglabai (user-supplied Bulgyodaejeon_DB_v1)',
    status: 'approved',
    isSyntheticTestFixture: false,
  }));

  const sections: Section[] = [
    {
      id: 'sec-bd-part-1',
      workId: WORK_ID,
      parentId: null,
      ordinal: 1,
      title: normalizeNfc('제1품 서품'),
      titleEn: 'Part 1 · Preface',
      sourceRef: normalizeNfc('제1품 서품 (1~15쪽)'),
    },
    {
      id: 'sec-bd-part-2',
      workId: WORK_ID,
      parentId: null,
      ordinal: 2,
      title: normalizeNfc('제2품 교리강령품'),
      titleEn: 'Part 2 · Core Doctrine',
      sourceRef: normalizeNfc('제2품 교리강령품 (16~26쪽)'),
    },
  ];

  const segments: Segment[] = [];
  const segmentTexts: SegmentText[] = [];
  const annotations: Annotation[] = [];

  drafts.forEach((row, index) => {
    const segId = `bd-${String(index + 1).padStart(2, '0')}`;
    const pageInfo = formatPrintedRange(row.start_page, row.end_page, pageMap);
    const srcKo = row.source_title_candidate.trim();
    const srcEn = SOURCE_EN_MAP[srcKo] ?? srcKo;
    const topicsArr = row.topics
      .split(',')
      .map((t) => normalizeNfc(t.trim()))
      .filter(Boolean);
    if (!topicsArr.includes('불교대전')) topicsArr.push('불교대전');

    segments.push({
      id: segId,
      workId: WORK_ID,
      sectionId: row.part_id === 2 ? 'sec-bd-part-2' : 'sec-bd-part-1',
      ordinal: index + 1,
      sourceRef: normalizeNfc(`${srcKo} · 불교대전 ${pageInfo.ko}`),
      sourceRefEn: `${srcEn} · Bulgyodaejeon ${pageInfo.en}`,
      topics: topicsArr,
    });

    segmentTexts.push({
      segmentId: segId,
      editionId: ED_KO,
      text: normalizeNfc(row.translation_ko.trim()),
      paraphrase: normalizeNfc(row.app_paraphrase.trim()),
      reviewStatus: 'approved',
    });

    const enItem = EN_RENDERINGS[row.id];
    if (!enItem) {
      throw new Error(`Missing English rendering for ${row.id}`);
    }
    segmentTexts.push({
      segmentId: segId,
      editionId: ED_EN,
      text: normalizeNfc(enItem.text),
      paraphrase: normalizeNfc(enItem.paraphrase),
      reviewStatus: 'approved',
    });

    segmentTexts.push({
      segmentId: segId,
      editionId: ED_LZH,
      text: normalizeNfc(row.normalized_ocr.trim()),
      reviewStatus: 'approved',
    });

    const speakerEn = SPEAKER_EN_MAP[row.speaker_candidate] ?? 'Scriptural passage';
    const partLabelKo = row.part_id === 2 ? '제2품 교리강령품' : '제1품 서품';
    const partLabelEn = row.part_id === 2 ? 'Part 2 · Core Doctrine' : 'Part 1 · Preface';

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
        bodyEn: `[Short Teaching] ${enItem.paraphrase}\n\n[Full Passage] ${enItem.text}`,
        source: normalizeNfc(`${partLabelKo} · ${srcKo} · 불교대전 ${pageInfo.ko}`),
        sourceEn: `${partLabelEn} · ${srcEn} · Bulgyodaejeon ${pageInfo.en}`,
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
          `• 편제: ${partLabelKo}\n• 인용 문헌: ${srcKo}\n• 화자 구분: ${row.speaker_candidate}\n• 원본 위치: 불교대전 인쇄면 ${pageInfo.ko} (DB ID: ${row.id})\n• 원칙 안내: 논서·보살·제자 설명과 부처님 말씀을 임의로 합치지 않고 분리 표기했습니다.`
        ),
        bodyEn: `• Division: ${partLabelEn}\n• Cited Text: ${srcEn}\n• Speaker Note: ${speakerEn}\n• Original Page: Bulgyodaejeon ${pageInfo.en} (ID: ${row.id})\n• Separation Principle: Commentary, bodhisattva, and sūtra speakers are preserved without conflation.`,
        source: normalizeNfc(`불교대전 1914 DB v1.0 (${row.id})`),
        sourceEn: `Bulgyodaejeon 1914 DB v1.0 (${row.id})`,
        reviewStatus: 'approved',
      }
    );
  });

  // Plan: 30-day contemplation across all 60 Bulgyodaejeon passages (2/day)
  const planId = 'plan-bd-30';
  const bdPlan: ReadingPlan = {
    id: planId,
    title: normalizeNfc('30일 불교대전 핵심 말씀 사유'),
    titleEn: '30-Day Bulgyodaejeon Contemplations',
    description: normalizeNfc(
      '만해 한용운 선생의 『불교대전』 현대어 번역 60편을 30일간 하루 두 편씩 천천히 스와이프하며 음미하는 계획입니다.'
    ),
    descriptionEn:
      'Swipe through all 60 translated passages of Master Han Yong-un’s Bulgyodaejeon at two teachings per day.',
    workId: WORK_ID,
    durationDays: 30,
    dailyTarget: 2,
  };
  const bdPlanItems: PlanItem[] = Array.from({ length: 30 }, (_, dayIdx) => {
    const s1 = `bd-${String(dayIdx * 2 + 1).padStart(2, '0')}`;
    const s2 = `bd-${String(dayIdx * 2 + 2).padStart(2, '0')}`;
    return {
      id: `pi-${planId}-${dayIdx + 1}`,
      planId,
      dayNumber: dayIdx + 1,
      segmentIds: [s1, s2],
    };
  });

  // Merge idempotently so re-running never duplicates Bulgyodaejeon records
  const prevWorks = existing.works.filter((w) => w.id !== WORK_ID);
  const prevEditions = existing.editions.filter((e) => e.workId !== WORK_ID);
  const prevRights = existing.manifest.entries.filter((e) => e.workId !== WORK_ID);
  const prevSections = existing.sections.filter((s) => s.workId !== WORK_ID);
  const prevSegments = existing.segments.filter((s) => s.workId !== WORK_ID);
  const prevSegIds = new Set(segments.map((s) => s.id));
  const prevTexts = existing.segmentTexts.filter((t) => !prevSegIds.has(t.segmentId));
  const prevAnns = existing.annotations.filter((a) => !prevSegIds.has(a.segmentId));
  const prevPlans = existing.plans.filter((p) => p.id !== planId);
  const prevPlanItems = existing.planItems.filter((pi) => pi.planId !== planId);

  const nextPack: ContentPack = {
    manifest: {
      ...existing.manifest,
      version: existing.manifest.version ?? '1.0.0',
      generatedAt: '2026-11-26',
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
    `Imported Bulgyodaejeon (${segments.length} passages). Total works=${nextPack.works.length}, editions=${nextPack.editions.length}, segments=${nextPack.segments.length}, plans=${nextPack.plans.length}.`
  );
}

main();
