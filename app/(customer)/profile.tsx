import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/hooks';

export default function CustomerProfileScreen() {
  const { session } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>My account</Text>
        <Text style={styles.subtitle}>One account can order meals and run your cook storefront.</Text>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.emailLabel}>Signed in as</Text>
        <Text style={styles.email}>{session?.user.email ?? 'No email'}</Text>

        <Link href="/onboarding/become-cook" style={styles.link}>
          Activate cook profile
        </Link>

        <Pressable onPress={() => void signOut()} style={styles.button}>
          <Text style={styles.buttonLabel}>Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8e7',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 56,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#7c2d12',
  },
  title: { fontSize: 30, lineHeight: 34, fontWeight: '800', color: '#fff7ed' },
  subtitle: { marginTop: 6, color: '#fed7aa', fontSize: 15 },
  profileCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  emailLabel: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  email: { marginTop: 6, color: '#111827', fontWeight: '700' },
  link: { marginTop: 16, color: '#c2410c', fontWeight: '700' },
  button: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
});