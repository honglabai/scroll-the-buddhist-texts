import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageBgPickerModal } from '../src/components/PageBgPickerModal';
import { ScenicHeroCard } from '../src/components/ScenicHeroCard';
import { resolvePageArtwork } from '../src/components/pageArtworks';
import { MIN_TOUCH_SIZE } from '../src/components/theme';
import { useApp } from '../src/features/app/AppProvider';

interface SegmentSummary {
  workTitle: string;
  sourceRef: string;
  previewText: string;
}

const ALL_FOLDERS_SENTINEL = '__ALL__';

export default function SavedScreen() {
  const router = useRouter();
  const {
    palette,
    appLanguage,
    strings,
    settings,
    bookmarks,
    notes,
    toggleBookmark,
    saveNote,
    deleteNote,
    navigateToSegmentById,
    getSegmentSummary,
  } = useApp();

  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const savedHeroArt = resolvePageArtwork('saved', settings).source;

  const [tab, setTab] = useState<'bookmarks' | 'notes'>('bookmarks');
  const [selectedFolder, setSelectedFolder] = useState<string>(ALL_FOLDERS_SENTINEL);
  const [summaries, setSummaries] = useState<Record<string, SegmentSummary>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const formatFolderLabel = (folder: string) => {
    if (folder === ALL_FOLDERS_SENTINEL) return strings.saved.allFolder;
    if (folder === '기본 모음' || folder === 'Favorites') return strings.saved.defaultFolder;
    return folder;
  };

  const folders = useMemo(() => {
    const set = new Set<string>([ALL_FOLDERS_SENTINEL]);
    for (const bm of bookmarks) set.add(bm.folder);
    return Array.from(set);
  }, [bookmarks]);

  const visibleBookmarks = useMemo(
    () =>
      selectedFolder === ALL_FOLDERS_SENTINEL
        ? bookmarks
        : bookmarks.filter((bm) => bm.folder === selectedFolder),
    [bookmarks, selectedFolder]
  );

  useEffect(() => {
    let cancelled = false;
    const ids = Array.from(
      new Set([...bookmarks.map((b) => b.segmentId), ...notes.map((n) => n.segmentId)])
    );
    Promise.all(ids.map(async (id) => [id, await getSegmentSummary(id)] as const)).then(
      (entries) => {
        if (cancelled) return;
        const map: Record<string, SegmentSummary> = {};
        for (const [id, info] of entries) {
          if (info) map[id] = info;
        }
        setSummaries(map);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [appLanguage, bookmarks, notes, getSegmentSummary]);

  const jumpToVerse = async (segmentId: string) => {
    const ok = await navigateToSegmentById(segmentId);
    if (ok) {
      router.push('/(tabs)/scroll');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))}
            accessibilityRole="button"
            style={[styles.backBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <Ionicons name="arrow-back" size={20} color={palette.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: palette.textPrimary }]}>{strings.saved.title}</Text>
          <Pressable
            onPress={() => router.push('/my')}
            accessibilityRole="button"
            accessibilityLabel={strings.tabs.my}
            style={[styles.backBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <Ionicons name="person-circle-outline" size={22} color={palette.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.segmentRow}>
          <Pressable
            onPress={() => setTab('bookmarks')}
            style={[
              styles.segBtn,
              {
                backgroundColor: tab === 'bookmarks' ? palette.coral : palette.card,
                borderColor: tab === 'bookmarks' ? palette.coral : palette.border,
              },
            ]}
          >
            <Text style={{ color: tab === 'bookmarks' ? '#FFFFFF' : palette.textPrimary, fontWeight: '700' }}>
              {strings.saved.bookmarksTab(bookmarks.length)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('notes')}
            style={[
              styles.segBtn,
              {
                backgroundColor: tab === 'notes' ? palette.coral : palette.card,
                borderColor: tab === 'notes' ? palette.coral : palette.border,
              },
            ]}
          >
            <Text style={{ color: tab === 'notes' ? '#FFFFFF' : palette.textPrimary, fontWeight: '700' }}>
              {strings.saved.notesTab(notes.length)}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <ScenicHeroCard
          source={savedHeroArt}
          badgeText={strings.artwork.savedBannerBadge}
          title={strings.artwork.savedBannerTitle}
          subtitle={strings.artwork.savedBannerSub(bookmarks.length, notes.length)}
          changeArtLabel={strings.artwork.changeBg}
          onPressChangeArt={() => setBgPickerOpen(true)}
          height={176}
          cardBg={palette.card}
          cardBorder={palette.border}
        />

        {tab === 'bookmarks' ? (
          <>
            {folders.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {folders.map((folder) => {
                  const active = selectedFolder === folder;
                  return (
                    <Pressable
                      key={folder}
                      onPress={() => setSelectedFolder(folder)}
                      style={[
                        styles.folderChip,
                        {
                          backgroundColor: active ? palette.coral : palette.card,
                          borderColor: active ? palette.coral : palette.border,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? '#FFFFFF' : palette.textPrimary, fontSize: 12, fontWeight: '600' }}>
                        {formatFolderLabel(folder)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {visibleBookmarks.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor: palette.border, backgroundColor: palette.card }]}>
                <Ionicons name="heart-outline" size={32} color={palette.coral} />
                <Text style={{ color: palette.textSecondary, marginTop: 8, textAlign: 'center' }}>
                  {strings.saved.emptyBookmarks}
                </Text>
              </View>
            ) : (
              visibleBookmarks.map((bm) => {
                const summary = summaries[bm.segmentId];
                return (
                  <View key={bm.segmentId} style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    <View style={styles.rowBetween}>
                      <Text style={{ color: palette.textPrimary, fontWeight: '700', flex: 1 }}>
                        {summary ? `${summary.workTitle} · ${summary.sourceRef}` : bm.segmentId}
                      </Text>
                      <Pressable
                        onPress={() => toggleBookmark(bm.segmentId, bm.editionId)}
                        accessibilityLabel={strings.noteModal.del}
                        style={styles.iconBtn}
                      >
                        <Ionicons name="trash-outline" size={20} color={palette.danger} />
                      </Pressable>
                    </View>
                    {summary?.previewText ? (
                      <Text style={{ color: palette.textSecondary, fontSize: 14, lineHeight: 20 }} numberOfLines={3}>
                        {summary.previewText}
                      </Text>
                    ) : null}
                    <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                      {strings.saved.folderLabel(formatFolderLabel(bm.folder), new Date(bm.createdAt).toLocaleDateString())}
                    </Text>
                    <Pressable
                      onPress={() => jumpToVerse(bm.segmentId)}
                      style={[styles.jumpBtn, { borderColor: palette.coral }]}
                    >
                      <Text style={{ color: palette.coral, fontWeight: '700' }}>
                        {strings.saved.jumpToVerse}
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </>
        ) : notes.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: palette.border, backgroundColor: palette.card }]}>
            <Ionicons name="create-outline" size={32} color={palette.coral} />
            <Text style={{ color: palette.textSecondary, marginTop: 8, textAlign: 'center' }}>
              {strings.saved.emptyNotes}
            </Text>
          </View>
        ) : (
          notes.map((n) => {
            const summary = summaries[n.segmentId];
            const isEditing = editingNoteId === n.id;
            return (
              <View key={n.id} style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <View style={styles.rowBetween}>
                  <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 13, flex: 1 }}>
                    {summary ? `${summary.workTitle} · ${summary.sourceRef}` : n.segmentId}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => {
                        setEditingNoteId(isEditing ? null : n.id);
                        setEditBody(n.body);
                      }}
                      accessibilityLabel={strings.noteModal.edit}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="create-outline" size={20} color={palette.coral} />
                    </Pressable>
                    <Pressable
                      onPress={() => deleteNote(n.id)}
                      accessibilityLabel={strings.noteModal.del}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="trash-outline" size={20} color={palette.danger} />
                    </Pressable>
                  </View>
                </View>

                {isEditing ? (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      value={editBody}
                      onChangeText={setEditBody}
                      multiline
                      style={[
                        styles.editInput,
                        { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceElevated },
                      ]}
                    />
                    <Pressable
                      onPress={async () => {
                        if (!editBody.trim()) return;
                        await saveNote(n.segmentId, editBody, n.tags, n.id);
                        setEditingNoteId(null);
                      }}
                      style={[styles.jumpBtn, { borderColor: palette.coral }]}
                    >
                      <Text style={{ color: palette.coral, fontWeight: '700' }}>
                        {strings.saved.saveEdit}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={{ color: palette.textPrimary, fontSize: 15, lineHeight: 22 }}>{n.body}</Text>
                )}

                {n.tags.length > 0 && (
                  <Text style={{ color: palette.coral, fontSize: 12 }}>#{n.tags.join(' #')}</Text>
                )}
                <View style={styles.rowBetween}>
                  <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
                    {new Date(n.updatedAt).toLocaleString()}
                  </Text>
                  <Pressable onPress={() => jumpToVerse(n.segmentId)}>
                    <Text style={{ color: palette.coral, fontSize: 12, fontWeight: '700' }}>
                      {strings.saved.viewOriginal}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <PageBgPickerModal
        visible={bgPickerOpen}
        pageKey="saved"
        onClose={() => setBgPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, gap: 12, borderBottomWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', flex: 1, textAlign: 'center' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  list: { padding: 18, gap: 12, paddingBottom: 32 },
  emptyBox: { padding: 28, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  card: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  iconBtn: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  jumpBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
});
