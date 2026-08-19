import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useAuth } from '@/features/auth/hooks';

export default function CompleteProfileScreen() {
  const { session } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Complete profile</Text>
      <Text style={styles.subtitle}>Name, city, and phone go here.</Text>
      <Text style={styles.email}>Signed in as {session?.user.email ?? 'unknown user'}</Text>
      <Link href="/onboarding/become-cook" style={styles.link}>
        Become a cook
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingBottom: 56 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#4b5563' },
  email: { marginTop: 8, color: '#111827' },
  link: { marginTop: 16, color: '#0f766e', fontWeight: '600' },
});