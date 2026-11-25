import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function scheduleDailyPlanReminder(params: {
  planId: string;
  planTitle: string;
  hour: number;
  minute: number;
}): Promise<{ scheduled: boolean; reason?: string }> {
  if (Platform.OS === 'web') {
    return { scheduled: false, reason: '웹 환경에서는 로컬 푸시 알림이 지원되지 않습니다.' };
  }

  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      return { scheduled: false, reason: '알림 권한이 허용되지 않았습니다.' };
    }

    // Cancel any existing notification for this planId to prevent duplicates
    await cancelPlanReminder(params.planId);

    await Notifications.scheduleNotificationAsync({
      identifier: `plan-reminder-${params.planId}`,
      content: {
        title: '마음스크롤 · 오늘의 경전',
        body: `${params.planTitle} — 오늘의 구절을 천천히 읽어보세요.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: params.hour,
        minute: params.minute,
      },
    });
    return { scheduled: true };
  } catch (err) {
    return {
      scheduled: false,
      reason: err instanceof Error ? err.message : '알림 예약에 실패했습니다.',
    };
  }
}

export async function cancelPlanReminder(planId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`plan-reminder-${planId}`);
  } catch {
    // Ignore if not scheduled
  }
}
