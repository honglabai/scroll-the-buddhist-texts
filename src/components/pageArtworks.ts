import type { ImageSourcePropType } from 'react-native';
import type { AppSettings, ArtworkPresetId, PageArtworkKey } from '../domain/types';

export interface ArtworkPresetEntry {
  id: ArtworkPresetId;
  source: ImageSourcePropType;
  licenseNote: string;
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
};

export const ARTWORK_PRESET_IDS: ArtworkPresetId[] = [
  'dawn-pagoda',
  'lotus-pond',
  'bamboo-path',
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
  'work-diamond': 'dawn-pagoda',
  'work-heart': 'evening-bell',
  'work-cheonsu': 'monk-halo',
  'work-dhp': 'lotus-pond',
  'work-kp': 'bamboo-path',
  'work-sn56-11': 'autumn-temple',
  'work-snp': 'geumgang-peaks',
  'work-iti': 'lotus-pond',
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
