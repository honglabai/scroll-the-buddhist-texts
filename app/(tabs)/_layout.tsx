import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useApp } from '../../src/features/app/AppProvider';

export default function TabLayout() {
  const { palette } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarAccessibilityLabel: '홈 피드 탭',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={typeof color === 'string' ? color : palette.primary} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: '경전',
          tabBarAccessibilityLabel: '경전 목록 및 검색 탭',
          tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={typeof color === 'string' ? color : palette.primary} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: '수행',
          tabBarAccessibilityLabel: '수행 계획 및 명상 탭',
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={typeof color === 'string' ? color : palette.primary} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: '저장',
          tabBarAccessibilityLabel: '저장한 구절 및 일지 탭',
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" size={size} color={typeof color === 'string' ? color : palette.primary} />,
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: 'My',
          tabBarAccessibilityLabel: '설정 및 내 정보 탭',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={typeof color === 'string' ? color : palette.primary} />,
        }}
      />
    </Tabs>
  );
}
