import { useEffect, useState } from 'react';

import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getOrderById, type OrderRecord } from '@/features/orders/api';
import { isUuid, normalizeRouteParam } from '@/lib/routeParams';

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const normalizedOrderId = normalizeRouteParam(orderId);
  const hasValidOrderId = isUuid(normalizedOrderId);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!normalizedOrderId) {
        setErrorMessage('Order id is missing from this route.');
        setIsLoading(false);
        return;
      }

      if (!hasValidOrderId) {
        setErrorMessage('This order link is invalid. Open your orders and select an order again.');
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage(null);
        const record = await getOrderById(normalizedOrderId);
        setOrder(record);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load order.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrder();
  }, [hasValidOrderId, normalizedOrderId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Order detail</Text>
      </View>

      {isLoading ? <Text style={styles.helper}>Loading order...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {errorMessage && !isLoading ? (
        <Link href="/(customer)/orders" style={styles.link}>Back to my orders</Link>
      ) : null}

      {order ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>{order.meal_title || `Meal ${order.meal_id}`}</Text>
          <Text style={styles.statusChip}>{order.status}</Text>
          <Text style={styles.meta}>Pickup: {new Date(order.scheduled_for).toLocaleString()}</Text>
          <Text style={styles.meta}>Quantity: {order.quantity}</Text>
          <Text style={styles.meta}>Fulfillment: {order.fulfillment_mode === 'cook_delivery' ? 'Cook delivery' : 'Pickup'}</Text>
          <Text style={styles.meta}>Ingredients: {order.ingredient_model === 'customer_provides' ? 'Customer provides' : 'Cook provides'}</Text>
          <Text style={styles.totalText}>Total: ${(order.total_cents / 100).toFixed(2)}</Text>
          <Text style={styles.notes}>{order.special_instructions || 'No special instructions.'}</Text>
          <Link href="/(customer)/orders" style={styles.orderBackLink}>
            Back to my orders
          </Link>
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
    backgroundColor: '#1e293b',
  },
  title: { fontSize: 30, lineHeight: 34, fontWeight: '800', color: '#f8fafc' },
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  subtitle: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: '#111827' },
  helper: { marginTop: 12, color: '#4b5563' },
  error: { marginTop: 12, color: '#b91c1c' },
  statusChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    color: '#9a3412',
    backgroundColor: '#ffedd5',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: 'capitalize',
    fontWeight: '800',
    fontSize: 12,
  },
  meta: { marginTop: 8, color: '#475569' },
  totalText: { marginTop: 10, color: '#111827', fontWeight: '800', fontSize: 18 },
  notes: { marginTop: 12, color: '#111827', lineHeight: 22 },
  link: { marginTop: 10, color: '#0f766e', fontWeight: '700' },
  orderBackLink: { marginTop: 16, color: '#c2410c', fontWeight: '800' },
});