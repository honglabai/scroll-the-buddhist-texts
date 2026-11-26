import { validateContentPack } from '../scripts/validate-content';
import { OPEN_CONTENT_PACK } from '../src/data/openContentPack';
import { SYNTHETIC_SEED_PACK } from '../src/data/seedContent';
import { canProcessWithAI, canReadWithTTS, canShareSegmentText } from '../src/domain/readingRules';

describe('Stage 0 & 3: Rights Manifest & Content Build Gate', () => {
  it('validates the open production scripture pack in production mode', () => {
    const res = validateContentPack(OPEN_CONTENT_PACK, { productionMode: true });
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.blockedEditionIds).toEqual([]);
    expect(OPEN_CONTENT_PACK.works.length).toBe(10);
    expect(OPEN_CONTENT_PACK.segments.length).toBeGreaterThanOrEqual(835);

    const bdWork = OPEN_CONTENT_PACK.works.find((w) => w.id === 'work-bulgyodaejeon');
    const diamondWork = OPEN_CONTENT_PACK.works.find((w) => w.id === 'work-diamond');
    const dhpWork = OPEN_CONTENT_PACK.works.find((w) => w.id === 'work-dhp');
    expect(bdWork?.totalSegments).toBe(60);
    expect(diamondWork?.totalSegments).toBe(32);
    expect(dhpWork?.totalSegments).toBe(423);

    const bdEditions = OPEN_CONTENT_PACK.editions.filter((e) => e.workId === 'work-bulgyodaejeon');
    expect(bdEditions.map((e) => e.id).sort()).toEqual([
      'ed-bulgyodaejeon-en',
      'ed-bulgyodaejeon-ko',
      'ed-bulgyodaejeon-lzh',
    ]);
    expect(bdEditions.find((e) => e.id === 'ed-bulgyodaejeon-lzh')?.isOriginal).toBe(true);

    const bdKoTexts = OPEN_CONTENT_PACK.segmentTexts.filter(
      (t) => t.editionId === 'ed-bulgyodaejeon-ko',
    );
    const bdEnTexts = OPEN_CONTENT_PACK.segmentTexts.filter(
      (t) => t.editionId === 'ed-bulgyodaejeon-en',
    );
    expect(bdKoTexts).toHaveLength(60);
    expect(bdEnTexts).toHaveLength(60);
    for (const item of bdKoTexts) {
      expect(item.text.trim().length).toBeGreaterThan(0);
      expect(item.paraphrase?.trim().length).toBeGreaterThan(0);
    }
    const bdSegments = OPEN_CONTENT_PACK.segments.filter((s) => s.workId === 'work-bulgyodaejeon');
    expect(bdSegments).toHaveLength(60);
    for (const seg of bdSegments) {
      expect((seg.sourceRefEn ?? '').length).toBeGreaterThan(0);
      expect(seg.sourceRefEn ?? '').not.toMatch(/[\uAC00-\uD7A3]/);
    }

    for (const item of bdEnTexts) {
      expect(item.text.trim().length).toBeGreaterThan(0);
      expect(item.paraphrase?.trim().length).toBeGreaterThan(0);
      expect(item.text).not.toMatch(/[\uAC00-\uD7A3]/);
      expect(item.paraphrase ?? '').not.toMatch(/[\uAC00-\uD7A3]/);
    }

    const sujatoDhp = OPEN_CONTENT_PACK.manifest.entries.find(
      (e) => e.editionId === 'ed-dhp-en-sujato'
    );
    expect(sujatoDhp?.license).toBe('CC0-1.0');
    expect(canProcessWithAI(sujatoDhp)).toBe(false);
    expect(canShareSegmentText(sujatoDhp)).toBe(true);
  });
  it('validates synthetic seed pack in dev mode and excludes unapproved editions', () => {
    const res = validateContentPack(SYNTHETIC_SEED_PACK, { productionMode: false });
    expect(res.valid).toBe(true);
    expect(res.approvedEditionIds).toContain('ed-dhp-ko-synth');
    expect(res.blockedEditionIds).toContain('ed-dhp-en-unapproved');
  });

  it('blocks synthetic test fixtures in production mode', () => {
    const res = validateContentPack(SYNTHETIC_SEED_PACK, { productionMode: true });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('synthetic fixture'))).toBe(true);
  });

  it('enforces per-edition rights for share, TTS, and AI processing', () => {
    const unrestricted = SYNTHETIC_SEED_PACK.manifest.entries.find(
      (e) => e.editionId === 'ed-dhp-ko-synth'
    );
    const restricted = SYNTHETIC_SEED_PACK.manifest.entries.find(
      (e) => e.editionId === 'ed-dhp-ko-restricted'
    );
    const unapproved = SYNTHETIC_SEED_PACK.manifest.entries.find(
      (e) => e.editionId === 'ed-dhp-en-unapproved'
    );

    expect(canShareSegmentText(unrestricted)).toBe(true);
    expect(canReadWithTTS(unrestricted)).toBe(true);
    expect(canProcessWithAI(unrestricted)).toBe(true);

    expect(canShareSegmentText(restricted)).toBe(false);
    expect(canReadWithTTS(restricted)).toBe(false);
    expect(canProcessWithAI(restricted)).toBe(false);

    expect(canShareSegmentText(unapproved)).toBe(false);
    expect(canReadWithTTS(unapproved)).toBe(false);
    expect(canProcessWithAI(unapproved)).toBe(false);
  });
});
