import type { ImageSourcePropType } from 'react-native';
import type { AppSettings, ArtworkPresetId, PageArtworkKey, Segment } from '../domain/types';

export interface ArtworkPresetEntry {
  id: ArtworkPresetId;
  source: ImageSourcePropType;
  licenseNote: string;
}

export interface ShortsCardVisualTheme {
  image: ImageSourcePropType;
  panelBg: string;
  accentText: string;
  subText: string;
}

export const ARTWORK_PRESETS: Record<ArtworkPresetId, ArtworkPresetEntry> = {
  'dawn-pagoda': {
    id: 'dawn-pagoda',
    source: require('../../assets/images/journey-hero.jpg') as ImageSourcePropType,
    licenseNote: 'Curated Temple Dawn Art',
  },
  'lotus-pond': {
    id: 'lotus-pond',
    source: require('../../assets/images/ways-plans.jpg') as ImageSourcePropType,
    licenseNote: 'Curated Lotus Courtyard Art',
  },
  'bamboo-path': {
    id: 'bamboo-path',
    source: require('../../assets/images/ways-topics.jpg') as ImageSourcePropType,
    licenseNote: 'Curated Bamboo Grove Art',
  },
  'geumgang-peaks': {
    id: 'geumgang-peaks',
    source: require('../../assets/images/page-library.jpg') as ImageSourcePropType,
    licenseNote: 'Jeong Seon · Geumgangjeon (Public Domain)',
  },
  'autumn-temple': {
    id: 'autumn-temple',
    source: require('../../assets/images/page-saved.jpg') as ImageSourcePropType,
    licenseNote: 'An Gyeon · Autumn Moon & Temple (CC0)',
  },
  'monk-halo': {
    id: 'monk-halo',
    source: require('../../assets/images/page-my.jpg') as ImageSourcePropType,
    licenseNote: 'Kim Hong-do · Yeombulseoseungdo (Public Domain)',
  },
  'evening-bell': {
    id: 'evening-bell',
    source: require('../../assets/images/page-bell.jpg') as ImageSourcePropType,
    licenseNote: 'An Gyeon · Evening Bell at Misty Temple (CC0)',
  },
  'bd-candle': {
    id: 'bd-candle',
    source: require('../../assets/images/bd-candle.jpg') as ImageSourcePropType,
    licenseNote: 'A Candle in the Dark (CC BY-SA 3.0)',
  },
  'bd-buddha': {
    id: 'bd-buddha',
    source: require('../../assets/images/bd-buddha.jpg') as ImageSourcePropType,
    licenseNote: 'Buseoksa Seated Buddha (CC0)',
  },
  'bd-moon': {
    id: 'bd-moon',
    source: require('../../assets/images/bd-moon.jpg') as ImageSourcePropType,
    licenseNote: 'Moon and the Lake (CC BY-SA 4.0)',
  },
  'bd-river': {
    id: 'bd-river',
    source: require('../../assets/images/bd-river.jpg') as ImageSourcePropType,
    licenseNote: 'Mist & Peaks at River (CC BY-SA 3.0)',
  },
};

export const ARTWORK_PRESET_IDS: ArtworkPresetId[] = [
  'dawn-pagoda',
  'lotus-pond',
  'bamboo-path',
  'bd-buddha',
  'bd-moon',
  'bd-river',
  'bd-candle',
  'geumgang-peaks',
  'autumn-temple',
  'monk-halo',
  'evening-bell',
];

export const DEFAULT_PAGE_ARTWORK: Record<PageArtworkKey, ArtworkPresetId> = {
  today: 'dawn-pagoda',
  plans: 'lotus-pond',
  scroll: 'bamboo-path',
  library: 'geumgang-peaks',
  saved: 'autumn-temple',
  my: 'monk-halo',
};

export const WORK_ARTWORK_MAP: Record<string, ArtworkPresetId> = {
  'work-bulgyodaejeon': 'bd-buddha',
  'work-diamond': 'dawn-pagoda',
  'work-heart': 'evening-bell',
  'work-cheonsu': 'monk-halo',
  'work-dhp': 'lotus-pond',
  'work-kp': 'bamboo-path',
  'work-sn56-11': 'autumn-temple',
  'work-snp': 'bd-river',
  'work-iti': 'bd-moon',
  'work-ud': 'bamboo-path',
};

export function resolveWorkArtwork(workId?: string): ArtworkPresetEntry {
  const id = (workId && WORK_ARTWORK_MAP[workId]) || 'dawn-pagoda';
  return ARTWORK_PRESETS[id];
}

export function resolvePageArtwork(
  pageKey: PageArtworkKey,
  settings: AppSettings,
  workId?: string
): ArtworkPresetEntry {
  const overrideId = settings.pageArtworkOverrides?.[pageKey];
  if (overrideId && ARTWORK_PRESETS[overrideId]) {
    return ARTWORK_PRESETS[overrideId];
  }
  if ((pageKey === 'today' || pageKey === 'scroll') && workId && WORK_ARTWORK_MAP[workId]) {
    return ARTWORK_PRESETS[WORK_ARTWORK_MAP[workId]];
  }
  return ARTWORK_PRESETS[DEFAULT_PAGE_ARTWORK[pageKey]];
}

const SHORTS_PALETTES: Record<
  'candle' | 'moon' | 'buddha' | 'river' | 'lotus' | 'bamboo' | 'dawn',
  ShortsCardVisualTheme
> = {
  candle: {
    image: ARTWORK_PRESETS['bd-candle'].source,
    panelBg: '#4E463B',
    accentText: '#DCE0CC',
    subText: '#DCD6CA',
  },
  moon: {
    image: ARTWORK_PRESETS['bd-moon'].source,
    panelBg: '#404852',
    accentText: '#CED8E3',
    subText: '#CFD6DF',
  },
  buddha: {
    image: ARTWORK_PRESETS['bd-buddha'].source,
    panelBg: '#2B4234',
    accentText: '#CBE0CD',
    subText: '#D2DDD3',
  },
  river: {
    image: ARTWORK_PRESETS['bd-river'].source,
    panelBg: '#444841',
    accentText: '#D6DDD0',
    subText: '#D4D9CE',
  },
  lotus: {
    image: ARTWORK_PRESETS['lotus-pond'].source,
    panelBg: '#324438',
    accentText: '#D8DEC8',
    subText: '#D7DCD1',
  },
  bamboo: {
    image: ARTWORK_PRESETS['bamboo-path'].source,
    panelBg: '#364438',
    accentText: '#D5DEC9',
    subText: '#D6DCD0',
  },
  dawn: {
    image: ARTWORK_PRESETS['dawn-pagoda'].source,
    panelBg: '#48453B',
    accentText: '#DEDAC7',
    subText: '#DAD7CA',
  },
};

export function resolveSegmentCardTheme(segment: Segment, workId?: string): ShortsCardVisualTheme {
  const topics = segment.topics ?? [];
  const has = (...keys: string[]) => keys.some((k) => topics.includes(k));

  if (has('평온', '청정', '공', '해탈', '진여', '내려놓음', '현재', '마음의 평온')) {
    return SHORTS_PALETTES.moon;
  }
  if (has('배움', '실천', '가르침', '믿음', '신앙', '발심', '성장')) {
    return SHORTS_PALETTES.candle;
  }
  if (has('마음공부', '선행', '불성', '수행', '정진', '참회', '계정혜', '마음')) {
    return SHORTS_PALETTES.buddha;
  }
  if (has('지혜', '생사', '삶과죽음', '삶과 죽음', '무상', '번뇌', '진리', '평등', '집착', '갈등', '고통', '용서', '인과', '분별', '성찰')) {
    return SHORTS_PALETTES.river;
  }
  if (has('자비', '행복', '평화', '공존', '포용', '행복과 감사', '인간관계')) {
    return SHORTS_PALETTES.lotus;
  }

  const cycle: (keyof typeof SHORTS_PALETTES)[] = [
    'buddha',
    'river',
    'moon',
    'candle',
    'dawn',
    'lotus',
    'bamboo',
  ];
  const offset = (segment.ordinal + (workId?.length ?? 0)) % cycle.length;
  return SHORTS_PALETTES[cycle[offset]];
}
