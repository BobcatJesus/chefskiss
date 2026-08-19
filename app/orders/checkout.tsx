import { useEffect, useRef, useState } from 'react';

import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getMealById, type MealRecord } from '@/features/meals/api';
import { createOrder } from '@/features/orders/api';
import { trackMenuEvent } from '@/features/profiles/api';
import { isUuid, normalizeRouteParam } from '@/lib/routeParams';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getDefaultRequestedTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateTimeInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getPickupPreset(type: 'asap' | 'tonight' | 'tomorrowLunch' | 'tomorrowDinner') {
  const date = new Date();

  if (type === 'asap') {
    date.setMinutes(date.getMinutes() + 90, 0, 0);
    return toDateTimeInputValue(date);
  }

  if (type === 'tonight') {
    date.setHours(18, 30, 0, 0);
    return toDateTimeInputValue(date);
  }

  date.setDate(date.getDate() + 1);
  date.setHours(type === 'tomorrowLunch' ? 12 : 18, 0, 0, 0);
  return toDateTimeInputValue(date);
}

function parseRequestedTime(value: string) {
  const normalized = value.trim().replace(' ', 'T');
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Pickup time must use YYYY-MM-DD HH:MM format.');
  }

  return parsed.toISOString();
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const normalizedMealId = normalizeRouteParam(mealId);
  const hasValidMealId = isUuid(normalizedMealId);
  const [meal, setMeal] = useState<MealRecord | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [fulfillmentMode, setFulfillmentMode] = useState<'pickup' | 'cook_delivery'>('pickup');
  const [ingredientModel, setIngredientModel] = useState<'cook_provides' | 'customer_provides'>('cook_provides');
  const [requestedTime, setRequestedTime] = useState(getDefaultRequestedTime());
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const trackedCheckoutStartRef = useRef<string | null>(null);

  useEffect(() => {
    async function loadMeal() {
      if (!normalizedMealId) {
        setErrorMessage('Meal id is missing from checkout.');
        setIsLoading(false);
        return;
      }

      if (!hasValidMealId) {
        setErrorMessage('This checkout link is invalid. Open checkout from a specific meal to use pickup presets like ASAP, Tonight, and Tomorrow.');
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage(null);
        const record = await getMealById(normalizedMealId);
        setMeal(record);
        setFulfillmentMode(record.offers_pickup ? 'pickup' : 'cook_delivery');
        setIngredientModel(record.ingredient_model === 'customer_provides' ? 'customer_provides' : 'cook_provides');
      } catch (error) {
        setErrorMessage(error instanceof Error ? `${error.message} Open checkout from a meal card to load preset options.` : 'Unable to load meal for checkout. Open checkout from a meal card to load preset options.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadMeal();
  }, [hasValidMealId, normalizedMealId]);

  useEffect(() => {
    if (!meal) {
      return;
    }

    if (trackedCheckoutStartRef.current === meal.id) {
      return;
    }

    trackedCheckoutStartRef.current = meal.id;
    void trackMenuEvent({
      cookProfileId: meal.cook_profile_id,
      eventType: 'checkout_start',
      mealId: meal.id,
      mealTitle: meal.title,
    });
  }, [meal]);

  async function handlePlaceOrder() {
    if (!meal) {
      setErrorMessage('Meal is not loaded yet.');
      return;
    }

    const quantityValue = Number(quantity);

    if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
      setErrorMessage('Quantity must be a whole number greater than 0.');
      return;
    }

    if (fulfillmentMode === 'pickup' && !meal.offers_pickup) {
      setErrorMessage('Pickup is not available for this offer.');
      return;
    }

    if (fulfillmentMode === 'cook_delivery' && !meal.offers_cook_delivery) {
      setErrorMessage('Cook delivery is not available for this offer.');
      return;
    }

    if (meal.ingredient_model === 'cook_provides' && ingredientModel !== 'cook_provides') {
      setErrorMessage('This offer requires cook-provided ingredients.');
      return;
    }

    if (meal.ingredient_model === 'customer_provides' && ingredientModel !== 'customer_provides') {
      setErrorMessage('This offer requires customer-provided ingredients.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const order = await createOrder({
        mealId: meal.id,
        quantity: quantityValue,
        fulfillmentMode,
        ingredientModel,
        scheduledFor: parseRequestedTime(requestedTime),
        specialInstructions,
      });
      router.replace(`/orders/${order.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to place order.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function adjustQuantity(delta: number) {
    const current = Number(quantity);
    const next = Number.isFinite(current) ? current + delta : 1;
    setQuantity(String(Math.max(1, next)));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.heroCard}>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.subtitle}>Confirm pickup details and place your order.</Text>
      </View>

      {isLoading ? <Text style={styles.helper}>Loading meal...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {errorMessage && !isLoading ? (
        <>
          <Link href="/(customer)/discover" style={styles.link}>Go to world feed</Link>
          <Link href="/(cook)/meals" style={styles.link}>Open my menu</Link>
        </>
      ) : null}

      {meal ? (
        <View style={styles.card}>
          <Text style={styles.mealTitle}>{meal.title}</Text>
          <Text style={styles.meta}>${(meal.price_cents / 100).toFixed(2)} each</Text>
          <Text style={styles.meta}>Service: {serviceTypeLabel(meal.service_type)}</Text>

          <View style={styles.inlineLabelRow}>
            <Text style={styles.fieldLabel}>Quantity</Text>
            <View style={styles.quantityControls}>
              <Pressable style={styles.quantityButton} onPress={() => adjustQuantity(-1)}>
                <Text style={styles.quantityButtonLabel}>-</Text>
              </Pressable>
              <Pressable style={styles.quantityButton} onPress={() => adjustQuantity(1)}>
                <Text style={styles.quantityButtonLabel}>+</Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            placeholder="Quantity"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Pickup time</Text>
          <View style={styles.presetRow}>
            <Pressable style={styles.presetChip} onPress={() => setRequestedTime(getPickupPreset('asap'))}>
              <Text style={styles.presetChipLabel}>ASAP</Text>
            </Pressable>
            <Pressable style={styles.presetChip} onPress={() => setRequestedTime(getPickupPreset('tonight'))}>
              <Text style={styles.presetChipLabel}>Tonight</Text>
            </Pressable>
            <Pressable style={styles.presetChip} onPress={() => setRequestedTime(getPickupPreset('tomorrowLunch'))}>
              <Text style={styles.presetChipLabel}>Tomorrow lunch</Text>
            </Pressable>
            <Pressable style={styles.presetChip} onPress={() => setRequestedTime(getPickupPreset('tomorrowDinner'))}>
              <Text style={styles.presetChipLabel}>Tomorrow dinner</Text>
            </Pressable>
          </View>

          <TextInput
            value={requestedTime}
            onChangeText={setRequestedTime}
            placeholder="YYYY-MM-DD HH:MM"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Fulfillment</Text>
          <View style={styles.presetRow}>
            {meal.offers_pickup ? (
              <Pressable
                style={[styles.presetChip, fulfillmentMode === 'pickup' ? styles.presetChipActive : null]}
                onPress={() => setFulfillmentMode('pickup')}
              >
                <Text style={[styles.presetChipLabel, fulfillmentMode === 'pickup' ? styles.presetChipLabelActive : null]}>Pickup</Text>
              </Pressable>
            ) : null}
            {meal.offers_cook_delivery ? (
              <Pressable
                style={[styles.presetChip, fulfillmentMode === 'cook_delivery' ? styles.presetChipActive : null]}
                onPress={() => setFulfillmentMode('cook_delivery')}
              >
                <Text style={[styles.presetChipLabel, fulfillmentMode === 'cook_delivery' ? styles.presetChipLabelActive : null]}>Cook delivery</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.fieldLabel}>Ingredients</Text>
          <View style={styles.presetRow}>
            {meal.ingredient_model === 'customer_chooses' ? (
              <>
                <Pressable
                  style={[styles.presetChip, ingredientModel === 'cook_provides' ? styles.presetChipActive : null]}
                  onPress={() => setIngredientModel('cook_provides')}
                >
                  <Text style={[styles.presetChipLabel, ingredientModel === 'cook_provides' ? styles.presetChipLabelActive : null]}>
                    Cook provides
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.presetChip, ingredientModel === 'customer_provides' ? styles.presetChipActive : null]}
                  onPress={() => setIngredientModel('customer_provides')}
                >
                  <Text style={[styles.presetChipLabel, ingredientModel === 'customer_provides' ? styles.presetChipLabelActive : null]}>
                    Customer provides
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.meta}>
                {meal.ingredient_model === 'cook_provides'
                  ? 'Cook provides ingredients for this offer.'
                  : 'Customer provides ingredients for this offer.'}
              </Text>
            )}
          </View>

          <TextInput
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholder="Special instructions"
            placeholderTextColor="#6b7280"
            multiline
            style={[styles.input, styles.multilineInput]}
          />

          <Pressable disabled={isSubmitting} onPress={handlePlaceOrder} style={styles.button}>
            <Text style={styles.buttonLabel}>{isSubmitting ? 'Placing order...' : 'Place order'}</Text>
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
    gap: 10,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#7c2d12',
  },
  title: { fontSize: 30, lineHeight: 34, fontWeight: '800', color: '#fff7ed' },
  subtitle: { marginTop: 6, color: '#fed7aa', fontSize: 15 },
  card: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  mealTitle: { marginTop: 2, fontSize: 22, fontWeight: '800', color: '#111827' },
  meta: { color: '#475569', marginTop: 6 },
  fieldLabel: {
    marginTop: 10,
    color: '#7c2d12',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inlineLabelRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffedd5',
    borderWidth: 1,
    borderColor: '#fdba74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonLabel: {
    color: '#9a3412',
    fontWeight: '800',
    fontSize: 16,
  },
  presetRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetChipLabel: {
    color: '#9a3412',
    fontWeight: '700',
    fontSize: 12,
  },
  presetChipActive: {
    borderColor: '#9a3412',
    backgroundColor: '#9a3412',
  },
  presetChipLabelActive: {
    color: '#fff7ed',
  },
  helper: { color: '#4b5563', marginTop: 12 },
  error: { color: '#b91c1c', marginTop: 12 },
  link: { color: '#0f766e', fontWeight: '700', marginTop: 10 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 10,
    backgroundColor: '#fffefc',
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: 12,
    backgroundColor: '#c2410c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
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