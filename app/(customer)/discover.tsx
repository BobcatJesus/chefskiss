import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link, useFocusEffect, useRouter } from 'expo-router';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { LocationBadge } from '@/components/ui/LocationBadge';
import { OutdoorAccent } from '@/components/ui/OutdoorAccent';
import { listPublishedMeals, type DiscoverMeal } from '@/features/meals/api';
import { inferFoodCategories } from '@/features/meals/foodCategories';
import {
    listActiveCookProfiles,
    listFollowedCookIds,
    listUnseenFollowOfferEvents,
    markFollowOfferEventsSeen,
    setCookFollow,
    type CookProfileRecord,
} from '@/features/profiles/api';

const SEARCH_STOP_WORDS = new Set(['a', 'and', 'cuisine', 'food', 'foods', 'style', 'styles', 'the']);

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const demoCooks: CookProfileRecord[] = [
  {
    id: 'demo-cook-1',
    user_id: 'demo-user-1',
    display_name: 'Amara Kitchen',
    public_menu_slug: 'amara-kitchen',
    bio: 'West African comfort food made in small batches.',
    city: 'Philadelphia',
    cuisines: ['Nigerian', 'West African'],
    food_safety_badge: null,
    identity_verified: true,
    rating_average: 4.9,
    rating_count: 18,
    is_active: true,
    follower_count: 42,
    verification_level: 'silver',
    repeat_customer_rate: 0.35,
    total_completed_orders: 64,
    cook_types: ['home_kitchen'],
  },
  {
    id: 'demo-cook-2',
    user_id: 'demo-user-2',
    display_name: 'Saffron Table',
    public_menu_slug: 'saffron-table',
    bio: 'Indian home cooking with bright spices and handmade breads.',
    city: 'Philadelphia',
    cuisines: ['Indian', 'Vegetarian'],
    food_safety_badge: null,
    identity_verified: true,
    rating_average: 4.8,
    rating_count: 12,
    is_active: true,
    follower_count: 27,
    verification_level: 'bronze',
    repeat_customer_rate: 0.28,
    total_completed_orders: 38,
    cook_types: ['home_kitchen'],
  },
];

const demoMeals: DiscoverMeal[] = [
  {
    id: 'demo-meal-1',
    cook_profile_id: 'demo-cook-1',
    service_type: 'prepared_meals',
    ingredient_model: 'cook_provides',
    offers_pickup: true,
    offers_cook_delivery: true,
    offers_platform_delivery: false,
    title: 'Jollof Rice',
    description: 'Smoky tomato rice with plantains and grilled chicken.',
    photo_url: null,
    price_cents: 1800,
    quantity_available: 8,
    is_published: true,
    updated_at: new Date().toISOString(),
    food_categories: ['west african', 'comfort food'],
    cook_display_name: 'Amara Kitchen',
    cook_city: 'Philadelphia',
  },
  {
    id: 'demo-meal-2',
    cook_profile_id: 'demo-cook-2',
    service_type: 'prepared_meals',
    ingredient_model: 'cook_provides',
    offers_pickup: true,
    offers_cook_delivery: false,
    offers_platform_delivery: false,
    title: 'Paneer Tikka Masala',
    description: 'Charred paneer in a creamy tomato and spice sauce.',
    photo_url: null,
    price_cents: 1600,
    quantity_available: 6,
    is_published: true,
    updated_at: new Date().toISOString(),
    food_categories: ['indian', 'vegetarian'],
    cook_display_name: 'Saffron Table',
    cook_city: 'Philadelphia',
  },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 980;

  const [meals, setMeals] = useState<DiscoverMeal[]>([]);
  const [cooks, setCooks] = useState<CookProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [followedCookIds, setFollowedCookIds] = useState<Set<string>>(new Set());
  const [isTogglingFollowId, setIsTogglingFollowId] = useState<string | null>(null);
  const [unseenFollowEventIds, setUnseenFollowEventIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [selectedCookId, setSelectedCookId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const loadMeals = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [mealRows, cookRows, followedIds] = await Promise.all([
        listPublishedMeals(),
        listActiveCookProfiles(),
        listFollowedCookIds(),
      ]);
      const followEvents = await listUnseenFollowOfferEvents();
      const shouldUsePreviewData = __DEV__ && mealRows.length === 0 && cookRows.length === 0;
      setMeals(shouldUsePreviewData ? demoMeals : mealRows);
      setCooks(shouldUsePreviewData ? demoCooks : cookRows);
      setIsPreviewMode(shouldUsePreviewData);
      setFollowedCookIds(followedIds);
      setUnseenFollowEventIds(followEvents.map((event) => event.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load world feed.');
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

  const query = normalizeSearchText(searchQuery);
  const queryTokens = query.split(/\s+/).filter((token) => token && !SEARCH_STOP_WORDS.has(token));

  const searchableMeals = useMemo(
    () => meals.filter((meal) => (onlyInStock ? meal.quantity_available > 0 : true)),
    [meals, onlyInStock]
  );

  const mealsByCookId = useMemo(() => {
    const grouped = new Map<string, DiscoverMeal[]>();
    for (const meal of searchableMeals) {
      const existing = grouped.get(meal.cook_profile_id);
      if (existing) {
        existing.push(meal);
      } else {
        grouped.set(meal.cook_profile_id, [meal]);
      }
    }
    return grouped;
  }, [searchableMeals]);

  const cookMap = useMemo(() => {
    const map = new Map<string, CookProfileRecord>();
    for (const cook of cooks) {
      map.set(cook.id, cook);
    }
    return map;
  }, [cooks]);

  const cookResults = useMemo(() => {
    return Array.from(mealsByCookId.entries())
      .map(([cookId, cookMeals]) => {
        const cook = cookMap.get(cookId);
        if (!cook) {
          return null;
        }

        const cookText = normalizeSearchText(
          `${cook.display_name} ${cook.city} ${cook.cuisines.join(' ')} ${cook.cook_types.join(' ')} ${cook.bio}`
        );
        const phraseHit = query.length > 0 && cookText.includes(query);

        const mealMatches = cookMeals.filter((meal) => {
          if (queryTokens.length === 0) {
            return true;
          }

          const mealText = normalizeSearchText(
            `${meal.title} ${meal.description} ${meal.food_categories?.join(' ') || inferFoodCategories(meal.title, meal.description).join(' ')}`
          );
          return queryTokens.every((token) => mealText.includes(token));
        });
        const cuisineMatch = queryTokens.length > 0 && queryTokens.every((token) => cookText.includes(token));
        const hasDistributedMatch = queryTokens.every(
          (token) =>
            cookText.includes(token) ||
            cookMeals.some((meal) =>
              normalizeSearchText(
                `${meal.title} ${meal.description} ${meal.food_categories?.join(' ') || inferFoodCategories(meal.title, meal.description).join(' ')}`
              ).includes(token)
            )
        );

        if (queryTokens.length > 0 && !hasDistributedMatch) {
          return null;
        }

        const minPriceCents = cookMeals.length > 0 ? Math.min(...cookMeals.map((meal) => meal.price_cents)) : null;
        const serviceSet = new Set(cookMeals.map((meal) => meal.service_type));

        return {
          ...cook,
          keywordScore: (phraseHit ? 5 : 0) + mealMatches.length + (cuisineMatch ? 3 : 0),
          publishedMealCount: cookMeals.length,
          minPriceCents,
          services: Array.from(serviceSet),
          matchingMeals: mealMatches.length > 0 || !cuisineMatch ? mealMatches : cookMeals,
        };
      })
      .filter((cook): cook is NonNullable<typeof cook> => Boolean(cook))
      .sort((a, b) => {
        if (queryTokens.length > 0) {
          if (b.keywordScore !== a.keywordScore) {
            return b.keywordScore - a.keywordScore;
          }
        }

        if (b.rating_average !== a.rating_average) {
          return b.rating_average - a.rating_average;
        }

        return (a.minPriceCents ?? Number.MAX_SAFE_INTEGER) - (b.minPriceCents ?? Number.MAX_SAFE_INTEGER);
      });
  }, [cookMap, mealsByCookId, query, queryTokens]);

  const mealResults = useMemo(() => {
    return searchableMeals
      .filter((meal) => {
        if (queryTokens.length === 0) {
          return true;
        }

        const cook = cookMap.get(meal.cook_profile_id);
        const searchableText = normalizeSearchText(
          `${meal.title} ${meal.description} ${meal.food_categories?.join(' ') || inferFoodCategories(meal.title, meal.description).join(' ')} ${cook?.display_name || ''} ${cook?.city || ''} ${cook?.cuisines.join(' ') || ''}`
        );
        return queryTokens.every((token) => searchableText.includes(token));
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [cookMap, queryTokens, searchableMeals]);

  const selectedCook = useMemo(
    () => cookResults.find((cook) => cook.id === selectedCookId) ?? null,
    [cookResults, selectedCookId]
  );

  useEffect(() => {
    if (cookResults.length === 0) {
      setSelectedCookId(null);
      return;
    }

    if (!selectedCookId || !cookResults.some((cook) => cook.id === selectedCookId)) {
      setSelectedCookId(cookResults[0].id);
    }
  }, [cookResults, selectedCookId]);

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

  async function handleMarkEventsSeen() {
    if (unseenFollowEventIds.length === 0) {
      return;
    }

    try {
      setErrorMessage(null);
      await markFollowOfferEventsSeen(unseenFollowEventIds);
      setUnseenFollowEventIds([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to mark updates as seen.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Chefskiss</Text>
        <Text style={styles.title}>What are you craving today?</Text>
        <Text style={styles.subtitle}>Find something delicious nearby, then meet the cook behind it.</Text>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search dishes, cooks, or cuisines"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          style={styles.heroSearchInput}
        />
        <View style={styles.suggestionRow}>
          {['Comfort food', 'Vegetarian', 'Desserts', 'Meal prep'].map((suggestion) => (
            <Pressable key={suggestion} onPress={() => setSearchQuery(suggestion)} style={styles.suggestionChip}>
              <Text style={styles.suggestionChipText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.heroRow}>
          <Text style={styles.heroStat}>{`${cookResults.length} cooks nearby`}</Text>
          <Pressable style={styles.refreshButton} onPress={() => void loadMeals()}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        </View>
        {isPreviewMode ? <Text style={styles.previewLabel}>Preview cooks are shown because no live cooks exist yet.</Text> : null}
        {unseenFollowEventIds.length > 0 ? (
          <Pressable onPress={() => void handleMarkEventsSeen()} style={styles.updatesPill}>
            <Text style={styles.updatesPillText}>New from cooks you follow: {unseenFollowEventIds.length}</Text>
          </Pressable>
        ) : null}

        <OutdoorAccent compact />
      </View>

      <View style={styles.controlsCard}>
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, onlyInStock ? styles.filterChipActive : null]}
            onPress={() => setOnlyInStock((value) => !value)}
          >
            <Text style={[styles.filterChipLabel, onlyInStock ? styles.filterChipLabelActive : null]}>
              {onlyInStock ? 'Available now' : 'Include sold out'}
            </Text>
          </Pressable>
          <Text style={styles.hintText}>Tip: start broad, then refine. Example: "indian" then "paneer tikka".</Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {isLoading ? <Text style={styles.helper}>Loading marketplace...</Text> : null}

      {!isLoading && mealResults.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nothing matches that craving yet.</Text>
          <Text style={styles.emptyText}>Try tacos, vegetarian, dessert, or meal prep.</Text>
        </View>
      ) : null}

      {!isLoading && mealResults.length > 0 ? (
        <View style={styles.discoverySection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Available near you</Text>
              <Text style={styles.sectionSubtitle}>Fresh dishes from independent cooks</Text>
            </View>
            <Text style={styles.sectionCount}>{mealResults.length} dishes</Text>
          </View>
          <View style={styles.mealGrid}>
            {mealResults.slice(0, 6).map((meal) => (
              <Link key={meal.id} href={`/meals/${meal.id}`} asChild>
                <Pressable style={styles.mealCard}>
                  {meal.photo_url ? (
                    <Image source={{ uri: meal.photo_url }} style={styles.mealPhoto} resizeMode="cover" />
                  ) : (
                    <View style={styles.mealPhotoPlaceholder}>
                      <Text style={styles.mealPhotoPlaceholderText}>Made nearby</Text>
                    </View>
                  )}
                  <View style={styles.mealCardBody}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.mealTitle}>{meal.title}</Text>
                      <Text style={styles.mealPrice}>${(meal.price_cents / 100).toFixed(0)}</Text>
                    </View>
                    <Text style={styles.mealCook}>{meal.cook_display_name} · {meal.cook_city}</Text>
                    <Text style={styles.mealDescription} numberOfLines={2}>{meal.description}</Text>
                    <View style={styles.mealFooter}>
                      <Text style={styles.mealAvailability}>{meal.quantity_available} available</Text>
                      <Text style={styles.mealAction}>View meal</Text>
                    </View>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.marketplaceArea, isWideLayout ? styles.marketplaceAreaWide : null]}>
        <View style={[styles.cookPanel, isWideLayout ? styles.cookPanelWide : null]}>
          <Text style={styles.panelTitle}>Cooks</Text>
          <FlatList
            data={cookResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.panelListContent}
            style={styles.panelList}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedCookId;
              return (
                <Pressable
                  onPress={() => setSelectedCookId(item.id)}
                  style={[styles.cookRow, isSelected ? styles.cookRowSelected : null]}
                >
                  <View style={styles.cookRowHeader}>
                    <Text style={styles.cookRowName}>{item.display_name}</Text>
                    <Text style={[styles.verifyPill, verificationPillStyle(item.verification_level)]}>
                      {verificationLevelLabel(item.verification_level)}
                    </Text>
                  </View>
                  <LocationBadge location={item.city} />
                  <Text style={styles.cookRowMeta}>
                    {item.rating_count > 0 ? `⭐ ${item.rating_average.toFixed(1)} (${item.rating_count})` : 'New cook'}
                  </Text>
                  <Text style={styles.cookRowMeta}>From {item.minPriceCents !== null ? `$${(item.minPriceCents / 100).toFixed(2)}` : 'N/A'}</Text>
                  <Text style={styles.cookRowMeta}>{item.matchingMeals.length} matching meals</Text>
                </Pressable>
              );
            }}
          />
        </View>

        <View style={styles.detailPanel}>
          {!selectedCook ? (
            <Text style={styles.helper}>Choose a cook from the left panel to view matching meals.</Text>
          ) : (
            <>
              <View style={styles.selectedCookCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{selectedCook.display_name}</Text>
                  <Text style={[styles.verifyPill, verificationPillStyle(selectedCook.verification_level)]}>
                    {verificationLevelLabel(selectedCook.verification_level)}
                  </Text>
                </View>
                <LocationBadge location={selectedCook.city} />
                <Text style={styles.cardMeta}>{selectedCook.follower_count} followers</Text>
                <Text style={styles.cardMeta}>
                  Services: {selectedCook.services.length > 0 ? selectedCook.services.map(serviceLabel).join(', ') : 'No active services yet'}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.qtyText}>{selectedCook.publishedMealCount} live offers</Text>
                  <Pressable onPress={() => router.push(`/cooks/${selectedCook.id}`)}>
                    <Text style={styles.ctaText}>View cook</Text>
                  </Pressable>
                </View>
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => void handleToggleFollow(selectedCook.id)}
                    disabled={isTogglingFollowId === selectedCook.id}
                    style={[styles.followButton, followedCookIds.has(selectedCook.id) ? styles.followButtonActive : null]}
                  >
                    <Text
                      style={[
                        styles.followButtonLabel,
                        followedCookIds.has(selectedCook.id) ? styles.followButtonLabelActive : null,
                      ]}
                    >
                      {isTogglingFollowId === selectedCook.id
                        ? 'Updating...'
                        : followedCookIds.has(selectedCook.id)
                          ? 'Following'
                          : 'Follow cook'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => router.push(`/cooks/${selectedCook.id}/menu`)} style={styles.menuButton}>
                    <Text style={styles.menuButtonLabel}>Browse full menu</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.panelTitle}>Matching meals</Text>
              <FlatList
                data={selectedCook.matchingMeals}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.panelListContent}
                style={styles.panelList}
                renderItem={({ item }) => (
                  <Link href={`/meals/${item.id}`} asChild>
                    <Pressable style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.pricePill}>${(item.price_cents / 100).toFixed(2)}</Text>
                      </View>
                      <Text style={styles.cardMeta}>{item.description}</Text>
                      <Text style={styles.cardMeta}>Food type: {item.food_categories.join(', ')}</Text>
                      <View style={styles.cardFooter}>
                        <Text style={styles.qtyText}>Qty {item.quantity_available}</Text>
                        <Text style={styles.ctaText}>View details</Text>
                      </View>
                    </Pressable>
                  </Link>
                )}
              />
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7f2e9',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    flexGrow: 1,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#17332f',
    shadowColor: '#17332f',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  eyebrow: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 6,
  },
  subtitle: {
    marginTop: 6,
    color: '#e2e8f0',
    fontSize: 15,
  },
  heroSearchInput: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: '#d9e2dc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  suggestionChip: {
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#28524b',
  },
  suggestionChipText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '700',
  },
  heroRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updatesPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#0f766e',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  updatesPillText: {
    color: '#ecfeff',
    fontWeight: '800',
    fontSize: 12,
  },
  heroStat: {
    color: '#fde68a',
    fontWeight: '700',
    fontSize: 13,
  },
  previewLabel: {
    marginTop: 8,
    color: '#fed7aa',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 12,
  },
  error: {
    color: '#b91c1c',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  helper: {
    color: '#475569',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  emptyState: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1c98b',
    backgroundColor: '#fff7ed',
    padding: 16,
  },
  emptyTitle: {
    color: '#7c2d12',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 5,
    color: '#9a3412',
    fontSize: 13,
  },
  discoverySection: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#17332f',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 3,
    color: '#64716e',
    fontSize: 13,
  },
  sectionCount: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '800',
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealCard: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 520,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1c98b',
    backgroundColor: '#ffffff',
  },
  mealPhoto: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5e8d8',
  },
  mealPhotoPlaceholder: {
    width: '100%',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcefe7',
  },
  mealPhotoPlaceholderText: {
    color: '#286052',
    fontSize: 14,
    fontWeight: '800',
  },
  mealCardBody: {
    padding: 13,
  },
  mealTitle: {
    flex: 1,
    color: '#17332f',
    fontSize: 18,
    fontWeight: '800',
  },
  mealPrice: {
    color: '#c2410c',
    fontSize: 17,
    fontWeight: '800',
  },
  mealCook: {
    marginTop: 6,
    color: '#53645f',
    fontSize: 13,
    fontWeight: '700',
  },
  mealDescription: {
    marginTop: 7,
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  mealFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  mealAvailability: {
    color: '#286052',
    fontSize: 12,
    fontWeight: '800',
  },
  mealAction: {
    color: '#c2410c',
    fontSize: 13,
    fontWeight: '800',
  },
  controlsCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e6d8c4',
    backgroundColor: '#fffdf8',
    padding: 10,
    gap: 8,
  },
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  hintText: {
    flexShrink: 1,
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '600',
  },
  marketplaceArea: {
    flex: 1,
    marginTop: 10,
    gap: 10,
  },
  marketplaceAreaWide: {
    flexDirection: 'row',
  },
  cookPanel: {
    borderWidth: 1,
    borderColor: '#e6d8c4',
    borderRadius: 16,
    backgroundColor: '#fffdf8',
    padding: 10,
    minHeight: 220,
  },
  cookPanelWide: {
    width: 320,
  },
  detailPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e6d8c4',
    borderRadius: 16,
    backgroundColor: '#fffdf8',
    padding: 10,
    minHeight: 220,
  },
  panelTitle: {
    color: '#7c2d12',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  panelList: {
    flex: 1,
  },
  panelListContent: {
    gap: 10,
    paddingBottom: 16,
  },
  cookRow: {
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  cookRowSelected: {
    borderColor: '#c2410c',
    backgroundColor: '#fff7ed',
  },
  cookRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cookRowName: {
    flex: 1,
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 15,
  },
  cookRowMeta: {
    marginTop: 4,
    color: '#475569',
    fontSize: 13,
  },
  selectedCookCard: {
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff7ed',
  },
  filterChipActive: {
    backgroundColor: '#c2410c',
    borderColor: '#c2410c',
  },
  filterChipLabel: {
    color: '#9a3412',
    fontWeight: '700',
    fontSize: 12,
  },
  filterChipLabelActive: {
    color: '#fff7ed',
  },
  card: {
    borderWidth: 1,
    borderColor: '#fed7aa',
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
  cardTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0f172a' },
  pricePill: {
    backgroundColor: '#111827',
    color: '#fde68a',
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cardMeta: { marginTop: 6, color: '#334155', fontSize: 14 },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyText: { color: '#475569', fontWeight: '600' },
  ctaText: { color: '#c2410c', fontWeight: '800' },
  verifyPill: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  followButton: {
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
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d97706',
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fffbeb',
  },
  menuButtonLabel: {
    color: '#b45309',
    fontWeight: '800',
    fontSize: 13,
  },
  actionRow: {
    marginTop: 10,
    gap: 8,
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