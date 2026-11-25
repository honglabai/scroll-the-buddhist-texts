import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoteModal } from '../../src/components/NoteModal';
import { StudyModal } from '../../src/components/StudyModal';
import { VerseCard } from '../../src/components/VerseCard';
import { MIN_TOUCH_SIZE } from '../../src/components/theme';
import { TOPICS } from '../../src/domain/readingRules';
import { useApp, type FeedItem } from '../../src/features/app/AppProvider';

export default function HomeScreen() {
  const router = useRouter();
  const {
    ready,
    error,
    palette,
    settings,
    reduceMotionEffective,
    currentWork,
    currentMode,
    activeTopic,
    editionsForCurrentWork,
    currentEdition,
    feedItems,
    currentSegmentIndex,
    targetSegmentId,
    bookmarks,
    notes,
    ttsActiveSegmentId,
    selectWorkAndSegment,
    navigateToSegmentById,
    selectTopicFeed,
    switchEdition,
    onSegmentFocused,
    toggleBookmark,
    shareCurrentVerse,
    toggleTts,
    clearTargetSegment,
  } = useApp();

  const [feedHeight, setFeedHeight] = useState(560);
  const [editionModalOpen, setEditionModalOpen] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [studyItem, setStudyItem] = useState<FeedItem | null>(null);
  const [noteItem, setNoteItem] = useState<FeedItem | null>(null);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<FeedItem>>(null);
  const bookmarkedIds = new Set(bookmarks.map((b) => b.segmentId));
  const notedIds = new Set(notes.map((n) => n.segmentId));

  useEffect(() => {
    if (!targetSegmentId || feedItems.length === 0) return;
    const idx = feedItems.findIndex((i) => i.segment.id === targetSegmentId);
    if (idx >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: idx,
          animated: !reduceMotionEffective,
        });
      }, 60);
    }
    clearTargetSegment();
  }, [targetSegmentId, feedItems, reduceMotionEffective, clearTargetSegment]);

  const onFeedLayout = (e: { nativeEvent: { layout: { height: number } } }) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 200 && Math.abs(h - feedHeight) > 4) {
      setFeedHeight(h);
    }
  };

  const [viewabilityConfig] = useState({ itemVisiblePercentThreshold: 60 });
  const onSegmentFocusedRef = useRef(onSegmentFocused);
  useEffect(() => {
    onSegmentFocusedRef.current = onSegmentFocused;
  }, [onSegmentFocused]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index?: number | null; item: unknown }[] }) => {
      const first = viewableItems[0];
      if (first && typeof first.index === 'number' && first.item) {
        const item = first.item as FeedItem;
        onSegmentFocusedRef.current(item.segment.id, first.index);
      }
    },
    []
  );

  const scrollToIndex = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= feedItems.length) return;
      flatListRef.current?.scrollToIndex({
        index: idx,
        animated: !reduceMotionEffective,
      });
      const item = feedItems[idx];
      if (item) {
        onSegmentFocusedRef.current(item.segment.id, idx);
      }
    },
    [feedItems, reduceMotionEffective]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        scrollToIndex(currentSegmentIndex + 1);
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        scrollToIndex(currentSegmentIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSegmentIndex, scrollToIndex]);

  if (!ready) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ color: palette.textSecondary, marginTop: 12 }}>경전을 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.danger, fontSize: 16, fontWeight: '700' }}>오류</Text>
        <Text style={{ color: palette.textPrimary, marginTop: 8 }}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: palette.border }]}>
        <View style={styles.brandGroup}>
          <View style={[styles.lotusBadge, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Ionicons name="flower-outline" size={20} color={palette.primary} />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: palette.primary }]}>마음스크롤</Text>
            <Text style={[styles.brandSub, { color: palette.textSecondary }]}>Dharma Scroll</Text>
          </View>
        </View>

        <View style={styles.modeChips}>
          <Pressable
            onPress={() => {
              if (currentWork) selectWorkAndSegment(currentWork.id, undefined, 'sequential');
            }}
            accessibilityRole="button"
            accessibilityLabel="순차 읽기 모드"
            style={[
              styles.chip,
              {
                backgroundColor: currentMode === 'sequential' ? palette.primary : palette.card,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={{ color: currentMode === 'sequential' ? palette.textOnPrimary : palette.textPrimary, fontSize: 12, fontWeight: '600' }}>
              순차 읽기
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTopicModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="주제 읽기 모드 선택"
            style={[
              styles.chip,
              {
                backgroundColor: currentMode === 'topic' ? palette.primary : palette.card,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={{ color: currentMode === 'topic' ? palette.textOnPrimary : palette.textPrimary, fontSize: 12, fontWeight: '600' }}>
              {activeTopic ? `주제: ${activeTopic}` : '주제 읽기'}
            </Text>
          </Pressable>

          {currentMode === 'sequential' && (
            <Pressable
              onPress={() => setEditionModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="번역 판본 선택"
              style={[styles.chip, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                {currentEdition?.lang.toUpperCase() ?? '판본'}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => router.push('/(tabs)/my')}
            accessibilityRole="button"
            accessibilityLabel="설정 열기"
            style={[styles.iconChip, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <Ionicons name="settings-outline" size={16} color={palette.primary} />
          </Pressable>
        </View>
      </View>

      {noticeBanner && (
        <View style={[styles.banner, { backgroundColor: palette.highlightBg }]}>
          <Text style={{ color: palette.textPrimary, fontSize: 13, flex: 1 }}>{noticeBanner}</Text>
          <Pressable onPress={() => setNoticeBanner(null)}>
            <Ionicons name="close" size={18} color={palette.textPrimary} />
          </Pressable>
        </View>
      )}

      {/* Vertical Feed */}
      <View style={styles.feedWrapper} onLayout={onFeedLayout}>
        {feedItems.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ color: palette.textSecondary, fontSize: 15 }}>표시할 경전 구절이 없습니다.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={feedItems}
            keyExtractor={(item) => item.segment.id}
            pagingEnabled
            snapToInterval={feedHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: feedHeight,
              offset: feedHeight * index,
              index,
            })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScrollToIndexFailed={() => {}}
            ListFooterComponent={
              <View style={[styles.endCard, { height: feedHeight, backgroundColor: palette.background }]}>
                <View style={[styles.endInner, { backgroundColor: palette.card, borderColor: palette.border }]}>
                  <Ionicons name="checkmark-circle-outline" size={44} color={palette.primary} />
                  <Text style={[styles.endTitle, { color: palette.primary }]}>
                    {currentMode === 'topic' ? `${activeTopic} 주제 읽기를 마쳤습니다` : `${currentWork?.title} 끝까지 읽었습니다`}
                  </Text>
                  <Text style={[styles.endDesc, { color: palette.textSecondary }]}>
                    잠시 숨을 고르며 오늘 마음에 남았던 구절을 떠올려 보세요.
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(tabs)/library')}
                    accessibilityRole="button"
                    accessibilityLabel="다음 경전 선택하기"
                    style={[styles.endBtn, { backgroundColor: palette.primary }]}
                  >
                    <Text style={{ color: palette.textOnPrimary, fontWeight: '700' }}>다음 경전 선택하기</Text>
                  </Pressable>
                </View>
              </View>
            }
            renderItem={({ item, index }) => (
              <VerseCard
                item={item}
                index={index}
                total={feedItems.length}
                cardHeight={feedHeight}
                palette={palette}
                fontScaleLevel={settings.fontScaleLevel}
                fontStyle={settings.fontStyle}
                lineHeightMultiplier={settings.lineHeightMultiplier}
                isBookmarked={bookmarkedIds.has(item.segment.id)}
                hasNote={notedIds.has(item.segment.id)}
                isTtsActive={ttsActiveSegmentId === item.segment.id}
                canGoPrev={index > 0}
                canGoNext={index < feedItems.length - 1}
                onPrev={() => scrollToIndex(index - 1)}
                onNext={() => scrollToIndex(index + 1)}
                onToggleBookmark={() => toggleBookmark(item.segment.id, item.edition.id)}
                onOpenStudy={() => setStudyItem(item)}
                onOpenNote={() => setNoteItem(item)}
                onToggleTts={async () => {
                  const errMsg = await toggleTts(item);
                  if (errMsg) setNoticeBanner(errMsg);
                }}
                onShare={async () => {
                  const res = await shareCurrentVerse(item);
                  if (!res.textIncluded) {
                    Alert.alert('공유 안내', '이 판본은 원문 본문 공유가 제한되어 출처 정보만 공유되었습니다.');
                  }
                }}
              />
            )}
          />
        )}
      </View>

      {/* Study Modal */}
      <StudyModal
        visible={Boolean(studyItem)}
        item={studyItem}
        onClose={() => setStudyItem(null)}
        onNavigateToSegment={async (segId) => {
          const targetIdx = feedItems.findIndex((f) => f.segment.id === segId);
          if (targetIdx >= 0) {
            scrollToIndex(targetIdx);
          } else {
            const moved = await navigateToSegmentById(segId);
            if (!moved) {
              setNoticeBanner('해당 구절을 찾을 수 없습니다.');
            }
          }
        }}
      />

      {/* Note Modal */}
      <NoteModal visible={Boolean(noteItem)} item={noteItem} onClose={() => setNoteItem(null)} />

      {/* Edition Selector Modal */}
      <Modal visible={editionModalOpen} transparent animationType="fade" onRequestClose={() => setEditionModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditionModalOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}>
            <Text style={[styles.sheetTitle, { color: palette.primary }]}>번역 및 원문 판본 선택</Text>
            {editionsForCurrentWork.map((ed) => {
              const selected = currentEdition?.id === ed.id;
              return (
                <Pressable
                  key={ed.id}
                  onPress={async () => {
                    setEditionModalOpen(false);
                    const res = await switchEdition(ed.id);
                    if (!res.found && res.message) {
                      setNoticeBanner(res.message);
                    }
                  }}
                  style={[
                    styles.sheetRow,
                    {
                      borderColor: palette.border,
                      backgroundColor: selected ? palette.card : 'transparent',
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>{ed.label}</Text>
                    <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                      {ed.translator} · {ed.licenseId}
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark" size={20} color={palette.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Topic Selector Modal */}
      <Modal visible={topicModalOpen} transparent animationType="fade" onRequestClose={() => setTopicModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTopicModalOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: palette.surfaceElevated, borderColor: palette.border, maxHeight: '70%' }]}>
            <Text style={[styles.sheetTitle, { color: palette.primary }]}>주제별 읽기 선택</Text>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {TOPICS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={async () => {
                    setTopicModalOpen(false);
                    await selectTopicFeed(t.id);
                  }}
                  style={[styles.sheetRow, { borderColor: palette.border }]}
                >
                  <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>{t.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lotusBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: { fontSize: 18, fontWeight: '800' },
  brandSub: { fontSize: 11 },
  modeChips: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  feedWrapper: { flex: 1 },
  endCard: { padding: 24, justifyContent: 'center' },
  endInner: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  endTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  endDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  endBtn: {
    marginTop: 8,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: MIN_TOUCH_SIZE,
  },
});
