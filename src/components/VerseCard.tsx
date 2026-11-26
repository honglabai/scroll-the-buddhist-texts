import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
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
  getLocalizedTopicLabel,
  getLocalizedWorkTitle,
  getStrings,
} from '../i18n/strings';
import { resolveSegmentCardTheme } from './pageArtworks';
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
  scenicBackdropActive?: boolean;
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
  const [showFullTranslation, setShowFullTranslation] = useState(false);

  const strings = getStrings(appLanguage);
  const baseFontSize = getFontSize(fontScaleLevel);
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

  const hasParaphrase = Boolean(item.segmentText?.paraphrase?.trim());
  const fullTranslationText = item.segmentText?.text ?? strings.card.missingEditionText;
  const primaryQuoteText =
    !showFullTranslation && item.segmentText?.paraphrase
      ? item.segmentText.paraphrase
      : fullTranslationText;

  const isVeryLong = primaryQuoteText.length > 130 || primaryQuoteText.includes('\n');
  const displayFontSize =
    primaryQuoteText.length <= 42
      ? Math.min(27, baseFontSize + 2)
      : primaryQuoteText.length <= 95
        ? Math.min(23, baseFontSize - 1)
        : primaryQuoteText.length <= 150
          ? Math.max(15, Math.min(18, baseFontSize - 4))
          : 14;
  const displayLineHeight = Math.round(displayFontSize * Math.min(1.5, Math.max(1.36, lineHeightMultiplier)));

  const ttsAllowed = canReadWithTTS(item.rights);
  const workTitle = getLocalizedWorkTitle(item.work, appLanguage);
  const sourceRef = getLocalizedSourceRef(item.segment, appLanguage);
  const originalEditionLabel = item.originalEdition
    ? getLocalizedEditionLabel(item.originalEdition, appLanguage)
    : '';

  const primaryTopicRaw = item.segment.topics[0] ?? '수행';
  const topicLabel = getLocalizedTopicLabel(primaryTopicRaw, appLanguage);
  const cardTheme = resolveSegmentCardTheme(item.segment, item.work.id);

  const progressPct = total > 0 ? Math.min(100, Math.round(((index + 1) / total) * 100)) : 0;
  const isCompact = cardHeight < 650;
  const topHeaderClearance = topInset + 52 + extraTopOffset;

  return (
    <View style={[styles.fullContainer, { height: cardHeight, paddingTop: topHeaderClearance }]}>
      {/* Unified Fullscreen Vertical Shorts Card */}
      <View style={[styles.shortsCard, { backgroundColor: cardTheme.panelBg }]}>
        {/* Top Atmospheric Thematic Artwork */}
        <View style={[styles.artworkStage, { height: isCompact ? '38%' : '42%' }]}>
          <Image source={cardTheme.image} style={styles.artworkImage} resizeMode="cover" />
          {Platform.OS === 'web' ? (
            <View
              pointerEvents="none"
              style={[
                styles.imageFeather,
                {
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 45%, ${cardTheme.panelBg} 100%)`,
                } as unknown as Record<string, unknown>,
              ]}
            />
          ) : (
            <View
              pointerEvents="none"
              style={[styles.imageFeatherNative, { backgroundColor: cardTheme.panelBg, opacity: 0.45 }]}
            />
          )}

          {/* Discreet Counter + Draft Status Pill Top-Left inside Card Image */}
          <View pointerEvents="none" style={styles.cardTopOverlayRow}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterBadgeText}>
                {index + 1} / {total}
              </Text>
            </View>
            {hasParaphrase && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftBadgeText}>{strings.shortCard.draftBadge}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Tinted Sanctuary Card Content Stage */}
        <View style={[styles.contentStage, { backgroundColor: cardTheme.panelBg }]}>
          <View style={styles.centeredPassage}>
            {/* Topic Subtitle */}
            <Text style={[styles.topicCaption, { color: cardTheme.accentText }]} numberOfLines={1}>
              {topicLabel}
            </Text>

            {/* Centered Hero Scripture Passage / Teaching */}
            <Pressable
              onPress={() => setLongReadOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`${topicLabel}. ${primaryQuoteText}`}
              style={styles.quotePressable}
            >
              <Text
                numberOfLines={showFullTranslation ? (isCompact ? 8 : 9) : isCompact ? 5 : 6}
                ellipsizeMode="tail"
                style={[
                  styles.quoteBody,
                  {
                    fontSize: displayFontSize,
                    lineHeight: displayLineHeight,
                    fontFamily,
                  },
                ]}
              >
                {primaryQuoteText}
              </Text>
            </Pressable>

            {/* Source Reference & Page Attribution */}
            <Text style={[styles.sourceCitation, { color: cardTheme.subText }]} numberOfLines={2}>
              {sourceRef}
            </Text>

            {/* Quick Inline Expansion Chips (Full Translation / Full Modal / Original Text) */}
            <View style={styles.inlineToggleRow}>
              {hasParaphrase && (
                <Pressable
                  onPress={() => setShowFullTranslation((v) => !v)}
                  accessibilityRole="button"
                  style={styles.inlineChip}
                >
                  <Text style={styles.inlineChipText}>
                    {showFullTranslation
                      ? strings.shortCard.hideFullTranslation
                      : strings.shortCard.fullTranslation}
                  </Text>
                </Pressable>
              )}
              {(isVeryLong || Boolean(item.originalText)) && (
                <Pressable
                  onPress={() => setLongReadOpen(true)}
                  accessibilityRole="button"
                  style={styles.inlineChip}
                >
                  <Text style={styles.inlineChipText}>
                    {item.originalText
                      ? strings.shortCard.originalLabel
                      : strings.scrollUi.fullScreenView}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Bottom-Center Next Passage / Vertical Swipe Affordance */}
          {canGoNext && (
            <Pressable
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel={strings.shortCard.swipeNextHint}
              style={styles.bottomSwipeCue}
            >
              <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.85)" style={{ marginBottom: -4 }} />
              <Text style={styles.bottomSwipeText}>{strings.shortCard.swipeNextHint}</Text>
            </Pressable>
          )}
        </View>

        {/* Right-Side Vertical Viral & Engagement Rail (YouTube Shorts / Reels UX) */}
        <View
          style={[
            styles.rightViralRail,
            {
              bottom: isCompact ? 12 : 18,
              gap: isCompact ? 6 : 9,
            },
          ]}
        >
          <ShortsActionButton
            icon={isBookmarked ? 'heart' : 'heart-outline'}
            label={strings.shortCard.like}
            iconColor={isBookmarked ? '#FF7566' : '#FFFFFF'}
            compact={isCompact}
            onPress={onToggleBookmark}
            accessibilityLabel={isBookmarked ? strings.card.liked : strings.card.like}
          />

          <ShortsActionButton
            icon={noteCount > 0 ? 'bookmark' : 'bookmark-outline'}
            label={strings.shortCard.note}
            iconColor={noteCount > 0 ? '#F3CE84' : '#FFFFFF'}
            badge={noteCount > 0 ? noteCount : undefined}
            badgeColor={palette.coral}
            compact={isCompact}
            onPress={onOpenNote}
            accessibilityLabel={strings.card.note}
          />

          <ShortsActionButton
            icon={isTtsActive ? 'stop-circle' : 'volume-medium-outline'}
            label={strings.shortCard.listen}
            iconColor={isTtsActive ? '#FF7566' : '#FFFFFF'}
            dimmed={!ttsAllowed}
            compact={isCompact}
            onPress={onToggleTts}
            accessibilityLabel={isTtsActive ? strings.card.ttsStop : strings.card.ttsPlay}
          />

          <ShortsActionButton
            icon="book-outline"
            label={strings.shortCard.study}
            iconColor="#FFFFFF"
            compact={isCompact}
            onPress={onOpenStudy}
            accessibilityLabel={strings.study.title}
          />

          <ShortsActionButton
            icon="share-social-outline"
            label={strings.shortCard.share}
            iconColor="#FFFFFF"
            compact={isCompact}
            onPress={onOpenViralCard}
            accessibilityLabel={strings.card.forward}
          />

          <View style={styles.percentBadge} accessibilityLabel={`${progressPct}%`}>
            <Text style={styles.percentBadgeText}>{progressPct}%</Text>
          </View>
        </View>
      </View>

      {/* Full Passage + 1914 Original Text Reader Modal */}
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
            {hasParaphrase && (
              <View style={[styles.modalSectionBox, { backgroundColor: palette.highlightBg }]}>
                <Text style={{ color: palette.coral, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
                  {strings.shortCard.draftBadge} · {topicLabel}
                </Text>
                <Text style={{ color: palette.textPrimary, fontSize: 18, fontWeight: '700', lineHeight: 27 }}>
                  {item.segmentText?.paraphrase}
                </Text>
              </View>
            )}

            <Text
              style={[
                styles.modalVerseText,
                {
                  color: palette.textPrimary,
                  fontSize: baseFontSize,
                  lineHeight: Math.round(baseFontSize * lineHeightMultiplier),
                  fontFamily,
                },
              ]}
            >
              {fullTranslationText}
            </Text>

            {item.originalText && (
              <View style={[styles.originalModalBox, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}>
                <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                  {strings.card.originalLabel} · {originalEditionLabel}
                </Text>
                <Text style={{ color: palette.textPrimary, fontSize: 16, lineHeight: 26 }}>
                  {item.originalText.text}
                </Text>
              </View>
            )}

            <Pressable
              onPress={() => {
                setLongReadOpen(false);
                onOpenStudy();
              }}
              style={[styles.modalStudyCta, { backgroundColor: palette.coral }]}
            >
              <Ionicons name="book-outline" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                {strings.scrollUi.exploreDeeper}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function ShortsActionButton({
  icon,
  label,
  iconColor,
  badge,
  badgeColor,
  dimmed,
  compact,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  iconColor: string;
  badge?: number;
  badgeColor?: string;
  dimmed?: boolean;
  compact?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const size = compact ? 38 : 42;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
      style={[styles.shortsBtnCol, dimmed && { opacity: 0.45 }]}
    >
      <View
        style={[
          styles.shortsIconCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Ionicons name={icon} size={compact ? 19 : 21} color={iconColor} />
        {typeof badge === 'number' && badge > 0 && (
          <View style={[styles.badgeDot, { backgroundColor: badgeColor ?? '#C95B4B' }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.shortsBtnLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    width: '100%',
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  shortsCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  artworkStage: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  imageFeather: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
  },
  imageFeatherNative: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 24,
  },
  cardTopOverlayRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  counterBadge: {
    backgroundColor: 'rgba(15, 20, 17, 0.62)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  draftBadge: {
    backgroundColor: 'rgba(15, 20, 17, 0.56)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  draftBadgeText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10,
    fontWeight: '600',
  },
  contentStage: {
    flex: 1,
    paddingLeft: 18,
    paddingRight: 72,
    paddingTop: 6,
    paddingBottom: 38,
    justifyContent: 'center',
  },
  centeredPassage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  topicCaption: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  quotePressable: {
    width: '100%',
    alignItems: 'center',
  },
  quoteBody: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  sourceCitation: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  inlineToggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  inlineChip: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
  },
  inlineChipText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomSwipeCue: {
    position: 'absolute',
    left: 18,
    right: 72,
    bottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bottomSwipeText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '600',
  },
  rightViralRail: {
    position: 'absolute',
    right: 10,
    alignItems: 'center',
    zIndex: 10,
  },
  shortsBtnCol: {
    alignItems: 'center',
    gap: 2,
  },
  shortsIconCircle: {
    backgroundColor: 'rgba(14, 19, 16, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shortsBtnLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  percentBadge: {
    marginTop: 2,
    backgroundColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  percentBadgeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
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
    padding: 20,
    gap: 16,
    paddingBottom: 48,
  },
  modalSectionBox: {
    padding: 16,
    borderRadius: 16,
  },
  modalVerseText: {
    fontWeight: '500',
  },
  originalModalBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalStudyCta: {
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
});
