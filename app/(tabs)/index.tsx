import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageBgPickerModal } from '../../src/components/PageBgPickerModal';
import { ARTWORK_PRESETS, resolvePageArtwork } from '../../src/components/pageArtworks';
import { MIN_TOUCH_SIZE } from '../../src/components/theme';
import { TOPICS } from '../../src/domain/readingRules';
import { useApp } from '../../src/features/app/AppProvider';
import {
  getLocalizedSourceRef,
  getLocalizedTopicLabel,
  getLocalizedWorkTitle,
} from '../../src/i18n/strings';

function formatTodayDate(lang: 'ko' | 'en'): string {
  const now = new Date();
  if (lang === 'en') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[now.getMonth()]} ${now.getDate()}`;
  }
  return `${now.getMonth() + 1}월 ${now.getDate()}일`;
}

export default function TodayScreen() {
  const router = useRouter();
  const {
    ready,
    error,
    palette,
    appLanguage,
    strings,
    settings,
    currentWork,
    feedItems,
    currentSegmentIndex,
    bookmarks,
    notes,
    readEventsCount,
    canInstallPwa,
    isStandalonePwa,
    promptPwaInstall,
    selectTopicFeed,
  } = useApp();

  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);

  const dateLabel = useMemo(() => formatTodayDate(appLanguage), [appLanguage]);
  const isDark = palette.mode === 'dark';
  const heroArtSource = resolvePageArtwork('today', settings, currentWork?.id).source;
  const plansTileArtSource = resolvePageArtwork('plans', settings).source;
  const topicsTileArtSource = ARTWORK_PRESETS['bamboo-path'].source;

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

  const currentItem = feedItems[currentSegmentIndex] ?? feedItems[0];
  const fullWorkTitle = currentWork ? getLocalizedWorkTitle(currentWork, appLanguage) : strings.appName;
  const shortWorkTitle = fullWorkTitle.replace(/\s*\(.*\)/, '');
  const resumeRef = currentItem ? getLocalizedSourceRef(currentItem.segment, appLanguage) : shortWorkTitle;
  const progressPct =
    feedItems.length > 0 ? Math.min(100, Math.round(((currentSegmentIndex + 1) / feedItems.length) * 100)) : 0;

  const serifTitleFont = Platform.select({
    ios: 'AppleMyungjo',
    android: 'serif',
    web: appLanguage === 'en' ? '"Noto Serif", Georgia, serif' : '"Noto Serif KR", Georgia, serif',
  });

  const showInstallBanner =
    Platform.OS === 'web' && canInstallPwa && !isStandalonePwa && !installDismissed;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.innerStage}>
          {/* Top Editorial Date Header + Read Streak Pill + Profile/Settings */}
          <View style={styles.topHeader}>
            <Text style={[styles.dateTitle, { color: palette.textPrimary, fontFamily: serifTitleFont }]}>
              {dateLabel}
            </Text>

            <View style={styles.headerActions}>
              <View
                accessibilityLabel={`${strings.today.streakLabel} ${readEventsCount}`}
                style={[
                  styles.streakPill,
                  { backgroundColor: isDark ? '#332522' : '#F4E4DF' },
                ]}
              >
                <Ionicons name="flame" size={16} color={palette.coral} />
                <Text style={[styles.streakCount, { color: palette.textPrimary }]}>
                  {readEventsCount}
                </Text>
              </View>

              <Pressable
                onPress={() => router.push('/my')}
                accessibilityRole="button"
                accessibilityLabel={strings.tabs.my}
                style={styles.profileBtn}
              >
                <Ionicons name="person-circle-outline" size={30} color={palette.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Optional WebAPK 1-Tap Install Banner (only when browser allows native install) */}
          {showInstallBanner && (
            <View
              style={[
                styles.installBanner,
                { backgroundColor: palette.card, borderColor: palette.coral },
              ]}
            >
              <Pressable
                onPress={() => {
                  promptPwaInstall();
                }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name="download-outline" size={18} color={palette.coral} />
                <Text style={{ color: palette.textPrimary, fontSize: 13, fontWeight: '700', flex: 1 }}>
                  {appLanguage === 'en'
                    ? 'Install App (Remove top browser bar)'
                    : '앱으로 설치하기 (상단 주소바 제거)'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setInstallDismissed(true)}
                accessibilityLabel="Close"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={palette.textSecondary} />
              </Pressable>
            </View>
          )}

          {/* Card 1: Main Scripture Journey Hero Card */}
          <View
            style={[
              styles.sectionCard,
              styles.cardShadow,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                {strings.today.journeyTitle}
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/library')}
                accessibilityRole="button"
                accessibilityLabel={strings.today.chooseText}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.chooseTextLink, { color: palette.coral }]}>
                  {strings.today.chooseText}
                </Text>
              </Pressable>
            </View>

            <View style={styles.heroFrame}>
              <ImageBackground
                source={heroArtSource}
                style={styles.heroBg}
                imageStyle={styles.heroBgImage}
                resizeMode="cover"
              >
                {/* Smooth Atmospheric Gradient Overlay for Crisp White Text */}
                <View style={styles.heroScrimTop} />
                {Platform.OS === 'web' ? (
                  <View
                    style={[
                      styles.heroScrimGradient,
                      {
                        backgroundImage:
                          'linear-gradient(180deg, rgba(16,18,15,0.02) 0%, rgba(16,18,15,0.18) 38%, rgba(16,18,15,0.72) 100%)',
                      } as unknown as Record<string, unknown>,
                    ]}
                  />
                ) : (
                  <View style={styles.heroScrimBottom} />
                )}

                <View style={styles.heroContent}>
                  <View style={styles.heroBadgeRow}>
                    <View style={styles.verseBadge}>
                      <Text style={styles.verseBadgeText}>{strings.today.verseByVerseBadge}</Text>
                    </View>
                    <Pressable
                      onPress={() => setBgPickerOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel={strings.artwork.changeBg}
                      style={styles.heroArtBtn}
                    >
                      <Ionicons name="image-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.heroArtBtnText}>{strings.artwork.changeBg}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.heroBottomStack}>
                    <Text style={styles.heroWorkTitle} numberOfLines={2}>
                      {shortWorkTitle}
                    </Text>
                    <Text style={styles.heroResumeText} numberOfLines={1}>
                      {strings.today.resumeFrom(resumeRef)}
                    </Text>

                    <View style={styles.heroProgressTrack}>
                      <View style={[styles.heroProgressFill, { width: `${progressPct}%` }]} />
                    </View>

                    <Pressable
                      onPress={() => router.push('/(tabs)/scroll')}
                      accessibilityRole="button"
                      accessibilityLabel={strings.today.continueReading}
                      style={styles.continueBtn}
                    >
                      <Ionicons name="play" size={15} color="#FFFFFF" />
                      <Text style={styles.continueBtnText}>{strings.today.continueReading}</Text>
                    </Pressable>
                  </View>
                </View>
              </ImageBackground>
            </View>
          </View>

          {/* Card 2: More Ways to Contemplate */}
          <View
            style={[
              styles.sectionCard,
              styles.cardShadow,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
              {strings.today.otherWaysTitle}
            </Text>

            <View style={styles.waysGrid}>
              <Pressable
                onPress={() => router.push('/(tabs)/practice')}
                accessibilityRole="button"
                accessibilityLabel={strings.today.plansCardTitle}
                style={styles.wayTile}
              >
                <ImageBackground
                  source={plansTileArtSource}
                  style={styles.wayBg}
                  imageStyle={{ borderRadius: 18 }}
                  resizeMode="cover"
                >
                  <View style={styles.wayScrim} />
                  <View style={styles.wayInner}>
                    <View style={styles.wayTopRow}>
                      <View style={styles.wayIconCircle}>
                        <Ionicons name="book" size={14} color="#FFFFFF" />
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
                    </View>
                    <View>
                      <Text style={styles.wayTitle}>{strings.today.plansCardTitle}</Text>
                      <Text style={styles.waySub} numberOfLines={1}>
                        {strings.today.plansCardSub}
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </Pressable>

              <Pressable
                onPress={() => setTopicModalOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={strings.today.topicsCardTitle}
                style={styles.wayTile}
              >
                <ImageBackground
                  source={topicsTileArtSource}
                  style={styles.wayBg}
                  imageStyle={{ borderRadius: 18 }}
                  resizeMode="cover"
                >
                  <View style={styles.wayScrim} />
                  <View style={styles.wayInner}>
                    <View style={styles.wayTopRow}>
                      <View style={styles.wayIconCircle}>
                        <Ionicons name="compass" size={14} color="#FFFFFF" />
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
                    </View>
                    <View>
                      <Text style={styles.wayTitle}>{strings.today.topicsCardTitle}</Text>
                      <Text style={styles.waySub} numberOfLines={1}>
                        {strings.today.topicsCardSub}
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </Pressable>
            </View>
          </View>

          {/* Compact Saved Verses & Private Journal Row */}
          <Pressable
            onPress={() => router.push('/saved')}
            accessibilityRole="button"
            accessibilityLabel={strings.today.savedRowTitle}
            style={[
              styles.savedSummaryCard,
              styles.cardShadow,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <View style={[styles.savedIconBox, { backgroundColor: isDark ? '#332522' : '#F6E8E4' }]}>
              <Ionicons name="bookmark" size={20} color={palette.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.textPrimary, fontSize: 15, fontWeight: '700' }}>
                {strings.today.savedRowTitle}
              </Text>
              <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}>
                {strings.today.savedRowSub(bookmarks.length, notes.length)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Topic Selector Modal (jumps straight to Scroll tab in Topic mode) */}
      <Modal
        visible={topicModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTopicModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                {strings.home.topicModalTitle}
              </Text>
              <Pressable onPress={() => setTopicModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={palette.textPrimary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              {TOPICS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={async () => {
                    setTopicModalOpen(false);
                    await selectTopicFeed(t.id);
                    router.push('/(tabs)/scroll');
                  }}
                  style={[styles.topicRow, { borderColor: palette.border }]}
                >
                  <Text style={{ color: palette.textPrimary, fontWeight: '600', fontSize: 15 }}>
                    {getLocalizedTopicLabel(t.id, appLanguage)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <PageBgPickerModal
        visible={bgPickerOpen}
        pageKey="today"
        onClose={() => setBgPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    alignItems: 'center',
  },
  innerStage: {
    width: '100%',
    maxWidth: 480,
    gap: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dateTitle: {
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
  },
  streakCount: {
    fontSize: 15,
    fontWeight: '700',
  },
  profileBtn: {
    minWidth: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  cardShadow: {
    shadowColor: '#1F1D1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  chooseTextLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroFrame: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroBg: {
    height: 312,
    width: '100%',
    justifyContent: 'space-between',
  },
  heroBgImage: {
    borderRadius: 20,
  },
  heroScrimTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(18, 20, 16, 0.14)',
  },
  heroScrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    backgroundColor: 'rgba(16, 18, 15, 0.56)',
  },
  heroScrimGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heroContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroArtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(24, 26, 22, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  heroArtBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  verseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(92, 82, 58, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  verseBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  heroBottomStack: {
    gap: 8,
  },
  heroWorkTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroResumeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '500',
  },
  heroProgressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 4,
  },
  heroProgressFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  continueBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(30, 32, 28, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  waysGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  wayTile: {
    flex: 1,
    height: 142,
    borderRadius: 18,
    overflow: 'hidden',
  },
  wayBg: {
    flex: 1,
    width: '100%',
  },
  wayScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(18, 22, 18, 0.42)',
    borderRadius: 18,
  },
  wayInner: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  wayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wayIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wayTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  waySub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  savedSummaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  closeBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: MIN_TOUCH_SIZE,
  },
});
