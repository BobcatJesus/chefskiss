import { Redirect, useLocalSearchParams } from 'expo-router';

import { resolvePermanentQrTarget } from '@/constants/permanentQrLinks';
import { useAuth } from '@/features/auth/hooks';

export default function Index() {
  const { session } = useAuth();
  const { go } = useLocalSearchParams<{ go?: string }>();
  const qrTarget = resolvePermanentQrTarget(String(go ?? ''));

  if (qrTarget) {
    const separator = qrTarget.includes('?') ? '&' : '?';
    return <Redirect href={`${qrTarget}${separator}src=qr-${encodeURIComponent(String(go))}`} />;
  }

  if (session) {
    return <Redirect href="/(customer)/discover" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}