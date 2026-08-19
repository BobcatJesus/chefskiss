import { useEffect, useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { getCookProfileBySlug, trackMenuEvent } from '@/features/profiles/api';

export default function PublicMenuSlugRedirectScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function resolveSlug() {
      if (!slug) {
        setErrorMessage('Menu link is incomplete.');
        return;
      }

      try {
        setErrorMessage(null);
        const cook = await getCookProfileBySlug(String(slug));
        await trackMenuEvent({
          cookProfileId: cook.id,
          eventType: 'short_link_visit',
          sourceSlug: String(slug),
        });
        router.replace(`/cooks/${cook.id}/menu?src=${encodeURIComponent(String(slug))}`);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Menu not found for this short link.');
      }
    }

    void resolveSlug();
  }, [router, slug]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Opening menu...</Text>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : <Text style={styles.helper}>Resolving short link</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf0',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  helper: {
    marginTop: 8,
    color: '#475569',
  },
  error: {
    marginTop: 8,
    color: '#b91c1c',
    textAlign: 'center',
  },
});
