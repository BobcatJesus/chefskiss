import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

export default function BecomeCookScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Become a cook</Text>
      <Text style={styles.subtitle}>Complete your legal attestation and cook profile before publishing meals.</Text>
      <Link href="/onboarding/legal-attestation" style={styles.link}>
        Start legal attestation
      </Link>
      <Link href="/(cook)/dashboard" style={styles.secondaryLink}>
        Open cook dashboard
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingBottom: 56 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#4b5563', textAlign: 'center' },
  link: { marginTop: 16, color: '#0f766e', fontWeight: '600' },
  secondaryLink: { marginTop: 10, color: '#0f172a', fontWeight: '600' },
});