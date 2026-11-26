import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoteModal } from '../../src/components/NoteModal';
import { StudyModal } from '../../src/components/StudyModal';
import { VerseCard } from '../../src/components/VerseCard';
import { ViralShareModal } from '../../src/components/ViralShareModal';
import { MIN_TOUCH_SIZE } from '../../src/components/theme';
import { TOPICS } from '../../src/domain/readingRules';
import { useApp, type FeedItem } from '../../src/features/app/AppProvider';
import {
  getLocalizedEditionLabel,
  getLocalizedTopicLabel,
  getLocalizedTranslator,
  getLocalizedWorkTitle,
} from '../../src/i18n/strings';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    ready,
    error,
    palette,
    appLanguage,
    strings,
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
    setAppLanguage,
    onSegmentFocused,
    toggleBookmark,
    shareCurrentVerse,
    toggleTts,
    clearTargetSegment,
  } = useApp();

  const [feedHeight, setFeedHeight] = useState(640);
  const [editionModalOpen, setEditionModalOpen] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [studyItem, setStudyItem] = useState<FeedItem | null>(null);
  const [noteItem, setNoteItem] = useState<FeedItem | null>(null);
  const [viralItem, setViralItem] = useState<FeedItem | null>(null);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);
  const [isWebFullscreen, setIsWebFullscreen] = useState(false);
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches ||
      Boolean((window.navigator as { standalone?: boolean }).standalone);
    const onFsChange = () => {
      setIsWebFullscreen(Boolean(document.fullscreenElement));
    };
    Promise.resolve().then(() => {
      setIsStandalonePwa(standalone);
      setIsWebFullscreen(Boolean(document.fullscreenElement));
    });
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleWebFullscreen = async () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setNoticeBanner(strings.home.fullscreenHint);
    }
  };

  const flatListRef = useRef<FlatList<FeedItem>>(null);
  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b) => b.segmentId)), [bookmarks]);
  const noteCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of notes) {
      map.set(n.segmentId, (map.get(n.segmentId) ?? 0) + 1);
    }
    return map;
  }, [notes]);

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
        <Text style={{ color: palette.textSecondary, marginTop: 12 }}>{strings.home.loading}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.danger, fontSize: 16, fontWeight: '700' }}>
          {strings.home.errorTitle}
        </Text>
        <Text style={{ color: palette.textPrimary, marginTop: 8 }}>{error}</Text>
      </SafeAreaView>
    );
  }

  const isDark = palette.mode === 'dark';
  const outerBackdrop = isDark ? '#0D1310' : '#EAE4D5';
  const topOverlayText = isDark ? '#F2EFE6' : '#243B30';
  const topOverlayMuted = isDark ? 'rgba(242,239,230,0.65)' : 'rgba(36,59,48,0.58)';
  const currentWorkTitle = currentWork ? getLocalizedWorkTitle(currentWork, appLanguage) : '';
  const activeTopicDisplay = activeTopic ? getLocalizedTopicLabel(activeTopic, appLanguage) : null;

  return (
    <View style={[styles.screenOuter, { backgroundColor: outerBackdrop }]}>
      <View style={styles.stageColumn} onLayout={onFeedLayout}>
        {/* Floating Transparent Top Overlay */}
        <View
          style={[
            styles.floatingTopBar,
            {
              paddingTop: Math.max(insets.top, 10),
            },
          ]}
        >
          <Pressable
            onPress={() => setEditionModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={strings.home.editionModalTitle}
            style={styles.topIconBtn}
          >
            <Ionicons name="flower-outline" size={22} color={topOverlayText} />
          </Pressable>

          <View style={styles.topTabsRow}>
            <Pressable
              onPress={() => {
                if (currentWork) selectWorkAndSegment(currentWork.id, undefined, 'sequential');
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: currentMode === 'sequential' }}
              style={styles.topTabBtn}
            >
              <Text
                style={[
                  styles.topTabText,
                  { color: currentMode === 'sequential' ? topOverlayText : topOverlayMuted },
                ]}
              >
                {strings.home.sequential}
              </Text>
              {currentMode === 'sequential' && (
                <View style={[styles.topUnderline, { backgroundColor: topOverlayText }]} />
              )}
            </Pressable>

            <Pressable
              onPress={() => setTopicModalOpen(true)}
              accessibilityRole="tab"
              accessibilityState={{ selected: currentMode === 'topic' }}
              style={styles.topTabBtn}
            >
              <Text
                style={[
                  styles.topTabText,
                  { color: currentMode === 'topic' ? topOverlayText : topOverlayMuted },
                ]}
              >
                {activeTopicDisplay ?? strings.home.topic}
              </Text>
              {currentMode === 'topic' && (
                <View style={[styles.topUnderline, { backgroundColor: topOverlayText }]} />
              )}
            </Pressable>

            <Pressable
              onPress={() => setEditionModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={strings.home.editionModalTitle}
              style={styles.topTabBtn}
            >
              <Text style={[styles.topTabText, { color: topOverlayMuted }]}>
                {currentEdition?.lang.toUpperCase() ?? strings.home.edition}
              </Text>
            </Pressable>
          </View>

          <View style={styles.topRightIcons}>
            <Pressable
              onPress={() => setAppLanguage(appLanguage === 'ko' ? 'en' : 'ko')}
              accessibilityRole="button"
              accessibilityLabel={appLanguage === 'ko' ? 'Switch to English' : '한국어로 전환'}
              style={styles.langTogglePill}
            >
              <Text style={[styles.langToggleText, { color: topOverlayText }]}>
                {appLanguage === 'ko' ? 'EN' : '한글'}
              </Text>
            </Pressable>
            {Platform.OS === 'web' && !isStandalonePwa && (
              <Pressable
                onPress={toggleWebFullscreen}
                accessibilityRole="button"
                accessibilityLabel={isWebFullscreen ? strings.home.fullscreenExit : strings.home.fullscreenEnter}
                style={styles.topIconBtn}
              >
                <Ionicons
                  name={isWebFullscreen ? 'contract-outline' : 'expand-outline'}
                  size={20}
                  color={topOverlayText}
                />
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push('/(tabs)/library')}
              accessibilityRole="button"
              accessibilityLabel={strings.tabs.library}
              style={styles.topIconBtn}
            >
              <Ionicons name="search-outline" size={22} color={topOverlayText} />
            </Pressable>
          </View>
        </View>

        {noticeBanner && (
          <View
            style={[
              styles.floatingBanner,
              {
                top: Math.max(insets.top, 10) + 52,
                backgroundColor: palette.highlightBg,
              },
            ]}
          >
            <Text style={{ color: palette.textPrimary, fontSize: 13, flex: 1 }}>{noticeBanner}</Text>
            <Pressable onPress={() => setNoticeBanner(null)}>
              <Ionicons name="close" size={18} color={palette.textPrimary} />
            </Pressable>
          </View>
        )}

        {/* Full-Screen Vertical Snap Feed */}
        {feedItems.length === 0 ? (
          <View style={[styles.center, { backgroundColor: palette.background }]}>
            <Text style={{ color: palette.textSecondary, fontSize: 15 }}>{strings.home.emptyFeed}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={styles.feedList}
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
                    {currentMode === 'topic' && activeTopicDisplay
                      ? strings.home.endTopic(activeTopicDisplay)
                      : strings.home.endWork(currentWorkTitle)}
                  </Text>
                  <Text style={[styles.endDesc, { color: palette.textSecondary }]}>
                    {strings.home.endDesc}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(tabs)/library')}
                    accessibilityRole="button"
                    accessibilityLabel={strings.home.chooseNext}
                    style={[styles.endBtn, { backgroundColor: palette.primary }]}
                  >
                    <Text style={{ color: palette.textOnPrimary, fontWeight: '700' }}>
                      {strings.home.chooseNext}
                    </Text>
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
                topInset={Math.max(insets.top, 10)}
                palette={palette}
                appLanguage={appLanguage}
                fontScaleLevel={settings.fontScaleLevel}
                fontStyle={settings.fontStyle}
                lineHeightMultiplier={settings.lineHeightMultiplier}
                isBookmarked={bookmarkedIds.has(item.segment.id)}
                noteCount={noteCountMap.get(item.segment.id) ?? 0}
                isTtsActive={ttsActiveSegmentId === item.segment.id}
                canGoPrev={index > 0}
                canGoNext={index < feedItems.length - 1}
                onPrev={() => scrollToIndex(index - 1)}
                onNext={() => scrollToIndex(index + 1)}
                onToggleBookmark={() =>
                  toggleBookmark(item.segment.id, item.edition.id, strings.saved.defaultFolder)
                }
                onOpenStudy={() => setStudyItem(item)}
                onOpenNote={() => setNoteItem(item)}
                onShareForward={async () => {
                  const res = await shareCurrentVerse(item);
                  if (!res.textIncluded) {
                    Alert.alert(
                      strings.home.shareRestrictedAlertTitle,
                      strings.home.shareRestrictedAlertBody
                    );
                  }
                }}
                onOpenViralCard={() => setViralItem(item)}
                onToggleTts={async () => {
                  const errMsg = await toggleTts(item);
                  if (errMsg) setNoticeBanner(errMsg);
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
              setNoticeBanner(strings.home.missingSegment);
            }
          }
        }}
      />

      {/* Note Modal */}
      <NoteModal visible={Boolean(noteItem)} item={noteItem} onClose={() => setNoteItem(null)} />

      {/* Viral Share Card Modal */}
      <ViralShareModal
        visible={Boolean(viralItem)}
        item={viralItem}
        onClose={() => setViralItem(null)}
      />

      {/* Edition Selector Modal */}
      <Modal
        visible={editionModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditionModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setEditionModalOpen(false)}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: palette.primary }]}>
              {strings.home.editionModalTitle}
            </Text>
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
                    <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>
                      {getLocalizedEditionLabel(ed, appLanguage)}
                    </Text>
                    <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                      {getLocalizedTranslator(ed, appLanguage)} · {ed.licenseId}
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
      <Modal
        visible={topicModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTopicModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setTopicModalOpen(false)}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
                maxHeight: '70%',
              },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: palette.primary }]}>
              {strings.home.topicModalTitle}
            </Text>
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
                  <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>
                    {getLocalizedTopicLabel(t.id, appLanguage)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenOuter: {
    flex: 1,
    alignItems: 'center',
  },
  stageColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    position: 'relative',
    overflow: 'hidden',
  },
  feedList: {
    flex: 1,
    width: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  floatingTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  topIconBtn: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  langTogglePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(197,162,106,0.45)',
    backgroundColor: 'rgba(197,162,106,0.14)',
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  topTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  topTabBtn: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  topTabText: {
    fontSize: 16,
    fontWeight: '700',
  },
  topUnderline: {
    marginTop: 4,
    height: 2.5,
    width: 24,
    borderRadius: 2,
  },
  floatingBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  endCard: {
    padding: 24,
    justifyContent: 'center',
  },
  endInner: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  endTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  endDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
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
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
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
