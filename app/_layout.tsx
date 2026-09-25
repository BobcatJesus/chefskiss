import { useEffect } from 'react';

import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/features/auth/hooks';
import { isSupabaseConfigured } from '@/lib/supabase';

function getSessionRoles(session: any): string[] {
  const rawRoles = session?.user?.user_metadata?.roles ?? session?.user?.user_metadata?.role;

  if (Array.isArray(rawRoles)) {
    return rawRoles.filter((value): value is string => typeof value === 'string' && value.length > 0);
  }

  if (typeof rawRoles === 'string' && rawRoles.trim().length > 0) {
    return [rawRoles];
  }

  return ['customer'];
}

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const { session, isLoading } = useAuth();
  const customerDefaultRoute = '/(customer)/discover';
  const chefDefaultRoute = '/(cook)/meals';

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const firstSegment = segments[0];
    const isAuthRoute = firstSegment === '(auth)';
    const isPasswordResetRoute = pathname === '/reset-password';
    const roles = getSessionRoles(session);
    const targetRoute = roles.includes('chef') ? chefDefaultRoute : customerDefaultRoute;

    if (!session && !isAuthRoute && !isPasswordResetRoute) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (session && isAuthRoute && !isPasswordResetRoute) {
      if (roles.length > 1) {
        router.replace('/(auth)/choose-profile');
        return;
      }

      router.replace(targetRoute);
    }
  }, [isLoading, router, segments, session]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.missingConfigContainer}>
        <Text style={styles.missingConfigTitle}>Supabase Config Required</Text>
        <Text style={styles.missingConfigText}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart npm start.</Text>
      </View>
    );
  }

  const firstSegment = segments[0];
  const showGlobalNav = false;

  return (
    <View style={styles.appShell}>
      <View style={[styles.stackContainer, showGlobalNav ? styles.stackContainerWithNav : null]}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(cook)" />
        </Stack>
      </View>

      {showGlobalNav ? <GlobalBottomNav pathname={pathname} /> : null}
    </View>
  );
}

function GlobalBottomNav({ pathname }: { pathname: string }) {
  const router = useRouter();
  const navItems: Array<{ label: string; href: string; isActive: (path: string) => boolean }> = [
    {
      label: 'Market',
      href: '/(customer)/discover',
      isActive: (path) => path.includes('/discover'),
    },
    {
      label: 'Saved',
      href: '/(customer)/favorites',
      isActive: (path) => path.includes('/favorites'),
    },
    {
      label: 'My Menu',
      href: '/(cook)/meals',
      isActive: (path) => path.includes('/(cook)/meals') || path.includes('/meals/'),
    },
    {
      label: 'Orders',
      href: '/(customer)/orders',
      isActive: (path) => path.includes('/orders'),
    },
    {
      label: 'Account',
      href: '/(customer)/profile',
      isActive: (path) => path.includes('/profile'),
    },
  ];

  return (
    <View style={styles.globalNavWrap}>
      <View style={styles.globalNav}>
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.href as any)}
              style={active ? styles.globalNavButtonActive : styles.globalNavButton}
            >
              <Text style={active ? styles.globalNavButtonLabelActive : styles.globalNavButtonLabel}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  stackContainer: {
    flex: 1,
  },
  stackContainerWithNav: {
    paddingBottom: 84,
  },
  missingConfigContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  missingConfigTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  missingConfigText: {
    marginTop: 12,
    color: '#374151',
    textAlign: 'center',
    maxWidth: 520,
  },
  globalNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  globalNav: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 16,
    backgroundColor: '#fff8e6',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 6,
  },
  globalNavButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  globalNavButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  globalNavButtonLabel: {
    color: '#7c2d12',
    fontWeight: '800',
    fontSize: 12,
  },
  globalNavButtonLabelActive: {
    color: '#fde68a',
  },
});
