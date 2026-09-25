import { useCallback, useState } from 'react';

import { Link, useFocusEffect } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { listOwnMeals, setMealAvailableNow, type MealRecord } from '@/features/meals/api';

export default function CookNowScreen() {
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMeals = useCallback(async () => {
    try {
      setErrorMessage(null);
      const rows = await listOwnMeals();
      setMeals(rows.filter((meal) => meal.is_available_now && meal.quantity_available > 0));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load Making Now.');
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

  async function removeFromNow(mealId: string) {
    try {
      await setMealAvailableNow(mealId, false);
      setMeals((current) => current.filter((meal) => meal.id !== mealId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to remove dish from Making Now.');
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Today’s table</Text>
            <Text style={styles.title}>Making Now</Text>
            <Text style={styles.subtitle}>A temporary lineup for what is coming out of your kitchen right now. Your full menu stays unchanged.</Text>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {isLoading ? <Text style={styles.helper}>Checking today’s offerings...</Text> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nothing is making now.</Text>
              <Text style={styles.emptyText}>Open My Menu and add a published dish to the current lineup when you have a fresh batch ready.</Text>
              <Link href="/(cook)/meals" asChild>
                <Pressable style={styles.button}><Text style={styles.buttonLabel}>Open My Menu</Text></Pressable>
              </Link>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.photo} resizeMode="cover" /> : null}
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>{item.quantity_available} available · ${(item.price_cents / 100).toFixed(2)}</Text>
            {item.current_offer_note ? <Text style={styles.note}>{item.current_offer_note}</Text> : null}
            <Pressable onPress={() => void removeFromNow(item.id)} style={styles.removeButton}>
              <Text style={styles.removeLabel}>Remove from Making Now</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf0' },
  content: { padding: 18, paddingBottom: 40, flexGrow: 1 },
  header: { marginBottom: 16 },
  eyebrow: { color: '#c2410c', fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { marginTop: 5, color: '#17332f', fontSize: 32, fontWeight: '900' },
  subtitle: { marginTop: 7, color: '#53645f', lineHeight: 21, maxWidth: 650 },
  helper: { marginTop: 12, color: '#64716e' },
  error: { marginTop: 12, color: '#b91c1c', fontWeight: '700' },
  emptyState: { borderRadius: 16, borderWidth: 1, borderColor: '#f1c98b', backgroundColor: '#fff7ed', padding: 18 },
  emptyTitle: { color: '#7c2d12', fontSize: 20, fontWeight: '800' },
  emptyText: { marginTop: 7, color: '#9a3412', lineHeight: 20 },
  button: { alignSelf: 'flex-start', marginTop: 14, borderRadius: 999, backgroundColor: '#17332f', paddingHorizontal: 14, paddingVertical: 9 },
  buttonLabel: { color: '#fffaf0', fontWeight: '800' },
  card: { marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: '#b8d8cb', backgroundColor: '#ffffff', padding: 12 },
  photo: { width: '100%', height: 190, borderRadius: 11, backgroundColor: '#dcefe7', marginBottom: 10 },
  cardTitle: { color: '#17332f', fontSize: 19, fontWeight: '800' },
  cardMeta: { marginTop: 5, color: '#286052', fontWeight: '700' },
  note: { marginTop: 7, color: '#53645f', lineHeight: 19 },
  removeButton: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 999, borderWidth: 1, borderColor: '#c2410c', paddingHorizontal: 11, paddingVertical: 7 },
  removeLabel: { color: '#c2410c', fontSize: 12, fontWeight: '800' },
});
