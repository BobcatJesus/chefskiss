import { useEffect, useMemo } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { resolvePermanentQrTarget } from '@/constants/permanentQrLinks';

export default function PermanentQrRedirectScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();

  const normalizedCode = useMemo(() => String(code ?? '').trim(), [code]);
  const target = useMemo(() => resolvePermanentQrTarget(normalizedCode), [normalizedCode]);

  useEffect(() => {
    if (!target) {
      return;
    }

    // Include the original code as a query token so destination analytics can detect QR entries.
    const separator = target.includes('?') ? '&' : '?';
    router.replace(`${target}${separator}src=qr-${encodeURIComponent(normalizedCode)}`);
  }, [normalizedCode, router, target]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Opening Chefskiss...</Text>
      {target ? (
        <Text style={styles.helper}>Redirecting with permanent QR code</Text>
      ) : (
        <Text style={styles.error}>This QR code path is not configured.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf0',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  helper: {
    marginTop: 8,
    color: '#475569',
  },
  error: {
    marginTop: 8,
    color: '#b91c1c',
    textAlign: 'center',
  },
});
