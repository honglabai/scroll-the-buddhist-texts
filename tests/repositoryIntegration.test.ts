import { InMemoryRepository } from '../src/data/inMemoryRepository';
import { SYNTHETIC_SEED_PACK } from '../src/data/seedContent';
import { buildSharePayload } from '../src/services/shareService';

jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
    dismissedAction: 'dismissedAction',
  },
}));

describe('Stage 2~5: Repository, Search, Bookmarks, Notes, Study, Plans & Privacy', () => {
  let repo: InMemoryRepository;

  beforeEach(async () => {
    repo = new InMemoryRepository({ allowSyntheticInDev: true });
    await repo.initialize(SYNTHETIC_SEED_PACK);
  });

  it('searches Korean text with NFC normalization and partial matching', async () => {
    const nfdQuery = '마음'.normalize('NFD');
    const results = await repo.searchSegments(nfdQuery);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.segment.id === 'demo-001')).toBe(true);
  });

  it('excludes unapproved annotations and unapproved related links', async () => {
    const anns = await repo.getApprovedAnnotations('demo-001', 'ed-dhp-ko-synth');
    expect(anns.some((a) => a.id === 'ann-001-unapproved')).toBe(false);
    expect(anns.some((a) => a.id === 'ann-001-easy')).toBe(true);

    const links = await repo.getApprovedRelatedLinks('demo-001');
    expect(links.some((l) => l.id === 'rel-003-unapproved')).toBe(false);
    expect(links.some((l) => l.id === 'rel-001')).toBe(true);
  });

  it('toggles bookmarks without duplicates and performs Note CRUD', async () => {
    const added = await repo.toggleBookmark('local', 'demo-001', 'ed-dhp-ko-synth');
    expect(added).toBe(true);
    expect((await repo.getBookmarks('local')).length).toBe(1);

    const removed = await repo.toggleBookmark('local', 'demo-001', 'ed-dhp-ko-synth');
    expect(removed).toBe(false);
    expect((await repo.getBookmarks('local')).length).toBe(0);

    const note = await repo.saveNote('local', 'demo-001', '오늘의 사유', ['마음']);
    expect(note.body).toBe('오늘의 사유');
    const updated = await repo.saveNote('local', 'demo-001', '수정된 사유', ['마음', '자비'], note.id);
    expect(updated.body).toBe('수정된 사유');
    await repo.deleteNote('local', note.id);
    expect((await repo.getNotes('local')).length).toBe(0);
  });

  it('deduplicates reading events and respects dwell time and midnight boundary', async () => {
    const tooShort = await repo.recordReadingEvent({
      profileId: 'local',
      segmentId: 'demo-001',
      localDay: '2026-11-26',
      mode: 'sequential',
      dwellMs: 500,
    });
    expect(tooShort).toBe(false);

    const first = await repo.recordReadingEvent({
      profileId: 'local',
      segmentId: 'demo-001',
      localDay: '2026-11-26',
      mode: 'sequential',
      dwellMs: 2500,
    });
    const dupSameDay = await repo.recordReadingEvent({
      profileId: 'local',
      segmentId: 'demo-001',
      localDay: '2026-11-26',
      mode: 'sequential',
      dwellMs: 3000,
    });
    const nextDay = await repo.recordReadingEvent({
      profileId: 'local',
      segmentId: 'demo-001',
      localDay: '2026-11-27',
      mode: 'sequential',
      dwellMs: 2500,
    });

    expect(first).toBe(true);
    expect(dupSameDay).toBe(false);
    expect(nextDay).toBe(true);
  });

  it('restricts share body when allowShare is false', async () => {
    const work = (await repo.getWorkById('work-dhp'))!;
    const seg = (await repo.getSegmentById('demo-001'))!;
    const ed = (await repo.getEditionsForWork('work-dhp')).find(
      (e) => e.id === 'ed-dhp-ko-restricted'
    )!;
    const st = (await repo.getSegmentText('demo-001', ed.id))!;
    const rights = await repo.getRightsForEdition(ed.id);

    const payload = buildSharePayload({ work, segment: seg, edition: ed, segmentText: st, rights });
    expect(payload.textIncluded).toBe(false);
    expect(payload.message).not.toContain(st.text);
  });

  it('preserves and remaps reading progress on content pack upgrade and supports full wipe', async () => {
    await repo.saveReadingProgress({
      profileId: 'local',
      workId: 'work-dhp',
      editionId: 'ed-dhp-ko-synth',
      segmentId: 'legacy-001',
      offset: 0,
      mode: 'sequential',
      updatedAt: '2026-11-26T00:00:00Z',
    });

    const upgradedPack = {
      ...SYNTHETIC_SEED_PACK,
      alignments: [
        ...SYNTHETIC_SEED_PACK.alignments,
        { fromId: 'legacy-001', toId: 'demo-001', relationship: '1:1' as const },
      ],
    };

    const { migratedProgressCount } = await repo.upgradeContentPack(upgradedPack);
    expect(migratedProgressCount).toBe(1);
    const prog = await repo.getReadingProgress('local', 'work-dhp', 'sequential');
    expect(prog?.segmentId).toBe('demo-001');

    const backup = await repo.exportPersonalData('local');
    expect(backup.readingProgress.length).toBe(1);

    await repo.deleteAllPersonalData('local');
    expect((await repo.getBookmarks('local')).length).toBe(0);
    expect((await repo.getReadingProgress('local', 'work-dhp', 'sequential'))).toBeUndefined();

    // Verify backup restore & rights entries listing
    await repo.importPersonalData(backup);
    expect((await repo.getReadingProgress('local', 'work-dhp', 'sequential'))?.segmentId).toBe('demo-001');
    expect((await repo.getAllRightsEntries()).length).toBe(SYNTHETIC_SEED_PACK.manifest.entries.length);
  });
});
