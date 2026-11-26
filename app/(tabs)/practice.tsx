import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MIN_TOUCH_SIZE } from '../../src/components/theme';
import { useApp } from '../../src/features/app/AppProvider';
import { getLocalizedPlanDesc, getLocalizedPlanTitle } from '../../src/i18n/strings';

export default function PracticeScreen() {
  const router = useRouter();
  const {
    palette,
    appLanguage,
    strings,
    plans,
    planProgressMap,
    readEventsCount,
    startPlan,
    getPlanItems,
    completePlanDay,
    togglePlanReminder,
    selectWorkAndSegment,
  } = useApp();

  // Simple reflection timer (3 minutes = 180s)
  const [meditationSec, setMeditationSec] = useState(180);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setMeditationSec((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>{strings.practice.title}</Text>
          <Pressable
            onPress={() => router.push('/my')}
            accessibilityRole="button"
            accessibilityLabel={strings.tabs.my}
            style={[styles.profileBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <Ionicons name="person-circle-outline" size={24} color={palette.textPrimary} />
          </Pressable>
        </View>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          {strings.practice.subtitle(readEventsCount)}
        </Text>

        {/* Breathing / Reflection Timer */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{strings.practice.timerTitle}</Text>
              <Text style={{ color: palette.textSecondary, fontSize: 13, marginTop: 4 }}>
                {strings.practice.timerDesc}
              </Text>
            </View>
            <Text style={[styles.timerText, { color: palette.coral }]}>{formatTimer(meditationSec)}</Text>
          </View>
          <View style={styles.timerActions}>
            <Pressable
              onPress={() => {
                if (meditationSec === 0) setMeditationSec(180);
                setTimerRunning((v) => !v);
              }}
              style={[styles.btn, { backgroundColor: palette.coral }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                {timerRunning
                  ? strings.practice.pause
                  : meditationSec === 0
                    ? strings.practice.restart
                    : strings.practice.start}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTimerRunning(false);
                setMeditationSec(180);
              }}
              style={[styles.btnOutline, { borderColor: palette.border }]}
            >
              <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>{strings.practice.reset}</Text>
            </Pressable>
          </View>
        </View>

        {/* Reading Plans */}
        <Text style={[styles.sectionHeader, { color: palette.textPrimary }]}>{strings.practice.plansTitle}</Text>
        {plans.map((plan) => {
          const prog = planProgressMap[plan.id];
          const completedCount = prog?.completedDays.length ?? 0;
          const pct = Math.min(100, Math.round((completedCount / plan.durationDays) * 100));
          const nextDay = completedCount + 1;

          return (
            <View key={plan.id} style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardTitle, { color: palette.textPrimary, flex: 1 }]}>
                  {getLocalizedPlanTitle(plan, appLanguage)}
                </Text>
                <Text style={{ color: palette.coral, fontWeight: '700', fontSize: 13 }}>
                  {completedCount} / {plan.durationDays}
                  {strings.practice.daysUnit} ({pct}%)
                </Text>
              </View>
              <Text style={{ color: palette.textSecondary, fontSize: 14, lineHeight: 20 }}>
                {getLocalizedPlanDesc(plan, appLanguage)}
              </Text>

              <View style={[styles.progressTrack, { backgroundColor: palette.background }]}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: palette.coral }]} />
              </View>

              {!prog ? (
                <Pressable
                  onPress={() => startPlan(plan.id)}
                  style={[styles.btn, { backgroundColor: palette.coral }]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    {strings.practice.startPlan}
                  </Text>
                </Pressable>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={styles.timerActions}>
                    <Pressable
                      onPress={async () => {
                        const items = await getPlanItems(plan.id);
                        const dayItem = items.find((i) => i.dayNumber === nextDay) ?? items[0];
                        if (dayItem?.segmentIds[0]) {
                          await selectWorkAndSegment(plan.workId, dayItem.segmentIds[0], 'sequential');
                          router.push('/(tabs)/scroll');
                        }
                      }}
                      style={[styles.btn, { backgroundColor: palette.coral }]}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                        {strings.practice.readDay(nextDay)}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        const items = await getPlanItems(plan.id);
                        const dayItem = items.find((i) => i.dayNumber === nextDay);
                        await completePlanDay(plan.id, nextDay, dayItem?.segmentIds ?? []);
                      }}
                      style={[styles.btnOutline, { borderColor: palette.coral }]}
                    >
                      <Ionicons name="checkmark" size={16} color={palette.coral} />
                      <Text style={{ color: palette.coral, fontWeight: '600' }}>
                        {strings.practice.manualComplete}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.rowBetween}>
                    <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
                      {strings.practice.reminderLabel}
                    </Text>
                    <Switch
                      value={prog.reminderEnabled}
                      onValueChange={async (val) => {
                        const msg = await togglePlanReminder(plan.id, val, 8, 0);
                        if (msg) Alert.alert(strings.practice.reminderAlertTitle, msg);
                      }}
                      trackColor={{ false: palette.border, true: palette.coral }}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, gap: 14, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { fontSize: 13, lineHeight: 19 },
  sectionHeader: { fontSize: 17, fontWeight: '800', marginTop: 6 },
  card: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  timerText: { fontSize: 26, fontWeight: '800' },
  timerActions: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
});
