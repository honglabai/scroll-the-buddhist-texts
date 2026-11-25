import { InMemoryRepository } from '../src/data/inMemoryRepository';
import { SYNTHETIC_SEED_PACK } from '../src/data/seedContent';
import type { ContentPack, Segment, SegmentText } from '../src/domain/types';

describe('Stage 7: 10,000-Segment Stress & 500-Swipe Regression Test', () => {
  it('handles 10,000 synthetic segments and 500 sequential navigations with 0 omissions/duplicates', async () => {
    const segments: Segment[] = [];
    const segmentTexts: SegmentText[] = [];

    for (let i = 1; i <= 10000; i++) {
      const id = `stress-${String(i).padStart(5, '0')}`;
      segments.push({
        id,
        workId: 'work-dhp',
        sectionId: 'sec-dhp-1',
        ordinal: i,
        sourceRef: `법구경 테스트 제${i}게송`,
        topics: i % 2 === 0 ? ['마음'] : ['자비'],
      });
      segmentTexts.push({
        segmentId: id,
        editionId: 'ed-dhp-ko-synth',
        text: `테스트 게송 ${i}: 마음을 고요히 살피고 자비를 실천합니다.`,
        reviewStatus: 'approved',
      });
    }

    const stressPack: ContentPack = {
      ...SYNTHETIC_SEED_PACK,
      segments,
      segmentTexts,
    };

    const repo = new InMemoryRepository({ allowSyntheticInDev: true });
    const t0 = Date.now();
    await repo.initialize(stressPack);
    const loaded = await repo.getSegmentsForWork('work-dhp');
    expect(loaded.length).toBe(10000);

    // Simulate 500 swipe/navigation steps with progress persistence
    const visited = new Set<string>();
    for (let step = 0; step < 500; step++) {
      const seg = loaded[step];
      visited.add(seg.id);
      await repo.saveReadingProgress({
        profileId: 'local',
        workId: 'work-dhp',
        editionId: 'ed-dhp-ko-synth',
        segmentId: seg.id,
        offset: step,
        mode: 'sequential',
        updatedAt: new Date().toISOString(),
      });
    }
    expect(visited.size).toBe(500);

    // Search latency check on 10,000 segments
    const searchStart = Date.now();
    const found = await repo.searchSegments('게송 9999');
    const searchMs = Date.now() - searchStart;
    expect(found.some((r) => r.segment.id === 'stress-09999')).toBe(true);
    expect(searchMs).toBeLessThan(1000);

    const totalMs = Date.now() - t0;
    expect(totalMs).toBeLessThan(5000);
  });
});
