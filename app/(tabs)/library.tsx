import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MIN_TOUCH_SIZE } from '../../src/components/theme';
import type { SearchResultItem } from '../../src/data/repository';
import type { Tradition } from '../../src/domain/types';
import { useApp } from '../../src/features/app/AppProvider';
import {
  getLocalizedEditionLabel,
  getLocalizedSourceRef,
  getLocalizedWorkDescription,
  getLocalizedWorkSubtitle,
  getLocalizedWorkTitle,
} from '../../src/i18n/strings';

export default function LibraryScreen() {
  const router = useRouter();
  const { palette, appLanguage, strings, works, search, selectWorkAndSegment } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [traditionFilter, setTraditionFilter] = useState<'all' | Tradition>('all');

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    search(query).then((found) => {
      if (!cancelled) setResults(found);
    });
    return () => {
      cancelled = true;
    };
  }, [appLanguage, query, search]);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults(null);
      return;
    }
    const found = await search(text);
    setResults(found);
  };

  const filteredWorks =
    traditionFilter === 'all' ? works : works.filter((w) => w.tradition === traditionFilter);

  const traditionEntries: ['all' | Tradition, string][] = [
    ['all', strings.library.traditions.all],
    ['early_buddhism', strings.library.traditions.early_buddhism],
    ['mahayana', strings.library.traditions.mahayana],
    ['korean_treatise', strings.library.traditions.korean_treatise],
  ];

  const renderHighlighted = (text: string, q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return <Text style={{ color: palette.textPrimary }}>{text}</Text>;
    const idx = text.toLowerCase().indexOf(trimmed.toLowerCase());
    if (idx < 0) return <Text style={{ color: palette.textPrimary }}>{text}</Text>;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + trimmed.length);
    const after = text.slice(idx + trimmed.length);
    return (
      <Text style={{ color: palette.textPrimary }}>
        {before}
        <Text style={{ backgroundColor: palette.highlightBg, fontWeight: '700' }}>{match}</Text>
        {after}
      </Text>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>{strings.library.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => router.push('/saved')}
              style={[styles.savedShortcutBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <Ionicons name="bookmark-outline" size={16} color={palette.coral} />
              <Text style={{ color: palette.textPrimary, fontSize: 12, fontWeight: '700' }}>
                {strings.tabs.saved}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/my')}
              accessibilityLabel={strings.tabs.my}
              style={{ padding: 4 }}
            >
              <Ionicons name="person-circle-outline" size={28} color={palette.textPrimary} />
            </Pressable>
          </View>
        </View>
        <View style={[styles.searchBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={20} color={palette.textSecondary} />
          <TextInput
            value={query}
            onChangeText={handleSearch}
            placeholder={strings.library.searchPlaceholder}
            placeholderTextColor={palette.textSecondary}
            accessibilityLabel={strings.library.searchPlaceholder}
            style={[styles.searchInput, { color: palette.textPrimary }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => handleSearch('')} accessibilityLabel="Clear">
              <Ionicons name="close-circle" size={20} color={palette.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {results !== null ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
            {strings.library.searchCount(results.length)}
          </Text>
          {results.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: palette.border, backgroundColor: palette.card }]}>
              <Text style={{ color: palette.textSecondary }}>{strings.library.noResults}</Text>
            </View>
          ) : (
            results.map((r) => (
              <Pressable
                key={`${r.segment.id}-${r.edition.id}`}
                onPress={async () => {
                  await selectWorkAndSegment(r.work.id, r.segment.id, 'sequential');
                  router.push('/(tabs)/scroll');
                }}
                style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
              >
                <Text style={{ color: palette.coral, fontWeight: '700', fontSize: 13 }}>
                  {getLocalizedWorkTitle(r.work, appLanguage)} · {getLocalizedSourceRef(r.segment, appLanguage)}
                </Text>
                <View style={{ marginTop: 4 }}>{renderHighlighted(r.segmentText.text, query)}</View>
                <Text style={{ color: palette.textSecondary, fontSize: 11, marginTop: 6 }}>
                  {getLocalizedEditionLabel(r.edition, appLanguage)}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {traditionEntries.map(([key, label]) => {
              const active = traditionFilter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTraditionFilter(key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? palette.coral : palette.card,
                      borderColor: active ? palette.coral : palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : palette.textPrimary, fontWeight: '700', fontSize: 13 }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredWorks.map((work) => {
            const title = getLocalizedWorkTitle(work, appLanguage);
            const subtitle = getLocalizedWorkSubtitle(work, appLanguage);
            const desc = getLocalizedWorkDescription(work, appLanguage);
            return (
              <Pressable
                key={work.id}
                onPress={async () => {
                  await selectWorkAndSegment(work.id, undefined, 'sequential');
                  router.push('/(tabs)/scroll');
                }}
                accessibilityRole="button"
                accessibilityLabel={title}
                style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
              >
                <View style={styles.workRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.textPrimary, fontSize: 17, fontWeight: '700' }}>
                      {title}
                    </Text>
                    {subtitle && (
                      <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {subtitle}
                      </Text>
                    )}
                  </View>
                  <View style={styles.countBadgeRow}>
                    <View style={[styles.countBadge, { borderColor: palette.border, backgroundColor: palette.background }]}>
                      <Text style={{ color: palette.coral, fontSize: 11, fontWeight: '700' }}>
                        {strings.library.unitLabel(work.totalSegments)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={palette.textSecondary} />
                  </View>
                </View>
                {desc && (
                  <Text style={{ color: palette.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
                    {desc}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, gap: 10, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: MIN_TOUCH_SIZE,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#1F1D1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  savedShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  workRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  countBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  emptyBox: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
});
