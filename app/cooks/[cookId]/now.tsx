import { useEffect, useState } from 'react';

import { Link, useLocalSearchParams } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';

import { listPublishedMeals, type DiscoverMeal } from '@/features/meals/api';
import { getCookProfileById, type CookProfileRecord } from '@/features/profiles/api';
import { isUuid, normalizeRouteParam } from '@/lib/routeParams';

export default function CookNowPublicScreen() {
  const { cookId } = useLocalSearchParams<{ cookId: string }>();
  const normalizedCookId = normalizeRouteParam(cookId);
  const [cook, setCook] = useState<CookProfileRecord | null>(null);
  const [meals, setMeals] = useState<DiscoverMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!normalizedCookId || !isUuid(normalizedCookId)) {
        setErrorMessage('This current-offerings link is invalid.');
        setIsLoading(false);
        return;
      }

      try {
        const [cookRecord, publishedMeals] = await Promise.all([getCookProfileById(normalizedCookId), listPublishedMeals()]);
        setCook(cookRecord);
        setMeals(publishedMeals.filter((meal) => meal.cook_profile_id === normalizedCookId && meal.is_available_now && meal.quantity_available > 0));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load current offerings.');
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [normalizedCookId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Today’s table</Text>
            <Text style={styles.title}>{cook?.display_name || 'Making Now'}</Text>
            <Text style={styles.subtitle}>What this chef is making right now. These offerings may change or sell out.</Text>
            <Link href={`/cooks/${normalizedCookId}/menu`} style={styles.menuLink}>View the full menu</Link>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {isLoading ? <Text style={styles.helper}>Loading current offerings...</Text> : null}
          </View>
        }
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>Nothing is being made right now. Check the full menu for the chef’s complete repertoire.</Text> : null}
        renderItem={({ item }) => (
          <Link href={`/meals/${item.id}`} asChild>
            <View style={styles.card}>
              {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.photo} resizeMode="cover" /> : null}
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>{item.quantity_available} available · ${(item.price_cents / 100).toFixed(2)}</Text>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
              <Text style={styles.cta}>View dish</Text>
            </View>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf0' },
  content: { padding: 18, paddingBottom: 36, flexGrow: 1 },
  header: { marginBottom: 16 },
  eyebrow: { color: '#c2410c', fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { marginTop: 5, color: '#17332f', fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 8, color: '#53645f', lineHeight: 21 },
  menuLink: { marginTop: 12, color: '#0f766e', fontWeight: '800' },
  helper: { marginTop: 12, color: '#64716e' },
  error: { marginTop: 12, color: '#b91c1c', fontWeight: '700' },
  empty: { borderRadius: 14, backgroundColor: '#fff7ed', padding: 16, color: '#9a3412', lineHeight: 20 },
  card: { marginBottom: 12, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: '#b8d8cb', backgroundColor: '#ffffff', padding: 12 },
  photo: { width: '100%', height: 210, borderRadius: 11, backgroundColor: '#dcefe7', marginBottom: 10 },
  cardTitle: { color: '#17332f', fontSize: 19, fontWeight: '800' },
  cardMeta: { marginTop: 5, color: '#286052', fontWeight: '700' },
  description: { marginTop: 7, color: '#53645f', lineHeight: 20 },
  cta: { marginTop: 11, color: '#c2410c', fontWeight: '800' },
});
