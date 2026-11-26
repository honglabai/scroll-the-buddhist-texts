import type { FontScaleLevel } from '../domain/types';

export interface ThemePalette {
  mode: 'light' | 'dark';
  background: string;
  card: string;
  surfaceElevated: string;
  primary: string;
  coral: string;
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
  background: '#F5F2EB',
  card: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  primary: '#2B4237',
  coral: '#C95B4B',
  secondary: '#8C877E',
  accent: '#B68E52',
  textPrimary: '#1F1D1A',
  textSecondary: '#736E66',
  textOnPrimary: '#FFFFFF',
  border: '#E8E2D5',
  danger: '#B84435',
  highlightBg: '#F6E8D9',
};

export const DARK_PALETTE: ThemePalette = {
  mode: 'dark',
  background: '#141715',
  card: '#1E2320',
  surfaceElevated: '#272D29',
  primary: '#91A89A',
  coral: '#DF6D5C',
  secondary: '#7B827C',
  accent: '#CFA96D',
  textPrimary: '#F4F0E8',
  textSecondary: '#A4A79E',
  textOnPrimary: '#141715',
  border: '#2D3430',
  danger: '#E37463',
  highlightBg: '#3B2B26',
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
