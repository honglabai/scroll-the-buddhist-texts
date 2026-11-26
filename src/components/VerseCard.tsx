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
import { canReadWithTTS, canShareSegmentText } from '../domain/readingRules';
import type { AppLanguage, FontScaleLevel } from '../domain/types';
import type { FeedItem } from '../features/app/AppProvider';
import {
  getLocalizedEditionLabel,
  getLocalizedSourceRef,
  getLocalizedTranslator,
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
  palette: ThemePalette;
  appLanguage?: AppLanguage;
  fontScaleLevel: FontScaleLevel;
  fontStyle: 'sans' | 'serif';
  lineHeightMultiplier: number;
  isBookmarked: boolean;
  noteCount: number;
  isTtsActive: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleBookmark: () => void;
  onOpenStudy: () => void;
  onOpenNote: () => void;
  onShareForward: () => void;
  onOpenViralCard: () => void;
  onToggleTts: () => void;
}

export function VerseCard({
  item,
  index,
  total,
  cardHeight,
  topInset,
  palette,
  appLanguage = 'ko',
  fontScaleLevel,
  fontStyle,
  lineHeightMultiplier,
  isBookmarked,
  noteCount,
  isTtsActive,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onToggleBookmark,
  onOpenStudy,
  onOpenNote,
  onShareForward,
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
          web: appLanguage === 'en' ? 'system-ui, -apple-system, sans-serif' : '"Noto Sans KR", system-ui, sans-serif',
        });

  const bodyText = item.segmentText?.text ?? strings.card.missingEditionText;
  const isLongText = bodyText.length > 140 || bodyText.includes('\n');
  const ttsAllowed = canReadWithTTS(item.rights);
  const shareTextAllowed = canShareSegmentText(item.rights);

  const workTitle = getLocalizedWorkTitle(item.work, appLanguage);
  const sourceRef = getLocalizedSourceRef(item.segment, appLanguage);
  const editionLabel = getLocalizedEditionLabel(item.edition, appLanguage);
  const translator = getLocalizedTranslator(item.edition, appLanguage);
  const originalEditionLabel = item.originalEdition
    ? getLocalizedEditionLabel(item.originalEdition, appLanguage)
    : '';

  const workBadgeText = getWorkEmblem(item.work.id, workTitle, appLanguage);

  // Serene ambient full-screen canvas palette
  const canvasBg = isDark ? '#151F1B' : '#F6F2E8';
  const haloTopColor = isDark ? 'rgba(65, 98, 82, 0.28)' : 'rgba(145, 162, 141, 0.22)';
  const haloBottomColor = isDark ? 'rgba(197, 162, 106, 0.14)' : 'rgba(197, 162, 106, 0.18)';
  const railPillBg = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(36, 59, 48, 0.08)';
  const railIconColor = isDark ? '#F5F1E8' : '#243B30';
  const railLabelColor = isDark ? '#DCE3DC' : '#314C40';

  // Ensure rightRail never collides with floatingTopBar on compact screens
  const topClearance = topInset + 56;
  const availRailHeight = Math.max(260, cardHeight - topClearance - 12);
  const isCompactRail = availRailHeight < 460;
  const railGap = isCompactRail ? 4 : 10;
  const avatarCircleSize = isCompactRail ? 36 : 44;
  const iconCircleSize = isCompactRail ? 34 : 42;
  const audioDiscSize = isCompactRail ? 32 : 38;
  const railIconSize = isCompactRail ? 18 : 22;
  const railFontSize = isCompactRail ? 10 : 11;

  return (
    <View style={[styles.fullContainer, { height: cardHeight, backgroundColor: canvasBg }]}>
      {/* Ambient Meditative Decorative Layers */}
      <View pointerEvents="none" style={[styles.haloTop, { backgroundColor: haloTopColor }]} />
      <View pointerEvents="none" style={[styles.haloBottom, { backgroundColor: haloBottomColor }]} />

      {/* Center Verse Content */}
      <View
        style={[
          styles.centerStage,
          {
            paddingTop: topInset + (isCompactRail ? 52 : 64),
            paddingBottom: isCompactRail ? 112 : 128,
          },
        ]}
      >
        <View style={styles.counterRow}>
          <View
            style={[
              styles.counterPill,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(49,76,64,0.09)',
                borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(49,76,64,0.16)',
              },
            ]}
          >
            <Text style={[styles.counterText, { color: palette.accent }]}>
              {index + 1} / {total}
            </Text>
          </View>
          {item.rights?.isSyntheticTestFixture && (
            <Text style={[styles.fixtureBadge, { color: palette.textSecondary }]}>
              {strings.card.syntheticBadge}
            </Text>
          )}
        </View>

        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={isLongText}
        >
          {showOriginal && item.originalText && (
            <View
              style={[
                styles.originalBox,
                {
                  borderColor: palette.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)',
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

          <Text
            style={[
              styles.verseText,
              {
                color: palette.textPrimary,
                fontSize,
                lineHeight,
                fontFamily,
              },
            ]}
          >
            {bodyText}
          </Text>

          {item.segmentText?.paraphrase && (
            <Text style={[styles.paraphraseText, { color: palette.textSecondary }]}>
              {strings.card.paraphrasePrefix}: {item.segmentText.paraphrase}
            </Text>
          )}

          {isLongText && (
            <Pressable
              onPress={() => setLongReadOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={strings.card.readFull}
              style={[styles.expandReadBtn, { borderColor: palette.primary }]}
            >
              <Ionicons name="expand-outline" size={16} color={palette.primary} />
              <Text style={[styles.expandReadText, { color: palette.primary }]}>
                {strings.card.readFull}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {/* Bottom-Left Floating Metadata Overlay */}
      <View style={styles.bottomLeftOverlay}>
        <Text style={[styles.bottomWorkTitle, { color: palette.textPrimary }]} numberOfLines={1}>
          {workTitle} · {sourceRef}
        </Text>

        <View style={styles.bottomMetaLinks}>
          <Text style={[styles.bottomAttribution, { color: palette.textSecondary }]} numberOfLines={1}>
            {editionLabel} · {translator}
          </Text>
          <View style={styles.inlineLinkRow}>
            <Pressable
              onPress={onOpenStudy}
              accessibilityRole="button"
              accessibilityLabel={strings.card.details}
              style={styles.inlineLinkBtn}
            >
              <Text style={[styles.inlineLinkText, { color: palette.primary }]}>
                {strings.card.details}
              </Text>
            </Pressable>
            {item.originalText && (
              <>
                <Text style={{ color: palette.textSecondary, fontSize: 12 }}>|</Text>
                <Pressable
                  onPress={() => setShowOriginal((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showOriginal ? strings.card.hideOriginal : strings.card.showOriginal
                  }
                  style={styles.inlineLinkBtn}
                >
                  <Text style={[styles.inlineLinkText, { color: palette.primary }]}>
                    {showOriginal ? strings.card.hideOriginal : strings.card.showOriginal}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Accessible Up / Down Step Controls */}
        <View style={styles.stepControlsRow}>
          <Pressable
            onPress={onPrev}
            disabled={!canGoPrev}
            accessibilityRole="button"
            accessibilityLabel={strings.card.prev}
            style={[
              styles.stepBtn,
              {
                backgroundColor: railPillBg,
                opacity: canGoPrev ? 1 : 0.35,
              },
            ]}
          >
            <Ionicons name="chevron-up" size={16} color={railIconColor} />
            <Text style={[styles.stepBtnText, { color: railIconColor }]}>{strings.card.prev}</Text>
          </Pressable>

          <Pressable
            onPress={onNext}
            disabled={!canGoNext}
            accessibilityRole="button"
            accessibilityLabel={strings.card.next}
            style={[
              styles.stepBtn,
              {
                backgroundColor: railPillBg,
                opacity: canGoNext ? 1 : 0.35,
              },
            ]}
          >
            <Text style={[styles.stepBtnText, { color: railIconColor }]}>{strings.card.next}</Text>
            <Ionicons name="chevron-down" size={16} color={railIconColor} />
          </Pressable>
        </View>
      </View>

      {/* Right-Side Vertical Action Rail */}
      <View
        style={[
          styles.rightRail,
          {
            top: topClearance,
            bottom: isCompactRail ? 10 : 14,
            gap: railGap,
          },
        ]}
      >
        {/* Creator/Work Emblem Avatar + Original Toggle */}
        <Pressable
          onPress={() => (item.originalText ? setShowOriginal((v) => !v) : onOpenStudy())}
          accessibilityRole="button"
          accessibilityLabel={
            item.originalText ? strings.card.showOriginal : strings.card.study
          }
          hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
          style={[
            styles.avatarButton,
            {
              minHeight: avatarCircleSize + 8,
              marginBottom: isCompactRail ? 0 : 4,
            },
          ]}
        >
          <View
            style={[
              styles.avatarCircle,
              {
                width: avatarCircleSize,
                height: avatarCircleSize,
                borderRadius: avatarCircleSize / 2,
                backgroundColor: isDark ? '#273A32' : '#314C40',
                borderColor: '#C5A26A',
              },
            ]}
          >
            <Text style={[styles.avatarText, isCompactRail && { fontSize: 11 }]}>
              {workBadgeText}
            </Text>
          </View>
          <View style={[styles.avatarPlusBadge, { backgroundColor: '#C5A26A' }]}>
            <Ionicons name={showOriginal ? 'checkmark' : 'add'} size={12} color="#19221F" />
          </View>
        </Pressable>

        {/* Save / Bookmark */}
        <RailAction
          icon={isBookmarked ? 'heart' : 'heart-outline'}
          label={isBookmarked ? strings.card.liked : strings.card.like}
          iconColor={isBookmarked ? '#E36458' : railIconColor}
          labelColor={isBookmarked ? '#E36458' : railLabelColor}
          pillBg={railPillBg}
          circleSize={iconCircleSize}
          iconSize={railIconSize}
          fontSize={railFontSize}
          compact={isCompactRail}
          onPress={onToggleBookmark}
          accessibilityLabel={isBookmarked ? strings.card.liked : strings.card.like}
        />

        {/* Study */}
        <RailAction
          icon="chatbubble-ellipses-outline"
          label={strings.card.study}
          iconColor={railIconColor}
          labelColor={railLabelColor}
          pillBg={railPillBg}
          circleSize={iconCircleSize}
          iconSize={railIconSize}
          fontSize={railFontSize}
          compact={isCompactRail}
          onPress={onOpenStudy}
          accessibilityLabel={strings.card.study}
        />

        {/* Note */}
        <RailAction
          icon={noteCount > 0 ? 'bookmark' : 'bookmark-outline'}
          label={noteCount > 0 ? `${strings.card.note} ${noteCount}` : strings.card.note}
          iconColor={noteCount > 0 ? palette.accent : railIconColor}
          labelColor={noteCount > 0 ? palette.accent : railLabelColor}
          pillBg={railPillBg}
          circleSize={iconCircleSize}
          iconSize={railIconSize}
          fontSize={railFontSize}
          compact={isCompactRail}
          onPress={onOpenNote}
          accessibilityLabel={strings.card.note}
        />

        {/* Forward / Share */}
        <RailAction
          icon="arrow-redo-outline"
          label={strings.card.forward}
          iconColor={shareTextAllowed ? railIconColor : palette.secondary}
          labelColor={railLabelColor}
          pillBg={railPillBg}
          circleSize={iconCircleSize}
          iconSize={railIconSize}
          fontSize={railFontSize}
          compact={isCompactRail}
          onPress={onShareForward}
          accessibilityLabel={strings.card.forward}
        />

        {/* Viral Card */}
        <RailAction
          icon="sparkles-outline"
          label={strings.card.viral}
          iconColor={palette.accent}
          labelColor={railLabelColor}
          pillBg={railPillBg}
          circleSize={iconCircleSize}
          iconSize={railIconSize}
          fontSize={railFontSize}
          compact={isCompactRail}
          onPress={onOpenViralCard}
          accessibilityLabel={strings.card.viral}
        />

        {/* Audio / TTS */}
        <Pressable
          onPress={onToggleTts}
          accessibilityRole="button"
          hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
          accessibilityLabel={isTtsActive ? strings.card.ttsStop : strings.card.ttsPlay}
          style={[styles.audioDiscWrap, isCompactRail && { minHeight: 40, marginTop: 0 }]}
        >
          <View
            style={[
              styles.audioDisc,
              {
                width: audioDiscSize,
                height: audioDiscSize,
                borderRadius: audioDiscSize / 2,
                backgroundColor: isTtsActive ? '#C5A26A' : isDark ? '#25352E' : '#314C40',
                borderColor: isTtsActive ? '#F7F4EC' : '#C5A26A',
                opacity: ttsAllowed ? 1 : 0.45,
              },
            ]}
          >
            <Ionicons
              name={isTtsActive ? 'stop' : 'musical-notes-outline'}
              size={isCompactRail ? 15 : 18}
              color={isTtsActive ? '#19221F' : '#F7F4EC'}
            />
          </View>
          <Text style={[styles.railLabel, { color: railLabelColor, fontSize: railFontSize }]}>
            {isTtsActive ? strings.card.ttsStop : strings.card.ttsPlay}
          </Text>
        </Pressable>
      </View>

      {/* Long Text Internal Reader Modal */}
      <Modal
        visible={longReadOpen}
        animationType="slide"
        onRequestClose={() => setLongReadOpen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.primary }]}>
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
                styles.verseText,
                { color: palette.textPrimary, fontSize, lineHeight, fontFamily },
              ]}
            >
              {bodyText}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function getWorkEmblem(workId: string, localizedTitle: string, lang: AppLanguage): string {
  if (lang === 'en') {
    const enMap: Record<string, string> = {
      'work-diamond': 'DM',
      'work-heart': 'HT',
      'work-dhp': 'DH',
      'work-kp': 'KP',
      'work-sn56-11': 'SN',
      'work-snp': 'NP',
      'work-iti': 'IT',
      'work-ud': 'UD',
    };
    return enMap[workId] ?? localizedTitle.slice(0, 2).toUpperCase();
  }
  const koMap: Record<string, string> = {
    'work-diamond': '금강',
    'work-heart': '반야',
    'work-cheonsu': '천수',
  };
  return koMap[workId] ?? localizedTitle.replace(/\s*\(.*\)/, '').slice(0, 2);
}

function RailAction({
  icon,
  label,
  iconColor,
  labelColor,
  pillBg,
  circleSize,
  iconSize,
  fontSize,
  compact,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  iconColor: string;
  labelColor: string;
  pillBg: string;
  circleSize: number;
  iconSize: number;
  fontSize: number;
  compact: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
      style={[styles.railBtn, compact && { minHeight: 38, gap: 1 }]}
    >
      <View
        style={[
          styles.railIconCircle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: pillBg,
          },
        ]}
      >
        <Ionicons name={icon} size={iconSize} color={iconColor} />
      </View>
      <Text style={[styles.railLabel, { color: labelColor, fontSize }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  haloTop: {
    position: 'absolute',
    top: -110,
    left: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  haloBottom: {
    position: 'absolute',
    bottom: -120,
    right: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  centerStage: {
    flex: 1,
    paddingLeft: 22,
    paddingRight: 86,
    justifyContent: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  counterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fixtureBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  bodyScroll: {
    flexGrow: 0,
    maxHeight: '100%',
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  originalBox: {
    padding: 12,
    borderRadius: 12,
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
  verseText: {
    fontWeight: '600',
  },
  paraphraseText: {
    fontSize: 14,
    lineHeight: 21,
  },
  expandReadBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: MIN_TOUCH_SIZE,
  },
  expandReadText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomLeftOverlay: {
    position: 'absolute',
    left: 20,
    right: 88,
    bottom: 16,
    gap: 4,
  },
  bottomWorkTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  bottomMetaLinks: {
    gap: 2,
  },
  bottomAttribution: {
    fontSize: 12,
  },
  inlineLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  inlineLinkBtn: {
    minHeight: 28,
    justifyContent: 'center',
  },
  inlineLinkText: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  stepControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    minHeight: 34,
    borderRadius: 12,
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rightRail: {
    position: 'absolute',
    right: 10,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  avatarButton: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#F7F4EC',
    fontSize: 13,
    fontWeight: '800',
  },
  avatarPlusBadge: {
    position: 'absolute',
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railBtn: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  railIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  audioDiscWrap: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: 2,
  },
  audioDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
