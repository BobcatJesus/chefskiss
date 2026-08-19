import { useCallback, useState } from 'react';

import { Link, useFocusEffect } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { listCustomerOrders, type OrderRecord } from '@/features/orders/api';

export default function CustomerOrdersScreen() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'ready' | 'completed'>('all');

  const loadOrders = useCallback(async () => {
    try {
      setErrorMessage(null);
      const rows = await listCustomerOrders();
      setOrders(rows);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load orders.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadOrders();
    }, [loadOrders])
  );

  const visibleOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    if (!matchesStatus) {
      return false;
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    const title = (order.meal_title || `Meal ${order.meal_id}`).toLowerCase();
    return title.includes(query) || order.status.toLowerCase().includes(query);
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <Text style={styles.title}>My orders</Text>
              <Text style={styles.subtitle}>Track each order from request to pickup.</Text>
              <Text style={styles.heroStat}>{visibleOrders.length} shown</Text>
            </View>

            <View style={styles.controlsCard}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search order by meal or status"
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
              />
              <View style={styles.filterRow}>
                {(['all', 'pending', 'accepted', 'ready', 'completed'] as const).map((status) => {
                  const isActive = statusFilter === status;
                  return (
                    <Pressable
                      key={status}
                      style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
                      onPress={() => setStatusFilter(status)}
                    >
                      <Text style={[styles.filterChipLabel, isActive ? styles.filterChipLabelActive : null]}>{status}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {isLoading ? <Text style={styles.helper}>Loading orders...</Text> : null}
            {!isLoading && visibleOrders.length === 0 ? <Text style={styles.helper}>No orders match these filters.</Text> : null}
          </>
        }
        renderItem={({ item }) => (
          <Link href={`/orders/${item.id}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.meal_title || `Meal ${item.meal_id}`}</Text>
              <Text style={styles.statusChip}>{item.status}</Text>
            </View>
            <Text style={styles.cardMeta}>Pickup {new Date(item.scheduled_for).toLocaleString()}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.totalText}>${(item.total_cents / 100).toFixed(2)}</Text>
              <Text style={styles.detailLink}>Open order</Text>
            </View>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8e7',
  },
  list: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#7c2d12',
    marginBottom: 4,
  },
  title: { fontSize: 30, lineHeight: 34, fontWeight: '800', color: '#f8fafc' },
  subtitle: { marginTop: 6, color: '#ffedd5', fontSize: 15 },
  heroStat: { marginTop: 12, color: '#fde68a', fontWeight: '700', fontSize: 13 },
  error: { marginTop: 12, color: '#b91c1c', fontWeight: '600' },
  helper: { marginTop: 12, color: '#475569', fontWeight: '500' },
  listContent: { gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40 },
  controlsCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#ffffff',
    padding: 10,
    gap: 8,
  },
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fffefc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: '#7c2d12',
    backgroundColor: '#7c2d12',
  },
  filterChipLabel: {
    color: '#9a3412',
    fontSize: 12,
    textTransform: 'capitalize',
    fontWeight: '700',
  },
  filterChipLabelActive: {
    color: '#ffedd5',
  },
  card: {
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827' },
  statusChip: {
    color: '#9a3412',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  cardMeta: { marginTop: 8, color: '#334155' },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: { color: '#0f172a', fontWeight: '800', fontSize: 18 },
  detailLink: { color: '#c2410c', fontWeight: '800' },
});