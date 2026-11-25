import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../../src/features/app/AppProvider';

export default function TabLayout() {
  const { palette } = useApp();
  const isDark = palette.mode === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#F7F4EC' : palette.primary,
        tabBarInactiveTintColor: isDark ? '#8FA396' : palette.textSecondary,
        tabBarStyle: {
          backgroundColor: isDark ? '#0D1310' : palette.background,
          borderTopColor: isDark ? '#1F2C26' : palette.border,
          height: 66,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarAccessibilityLabel: '홈 피드 탭',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={typeof color === 'string' ? color : palette.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: '경전',
          tabBarAccessibilityLabel: '경전 목록 및 검색 탭',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'library' : 'library-outline'}
              size={size}
              color={typeof color === 'string' ? color : palette.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: '수행',
          tabBarAccessibilityLabel: '수행 계획 및 명상 탭',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.centerPill,
                {
                  backgroundColor: focused ? '#C5A26A' : palette.primary,
                  borderColor: '#C5A26A',
                },
              ]}
            >
              <Ionicons
                name="leaf"
                size={20}
                color={focused ? '#19221F' : '#F7F4EC'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: '저장',
          tabBarAccessibilityLabel: '저장한 구절 및 일지 탭',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'bookmark' : 'bookmark-outline'}
              size={size}
              color={typeof color === 'string' ? color : palette.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: 'My',
          tabBarAccessibilityLabel: '설정 및 내 정보 탭',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={typeof color === 'string' ? color : palette.primary}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerPill: {
    width: 44,
    height: 30,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
