import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function CookLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#17332f',
        tabBarInactiveTintColor: '#71807a',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: Platform.select({ ios: 84, default: 68 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 20, default: 10 }),
          borderTopColor: '#d9e2dc',
          borderTopWidth: 1,
          backgroundColor: '#fffdf8',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen name="meals" options={{ title: 'Menu', tabBarLabel: 'My Menu' }} />
      <Tabs.Screen name="now" options={{ title: 'Making Now', tabBarLabel: 'Now' }} />
      <Tabs.Screen name="beauty" options={{ title: 'Beauty', tabBarLabel: 'Beauty' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarLabel: 'Orders' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Account' }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="availability" options={{ href: null }} />
    </Tabs>
  );
}