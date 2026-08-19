import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111827',
        tabBarInactiveTintColor: '#64748b',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: Platform.select({ ios: 84, default: 68 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 20, default: 10 }),
          borderTopColor: '#f59e0b',
          borderTopWidth: 1,
          backgroundColor: '#fff8e6',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarLabel: 'Market' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites', tabBarLabel: 'Saved' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarLabel: 'Orders' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Account' }} />
    </Tabs>
  );
}