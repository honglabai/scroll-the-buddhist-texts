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
import type { FeedItem } from '../features/app/AppProvider';
import { canReadWithTTS, canShareSegmentText } from '../domain/readingRules';
import type { FontScaleLevel } from '../domain/types';
import { getFontSize, MIN_TOUCH_SIZE, type ThemePalette } from './theme';

interface VerseCardProps {
  item: FeedItem;
  index: number;
  total: number;
  cardHeight: number;
  palette: ThemePalette;
  fontScaleLevel: FontScaleLevel;
  fontStyle: 'sans' | 'serif';
  lineHeightMultiplier: number;
  isBookmarked: boolean;
  hasNote: boolean;
  isTtsActive: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleBookmark: () => void;
  onOpenStudy: () => void;
  onOpenNote: () => void;
  onToggleTts: () => void;
  onShare: () => void;
}

export function VerseCard({
  item,
  index,
  total,
  cardHeight,
  palette,
  fontScaleLevel,
  fontStyle,
  lineHeightMultiplier,
  isBookmarked,
  hasNote,
  isTtsActive,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onToggleBookmark,
  onOpenStudy,
  onOpenNote,
  onToggleTts,
  onShare,
}: VerseCardProps) {
  const [longReadOpen, setLongReadOpen] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const fontSize = getFontSize(fontScaleLevel);
  const lineHeight = Math.round(fontSize * lineHeightMultiplier);
  const fontFamily =
    fontStyle === 'serif'
      ? Platform.select({ ios: 'AppleMyungjo', android: 'serif', web: '"Noto Serif KR", Georgia, serif' })
      : Platform.select({ web: '"Noto Sans KR", system-ui, sans-serif' });
  const bodyText = item.segmentText?.text ?? '선택한 판본에서 이 구절의 번역을 아직 준비 중입니다.';
  const isLongText = bodyText.length > 140 || bodyText.includes('\n');
  const ttsAllowed = canReadWithTTS(item.rights);
  const shareTextAllowed = canShareSegmentText(item.rights);

  return (
    <View
      style={[
        styles.container,
        {
          height: cardHeight,
          backgroundColor: palette.background,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        {/* Top meta */}
        <View style={styles.metaHeader}>
          <View style={styles.metaLeft}>
            <Text style={[styles.workTitle, { color: palette.primary }]} numberOfLines={1}>
              {item.work.title}
            </Text>
            <Text style={[styles.sourceRef, { color: palette.textSecondary }]}>
              {item.segment.sourceRef}
            </Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={[styles.counter, { color: palette.accent }]}>
              {index + 1} / {total}
            </Text>
            {item.originalText && (
              <Pressable
                onPress={() => setShowOriginal((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showOriginal ? '원문 숨기기' : '원문 대조 보기'}
                style={[styles.pillButton, { borderColor: palette.border }]}
              >
                <Text style={[styles.pillText, { color: palette.primary }]}>
                  {showOriginal ? '원문 닫기' : '원문 대조'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Body */}
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={isLongText}
        >
          {showOriginal && item.originalText && (
            <View style={[styles.originalBox, { borderColor: palette.border, backgroundColor: palette.background }]}>
              <Text style={[styles.originalLabel, { color: palette.textSecondary }]}>
                원문 ({item.originalEdition?.label})
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
              쉬운 말: {item.segmentText.paraphrase}
            </Text>
          )}

          {isLongText && (
            <Pressable
              onPress={() => setLongReadOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="장문 전체 화면으로 읽기"
              style={[styles.expandReadBtn, { borderColor: palette.primary }]}
            >
              <Ionicons name="expand-outline" size={16} color={palette.primary} />
              <Text style={[styles.expandReadText, { color: palette.primary }]}>
                전체 읽기 모드
              </Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Source attribution (always visible) */}
        <View style={[styles.attributionRow, { borderTopColor: palette.border }]}>
          <Text style={[styles.attributionText, { color: palette.textSecondary }]} numberOfLines={2}>
            판본: {item.edition.label} · 번역: {item.edition.translator} · {item.rights?.license ?? '출처 확인'}
          </Text>
          {item.rights?.isSyntheticTestFixture && (
            <Text style={[styles.fixtureBadge, { color: palette.accent }]}>
              테스트 시연용 문장
            </Text>
          )}
        </View>

        {/* Action buttons (48dp touch targets) */}
        <View style={styles.actionsRow}>
          <ActionButton
            icon={isBookmarked ? 'heart' : 'heart-outline'}
            label="담기"
            active={isBookmarked}
            palette={palette}
            onPress={onToggleBookmark}
            accessibilityLabel={isBookmarked ? '마음에 담기 취소' : '마음에 담기'}
          />
          <ActionButton
            icon="book-outline"
            label="해설"
            palette={palette}
            onPress={onOpenStudy}
            accessibilityLabel="구절 해설 및 원어 탐구 열기"
          />
          <ActionButton
            icon={hasNote ? 'document-text' : 'create-outline'}
            label="기록"
            active={hasNote}
            palette={palette}
            onPress={onOpenNote}
            accessibilityLabel="비공개 수행 기록 작성 및 보기"
          />
          <ActionButton
            icon={isTtsActive ? 'stop-circle-outline' : 'volume-high-outline'}
            label={isTtsActive ? '정지' : '듣기'}
            active={isTtsActive}
            muted={!ttsAllowed}
            palette={palette}
            onPress={onToggleTts}
            accessibilityLabel={ttsAllowed ? '음성으로 듣기' : '음성 낭독 미지원 판본'}
          />
          <ActionButton
            icon="share-social-outline"
            label="공유"
            muted={!shareTextAllowed}
            palette={palette}
            onPress={onShare}
            accessibilityLabel={shareTextAllowed ? '구절 공유하기' : '출처 링크만 공유하기'}
          />
        </View>

        {/* Accessibility Prev / Next navigation */}
        <View style={styles.navRow}>
          <Pressable
            onPress={onPrev}
            disabled={!canGoPrev}
            accessibilityRole="button"
            accessibilityLabel="이전 구절로 이동"
            style={[
              styles.navBtn,
              { borderColor: palette.border, opacity: canGoPrev ? 1 : 0.35 },
            ]}
          >
            <Ionicons name="arrow-up" size={18} color={palette.primary} />
            <Text style={[styles.navBtnText, { color: palette.primary }]}>이전</Text>
          </Pressable>

          <Pressable
            onPress={onNext}
            disabled={!canGoNext}
            accessibilityRole="button"
            accessibilityLabel="다음 구절로 이동"
            style={[
              styles.navBtn,
              { borderColor: palette.border, opacity: canGoNext ? 1 : 0.35 },
            ]}
          >
            <Text style={[styles.navBtnText, { color: palette.primary }]}>다음</Text>
            <Ionicons name="arrow-down" size={18} color={palette.primary} />
          </Pressable>
        </View>
      </View>

      {/* Long Text Internal Reader Modal */}
      <Modal visible={longReadOpen} animationType="slide" onRequestClose={() => setLongReadOpen(false)}>
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.primary }]}>
              {item.work.title} · {item.segment.sourceRef}
            </Text>
            <Pressable
              onPress={() => setLongReadOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="전체 읽기 닫기"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={palette.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={[styles.verseText, { color: palette.textPrimary, fontSize, lineHeight, fontFamily }]}>
              {bodyText}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  active,
  muted,
  palette,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  muted?: boolean;
  palette: ThemePalette;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const color = active ? palette.accent : muted ? palette.secondary : palette.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.actionBtn}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  metaLeft: {
    flex: 1,
  },
  metaRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  workTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sourceRef: {
    fontSize: 13,
    marginTop: 2,
  },
  counter: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 32,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bodyScroll: {
    flex: 1,
    marginVertical: 10,
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  originalBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  originalLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  originalText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  verseText: {
    fontWeight: '500',
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
  attributionRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginBottom: 4,
    gap: 2,
  },
  attributionText: {
    fontSize: 12,
  },
  fixtureBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionBtn: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  navBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '600',
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
