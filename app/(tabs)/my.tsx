import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONT_SCALE_MAP, MIN_TOUCH_SIZE } from '../../src/components/theme';
import { getFeatureFlags } from '../../src/domain/featureFlags';
import type { FontScaleLevel, ThemeMode } from '../../src/domain/types';
import { useApp } from '../../src/features/app/AppProvider';
import { SUBSCRIPTION_PLANS_HYPOTHESIS } from '../../src/features/extensions/extensionServices';

export default function MyScreen() {
  const {
    palette,
    settings,
    readEventsCount,
    bookmarks,
    notes,
    rightsEntries,
    updateFontScale,
    updateFontStyle,
    updateLineHeight,
    updateThemeMode,
    updateReduceMotion,
    updateTtsRate,
    exportBackup,
    importBackup,
    wipeAllPersonalData,
  } = useApp();

  const flags = useMemo(() => getFeatureFlags(), []);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreJson, setRestoreJson] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleExport = async () => {
    const backup = await exportBackup();
    const json = JSON.stringify(backup, null, 2);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dharma-scroll-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('백업 JSON 파일을 다운로드했습니다.');
      return;
    }
    await Share.share({
      title: '마음스크롤 개인 데이터 백업',
      message: json,
    });
  };

  const handleRestore = async () => {
    try {
      await importBackup(restoreJson);
      setRestoreModalOpen(false);
      setRestoreJson('');
      setStatusMessage('백업 데이터를 복원했습니다.');
    } catch (err) {
      Alert.alert('복원 실패', err instanceof Error ? err.message : '올바른 JSON 백업이 아닙니다.');
    }
  };

  const handleWipe = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('저장한 구절, 비공개 일지, 읽기 기록 및 설정이 영구 삭제됩니다. 계속하시겠습니까?')) {
        wipeAllPersonalData().then(() => setStatusMessage('모든 개인 데이터를 삭제했습니다.'));
      }
      return;
    }
    Alert.alert(
      '모든 개인 데이터 삭제',
      '저장한 구절, 비공개 일지, 읽기 기록 및 설정이 영구적으로 삭제됩니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => wipeAllPersonalData().then(() => setStatusMessage('모든 개인 데이터를 삭제했습니다.')),
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: palette.primary }]}>My · 설정 및 개인정보</Text>

        {statusMessage && (
          <View style={[styles.banner, { backgroundColor: palette.highlightBg }]}>
            <Text style={{ color: palette.textPrimary, fontSize: 13, flex: 1 }}>{statusMessage}</Text>
            <Pressable onPress={() => setStatusMessage(null)}>
              <Ionicons name="close" size={18} color={palette.textPrimary} />
            </Pressable>
          </View>
        )}

        {/* Stats */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.primary }]}>나의 수행 발자취 (로컬 전용)</Text>
          <View style={styles.statsRow}>
            <StatBox label="읽은 구절" value={readEventsCount} color={palette.primary} subColor={palette.textSecondary} />
            <StatBox label="담은 구절" value={bookmarks.length} color={palette.primary} subColor={palette.textSecondary} />
            <StatBox label="수행 일지" value={notes.length} color={palette.primary} subColor={palette.textSecondary} />
          </View>
        </View>

        {/* 5-step Font Size */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.primary }]}>
            본문 글자 크기 (5단계 · 현재 {FONT_SCALE_MAP[settings.fontScaleLevel]}sp)
          </Text>
          <View style={styles.rowGap}>
            {([1, 2, 3, 4, 5] as FontScaleLevel[]).map((lvl) => {
              const active = settings.fontScaleLevel === lvl;
              return (
                <Pressable
                  key={lvl}
                  onPress={() => updateFontScale(lvl)}
                  accessibilityRole="button"
                  accessibilityLabel={`글자 크기 ${lvl}단계 (${FONT_SCALE_MAP[lvl]}sp)`}
                  style={[
                    styles.choiceBtn,
                    {
                      backgroundColor: active ? palette.primary : palette.surfaceElevated,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? palette.textOnPrimary : palette.textPrimary, fontWeight: '700' }}>
                    {lvl}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.cardTitle, { color: palette.primary, marginTop: 6 }]}>본문 글꼴 및 줄 간격</Text>
          <View style={styles.rowGap}>
            {(
              [
                { id: 'sans', label: '고딕체' },
                { id: 'serif', label: '명조체' },
              ] as const
            ).map((f) => {
              const active = settings.fontStyle === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => updateFontStyle(f.id)}
                  style={[
                    styles.choiceBtn,
                    {
                      backgroundColor: active ? palette.primary : palette.surfaceElevated,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? palette.textOnPrimary : palette.textPrimary, fontWeight: '600' }}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.rowGap}>
            {[
              { value: 1.35, label: '좁게' },
              { value: 1.55, label: '보통' },
              { value: 1.8, label: '넓게' },
            ].map((lh) => {
              const active = Math.abs(settings.lineHeightMultiplier - lh.value) < 0.05;
              return (
                <Pressable
                  key={lh.label}
                  onPress={() => updateLineHeight(lh.value)}
                  style={[
                    styles.choiceBtn,
                    {
                      backgroundColor: active ? palette.primary : palette.surfaceElevated,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? palette.textOnPrimary : palette.textPrimary, fontWeight: '600' }}>
                    {lh.label} ({lh.value})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Theme */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.primary }]}>화면 테마</Text>
          <View style={styles.rowGap}>
            {(
              [
                { id: 'system', label: '시스템' },
                { id: 'light', label: '라이트(한지)' },
                { id: 'dark', label: '다크(수묵)' },
              ] as { id: ThemeMode; label: string }[]
            ).map((t) => {
              const active = settings.themeMode === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => updateThemeMode(t.id)}
                  style={[
                    styles.choiceBtn,
                    {
                      backgroundColor: active ? palette.primary : palette.surfaceElevated,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? palette.textOnPrimary : palette.textPrimary, fontSize: 13, fontWeight: '600' }}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Accessibility & TTS */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.rowBetween}>
            <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>모션 감소 (애니메이션 최소화)</Text>
            <Switch
              value={settings.reduceMotion}
              onValueChange={updateReduceMotion}
              trackColor={{ false: palette.border, true: palette.primary }}
            />
          </View>

          <Text style={[styles.cardTitle, { color: palette.primary, marginTop: 8 }]}>
            음성 낭독(TTS) 속도: {settings.ttsRate.toFixed(2)}x
          </Text>
          <View style={styles.rowGap}>
            {[0.8, 0.95, 1.15].map((r) => {
              const active = Math.abs(settings.ttsRate - r) < 0.02;
              return (
                <Pressable
                  key={r}
                  onPress={() => updateTtsRate(r)}
                  style={[
                    styles.choiceBtn,
                    {
                      backgroundColor: active ? palette.primary : palette.surfaceElevated,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? palette.textOnPrimary : palette.textPrimary, fontWeight: '600' }}>
                    {r}x
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sources & Privacy */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.primary }]}>출처 · 권리 · 개인정보</Text>
          <Pressable onPress={() => setSourcesModalOpen(true)} style={[styles.actionBtn, { borderColor: palette.primary }]}>
            <Text style={{ color: palette.primary, fontWeight: '700' }}>
              수록 판본 출처 및 권리 안내 ({rightsEntries.length}건)
            </Text>
          </Pressable>
          <Pressable onPress={() => setPrivacyModalOpen(true)} style={[styles.actionBtn, { borderColor: palette.border }]}>
            <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>개인정보 처리방침 및 오픈소스 고지</Text>
          </Pressable>
        </View>

        {/* Backup & Delete */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.primary }]}>데이터 백업 및 삭제</Text>
          <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 19 }}>
            모든 읽기 기록과 수행 일지는 기기 내부에만 저장되며, 외부 서버로 전송되지 않습니다.
          </Text>
          <Pressable onPress={handleExport} style={[styles.actionBtn, { borderColor: palette.primary }]}>
            <Text style={{ color: palette.primary, fontWeight: '700' }}>JSON으로 내보내기 (백업)</Text>
          </Pressable>
          <Pressable onPress={() => setRestoreModalOpen(true)} style={[styles.actionBtn, { borderColor: palette.border }]}>
            <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>JSON 백업에서 복원하기</Text>
          </Pressable>
          <Pressable onPress={handleWipe} style={[styles.actionBtn, { borderColor: palette.danger }]}>
            <Text style={{ color: palette.danger, fontWeight: '700' }}>모든 개인 데이터 삭제</Text>
          </Pressable>
        </View>

        {/* Stage 8 Optional Feature Flags */}
        {flags.premium && (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.primary }]}>마음스크롤 Plus (실험 기능)</Text>
            {SUBSCRIPTION_PLANS_HYPOTHESIS.map((p) => (
              <Text key={p.id} style={{ color: palette.textPrimary, fontSize: 13 }}>
                • {p.label}: {p.priceKrw.toLocaleString()}원 / {p.period}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sources Modal */}
      <Modal visible={sourcesModalOpen} animationType="slide" onRequestClose={() => setSourcesModalOpen(false)}>
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.primary }]}>수록 판본 출처 및 권리 안내</Text>
            <Pressable onPress={() => setSourcesModalOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={palette.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {rightsEntries.map((entry) => (
              <View key={entry.editionId} style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={{ color: palette.primary, fontWeight: '700' }}>
                  {entry.editionId} ({entry.status})
                </Text>
                <Text style={{ color: palette.textPrimary, fontSize: 13 }}>
                  번역/편집: {entry.translator} · 라이선스: {entry.license}
                </Text>
                <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                  공유: {entry.allowShare ? '허용' : '제한'} · 음성(TTS): {entry.allowTTS ? '허용' : '제한'} · AI 근거: {entry.allowAIProcessing ? '허용' : '제한'}
                </Text>
                <Text style={{ color: palette.textSecondary, fontSize: 11 }}>{entry.permissionEvidence}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={privacyModalOpen} animationType="slide" onRequestClose={() => setPrivacyModalOpen(false)}>
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.primary }]}>개인정보 처리방침 및 오픈소스 고지</Text>
            <Pressable onPress={() => setPrivacyModalOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={palette.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.primary }]}>개인정보 최소 수집 및 로컬 비공개 원칙</Text>
              <Text style={{ color: palette.textPrimary, fontSize: 14, lineHeight: 21 }}>
                본 앱은 비회원·오프라인 우선으로 작동하며, 사용자의 종교·사상·신념을 드러낼 수 있는 경전 읽기 기록, 북마크, 수행 일지를 외부 서버에 저장하지 않습니다. 광고 추적이나 맞춤형 광고 타기팅을 수행하지 않으며, AI 탐구 기능 이용 시에도 개인 일지는 전송되지 않습니다.
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.primary }]}>오픈소스 고지</Text>
              <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 20 }}>
                Expo, React Native, React, TypeScript, expo-router, expo-sqlite, expo-speech, expo-notifications, @expo/vector-icons
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Restore Modal */}
      <Modal visible={restoreModalOpen} animationType="slide" onRequestClose={() => setRestoreModalOpen(false)}>
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.primary }]}>JSON 백업 복원</Text>
            <Pressable onPress={() => setRestoreModalOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={palette.textPrimary} />
            </Pressable>
          </View>
          <View style={styles.content}>
            <TextInput
              value={restoreJson}
              onChangeText={setRestoreJson}
              multiline
              placeholder="내보낸 백업 JSON 전체를 붙여넣으세요"
              placeholderTextColor={palette.textSecondary}
              style={[
                styles.jsonInput,
                { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceElevated },
              ]}
            />
            <Pressable onPress={handleRestore} style={[styles.actionBtn, { backgroundColor: palette.primary, borderColor: palette.primary }]}>
              <Text style={{ color: palette.textOnPrimary, fontWeight: '700' }}>백업 데이터 복원 실행</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color, subColor }: { label: string; value: number; color: string; subColor: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: subColor, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '800' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  rowGap: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  choiceBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: { flex: 1, paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  closeBtn: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jsonInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 200,
    textAlignVertical: 'top',
    fontSize: 12,
  },
});
