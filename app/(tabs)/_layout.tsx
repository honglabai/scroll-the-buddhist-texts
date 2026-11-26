import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../../src/features/app/AppProvider';

export default function TabLayout() {
  const { palette, strings } = useApp();
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
          title: strings.tabs.home,
          tabBarAccessibilityLabel: strings.tabs.home,
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
          title: strings.tabs.library,
          tabBarAccessibilityLabel: strings.tabs.library,
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
          title: strings.tabs.practice,
          tabBarAccessibilityLabel: strings.tabs.practice,
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
          title: strings.tabs.saved,
          tabBarAccessibilityLabel: strings.tabs.saved,
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
          title: strings.tabs.my,
          tabBarAccessibilityLabel: strings.tabs.my,
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
