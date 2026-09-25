import { useCallback, useState } from 'react';

import { Link, useFocusEffect } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { listOwnMeals, type MealRecord } from '@/features/meals/api';

export default function CookBeautyScreen() {
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMeals = useCallback(async () => {
    try {
      setErrorMessage(null);
      const rows = await listOwnMeals();
      setMeals(rows.filter((meal) => meal.photo_url));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load your beauty page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadMeals();
    }, [loadMeals])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Your food story</Text>
            <Text style={styles.title}>Beauty</Text>
            <Text style={styles.subtitle}>Turn your meal photos into a living showcase customers can feel before they order.</Text>
            <Link href="/meals/create" asChild>
              <Pressable style={styles.addButton}>
                <Text style={styles.addButtonLabel}>Add a new dish</Text>
              </Pressable>
            </Link>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {isLoading ? <Text style={styles.helper}>Loading your photos...</Text> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Your gallery is waiting.</Text>
              <Text style={styles.emptyText}>Upload a meal photo when you create or edit a dish. Published photos appear here as your chef showcase.</Text>
              <Link href="/meals/create" asChild>
                <Pressable style={styles.emptyButton}>
                  <Text style={styles.emptyButtonLabel}>Create your first dish</Text>
                </Pressable>
              </Link>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Link href={`/meals/edit/${item.id}`} asChild>
            <Pressable style={styles.tile}>
              <Image source={{ uri: item.photo_url || undefined }} style={styles.photo} resizeMode="cover" />
              <View style={styles.tileOverlay}>
                <Text style={styles.tileTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.tileStatus}>{item.is_published ? 'Live' : 'Draft'}</Text>
              </View>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf0' },
  content: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  header: { marginBottom: 18 },
  eyebrow: { color: '#c2410c', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { marginTop: 5, color: '#17332f', fontSize: 34, fontWeight: '900' },
  subtitle: { maxWidth: 620, marginTop: 7, color: '#53645f', fontSize: 15, lineHeight: 21 },
  addButton: { alignSelf: 'flex-start', marginTop: 14, borderRadius: 999, backgroundColor: '#17332f', paddingHorizontal: 15, paddingVertical: 10 },
  addButtonLabel: { color: '#fffaf0', fontWeight: '800' },
  error: { marginTop: 12, color: '#b91c1c', fontWeight: '700' },
  helper: { marginTop: 12, color: '#64716e' },
  gridRow: { gap: 8, marginBottom: 8 },
  tile: { flex: 1, aspectRatio: 1, overflow: 'hidden', borderRadius: 8, backgroundColor: '#dcefe7' },
  photo: { width: '100%', height: '100%' },
  tileOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 8, backgroundColor: 'rgba(23, 51, 47, 0.78)' },
  tileTitle: { color: '#fffaf0', fontSize: 13, fontWeight: '800' },
  tileStatus: { marginTop: 2, color: '#f7d794', fontSize: 11, fontWeight: '700' },
  emptyState: { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: '#bfded6', backgroundColor: '#e6f4ef', padding: 18 },
  emptyTitle: { color: '#17332f', fontSize: 20, fontWeight: '800' },
  emptyText: { marginTop: 7, color: '#53645f', lineHeight: 20 },
  emptyButton: { alignSelf: 'flex-start', marginTop: 14, borderRadius: 999, backgroundColor: '#c2410c', paddingHorizontal: 14, paddingVertical: 9 },
  emptyButtonLabel: { color: '#fff7ed', fontWeight: '800' },
});
