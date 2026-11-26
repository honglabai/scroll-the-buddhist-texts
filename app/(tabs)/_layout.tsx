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
        tabBarActiveTintColor: palette.coral,
        tabBarInactiveTintColor: isDark ? '#8B8E87' : '#7A766E',
        tabBarStyle: {
          backgroundColor: isDark ? '#191D1A' : '#FAF8F4',
          borderTopColor: isDark ? '#272D29' : '#EAE4D9',
          height: 68,
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
          title: strings.tabs.today,
          tabBarAccessibilityLabel: strings.tabs.today,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={size}
              color={typeof color === 'string' ? color : palette.coral}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: strings.tabs.plans,
          tabBarAccessibilityLabel: strings.tabs.plans,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'book' : 'book-outline'}
              size={size}
              color={typeof color === 'string' ? color : palette.coral}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scroll"
        options={{
          title: strings.tabs.scroll,
          tabBarAccessibilityLabel: strings.tabs.scroll,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.scrollCircle,
                {
                  backgroundColor: focused
                    ? palette.coral
                    : isDark
                      ? '#3A3E3B'
                      : '#6E6B65',
                },
              ]}
            >
              <Ionicons name="chevron-up" size={18} color="#FFFFFF" />
            </View>
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
              color={typeof color === 'string' ? color : palette.coral}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scrollCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
