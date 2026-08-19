import { useCallback, useMemo, useState } from 'react';

import { Link, useFocusEffect, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { listPublishedMeals, type DiscoverMeal } from '@/features/meals/api';
import {
    listActiveCookProfiles,
    listFollowedCookIds,
    setCookFollow,
    type CookProfileRecord,
} from '@/features/profiles/api';

type SavedCookWithStats = CookProfileRecord & {
  publishedMealCount: number;
  services: Array<'prepared_meals' | 'meal_prep' | 'in_home_chef'>;
};

export default function FavoritesScreen() {
  const router = useRouter();
  const [meals, setMeals] = useState<DiscoverMeal[]>([]);
  const [cooks, setCooks] = useState<CookProfileRecord[]>([]);
  const [followedCookIds, setFollowedCookIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'offers' | 'cooks'>('offers');
  const [isTogglingFollowId, setIsTogglingFollowId] = useState<string | null>(null);

  const loadSaved = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [mealRows, cookRows, followedIds] = await Promise.all([
        listPublishedMeals(),
        listActiveCookProfiles(),
        listFollowedCookIds(),
      ]);
      setMeals(mealRows);
      setCooks(cookRows);
      setFollowedCookIds(followedIds);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load saved feed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadSaved();
    }, [loadSaved])
  );

  const savedMeals = useMemo(
    () => meals.filter((meal) => followedCookIds.has(meal.cook_profile_id)),
    [meals, followedCookIds]
  );

  const savedCooks = useMemo(() => {
    return cooks
      .filter((cook) => followedCookIds.has(cook.id))
      .map((cook) => {
        const cookMeals = meals.filter((meal) => meal.cook_profile_id === cook.id);
        const serviceSet = new Set(cookMeals.map((meal) => meal.service_type));
        return {
          ...cook,
          publishedMealCount: cookMeals.length,
          services: Array.from(serviceSet),
        };
      });
  }, [cooks, meals, followedCookIds]);

  const listData: Array<DiscoverMeal | SavedCookWithStats> =
    viewMode === 'offers' ? savedMeals : savedCooks;

  async function handleToggleFollow(cookId: string) {
    const isCurrentlyFollowed = followedCookIds.has(cookId);
    try {
      setErrorMessage(null);
      setIsTogglingFollowId(cookId);
      await setCookFollow(cookId, !isCurrentlyFollowed);
      setFollowedCookIds((current) => {
        const next = new Set(current);
        if (isCurrentlyFollowed) {
          next.delete(cookId);
        } else {
          next.add(cookId);
        }
        return next;
      });
      setCooks((current) =>
        current.map((cook) =>
          cook.id === cookId
            ? {
                ...cook,
                follower_count: isCurrentlyFollowed ? Math.max(0, cook.follower_count - 1) : cook.follower_count + 1,
              }
            : cook
        )
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update follow state.');
    } finally {
      setIsTogglingFollowId(null);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        key={viewMode}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <Text style={styles.title}>Saved cooks</Text>
              <Text style={styles.subtitle}>Followed cooks and their freshest offers, all in one place.</Text>
            </View>

            <View style={styles.controlRow}>
              <Pressable
                onPress={() => setViewMode('offers')}
                style={[styles.modeChip, viewMode === 'offers' ? styles.modeChipActive : null]}
              >
                <Text style={[styles.modeChipLabel, viewMode === 'offers' ? styles.modeChipLabelActive : null]}>Offers</Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode('cooks')}
                style={[styles.modeChip, viewMode === 'cooks' ? styles.modeChipActive : null]}
              >
                <Text style={[styles.modeChipLabel, viewMode === 'cooks' ? styles.modeChipLabelActive : null]}>Cooks</Text>
              </Pressable>
            </View>

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {isLoading ? <Text style={styles.helper}>Loading saved feed...</Text> : null}

            {!isLoading && followedCookIds.size === 0 ? (
              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderTitle}>No follows yet</Text>
                <Text style={styles.placeholderText}>Follow cooks from Discover to build your saved feed.</Text>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => {
          if (viewMode === 'offers') {
            const offer = item as DiscoverMeal;
            return (
              <Link href={`/meals/${offer.id}`} asChild>
                <Pressable style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{offer.title}</Text>
                    <Text style={styles.pricePill}>${(offer.price_cents / 100).toFixed(2)}</Text>
                  </View>
                  <Text style={styles.cardMeta}>{offer.cook_display_name} · {offer.cook_city}</Text>
                  <Text style={styles.cardMeta}>Qty {offer.quantity_available}</Text>
                  <Text style={styles.cta}>View offer</Text>
                </Pressable>
              </Link>
            );
          }

          const savedCook = item as SavedCookWithStats;

          return (
            <View style={styles.card}>
              <Pressable onPress={() => router.push(`/cooks/${savedCook.id}`)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{savedCook.display_name}</Text>
                  <Text style={[styles.verifyPill, verificationPillStyle(savedCook.verification_level)]}>
                    {verificationLevelLabel(savedCook.verification_level)}
                  </Text>
                </View>
                <Text style={styles.cardMeta}>{savedCook.city}</Text>
                <Text style={styles.cardMeta}>{savedCook.follower_count} followers</Text>
                <Text style={styles.cardMeta}>Completed orders: {savedCook.total_completed_orders}</Text>
                <Text style={styles.cardMeta}>Repeat customers: {savedCook.repeat_customer_rate.toFixed(1)}%</Text>
                <Text style={styles.cardMeta}>
                  Services: {savedCook.services.length > 0 ? savedCook.services.map(serviceLabel).join(', ') : 'No active services yet'}
                </Text>
                <Text style={styles.cta}>View cook</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleToggleFollow(savedCook.id)}
                disabled={isTogglingFollowId === savedCook.id}
                style={styles.unfollowButton}
              >
                <Text style={styles.unfollowButtonText}>
                  {isTogglingFollowId === savedCook.id ? 'Updating...' : 'Unfollow'}
                </Text>
              </Pressable>
              <Pressable onPress={() => router.push(`/cooks/${savedCook.id}/menu`)} style={styles.menuButton}>
                <Text style={styles.menuButtonLabel}>Browse menu</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          !isLoading && followedCookIds.size > 0
            ? <Text style={styles.helper}>{viewMode === 'offers' ? 'No live offers from followed cooks yet.' : 'No followed cooks found.'}</Text>
            : null
        }
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
    backgroundColor: '#1e293b',
  },
  title: { fontSize: 30, lineHeight: 34, fontWeight: '800', color: '#f8fafc' },
  subtitle: { marginTop: 6, color: '#e2e8f0', fontSize: 15 },
  controlRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff7ed',
  },
  modeChipActive: {
    borderColor: '#c2410c',
    backgroundColor: '#c2410c',
  },
  modeChipLabel: {
    color: '#9a3412',
    fontWeight: '800',
    fontSize: 12,
  },
  modeChipLabelActive: {
    color: '#fff7ed',
  },
  helper: {
    marginTop: 12,
    color: '#475569',
  },
  error: {
    marginTop: 12,
    color: '#b91c1c',
    fontWeight: '700',
  },
  placeholderCard: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  placeholderTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  placeholderText: {
    marginTop: 8,
    color: '#475569',
    lineHeight: 20,
  },
  listContent: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 14,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 17,
  },
  cardMeta: {
    marginTop: 6,
    color: '#334155',
    fontSize: 14,
  },
  pricePill: {
    backgroundColor: '#111827',
    color: '#fde68a',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  verifyPill: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  cta: {
    marginTop: 10,
    color: '#c2410c',
    fontWeight: '800',
  },
  unfollowButton: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff1f2',
  },
  unfollowButtonText: {
    color: '#9f1239',
    fontWeight: '800',
    fontSize: 13,
  },
  menuButton: {
    marginTop: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d97706',
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fffbeb',
  },
  menuButtonLabel: {
    color: '#b45309',
    fontWeight: '800',
    fontSize: 13,
  },
});

function serviceLabel(value: 'prepared_meals' | 'meal_prep' | 'in_home_chef') {
  if (value === 'meal_prep') {
    return 'Meal Prep';
  }

  if (value === 'in_home_chef') {
    return 'In-Home Chef';
  }

  return 'Prepared Meals';
}

function verificationLevelLabel(level: 'bronze' | 'silver' | 'gold') {
  if (level === 'gold') {
    return 'Top Cook';
  }

  if (level === 'silver') {
    return 'Verified';
  }

  return 'Rising';
}

function verificationPillStyle(level: 'bronze' | 'silver' | 'gold') {
  if (level === 'gold') {
    return { backgroundColor: '#fef3c7', color: '#92400e' };
  }

  if (level === 'silver') {
    return { backgroundColor: '#e0f2fe', color: '#075985' };
  }

  return { backgroundColor: '#fee2e2', color: '#9f1239' };
}