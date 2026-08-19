import { useEffect, useMemo, useState } from 'react';

import { Link, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { LocationBadge } from '@/components/ui/LocationBadge';
import { OutdoorAccent } from '@/components/ui/OutdoorAccent';
import { listPublishedMeals, type DiscoverMeal } from '@/features/meals/api';
import {
    getCookProfileById,
    listFollowedCookIds,
    setCookFollow,
    type CookProfileRecord,
} from '@/features/profiles/api';
import { isUuid, normalizeRouteParam } from '@/lib/routeParams';

export default function CookDetailScreen() {
  const { cookId } = useLocalSearchParams<{ cookId: string }>();
  const normalizedCookId = normalizeRouteParam(cookId);
  const hasValidCookId = isUuid(normalizedCookId);
  const [cook, setCook] = useState<CookProfileRecord | null>(null);
  const [offers, setOffers] = useState<DiscoverMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCook() {
      if (!normalizedCookId) {
        setErrorMessage('Cook id is missing from this route.');
        setIsLoading(false);
        return;
      }

      if (!hasValidCookId) {
        setErrorMessage('This cook link is invalid. Open the world feed and choose a cook again.');
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage(null);
        const [cookRecord, meals, followedIds] = await Promise.all([
          getCookProfileById(normalizedCookId),
          listPublishedMeals(),
          listFollowedCookIds(),
        ]);
        setCook(cookRecord);
        setOffers(meals.filter((meal) => meal.cook_profile_id === normalizedCookId));
        setIsFollowing(followedIds.has(normalizedCookId));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load cook profile.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadCook();
  }, [hasValidCookId, normalizedCookId]);

  const services = useMemo(() => {
    return Array.from(new Set(offers.map((offer) => offer.service_type))).map(serviceLabel);
  }, [offers]);

  async function handleToggleFollow() {
    if (!cook) {
      return;
    }

    try {
      setErrorMessage(null);
      setIsTogglingFollow(true);
      await setCookFollow(cook.id, !isFollowing);
      setIsFollowing((current) => !current);
      setCook((current) =>
        current
          ? {
              ...current,
              follower_count: isFollowing ? Math.max(0, current.follower_count - 1) : current.follower_count + 1,
            }
          : current
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update follow state.');
    } finally {
      setIsTogglingFollow(false);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cook ? offers : []}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <Text style={styles.title}>{cook?.display_name || 'Cook profile'}</Text>
              <LocationBadge location={cook?.city || 'Loading city...'} />
              {cook ? (
                <View style={styles.heroBadgeRow}>
                  <Text style={[styles.verifyPill, verificationPillStyle(cook.verification_level)]}>{verificationLevelLabel(cook.verification_level)}</Text>
                  <Text style={styles.heroFollowers}>{cook.follower_count} followers</Text>
                </View>
              ) : null}

              <OutdoorAccent compact />
            </View>

            {isLoading ? <Text style={styles.helper}>Loading cook profile...</Text> : null}
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {errorMessage && !isLoading ? (
              <>
                <Link href="/(customer)/discover" style={styles.fallbackLink}>Back to world feed</Link>
                <Link href="/(customer)/favorites" style={styles.fallbackLink}>Open saved cooks</Link>
              </>
            ) : null}

            {cook ? (
              <>
                <View style={styles.trustCard}>
                  <Text style={styles.sectionTitle}>Trust & safety</Text>
                  <Text style={styles.meta}>{cook.identity_verified ? 'Identity verified' : 'Identity not verified yet'}</Text>
                  <Text style={styles.meta}>{cook.food_safety_badge ? `Food safety: ${cook.food_safety_badge}` : 'Food safety badge pending'}</Text>
                  <Text style={styles.meta}>
                    {cook.rating_count > 0 ? `⭐ ${cook.rating_average.toFixed(1)} average (${cook.rating_count} reviews)` : 'No ratings yet'}
                  </Text>
                  <Text style={styles.meta}>Completed orders: {cook.total_completed_orders}</Text>
                  <Text style={styles.meta}>
                    Repeat customers: {cook.repeat_customer_rate.toFixed(1)}%
                  </Text>
                  <Pressable
                    onPress={() => void handleToggleFollow()}
                    disabled={isTogglingFollow}
                    style={[styles.followButton, isFollowing ? styles.followButtonActive : null]}
                  >
                    <Text style={[styles.followButtonLabel, isFollowing ? styles.followButtonLabelActive : null]}>
                      {isTogglingFollow ? 'Updating...' : isFollowing ? 'Following' : 'Follow cook'}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.profileCard}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.bioText}>{cook.bio || 'No bio yet.'}</Text>
                  <Text style={styles.meta}>Cuisines: {cook.cuisines.length > 0 ? cook.cuisines.join(', ') : 'Not listed yet'}</Text>
                  <Text style={styles.meta}>Services: {services.length > 0 ? services.join(', ') : 'No active services yet'}</Text>
                  <Link href={`/cooks/${cook.id}/menu`} asChild>
                    <Pressable style={styles.menuButton}>
                      <Text style={styles.menuButtonLabel}>View full menu</Text>
                    </Pressable>
                  </Link>
                </View>

                <Text style={styles.sectionHeading}>Live offers</Text>
              </>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <Link href={`/meals/${item.id}`} asChild>
            <Pressable style={styles.offerCard}>
              <Text style={styles.offerTitle}>{item.title}</Text>
              <Text style={styles.meta}>${(item.price_cents / 100).toFixed(2)} · Qty {item.quantity_available}</Text>
              <Text style={styles.offerAction}>View offer</Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={!isLoading && cook ? <Text style={styles.helper}>No published offers yet.</Text> : null}
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
  heroBadgeRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  verifyPill: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  heroFollowers: {
    color: '#fde68a',
    fontWeight: '700',
    fontSize: 12,
  },
  helper: { marginTop: 12, color: '#475569' },
  error: { marginTop: 12, color: '#b91c1c' },
  fallbackLink: { marginTop: 10, color: '#0f766e', fontWeight: '700' },
  trustCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    backgroundColor: '#fffbeb',
    padding: 14,
    gap: 4,
  },
  profileCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 6,
  },
  sectionTitle: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  bioText: {
    color: '#334155',
    lineHeight: 21,
  },
  meta: {
    color: '#475569',
  },
  followButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#c2410c',
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff7ed',
  },
  followButtonActive: {
    backgroundColor: '#c2410c',
  },
  followButtonLabel: {
    color: '#c2410c',
    fontWeight: '800',
    fontSize: 13,
  },
  followButtonLabelActive: {
    color: '#fff7ed',
  },
  menuButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d97706',
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#fffbeb',
  },
  menuButtonLabel: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeading: {
    marginTop: 14,
    color: '#111827',
    fontWeight: '800',
    fontSize: 18,
  },
  listContent: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 34,
  },
  offerCard: {
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  offerTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 16,
  },
  offerAction: {
    marginTop: 8,
    color: '#c2410c',
    fontWeight: '800',
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