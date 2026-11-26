import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

const TRADITION_LABELS: Record<'all' | Tradition, string> = {
  all: '전체',
  early_buddhism: '초기불교',
  mahayana: '대승불교',
  korean_treatise: '한국 찬술',
};

export default function LibraryScreen() {
  const router = useRouter();
  const { palette, works, search, selectWorkAndSegment } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [traditionFilter, setTraditionFilter] = useState<'all' | Tradition>('all');

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
        <Text style={[styles.title, { color: palette.primary }]}>경전 탐색 및 검색</Text>
        <View style={[styles.searchBox, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={20} color={palette.textSecondary} />
          <TextInput
            value={query}
            onChangeText={handleSearch}
            placeholder="경전명, 구절 번호, 한국어·영어 본문 검색"
            placeholderTextColor={palette.textSecondary}
            accessibilityLabel="경전 검색 입력"
            style={[styles.searchInput, { color: palette.textPrimary }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => handleSearch('')} accessibilityLabel="검색어 지우기">
              <Ionicons name="close-circle" size={20} color={palette.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {results !== null ? (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
            검색 결과 {results.length}건
          </Text>
          {results.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: palette.border }]}>
              <Text style={{ color: palette.textSecondary }}>일치하는 구절이 없습니다.</Text>
            </View>
          ) : (
            results.map((r) => (
              <Pressable
                key={`${r.segment.id}-${r.edition.id}`}
                onPress={async () => {
                  await selectWorkAndSegment(r.work.id, r.segment.id, 'sequential');
                  router.push('/(tabs)');
                }}
                style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
              >
                <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 13 }}>
                  {r.work.title} · {r.segment.sourceRef}
                </Text>
                <View style={{ marginTop: 4 }}>{renderHighlighted(r.segmentText.text, query)}</View>
                <Text style={{ color: palette.textSecondary, fontSize: 11, marginTop: 6 }}>
                  {r.edition.label}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(Object.keys(TRADITION_LABELS) as ('all' | Tradition)[]).map((key) => {
              const active = traditionFilter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTraditionFilter(key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? palette.primary : palette.card,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? palette.textOnPrimary : palette.textPrimary, fontWeight: '600', fontSize: 13 }}>
                    {TRADITION_LABELS[key]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredWorks.map((work) => (
            <Pressable
              key={work.id}
              onPress={async () => {
                await selectWorkAndSegment(work.id, undefined, 'sequential');
                router.push('/(tabs)');
              }}
              accessibilityRole="button"
              accessibilityLabel={`${work.title} 읽기 시작`}
              style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <View style={styles.workRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.primary, fontSize: 17, fontWeight: '700' }}>
                    {work.title}
                  </Text>
                  {work.subtitle && (
                    <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {work.subtitle}
                    </Text>
                  )}
                </View>
                <View style={styles.countBadgeRow}>
                  <View style={[styles.countBadge, { borderColor: palette.border, backgroundColor: palette.background }]}>
                    <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '700' }}>
                      {work.totalSegments}구절
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={palette.primary} />
                </View>
              </View>
              {work.description && (
                <Text style={{ color: palette.textPrimary, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
                  {work.description}
                </Text>
              )}
            </Pressable>
          ))}
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
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
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
