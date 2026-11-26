import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { resolvePageArtwork } from '../../src/components/pageArtworks';
import { MIN_TOUCH_SIZE } from '../../src/components/theme';
import { TOPICS } from '../../src/domain/readingRules';
import { useApp, type FeedItem } from '../../src/features/app/AppProvider';
import {
  getLocalizedEditionLabel,
  getLocalizedSourceRef,
  getLocalizedTopicLabel,
  getLocalizedTranslator,
  getLocalizedWorkTitle,
} from '../../src/i18n/strings';

type PickerTab = 'chapter' | 'work' | 'edition' | 'topic';

export default function ScrollReaderScreen() {
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
    works,
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
    updateThemeMode,
    updateScrollBackdrop,
    onSegmentFocused,
    toggleBookmark,
    toggleTts,
    clearTargetSegment,
  } = useApp();

  const [feedHeight, setFeedHeight] = useState(640);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<PickerTab>('chapter');
  const [studyItem, setStudyItem] = useState<FeedItem | null>(null);
  const [noteItem, setNoteItem] = useState<FeedItem | null>(null);
  const [viralItem, setViralItem] = useState<FeedItem | null>(null);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);

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
      if (!first || typeof first.index !== 'number') return;
      const item = first.item as FeedItem;
      onSegmentFocusedRef.current(item.segment.id, first.index);
    },
    []
  );

  const scrollToIndex = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= feedItems.length) return;
      flatListRef.current?.scrollToIndex({ index: idx, animated: !reduceMotionEffective });
    },
    [feedItems.length, reduceMotionEffective]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (pickerOpen || studyItem || noteItem || viralItem) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToIndex(Math.min(feedItems.length - 1, currentSegmentIndex + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToIndex(Math.max(0, currentSegmentIndex - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentSegmentIndex, feedItems.length, noteItem, pickerOpen, scrollToIndex, studyItem, viralItem]);

  if (!ready) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.coral} />
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
  const pillBg = 'rgba(17, 26, 21, 0.72)';
  const pillBorder = 'rgba(255,255,255,0.16)';
  const currentWorkTitle = currentWork ? getLocalizedWorkTitle(currentWork, appLanguage) : '';
  const shortWorkTitle = currentWorkTitle.replace(/\s*\(.*\)/, '');
  const activeTopicDisplay = activeTopic ? getLocalizedTopicLabel(activeTopic, appLanguage) : null;
  const selectorChipLabel =
    currentMode === 'topic' && activeTopicDisplay
      ? activeTopicDisplay
      : `${shortWorkTitle} ${currentSegmentIndex + 1}`;

  const scrollBackdropSource = resolvePageArtwork('scroll', settings, currentWork?.id).source;

  return (
    <View style={[styles.screenOuter, { backgroundColor: '#12211A' }]}>
      <View style={styles.stageColumn} onLayout={onFeedLayout}>
        {settings.scrollBackdropEnabled ? (
          <View pointerEvents="none" style={styles.backdropLayer}>
            <Image source={scrollBackdropSource} style={styles.backdropImage} resizeMode="cover" />
            <View
              style={[
                styles.backdropGlaze,
                {
                  backgroundColor: 'rgba(14, 24, 19, 0.68)',
                },
              ]}
            />
          </View>
        ) : null}

        {/* Minimalist Floating Top Pill Navigation (YouTube Shorts Overlay Controls) */}
        <View
          style={[
            styles.floatingTopBar,
            { paddingTop: Math.max(insets.top, 8) },
          ]}
        >
          <View style={styles.topLeftGroup}>
            <Pressable
              onPress={() => setAppLanguage(appLanguage === 'ko' ? 'en' : 'ko')}
              accessibilityRole="button"
              accessibilityLabel={appLanguage === 'ko' ? 'Switch to English' : '한국어로 전환'}
              style={[styles.pillBtn, styles.softShadow, { backgroundColor: pillBg, borderColor: pillBorder }]}
            >
              <Text style={[styles.pillText, { color: '#FFFFFF' }]}>
                {strings.scrollUi.langBadge}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => updateThemeMode(isDark ? 'light' : 'dark')}
              accessibilityRole="button"
              accessibilityLabel={isDark ? strings.my.themeLight : strings.my.themeDark}
              style={[styles.circleIconBtn, styles.softShadow, { backgroundColor: pillBg, borderColor: pillBorder }]}
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={19}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              onPress={() => updateScrollBackdrop(!settings.scrollBackdropEnabled)}
              accessibilityRole="button"
              accessibilityLabel={strings.artwork.scrollBackdropToggle}
              style={[
                styles.circleIconBtn,
                styles.softShadow,
                {
                  backgroundColor: settings.scrollBackdropEnabled ? palette.coral : pillBg,
                  borderColor: settings.scrollBackdropEnabled ? palette.coral : pillBorder,
                },
              ]}
            >
              <Ionicons
                name="image-outline"
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <View style={styles.topRightGroup}>
            <Pressable
              onPress={() => {
                setPickerTab('chapter');
                setPickerOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={strings.scrollUi.pickerTitle}
              style={[
                styles.selectorPill,
                styles.softShadow,
                { backgroundColor: pillBg, borderColor: pillBorder },
              ]}
            >
              <Text style={[styles.pillText, styles.selectorText, { color: '#FFFFFF' }]} numberOfLines={1}>
                {selectorChipLabel}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/my')}
              accessibilityRole="button"
              accessibilityLabel={strings.tabs.my}
              style={[styles.circleIconBtn, styles.softShadow, { backgroundColor: pillBg, borderColor: pillBorder }]}
            >
              <Ionicons name="person-circle-outline" size={23} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {noticeBanner && (
          <View
            style={[
              styles.floatingBanner,
              {
                top: Math.max(insets.top, 10) + 56,
                backgroundColor: palette.highlightBg,
                borderColor: palette.coral,
                borderWidth: 1,
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
              <View
                style={[
                  styles.endCard,
                  {
                    height: feedHeight,
                    backgroundColor: 'transparent',
                  },
                ]}
              >
                <View style={[styles.endInner, { backgroundColor: palette.card, borderColor: palette.border }]}>
                  <Ionicons name="checkmark-circle-outline" size={44} color={palette.coral} />
                  <Text style={[styles.endTitle, { color: palette.textPrimary }]}>
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
                scenicBackdropActive={Boolean(settings.scrollBackdropEnabled)}
                canGoNext={index < feedItems.length - 1}
                onNext={() => scrollToIndex(index + 1)}
                onToggleBookmark={() =>
                  toggleBookmark(item.segment.id, item.edition.id, strings.saved.defaultFolder)
                }
                onOpenStudy={() => setStudyItem(item)}
                onOpenNote={() => setNoteItem(item)}
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

      {/* Viral Share & Forward Modal */}
      <ViralShareModal
        visible={Boolean(viralItem)}
        item={viralItem}
        onClose={() => setViralItem(null)}
      />

      {/* Combined Scripture / Chapter / Edition / Topic Selector Modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: palette.textPrimary }]}>
                {strings.scrollUi.pickerTitle}
              </Text>
              <Pressable onPress={() => setPickerOpen(false)} style={styles.closeIconBtn}>
                <Ionicons name="close" size={22} color={palette.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.pickerTabRow}>
              {(
                [
                  { id: 'chapter', label: strings.scrollUi.pickerChapterTab },
                  { id: 'work', label: strings.scrollUi.pickerWorkTab },
                  { id: 'edition', label: strings.scrollUi.pickerEditionTab },
                  { id: 'topic', label: strings.home.topic },
                ] as { id: PickerTab; label: string }[]
              ).map((pt) => {
                const active = pickerTab === pt.id;
                return (
                  <Pressable
                    key={pt.id}
                    onPress={() => setPickerTab(pt.id)}
                    style={[
                      styles.pickerTabChip,
                      {
                        backgroundColor: active ? palette.coral : palette.background,
                        borderColor: active ? palette.coral : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : palette.textPrimary,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {pt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              {pickerTab === 'chapter' &&
                feedItems.map((fi, idx) => {
                  const selected = idx === currentSegmentIndex;
                  return (
                    <Pressable
                      key={fi.segment.id}
                      onPress={() => {
                        setPickerOpen(false);
                        scrollToIndex(idx);
                      }}
                      style={[
                        styles.sheetRow,
                        {
                          borderColor: selected ? palette.coral : palette.border,
                          backgroundColor: selected ? palette.highlightBg : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: palette.textPrimary, fontWeight: selected ? '700' : '500', flex: 1 }}>
                        {idx + 1}. {getLocalizedSourceRef(fi.segment, appLanguage)}
                      </Text>
                      {selected && <Ionicons name="checkmark" size={18} color={palette.coral} />}
                    </Pressable>
                  );
                })}

              {pickerTab === 'work' &&
                works.map((w) => {
                  const selected = currentWork?.id === w.id && currentMode === 'sequential';
                  return (
                    <Pressable
                      key={w.id}
                      onPress={async () => {
                        setPickerOpen(false);
                        await selectWorkAndSegment(w.id, undefined, 'sequential');
                      }}
                      style={[
                        styles.sheetRow,
                        {
                          borderColor: selected ? palette.coral : palette.border,
                          backgroundColor: selected ? palette.highlightBg : 'transparent',
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>
                          {getLocalizedWorkTitle(w, appLanguage)}
                        </Text>
                        <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                          {strings.library.unitLabel(w.totalSegments)}
                        </Text>
                      </View>
                      {selected && <Ionicons name="checkmark" size={18} color={palette.coral} />}
                    </Pressable>
                  );
                })}

              {pickerTab === 'edition' &&
                editionsForCurrentWork.map((ed) => {
                  const selected = currentEdition?.id === ed.id;
                  return (
                    <Pressable
                      key={ed.id}
                      onPress={async () => {
                        setPickerOpen(false);
                        const res = await switchEdition(ed.id);
                        if (!res.found && res.message) {
                          setNoticeBanner(res.message);
                        }
                      }}
                      style={[
                        styles.sheetRow,
                        {
                          borderColor: selected ? palette.coral : palette.border,
                          backgroundColor: selected ? palette.highlightBg : 'transparent',
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
                      {selected && <Ionicons name="checkmark" size={18} color={palette.coral} />}
                    </Pressable>
                  );
                })}

              {pickerTab === 'topic' &&
                TOPICS.map((t) => {
                  const selected = currentMode === 'topic' && activeTopic === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={async () => {
                        setPickerOpen(false);
                        await selectTopicFeed(t.id);
                      }}
                      style={[
                        styles.sheetRow,
                        {
                          borderColor: selected ? palette.coral : palette.border,
                          backgroundColor: selected ? palette.highlightBg : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>
                        {getLocalizedTopicLabel(t.id, appLanguage)}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={18} color={palette.coral} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
                      )}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        </View>
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
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 6,
  },
  topLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  topRightGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  pillBtn: {
    paddingHorizontal: 11,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    flexShrink: 1,
    maxWidth: 132,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectorText: {
    flexShrink: 1,
  },
  circleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  softShadow: {
    shadowColor: '#1F1D1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
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
    borderRadius: 14,
    gap: 8,
  },
  endCard: {
    padding: 24,
    justifyContent: 'center',
  },
  endInner: {
    padding: 28,
    borderRadius: 24,
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
    paddingHorizontal: 22,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeIconBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTabRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pickerTabChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: MIN_TOUCH_SIZE,
  },
  backdropLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropGlaze: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
