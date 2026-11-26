import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { FONT_SCALE_MAP, MIN_TOUCH_SIZE } from '../src/components/theme';
import { getFeatureFlags } from '../src/domain/featureFlags';
import type { AppLanguage, FontScaleLevel, ThemeMode } from '../src/domain/types';
import { useApp } from '../src/features/app/AppProvider';
import { SUBSCRIPTION_PLANS_HYPOTHESIS } from '../src/features/extensions/extensionServices';

export default function MyScreen() {
  const router = useRouter();
  const {
    palette,
    appLanguage,
    strings,
    settings,
    readEventsCount,
    bookmarks,
    notes,
    rightsEntries,
    canInstallPwa,
    isStandalonePwa,
    promptPwaInstall,
    setAppLanguage,
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

  const handleInstallApp = async () => {
    const triggered = await promptPwaInstall();
    if (!triggered) {
      setStatusMessage(strings.my.pwaToast);
    }
  };

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
      setStatusMessage(strings.my.exportedMsg);
      return;
    }
    await Share.share({
      title: strings.appName,
      message: json,
    });
  };

  const handleRestore = async () => {
    try {
      await importBackup(restoreJson);
      setRestoreModalOpen(false);
      setRestoreJson('');
      setStatusMessage(strings.my.restoredMsg);
    } catch (err) {
      Alert.alert(strings.my.restoreFailTitle, err instanceof Error ? err.message : strings.my.restoreFailTitle);
    }
  };

  const handleWipe = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(strings.my.wipeConfirmBody)) {
        wipeAllPersonalData().then(() => setStatusMessage(strings.my.wipedMsg));
      }
      return;
    }
    Alert.alert(strings.my.wipeConfirmTitle, strings.my.wipeConfirmBody, [
      { text: strings.my.cancel, style: 'cancel' },
      {
        text: strings.my.confirmDelete,
        style: 'destructive',
        onPress: () => wipeAllPersonalData().then(() => setStatusMessage(strings.my.wipedMsg)),
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))}
            accessibilityRole="button"
            style={[styles.backBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <Ionicons name="arrow-back" size={20} color={palette.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            {strings.tabs.my} · {strings.my.title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {statusMessage && (
          <View style={[styles.banner, { backgroundColor: palette.highlightBg }]}>
            <Text style={{ color: palette.textPrimary, fontSize: 13, flex: 1 }}>{statusMessage}</Text>
            <Pressable onPress={() => setStatusMessage(null)}>
              <Ionicons name="close" size={18} color={palette.textPrimary} />
            </Pressable>
          </View>
        )}

        {/* Language Selector (한국어 / English) */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{strings.my.languageTitle}</Text>
          <View style={styles.rowGap}>
            {(
              [
                { id: 'ko', label: strings.my.koreanLabel },
                { id: 'en', label: strings.my.englishLabel },
              ] as { id: AppLanguage; label: string }[]
            ).map((langOpt) => {
              const active = appLanguage === langOpt.id;
              return (
                <Pressable
                  key={langOpt.id}
                  onPress={() => setAppLanguage(langOpt.id)}
                  accessibilityRole="button"
                  accessibilityLabel={langOpt.label}
                  style={[
                    styles.choiceBtn,
                    {
                      backgroundColor: active ? palette.coral : palette.surfaceElevated,
                      borderColor: active ? palette.coral : palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : palette.textPrimary, fontWeight: '700' }}>
                    {langOpt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* PWA Fullscreen Install Status (Web) */}
        {Platform.OS === 'web' && (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{strings.my.pwaTitle}</Text>
            {isStandalonePwa ? (
              <Text style={{ color: palette.coral, fontSize: 13, fontWeight: '600' }}>
                {strings.my.pwaActive}
              </Text>
            ) : (
              <>
                <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 19 }}>
                  {strings.my.pwaGuide}
                </Text>
                <Pressable onPress={handleInstallApp} style={[styles.actionBtn, { borderColor: palette.coral }]}>
                  <Text style={{ color: palette.coral, fontWeight: '700' }}>
                    {canInstallPwa ? strings.my.pwaInstallBtn : strings.my.pwaGuideBtn}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{strings.my.statsTitle}</Text>
          <View style={styles.statsRow}>
            <StatBox label={strings.my.statRead} value={readEventsCount} color={palette.coral} subColor={palette.textSecondary} />
            <StatBox label={strings.my.statSaved} value={bookmarks.length} color={palette.coral} subColor={palette.textSecondary} />
            <StatBox label={strings.my.statNotes} value={notes.length} color={palette.coral} subColor={palette.textSecondary} />
          </View>
        </View>

        {/* 5-step Font Size */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            {strings.my.fontSizeTitle(FONT_SCALE_MAP[settings.fontScaleLevel])}
          </Text>
          <View style={styles.rowGap}>
            {([1, 2, 3, 4, 5] as FontScaleLevel[]).map((lvl) => {
              const active = settings.fontScaleLevel === lvl;
              return (
                <Pressable
                  key={lvl}
                  onPress={() => updateFontScale(lvl)}
                  accessibilityRole="button"
                  accessibilityLabel={`${lvl}`}
                  style={[
                    styles.choiceBtn,
                    {
                      backgroundColor: active ? palette.coral : palette.surfaceElevated,
                      borderColor: active ? palette.coral : palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : palette.textPrimary, fontWeight: '700' }}>
                    {lvl}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.cardTitle, { color: palette.textPrimary, marginTop: 6 }]}>
            {strings.my.fontStyleAndLineTitle}
          </Text>
          <View style={styles.rowGap}>
            {(
              [
                { id: 'sans', label: strings.my.sansLabel },
                { id: 'serif', label: strings.my.serifLabel },
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
                      backgroundColor: active ? palette.coral : palette.surfaceElevated,
                      borderColor: active ? palette.coral : palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : palette.textPrimary, fontWeight: '600' }}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.rowGap}>
            {[
              { value: 1.35, label: strings.my.lineNarrow },
              { value: 1.55, label: strings.my.lineNormal },
              { value: 1.8, label: strings.my.lineWide },
            ].map((lh) => {
              const active = Math.abs(settings.lineHeightMultiplier - lh.value) < 0.05;
              return (
                <Pressable
                  key={lh.value}
                  onPress={() => updateLineHeight(lh.value)}
                  style={[
                    styles.choiceBtn,
                    {
                      backgroundColor: active ? palette.coral : palette.surfaceElevated,
                      borderColor: active ? palette.coral : palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : palette.textPrimary, fontWeight: '600' }}>
                    {lh.label} ({lh.value})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Theme */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{strings.my.themeTitle}</Text>
          <View style={styles.rowGap}>
            {(
              [
                { id: 'system', label: strings.my.themeSystem },
                { id: 'light', label: strings.my.themeLight },
                { id: 'dark', label: strings.my.themeDark },
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
                      backgroundColor: active ? palette.coral : palette.surfaceElevated,
                      borderColor: active ? palette.coral : palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : palette.textPrimary, fontSize: 13, fontWeight: '600' }}>
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
            <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>{strings.my.reduceMotion}</Text>
            <Switch
              value={settings.reduceMotion}
              onValueChange={updateReduceMotion}
              trackColor={{ false: palette.border, true: palette.coral }}
            />
          </View>

          <Text style={[styles.cardTitle, { color: palette.textPrimary, marginTop: 8 }]}>
            {strings.my.ttsSpeed(settings.ttsRate)}
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
                      backgroundColor: active ? palette.coral : palette.surfaceElevated,
                      borderColor: active ? palette.coral : palette.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : palette.textPrimary, fontWeight: '600' }}>
                    {r}x
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sources & Privacy */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{strings.my.sourcesTitle}</Text>
          <Pressable onPress={() => setSourcesModalOpen(true)} style={[styles.actionBtn, { borderColor: palette.coral }]}>
            <Text style={{ color: palette.coral, fontWeight: '700' }}>
              {strings.my.sourcesBtn(rightsEntries.length)}
            </Text>
          </Pressable>
          <Pressable onPress={() => setPrivacyModalOpen(true)} style={[styles.actionBtn, { borderColor: palette.border }]}>
            <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>{strings.my.privacyBtn}</Text>
          </Pressable>
        </View>

        {/* Backup & Delete */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{strings.my.backupTitle}</Text>
          <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 19 }}>
            {strings.my.backupDesc}
          </Text>
          <Pressable onPress={handleExport} style={[styles.actionBtn, { borderColor: palette.coral }]}>
            <Text style={{ color: palette.coral, fontWeight: '700' }}>{strings.my.exportBtn}</Text>
          </Pressable>
          <Pressable onPress={() => setRestoreModalOpen(true)} style={[styles.actionBtn, { borderColor: palette.border }]}>
            <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>{strings.my.restoreBtn}</Text>
          </Pressable>
          <Pressable onPress={handleWipe} style={[styles.actionBtn, { borderColor: palette.danger }]}>
            <Text style={{ color: palette.danger, fontWeight: '700' }}>{strings.my.wipeBtn}</Text>
          </Pressable>
        </View>

        {/* Stage 8 Optional Feature Flags */}
        {flags.premium && (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{strings.appName} Plus</Text>
            {SUBSCRIPTION_PLANS_HYPOTHESIS.map((p) => (
              <Text key={p.id} style={{ color: palette.textPrimary, fontSize: 13 }}>
                • {p.label}: {p.priceKrw.toLocaleString()} / {p.period}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sources Modal */}
      <Modal visible={sourcesModalOpen} animationType="slide" onRequestClose={() => setSourcesModalOpen(false)}>
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.primary }]}>{strings.my.sourcesModalTitle}</Text>
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
                  {strings.my.translatorLabel}: {entry.translator} · {strings.my.licenseLabel}: {entry.license}
                </Text>
                <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                  {strings.my.permShare}: {entry.allowShare ? strings.my.allowed : strings.my.restricted} ·{' '}
                  {strings.my.permTts}: {entry.allowTTS ? strings.my.allowed : strings.my.restricted} ·{' '}
                  {strings.my.permAi}: {entry.allowAIProcessing ? strings.my.allowed : strings.my.restricted}
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
            <Text style={[styles.modalTitle, { color: palette.primary }]}>{strings.my.privacyModalTitle}</Text>
            <Pressable onPress={() => setPrivacyModalOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={palette.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.primary }]}>{strings.my.privacyHeading}</Text>
              <Text style={{ color: palette.textPrimary, fontSize: 14, lineHeight: 21 }}>
                {strings.my.privacyBody}
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.primary }]}>{strings.my.ossHeading}</Text>
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
            <Text style={[styles.modalTitle, { color: palette.primary }]}>{strings.my.restoreModalTitle}</Text>
            <Pressable onPress={() => setRestoreModalOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={palette.textPrimary} />
            </Pressable>
          </View>
          <View style={styles.content}>
            <TextInput
              value={restoreJson}
              onChangeText={setRestoreJson}
              multiline
              placeholder={strings.my.restorePlaceholder}
              placeholderTextColor={palette.textSecondary}
              style={[
                styles.jsonInput,
                { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceElevated },
              ]}
            />
            <Pressable onPress={handleRestore} style={[styles.actionBtn, { backgroundColor: palette.primary, borderColor: palette.primary }]}>
              <Text style={{ color: palette.textOnPrimary, fontWeight: '700' }}>{strings.my.restoreExecBtn}</Text>
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
  content: { padding: 18, gap: 14, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40, height: 40 },
  title: { fontSize: 20, fontWeight: '800', flex: 1, textAlign: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6 },
  rowGap: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  choiceBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 14,
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
