import type { FontScaleLevel } from '../domain/types';

export interface ThemePalette {
  mode: 'light' | 'dark';
  background: string;
  card: string;
  surfaceElevated: string;
  primary: string;
  secondary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  border: string;
  danger: string;
  highlightBg: string;
}

export const LIGHT_PALETTE: ThemePalette = {
  mode: 'light',
  background: '#F7F4EC',
  card: '#E9EDE2',
  surfaceElevated: '#FFFFFF',
  primary: '#314C40',
  secondary: '#91A28D',
  accent: '#C5A26A',
  textPrimary: '#243B30',
  textSecondary: '#475B4B',
  textOnPrimary: '#F7F4EC',
  border: '#CFD8C7',
  danger: '#A63A2B',
  highlightBg: '#F2E5C6',
};

export const DARK_PALETTE: ThemePalette = {
  mode: 'dark',
  background: '#19221F',
  card: '#22302B',
  surfaceElevated: '#293933',
  primary: '#91A28D',
  secondary: '#6B8068',
  accent: '#C5A26A',
  textPrimary: '#F2EFE6',
  textSecondary: '#B9C7BC',
  textOnPrimary: '#19221F',
  border: '#32443D',
  danger: '#E37463',
  highlightBg: '#3D3522',
};

export const FONT_SCALE_MAP: Record<FontScaleLevel, number> = {
  1: 18,
  2: 21,
  3: 24,
  4: 28,
  5: 34,
};

export const MIN_TOUCH_SIZE = 48;

export function getFontSize(level: FontScaleLevel): number {
  return FONT_SCALE_MAP[level] ?? 24;
}
