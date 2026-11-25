import { validateContentPack } from '../scripts/validate-content';
import { SYNTHETIC_SEED_PACK } from '../src/data/seedContent';
import { canProcessWithAI, canReadWithTTS, canShareSegmentText } from '../src/domain/readingRules';

describe('Stage 0 & 3: Rights Manifest & Content Build Gate', () => {
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
