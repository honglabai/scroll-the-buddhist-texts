import { InMemoryRepository } from '../src/data/inMemoryRepository';
import { OPEN_CONTENT_PACK } from '../src/data/openContentPack';
import {
  getLocalizedEditionLabel,
  getLocalizedPlanTitle,
  getLocalizedSourceRef,
  getLocalizedTopicLabel,
  getLocalizedWorkTitle,
  getStrings,
} from '../src/i18n/strings';

describe('Bilingual (Korean / English) Consistency & Open Scriptures Parity', () => {
  let repo: InMemoryRepository;

  beforeAll(async () => {
    repo = new InMemoryRepository({ allowSyntheticInDev: false });
    await repo.initialize(OPEN_CONTENT_PACK);
  });

  it('provides full Korean and English UI string sets without untranslated placeholders', () => {
    const ko = getStrings('ko');
    const en = getStrings('en');

    expect(ko.tabs.home).toBe('홈');
    expect(en.tabs.home).toBe('Home');
    expect(ko.my.languageTitle).not.toBe(en.my.languageTitle);
    expect(en.viralModal.title).not.toMatch(/[\uAC00-\uD7A3]/);
    expect(en.study.title).not.toMatch(/[\uAC00-\uD7A3]/);
    expect(en.library.title).not.toMatch(/[\uAC00-\uD7A3]/);
    expect(en.practice.title).not.toMatch(/[\uAC00-\uD7A3]/);
    expect(en.saved.title).not.toMatch(/[\uAC00-\uD7A3]/);
    expect(en.my.title).not.toMatch(/[\uAC00-\uD7A3]/);
    expect(getLocalizedTopicLabel('마음', 'en')).toBe('Mind');
    expect(getLocalizedTopicLabel('마음', 'ko')).toBe('마음');
  });

  it('provides both complete Korean and English approved editions for Diamond and Heart Sutras', async () => {
    const diamondEds = await repo.getEditionsForWork('work-diamond');
    expect(diamondEds.some((e) => e.lang === 'ko')).toBe(true);
    expect(diamondEds.some((e) => e.lang === 'en')).toBe(true);
    expect(diamondEds.some((e) => e.lang === 'zh' && e.isOriginal)).toBe(true);

    const heartEds = await repo.getEditionsForWork('work-heart');
    expect(heartEds.some((e) => e.lang === 'ko')).toBe(true);
    expect(heartEds.some((e) => e.lang === 'en')).toBe(true);

    const diamondKo = await repo.getSegmentText('diamond-01', 'ed-diamond-ko-ws');
    const diamondEn = await repo.getSegmentText('diamond-01', 'ed-diamond-en-ws');
    expect(diamondKo?.text).toContain('나는 이렇게 들었다');
    expect(diamondEn?.text).toContain('Thus have I heard');
  });

  it('filters works and search strictly to the active language with zero cross-language leakage', async () => {
    const works = await repo.getWorks();
    const editions = await repo.getAllEditions();

    for (const lang of ['ko', 'en'] as const) {
      const workIdsForLang = new Set(editions.filter((e) => e.lang === lang).map((e) => e.workId));
      const langWorks = works.filter((w) => workIdsForLang.has(w.id));
      expect(langWorks.length).toBeGreaterThanOrEqual(lang === 'ko' ? 3 : 8);

      for (const w of langWorks) {
        const localizedTitle = getLocalizedWorkTitle(w, lang);
        expect(localizedTitle.length).toBeGreaterThan(0);
        if (lang === 'en') {
          expect(localizedTitle).not.toMatch(/[\uAC00-\uD7A3]/);
        }
        const ed = editions.find((e) => e.workId === w.id && e.lang === lang)!;
        expect(getLocalizedEditionLabel(ed, lang).length).toBeGreaterThan(0);
        if (lang === 'en') {
          expect(getLocalizedEditionLabel(ed, 'en')).not.toMatch(/[\uAC00-\uD7A3]/);
        }
      }
    }

    const koSearch = await repo.searchSegments('Śrāvastī', undefined, 'ko');
    expect(koSearch.length).toBe(0);

    const enSearch = await repo.searchSegments('Śrāvastī', undefined, 'en');
    expect(enSearch.length).toBeGreaterThan(0);
    expect(enSearch.every((r) => r.edition.lang === 'en')).toBe(true);
    expect(getLocalizedSourceRef(enSearch[0].segment, 'en')).not.toMatch(/[\uAC00-\uD7A3]/);
  });

  it('localizes reading plans without mixing languages', async () => {
    const plans = await repo.getPlans();
    expect(plans.length).toBeGreaterThanOrEqual(4);
    expect(plans.some((p) => p.id === 'plan-bd-30')).toBe(true);
    for (const plan of plans) {
      expect(getLocalizedPlanTitle(plan, 'en')).not.toMatch(/[\uAC00-\uD7A3]/);
    }
  });

  it('localizes Bulgyodaejeon topics cleanly into English without Hangul leakage', () => {
    expect(getLocalizedTopicLabel('마음공부', 'en')).toBe('Mind Cultivation');
    expect(getLocalizedTopicLabel('평온', 'en')).toBe('Serenity');
    expect(getLocalizedTopicLabel('지혜', 'en')).toBe('Wisdom');
    expect(getLocalizedTopicLabel('배움', 'en')).toBe('Learning & Study');
    expect(getLocalizedTopicLabel('실천', 'en')).toBe('Living Practice');
    expect(getLocalizedTopicLabel('배움과 실천', 'en')).toBe('Study & Practice');
    for (const topic of ['마음공부', '평온', '지혜', '배움', '실천', '배움과 실천', '청정', '선행', '참선', '불성']) {
      expect(getLocalizedTopicLabel(topic, 'en')).not.toMatch(/[\uAC00-\uD7A3]/);
    }
  });
});
