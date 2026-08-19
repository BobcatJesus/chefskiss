import { useCallback, useState } from 'react';

import * as ExpoLinking from 'expo-linking';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { FlatList, Image, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { listOwnMeals, setMealPublished, type MealRecord } from '@/features/meals/api';
import { ensureCookProfile, getCookProfileById } from '@/features/profiles/api';

export default function CookMealsScreen() {
  const router = useRouter();
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cookProfileId, setCookProfileId] = useState<string | null>(null);
  const [cookMenuSlug, setCookMenuSlug] = useState<string | null>(null);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);

  const loadMeals = useCallback(async () => {
    try {
      setErrorMessage(null);
      const [rows, profileId] = await Promise.all([listOwnMeals(), ensureCookProfile()]);
      const cookProfile = await getCookProfileById(profileId);
      setMeals(rows);
      setCookProfileId(profileId);
      setCookMenuSlug(cookProfile.public_menu_slug || null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load meals.');
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

  async function handleTogglePublish(meal: MealRecord) {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsTogglingId(meal.id);
      const nextPublished = !meal.is_published;
      await setMealPublished(meal.id, nextPublished);
      const rows = await listOwnMeals();
      setMeals(rows);
      setSuccessMessage(nextPublished ? 'Meal published to world feed.' : 'Meal unpublished from world feed.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
    } catch (error) {
      setSuccessMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update publish status.');
    } finally {
      setIsTogglingId(null);
    }
  }

  function buildPublicMenuPath(profileId: string): string {
    if (cookMenuSlug) {
      return `/m/${cookMenuSlug}`;
    }

    return `/cooks/${profileId}/menu`;
  }

  function buildPublicMenuUrl(profileId: string): string {
    const menuPath = buildPublicMenuPath(profileId);

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${menuPath}`;
    }

    return ExpoLinking.createURL(menuPath);
  }

  async function handleShareMenu() {
    if (!cookProfileId) {
      setErrorMessage('Menu link is not ready yet. Try again in a moment.');
      return;
    }

    const menuUrl = buildPublicMenuUrl(cookProfileId);
    const message = `Check out my menu on Chefskiss: ${menuUrl}`;
    setSharePreviewUrl(menuUrl);

    try {
      await Share.share({
        message,
        url: menuUrl,
      });
      setSuccessMessage('Menu link ready to share.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
    } catch {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(menuUrl);
          setSuccessMessage('Menu link copied to clipboard.');
          setTimeout(() => {
            setSuccessMessage(null);
          }, 2500);
          return;
        } catch {
          // Fall through to explicit error message.
        }
      }

      setErrorMessage(null);
      setSuccessMessage('Copy the menu link below to share it.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My menu</Text>
      <Text style={styles.subtitle}>Build your menu, then publish dishes for customers to choose from instantly.</Text>

      <Link href="/meals/create" style={styles.link}>
        + Create a new meal
      </Link>

      <Link href="/(customer)/discover" style={styles.secondaryLink}>
        View world feed
      </Link>

      {cookProfileId ? (
        <View style={styles.menuActionsRow}>
          <Pressable onPress={() => router.push(buildPublicMenuPath(cookProfileId) as any)}>
            <Text style={styles.secondaryLink}>View public menu page</Text>
          </Pressable>
          <Pressable onPress={() => void handleShareMenu()} style={styles.shareButton}>
            <Text style={styles.shareButtonLabel}>Share menu link</Text>
          </Pressable>
        </View>
      ) : null}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
      {sharePreviewUrl ? <Text style={styles.sharePreview} selectable>{sharePreviewUrl}</Text> : null}

      {isLoading ? <Text style={styles.helper}>Loading your meals...</Text> : null}

      {!isLoading && meals.length === 0 ? <Text style={styles.helper}>No menu items yet. Create a dish to start your menu.</Text> : null}

      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Link href={`/meals/edit/${item.id}`} asChild>
              <Pressable style={styles.cardMain}>
                {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.cardPhoto} /> : null}
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>${(item.price_cents / 100).toFixed(2)} · Qty {item.quantity_available}</Text>
                <Text style={styles.cardMeta}>{item.is_published ? 'Live on your menu' : 'Draft (hidden from your menu)'}</Text>
              </Pressable>
            </Link>

            <Pressable
              disabled={isTogglingId === item.id}
              onPress={() => void handleTogglePublish(item)}
              style={[styles.publishButton, item.is_published ? styles.unpublishButton : styles.republishButton]}
            >
              <Text style={styles.publishButtonLabel}>
                {isTogglingId === item.id ? 'Updating...' : item.is_published ? 'Hide from menu' : 'Publish to menu'}
              </Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { marginTop: 8, color: '#4b5563' },
  link: { marginTop: 16, marginBottom: 12, color: '#0f766e', fontWeight: '600' },
  secondaryLink: { marginBottom: 12, color: '#0f766e', fontWeight: '600' },
  menuActionsRow: {
    marginBottom: 8,
    gap: 8,
  },
  shareButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#b45309',
    borderRadius: 999,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shareButtonLabel: {
    color: '#92400e',
    fontWeight: '700',
  },
  error: { color: '#b91c1c', marginBottom: 8 },
  success: { color: '#166534', marginBottom: 8 },
  sharePreview: { color: '#1e3a8a', marginBottom: 10 },
  helper: { color: '#4b5563', marginBottom: 8 },
  list: { width: '100%' },
  listContent: { gap: 10, paddingBottom: 12 },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  cardMain: {
    gap: 2,
  },
  cardPhoto: {
    width: '100%',
    height: 170,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cardMeta: { marginTop: 4, color: '#4b5563' },
  publishButton: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  republishButton: {
    borderColor: '#0f766e',
    backgroundColor: '#ecfeff',
  },
  unpublishButton: {
    borderColor: '#b91c1c',
    backgroundColor: '#fef2f2',
  },
  publishButtonLabel: {
    color: '#111827',
    fontWeight: '700',
  },
});