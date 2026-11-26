import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { canReadWithTTS } from '../domain/readingRules';
import type { AppLanguage, FontScaleLevel } from '../domain/types';
import type { FeedItem } from '../features/app/AppProvider';
import {
  getLocalizedEditionLabel,
  getLocalizedSourceRef,
  getLocalizedWorkTitle,
  getStrings,
} from '../i18n/strings';
import { getFontSize, MIN_TOUCH_SIZE, type ThemePalette } from './theme';

interface VerseCardProps {
  item: FeedItem;
  index: number;
  total: number;
  cardHeight: number;
  topInset: number;
  extraTopOffset?: number;
  palette: ThemePalette;
  appLanguage?: AppLanguage;
  fontScaleLevel: FontScaleLevel;
  fontStyle: 'sans' | 'serif';
  lineHeightMultiplier: number;
  isBookmarked: boolean;
  noteCount: number;
  isTtsActive: boolean;
  canGoNext: boolean;
  onNext: () => void;
  onToggleBookmark: () => void;
  onOpenStudy: () => void;
  onOpenNote: () => void;
  onOpenViralCard: () => void;
  onToggleTts: () => void;
}

export function VerseCard({
  item,
  index,
  total,
  cardHeight,
  topInset,
  extraTopOffset = 0,
  palette,
  appLanguage = 'ko',
  fontScaleLevel,
  fontStyle,
  lineHeightMultiplier,
  isBookmarked,
  noteCount,
  isTtsActive,
  canGoNext,
  onNext,
  onToggleBookmark,
  onOpenStudy,
  onOpenNote,
  onOpenViralCard,
  onToggleTts,
}: VerseCardProps) {
  const [longReadOpen, setLongReadOpen] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const strings = getStrings(appLanguage);
  const isDark = palette.mode === 'dark';
  const fontSize = getFontSize(fontScaleLevel);
  const lineHeight = Math.round(fontSize * lineHeightMultiplier);
  const fontFamily =
    fontStyle === 'serif'
      ? Platform.select({
          ios: 'AppleMyungjo',
          android: 'serif',
          web: appLanguage === 'en' ? '"Noto Serif", Georgia, serif' : '"Noto Serif KR", Georgia, serif',
        })
      : Platform.select({
          web:
            appLanguage === 'en'
              ? 'system-ui, -apple-system, sans-serif'
              : '"Noto Sans KR", system-ui, sans-serif',
        });

  const bodyText = item.segmentText?.text ?? strings.card.missingEditionText;
  const isLongText = bodyText.length > 150 || bodyText.includes('\n');
  const ttsAllowed = canReadWithTTS(item.rights);

  const workTitle = getLocalizedWorkTitle(item.work, appLanguage);
  const shortWorkTitle = workTitle.replace(/\s*\(.*\)/, '');
  const sourceRef = getLocalizedSourceRef(item.segment, appLanguage);
  const originalEditionLabel = item.originalEdition
    ? getLocalizedEditionLabel(item.originalEdition, appLanguage)
    : '';

  const progressPct = total > 0 ? Math.min(100, Math.round(((index + 1) / total) * 100)) : 0;

  // Serene elevated circle styling (Bible-app inspired warm cream / ink floating circles)
  const circleBg = isDark ? '#232925' : '#FFFFFF';
  const circleBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(31,29,26,0.06)';
  const iconColor = isDark ? '#EAE6DC' : '#1F1D1A';
  const isCompact = cardHeight < 660;

  return (
    <View style={[styles.fullContainer, { height: cardHeight, backgroundColor: palette.background }]}>
      {/* Center Serene Typography Stage */}
      <View
        style={[
          styles.centerStage,
          {
            paddingTop: topInset + (isCompact ? 56 : 72) + extraTopOffset,
            paddingBottom: isCompact ? 168 : 196,
          },
        ]}
      >
        <Text style={[styles.refCaption, { color: palette.textSecondary }]} numberOfLines={1}>
          {shortWorkTitle} · {sourceRef} ({index + 1}/{total})
        </Text>

        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={isLongText}
        >
          <Text
            style={[
              styles.verseText,
              {
                color: palette.textPrimary,
                fontSize: isCompact && fontSize > 22 ? 22 : fontSize,
                lineHeight: isCompact && fontSize > 22 ? Math.round(22 * lineHeightMultiplier) : lineHeight,
                fontFamily,
              },
            ]}
          >
            {bodyText}
          </Text>

          {showOriginal && item.originalText && (
            <View
              style={[
                styles.originalBox,
                {
                  borderColor: palette.border,
                  backgroundColor: circleBg,
                },
              ]}
            >
              <Text style={[styles.originalLabel, { color: palette.textSecondary }]}>
                {strings.card.originalLabel} · {originalEditionLabel}
              </Text>
              <Text style={[styles.originalText, { color: palette.textPrimary }]}>
                {item.originalText.text}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Quiet Inline View Toggles below centered verse */}
        <View style={styles.inlineViewRow}>
          {isLongText && (
            <Pressable
              onPress={() => setLongReadOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={strings.scrollUi.fullScreenView}
              style={styles.inlineActionBtn}
            >
              <Text style={[styles.inlineActionText, { color: palette.textSecondary }]}>
                {strings.scrollUi.fullScreenView}
              </Text>
            </Pressable>
          )}
          {isLongText && item.originalText && (
            <Text style={{ color: palette.textSecondary, fontSize: 12 }}>·</Text>
          )}
          {item.originalText && (
            <Pressable
              onPress={() => setShowOriginal((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={
                showOriginal ? strings.card.hideOriginal : strings.card.showOriginal
              }
              style={styles.inlineActionBtn}
            >
              <Text style={[styles.inlineActionText, { color: palette.textSecondary }]}>
                {showOriginal ? strings.card.hideOriginal : strings.card.showOriginal}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Right Floating White Action Circles (Heart, Journal Note, Share/Viral, Speaker TTS, Progress %) */}
      <View
        style={[
          styles.rightRail,
          {
            top: topInset + 64 + extraTopOffset,
            bottom: isCompact ? 16 : 24,
            gap: isCompact ? 8 : 12,
          },
        ]}
      >
        <FloatingCircleButton
          icon={isBookmarked ? 'heart' : 'heart-outline'}
          iconColor={isBookmarked ? palette.coral : iconColor}
          bg={circleBg}
          borderColor={circleBorder}
          compact={isCompact}
          onPress={onToggleBookmark}
          accessibilityLabel={isBookmarked ? strings.card.liked : strings.card.like}
        />

        <FloatingCircleButton
          icon="share-outline"
          iconColor={iconColor}
          bg={circleBg}
          borderColor={circleBorder}
          compact={isCompact}
          onPress={onOpenViralCard}
          accessibilityLabel={strings.card.forward}
        />

        <FloatingCircleButton
          icon={isTtsActive ? 'stop' : 'volume-medium-outline'}
          iconColor={isTtsActive ? palette.coral : iconColor}
          bg={circleBg}
          borderColor={circleBorder}
          compact={isCompact}
          dimmed={!ttsAllowed}
          onPress={onToggleTts}
          accessibilityLabel={isTtsActive ? strings.card.ttsStop : strings.card.ttsPlay}
        />

        <FloatingCircleButton
          icon={noteCount > 0 ? 'create' : 'create-outline'}
          iconColor={noteCount > 0 ? palette.accent : iconColor}
          bg={circleBg}
          borderColor={circleBorder}
          compact={isCompact}
          badge={noteCount > 0 ? noteCount : undefined}
          badgeColor={palette.coral}
          onPress={onOpenNote}
          accessibilityLabel={strings.card.note}
        />

        {/* Circular Progress Percentage Ring */}
        <View
          accessibilityLabel={`${progressPct}%`}
          style={[
            styles.progressCircle,
            {
              width: isCompact ? 42 : 46,
              height: isCompact ? 42 : 46,
              borderRadius: isCompact ? 21 : 23,
              backgroundColor: circleBg,
              borderColor: progressPct >= 100 ? palette.coral : palette.border,
            },
          ]}
        >
          <View
            style={[
              styles.progressDot,
              { backgroundColor: palette.coral },
            ]}
          />
          <Text style={[styles.progressText, { color: palette.textPrimary }]}>
            {progressPct}%
          </Text>
        </View>
      </View>

      {/* Bottom-Center Swipe Up Cue + Explore Deeper CTA (Bible App layout) */}
      <View pointerEvents="box-none" style={styles.bottomCenterStack}>
        {canGoNext && (
          <Pressable
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel={strings.scrollUi.swipeUpTitle}
            style={styles.swipeCueWrapper}
          >
            <View style={styles.doubleChevronWrap}>
              <Ionicons name="chevron-up" size={16} color={palette.textPrimary} style={{ marginBottom: -8 }} />
              <Ionicons name="chevron-up" size={16} color={palette.textPrimary} />
            </View>
            <View
              style={[
                styles.swipeCardPill,
                styles.softShadow,
                { backgroundColor: circleBg, borderColor: circleBorder },
              ]}
            >
              <Text style={[styles.swipeTitle, { color: palette.textPrimary }]}>
                {strings.scrollUi.swipeUpTitle}
              </Text>
              <Text style={[styles.swipeSub, { color: palette.textSecondary }]}>
                {strings.scrollUi.swipeUpSub}
              </Text>
            </View>
          </Pressable>
        )}

        <Pressable
          onPress={onOpenStudy}
          accessibilityRole="button"
          accessibilityLabel={strings.scrollUi.exploreDeeper}
          style={[
            styles.explorePill,
            styles.softShadow,
            { backgroundColor: circleBg, borderColor: circleBorder },
          ]}
        >
          <Ionicons name="book-outline" size={17} color={palette.textPrimary} />
          <Text style={[styles.exploreText, { color: palette.textPrimary }]}>
            {strings.scrollUi.exploreDeeper}
          </Text>
        </Pressable>
      </View>

      {/* Full-Screen Distraction-Free Long Passage Modal */}
      <Modal
        visible={longReadOpen}
        animationType="slide"
        onRequestClose={() => setLongReadOpen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
              {workTitle} · {sourceRef}
            </Text>
            <Pressable
              onPress={() => setLongReadOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={strings.card.readFullClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={palette.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text
              style={[
                styles.modalVerseText,
                { color: palette.textPrimary, fontSize, lineHeight, fontFamily },
              ]}
            >
              {bodyText}
            </Text>
            {item.originalText && (
              <View style={[styles.originalBox, { borderColor: palette.border, backgroundColor: circleBg, marginTop: 20 }]}>
                <Text style={[styles.originalLabel, { color: palette.textSecondary }]}>
                  {strings.card.originalLabel} · {originalEditionLabel}
                </Text>
                <Text style={[styles.originalText, { color: palette.textPrimary }]}>
                  {item.originalText.text}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function FloatingCircleButton({
  icon,
  iconColor,
  bg,
  borderColor,
  compact,
  dimmed,
  badge,
  badgeColor,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bg: string;
  borderColor: string;
  compact: boolean;
  dimmed?: boolean;
  badge?: number;
  badgeColor?: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const size = compact ? 42 : 46;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
      style={[
        styles.circleBtn,
        styles.softShadow,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderColor,
          opacity: dimmed ? 0.45 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={compact ? 20 : 22} color={iconColor} />
      {badge !== undefined && badge > 0 && (
        <View style={[styles.badgeDot, { backgroundColor: badgeColor ?? '#C95B4B' }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  centerStage: {
    flex: 1,
    paddingLeft: 28,
    paddingRight: 74,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refCaption: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  bodyScroll: {
    flexGrow: 0,
    maxHeight: '78%',
    width: '100%',
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  verseText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  originalBox: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  originalLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '600',
  },
  originalText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  inlineViewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  inlineActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  inlineActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rightRail: {
    position: 'absolute',
    right: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBtn: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  softShadow: {
    shadowColor: '#1F1D1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  progressCircle: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressDot: {
    position: 'absolute',
    top: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomCenterStack: {
    position: 'absolute',
    left: 24,
    right: 70,
    bottom: 18,
    alignItems: 'center',
    gap: 14,
  },
  swipeCueWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  doubleChevronWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeCardPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  swipeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  swipeSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  explorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
  },
  exploreText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 24,
    paddingBottom: 48,
  },
  modalVerseText: {
    fontWeight: '600',
  },
});
