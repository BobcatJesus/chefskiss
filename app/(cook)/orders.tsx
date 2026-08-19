import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

export default function CookOrdersScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cook orders</Text>
      <Text style={styles.subtitle}>Accept or decline incoming orders.</Text>
      <Link href="/orders/demo-order" style={styles.link}>
        Open sample order
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingBottom: 56 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#4b5563' },
  link: { marginTop: 16, color: '#0f766e', fontWeight: '600' },
});