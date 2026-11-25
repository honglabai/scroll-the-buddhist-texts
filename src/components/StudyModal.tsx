import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getFeatureFlags } from '../domain/featureFlags';
import { canProcessWithAI } from '../domain/readingRules';
import type { AIStudyResponse, Annotation, Edition, RelatedLink, SegmentText } from '../domain/types';
import { useApp, type FeedItem } from '../features/app/AppProvider';
import {
  filterModeratedComments,
  isCommentAllowed,
  type CommentModerationItem,
} from '../features/extensions/extensionServices';
import { AIStudyService } from '../services/aiStudyService';
import { MIN_TOUCH_SIZE } from './theme';

type StudyTab = 'easy' | 'context' | 'terms' | 'related' | 'practice' | 'ai';

const aiService = new AIStudyService();

export function StudyModal({
  visible,
  item,
  onClose,
  onNavigateToSegment,
}: {
  visible: boolean;
  item: FeedItem | null;
  onClose: () => void;
  onNavigateToSegment: (segmentId: string) => void;
}) {
  const { palette, getStudyDetails } = useApp();
  const flags = useMemo(() => getFeatureFlags(), []);
  const [tab, setTab] = useState<StudyTab>('easy');
  const [loading, setLoading] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [relatedLinks, setRelatedLinks] = useState<RelatedLink[]>([]);
  const [original, setOriginal] = useState<{ edition: Edition; segmentText: SegmentText } | undefined>();

  // AI state
  const [question, setQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIStudyResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Stage 8 public comments state (when flag enabled)
  const [comments, setComments] = useState<CommentModerationItem[]>([]);
  const [blockedAuthors, setBlockedAuthors] = useState<Set<string>>(new Set());
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    if (!visible || !item) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setTab('easy');
      setAiResponse(null);
      setAiError(null);
      setQuestion('');
      setLoading(true);
    });
    getStudyDetails(item.segment.id, item.edition.id)
      .then((res) => {
        if (cancelled) return;
        setAnnotations(res.annotations);
        setRelatedLinks(res.relatedLinks);
        setOriginal(res.original);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, item, getStudyDetails]);

  if (!item) return null;

  const byKind = (kind: Annotation['kind']) => annotations.filter((a) => a.kind === kind);

  const runAIStudy = async () => {
    if (!item.segmentText || !item.rights) {
      setAiError('승인된 판본 데이터가 없어 AI 탐구를 실행할 수 없습니다.');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    const res = await aiService.query({
      request: {
        segmentId: item.segment.id,
        editionId: item.edition.id,
        mode: question.trim() ? 'qa' : 'summary',
        question: question.trim() || undefined,
      },
      corpus: [
        {
          segment: item.segment,
          segmentText: item.segmentText,
          rights: item.rights,
          annotations,
        },
      ],
    });
    setAiLoading(false);
    if (res.ok) {
      setAiResponse(res.data);
    } else {
      setAiError(res.error);
    }
  };

  const handleAddComment = () => {
    if (!isCommentAllowed(commentInput)) return;
    setComments((prev) => [
      {
        id: `c-${Date.now()}`,
        segmentId: item.segment.id,
        authorAlias: '수행자',
        body: commentInput.trim(),
        reportedCount: 0,
        isBlockedAuthor: false,
      },
      ...prev,
    ]);
    setCommentInput('');
  };

  const tabs: { id: StudyTab; label: string }[] = [
    { id: 'easy', label: '쉬운 해설' },
    { id: 'context', label: '배경' },
    { id: 'terms', label: '원어' },
    { id: 'related', label: '관련 경전' },
    { id: 'practice', label: '교리·실천' },
    ...(flags.aiStudy ? [{ id: 'ai' as const, label: 'AI 탐구' }] : []),
  ];

  const renderAnnotationList = (items: Annotation[]) => {
    if (items.length === 0) {
      return (
        <View style={[styles.emptyBox, { borderColor: palette.border }]}>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
            검수된 해설이 아직 없습니다.
          </Text>
        </View>
      );
    }
    return items.map((ann) => (
      <View key={ann.id} style={[styles.block, { backgroundColor: palette.card, borderColor: palette.border }]}>
        {ann.title && <Text style={[styles.blockTitle, { color: palette.primary }]}>{ann.title}</Text>}
        <Text style={[styles.blockBody, { color: palette.textPrimary }]}>{ann.body}</Text>
        {ann.uncertaintyNote && (
          <Text style={[styles.uncertainty, { color: palette.accent }]}>
            유의: {ann.uncertaintyNote}
          </Text>
        )}
        <Text style={[styles.sourceLabel, { color: palette.textSecondary }]}>출처: {ann.source}</Text>
      </View>
    ));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: palette.primary }]}>경전 탐구</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              {item.work.title} · {item.segment.sourceRef}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="경전 탐구 닫기"
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={24} color={palette.textPrimary} />
          </Pressable>
        </View>

        {/* Original Verse Quote */}
        <View style={[styles.quoteBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.quoteLabel, { color: palette.textSecondary }]}>
            경전 본문 ({item.edition.label})
          </Text>
          <Text style={[styles.quoteText, { color: palette.textPrimary }]}>
            {item.segmentText?.text ?? '번역 준비 중'}
          </Text>
        </View>

        {/* Sub-tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: active ? palette.primary : palette.card,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text style={{ color: active ? palette.textOnPrimary : palette.textPrimary, fontWeight: '600', fontSize: 13 }}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.content}>
          {loading ? (
            <ActivityIndicator color={palette.primary} />
          ) : (
            <>
              {tab === 'easy' && renderAnnotationList(byKind('easy_explanation'))}
              {tab === 'context' && renderAnnotationList(byKind('context'))}
              {tab === 'terms' && (
                <View style={{ gap: 12 }}>
                  {original && (
                    <View style={[styles.block, { backgroundColor: palette.card, borderColor: palette.border }]}>
                      <Text style={[styles.blockTitle, { color: palette.primary }]}>
                        원문 ({original.edition.label})
                      </Text>
                      <Text style={[styles.blockBody, { color: palette.textPrimary, fontStyle: 'italic' }]}>
                        {original.segmentText.text}
                      </Text>
                    </View>
                  )}
                  {renderAnnotationList(byKind('original_term'))}
                </View>
              )}
              {tab === 'related' && (
                <View style={{ gap: 12 }}>
                  {relatedLinks.length === 0 ? (
                    <View style={[styles.emptyBox, { borderColor: palette.border }]}>
                      <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                        검수된 관련 경전이 아직 없습니다.
                      </Text>
                    </View>
                  ) : (
                    relatedLinks.map((link) => (
                      <Pressable
                        key={link.id}
                        onPress={() => {
                          onClose();
                          onNavigateToSegment(link.toId);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${link.targetTitle} 구절로 이동`}
                        style={[styles.block, { backgroundColor: palette.card, borderColor: palette.border }]}
                      >
                        <Text style={[styles.linkBadge, { color: palette.accent }]}>
                          {link.type === 'parallel_sutta' ? '평행경 (Parallel)' : '주제 유사 구절 (Thematic)'}
                        </Text>
                        <Text style={[styles.blockTitle, { color: palette.primary }]}>
                          {link.targetTitle} ({link.targetRef}) →
                        </Text>
                        <Text style={[styles.blockBody, { color: palette.textSecondary }]}>{link.evidence}</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
              {tab === 'practice' && (
                <View style={{ gap: 12 }}>
                  {renderAnnotationList([...byKind('doctrinal_meaning'), ...byKind('daily_practice')])}
                </View>
              )}
              {tab === 'ai' && (
                <View style={{ gap: 12 }}>
                  {!canProcessWithAI(item.rights) ? (
                    <View style={[styles.emptyBox, { borderColor: palette.border }]}>
                      <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                        이 판본은 저작권/라이선스 조건상 AI 처리를 지원하지 않습니다.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <TextInput
                        value={question}
                        onChangeText={setQuestion}
                        placeholder="이 구절에 대해 궁금한 점을 입력하세요 (비워두면 요약 생성)"
                        placeholderTextColor={palette.textSecondary}
                        maxLength={300}
                        style={[
                          styles.input,
                          {
                            color: palette.textPrimary,
                            backgroundColor: palette.surfaceElevated,
                            borderColor: palette.border,
                          },
                        ]}
                      />
                      <Pressable
                        onPress={runAIStudy}
                        accessibilityRole="button"
                        accessibilityLabel="근거 기반 AI 탐구 실행"
                        style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
                      >
                        <Text style={{ color: palette.textOnPrimary, fontWeight: '700' }}>
                          {aiLoading ? '근거 확인 중...' : 'AI 심층 탐구 보기'}
                        </Text>
                      </Pressable>
                      {aiError && <Text style={{ color: palette.danger, fontSize: 13 }}>{aiError}</Text>}
                      {aiResponse && (
                        <View style={[styles.block, { backgroundColor: palette.card, borderColor: palette.border }]}>
                          <Text style={[styles.linkBadge, { color: palette.accent }]}>
                            {aiResponse.isMocked
                              ? 'AI 보조 해설 · 개발용 모의 응답 (경전 원문이 아닙니다)'
                              : 'AI 보조 해설 (경전 원문이 아닙니다)'}
                          </Text>
                          <Text style={[styles.blockBody, { color: palette.textPrimary }]}>{aiResponse.summary}</Text>
                          <Text style={[styles.blockBody, { color: palette.textSecondary }]}>{aiResponse.context}</Text>
                          {aiResponse.terms.length > 0 && (
                            <View style={{ gap: 4 }}>
                              {aiResponse.terms.map((termItem, i) => (
                                <Text key={i} style={[styles.blockBody, { color: palette.textPrimary, fontSize: 14 }]}>
                                  • {termItem.term}: {termItem.explanation}
                                </Text>
                              ))}
                            </View>
                          )}
                          <Text style={[styles.blockBody, { color: palette.primary }]}>
                            실천: {aiResponse.practicalReflection}
                          </Text>
                          <Text style={[styles.sourceLabel, { color: palette.textSecondary }]}>
                            인용 근거: {aiResponse.citations.map((c) => `${c.sourceRef} (${c.editionId})`).join(', ')}
                          </Text>
                          <Text style={[styles.uncertainty, { color: palette.textSecondary }]}>
                            {aiResponse.uncertainty}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {flags.publicComments && (
                <View style={[styles.block, { backgroundColor: palette.card, borderColor: palette.border, marginTop: 16 }]}>
                  <Text style={[styles.blockTitle, { color: palette.primary }]}>공개 사유 나눔 (실험 기능)</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={commentInput}
                      onChangeText={setCommentInput}
                      placeholder="짧은 사유를 남겨보세요"
                      placeholderTextColor={palette.textSecondary}
                      style={[styles.input, { flex: 1, color: palette.textPrimary, borderColor: palette.border }]}
                    />
                    <Pressable onPress={handleAddComment} style={[styles.primaryBtn, { backgroundColor: palette.primary, paddingHorizontal: 14 }]}>
                      <Text style={{ color: palette.textOnPrimary }}>등록</Text>
                    </Pressable>
                  </View>
                  {filterModeratedComments(comments, blockedAuthors).map((c) => (
                    <View key={c.id} style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: palette.border }}>
                      <Text style={{ color: palette.textPrimary }}>{c.body}</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                        <Pressable onPress={() => setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, reportedCount: x.reportedCount + 1 } : x)))}>
                          <Text style={{ color: palette.danger, fontSize: 12 }}>신고</Text>
                        </Pressable>
                        <Pressable onPress={() => setBlockedAuthors((prev) => new Set(prev).add(c.authorAlias))}>
                          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>작성자 차단</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteBox: {
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  quoteLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  quoteText: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  tabBar: { maxHeight: 52 },
  tabBarContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  block: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  blockTitle: { fontSize: 15, fontWeight: '700' },
  blockBody: { fontSize: 15, lineHeight: 23 },
  uncertainty: { fontSize: 12, lineHeight: 18 },
  sourceLabel: { fontSize: 12 },
  linkBadge: { fontSize: 12, fontWeight: '700' },
  emptyBox: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: MIN_TOUCH_SIZE,
  },
  primaryBtn: {
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
