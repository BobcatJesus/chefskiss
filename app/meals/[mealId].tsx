import { useEffect, useState } from 'react';

import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMealById, type MealRecord } from '@/features/meals/api';
import { isUuid, normalizeRouteParam } from '@/lib/routeParams';

export default function MealDetailScreen() {
  const router = useRouter();
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const normalizedMealId = normalizeRouteParam(mealId);
  const hasValidMealId = isUuid(normalizedMealId);
  const [meal, setMeal] = useState<MealRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeal() {
      if (!normalizedMealId) {
        setErrorMessage('Meal id is missing from this route.');
        setIsLoading(false);
        return;
      }

      if (!hasValidMealId) {
        setErrorMessage('This meal link is invalid. Open the feed and select a meal again.');
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage(null);
        const record = await getMealById(normalizedMealId);
        setMeal(record);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load meal.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadMeal();
  }, [hasValidMealId, normalizedMealId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Meal detail</Text>
      </View>

      {isLoading ? <Text style={styles.helper}>Loading meal...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {errorMessage && !isLoading ? (
        <>
          <Link href="/(customer)/discover" style={styles.link}>Go back to world feed</Link>
          <Link href="/(cook)/meals" style={styles.link}>Open my menu</Link>
        </>
      ) : null}

      {meal ? (
        <View style={styles.card}>
          {meal.photo_url ? <Image source={{ uri: meal.photo_url }} style={styles.photo} /> : null}
          <Text style={styles.subtitle}>{meal.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.pricePill}>${(meal.price_cents / 100).toFixed(2)}</Text>
            <Text style={styles.meta}>Qty {meal.quantity_available}</Text>
          </View>
          <Text style={styles.meta}>Service: {serviceTypeLabel(meal.service_type)}</Text>
          <Text style={styles.meta}>Fulfillment: {fulfillmentSummary(meal.offers_pickup, meal.offers_cook_delivery)}</Text>
          <Text style={styles.meta}>Ingredients: {ingredientModelLabel(meal.ingredient_model)}</Text>
          <Text style={styles.description}>{meal.description || 'No description yet.'}</Text>
          <Text style={styles.meta}>{meal.is_published ? 'Available for pickup' : 'Currently not published'}</Text>

          <Pressable
            disabled={meal.quantity_available <= 0}
            onPress={() => router.push(`/orders/checkout?mealId=${meal.id}`)}
            style={[styles.button, meal.quantity_available <= 0 ? styles.buttonDisabled : null]}
          >
            <Text style={styles.buttonLabel}>{meal.quantity_available <= 0 ? 'Sold out' : 'Order this meal'}</Text>
          </Pressable>
        </View>
      ) : null}
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
    backgroundColor: '#111827',
  },
  title: { fontSize: 30, lineHeight: 34, fontWeight: '800', color: '#f8fafc' },
  card: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#e2e8f0',
  },
  subtitle: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: '#111827' },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pricePill: {
    color: '#111827',
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: '800',
  },
  meta: { marginTop: 8, color: '#475569', fontWeight: '600' },
  description: { marginTop: 12, color: '#0f172a', lineHeight: 22 },
  helper: { marginTop: 12, color: '#4b5563' },
  error: { marginTop: 12, color: '#b91c1c' },
  link: { marginTop: 10, color: '#0f766e', fontWeight: '700' },
  button: {
    marginTop: 20,
    backgroundColor: '#c2410c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonLabel: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});

function serviceTypeLabel(value: 'prepared_meals' | 'meal_prep' | 'in_home_chef') {
  if (value === 'meal_prep') {
    return 'Meal Prep';
  }

  if (value === 'in_home_chef') {
    return 'In-Home Chef';
  }

  return 'Prepared Meals';
}

function ingredientModelLabel(value: 'cook_provides' | 'customer_provides' | 'customer_chooses') {
  if (value === 'customer_provides') {
    return 'Customer provides';
  }

  if (value === 'customer_chooses') {
    return 'Customer chooses at booking';
  }

  return 'Cook provides';
}

function fulfillmentSummary(offersPickup: boolean, offersCookDelivery: boolean) {
  if (offersPickup && offersCookDelivery) {
    return 'Pickup or cook delivery';
  }

  if (offersCookDelivery) {
    return 'Cook delivery';
  }

  return 'Pickup';
}