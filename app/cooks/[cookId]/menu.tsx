import { useEffect, useMemo, useRef, useState } from 'react';

import * as Clipboard from 'expo-clipboard';
import * as ExpoLinking from 'expo-linking';
import { Link, useLocalSearchParams } from 'expo-router';
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { listPublishedMeals, type DiscoverMeal } from '@/features/meals/api';
import { getCookProfileById, trackMenuEvent, type CookProfileRecord } from '@/features/profiles/api';
import { isUuid, normalizeRouteParam } from '@/lib/routeParams';

export default function CookMenuScreen() {
  const { cookId, src } = useLocalSearchParams<{ cookId: string; src?: string }>();
  const normalizedCookId = normalizeRouteParam(cookId);
  const hasValidCookId = isUuid(normalizedCookId);
  const [cook, setCook] = useState<CookProfileRecord | null>(null);
  const [menuItems, setMenuItems] = useState<DiscoverMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const trackedViewKeyRef = useRef<string | null>(null);

  useEffect(() => {
    async function loadMenu() {
      if (!normalizedCookId) {
        setErrorMessage('Cook id is missing from this route.');
        setIsLoading(false);
        return;
      }

      if (!hasValidCookId) {
        setErrorMessage('This cook menu link is invalid. Open the world feed and select a cook menu again.');
        setIsLoading(false);
        return;
      }

      try {
        setErrorMessage(null);
        const [cookRecord, meals] = await Promise.all([getCookProfileById(normalizedCookId), listPublishedMeals()]);
        setCook(cookRecord);
        setMenuItems(meals.filter((meal) => meal.cook_profile_id === normalizedCookId));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load menu.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadMenu();
  }, [hasValidCookId, normalizedCookId]);

  const menuSummary = useMemo(() => {
    const minPrice = menuItems.length > 0 ? Math.min(...menuItems.map((item) => item.price_cents)) : null;
    const maxPrice = menuItems.length > 0 ? Math.max(...menuItems.map((item) => item.price_cents)) : null;
    return {
      count: menuItems.length,
      minPrice,
      maxPrice,
    };
  }, [menuItems]);

  const publicMenuPath = useMemo(() => {
    if (cook?.public_menu_slug) {
      return `/m/${cook.public_menu_slug}`;
    }

    return cook ? `/cooks/${cook.id}/menu` : null;
  }, [cook]);

  const publicMenuUrl = useMemo(() => {
    if (!publicMenuPath) {
      return null;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${publicMenuPath}`;
    }

    return ExpoLinking.createURL(publicMenuPath);
  }, [publicMenuPath]);

  const qrCodeUrl = useMemo(() => {
    if (!publicMenuUrl) {
      return null;
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(publicMenuUrl)}`;
  }, [publicMenuUrl]);

  const featuredDishNames = useMemo(() => {
    return menuItems.slice(0, 3).map((item) => item.title);
  }, [menuItems]);

  useEffect(() => {
    if (!cook) {
      return;
    }

    const sourceSlug = src ? String(src) : undefined;
    const viewKey = `${cook.id}:${sourceSlug || 'direct'}`;
    if (trackedViewKeyRef.current === viewKey) {
      return;
    }

    trackedViewKeyRef.current = viewKey;
    void trackMenuEvent({
      cookProfileId: cook.id,
      eventType: 'menu_page_view',
      sourceSlug,
    });
  }, [cook, src]);

  async function exportSocialPreviewCard() {
    if (!cook) {
      return;
    }

    const cardTitle = `${cook.display_name} - Public Menu`;
    const cardSubtitle = cook.city || 'Local chef';
    const dishLine = featuredDishNames.length > 0 ? featuredDishNames.join(' | ') : 'Featured menu drops coming soon';
    const visitsLine = `${menuSummary.count} live dishes`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const pngDataUrl = await buildSocialPreviewCardPng({
          title: cardTitle,
          subtitle: cardSubtitle,
          visitsLine,
          dishLine,
          publicMenuUrl: publicMenuUrl || '',
        });
        downloadDataUrl(pngDataUrl, `${cook.public_menu_slug || cook.id}-social-card.png`);
        setExportStatus('Social card downloaded as PNG.');
        return;
      } catch {
        // Fall back to SVG export below.
      }

      const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9f1239"/><stop offset="100%" stop-color="#be123c"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)" rx="36"/><text x="72" y="140" font-size="36" fill="#fecdd3" font-family="Verdana">Public Menu</text><text x="72" y="250" font-size="84" font-weight="700" fill="#ffe4e6" font-family="Verdana">${escapeForSvg(cardTitle)}</text><text x="72" y="320" font-size="42" fill="#fecdd3" font-family="Verdana">${escapeForSvg(cardSubtitle)}</text><text x="72" y="400" font-size="34" fill="#ffe4e6" font-family="Verdana">${escapeForSvg(visitsLine)}</text><text x="72" y="470" font-size="28" fill="#ffe4e6" font-family="Verdana">Featured: ${escapeForSvg(dishLine)}</text><text x="72" y="560" font-size="24" fill="#fecdd3" font-family="Verdana">${escapeForSvg(publicMenuUrl || '')}</text></svg>`;

      const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${cook.public_menu_slug || cook.id}-social-card.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      setExportStatus('Social card downloaded as SVG.');
      return;
    }

    const fallbackText = `${cardTitle}\n${cardSubtitle}\n${visitsLine}\nFeatured: ${dishLine}\n${publicMenuUrl || ''}`;
    await Clipboard.setStringAsync(fallbackText);
    setExportStatus('Social card text copied to clipboard.');
  }

  function onPressDish(item: DiscoverMeal) {
    if (!cook) {
      return;
    }

    void trackMenuEvent({
      cookProfileId: cook.id,
      eventType: 'menu_dish_click',
      mealId: item.id,
      mealTitle: item.title,
      sourceSlug: cook.public_menu_slug || undefined,
    });
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>Public Menu</Text>
              <Text style={styles.title}>{cook?.display_name || 'Cook menu'}</Text>
              <Text style={styles.subtitle}>{cook?.city || 'Loading city...'}</Text>
              {menuSummary.count > 0 ? (
                <Text style={styles.heroMeta}>
                  {menuSummary.count} dishes · ${((menuSummary.minPrice || 0) / 100).toFixed(2)} to ${((menuSummary.maxPrice || 0) / 100).toFixed(2)}
                </Text>
              ) : null}
            </View>

            <View style={styles.adCard}>
              <Text style={styles.adTitle}>Pick a dish and order fast</Text>
              <Text style={styles.adBody}>Every item here is live and ready to book. Choose your meal and checkout in a few taps.</Text>
            </View>

            {publicMenuUrl ? (
              <View style={styles.shareCard}>
                <Text style={styles.shareTitle}>Share this menu</Text>
                <Text style={styles.shareBody}>Short link for ads, stories, and QR flyers:</Text>
                <Text style={styles.shareUrl} selectable>{publicMenuUrl}</Text>
                {qrCodeUrl ? (
                  <View style={styles.qrFrame}>
                    <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} />
                  </View>
                ) : null}
              </View>
            ) : null}

            {cook ? (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Social preview card</Text>
                <View style={styles.previewPanel}>
                  <Text style={styles.previewKitchen}>{cook.display_name}</Text>
                  <Text style={styles.previewTagline}>Fresh local dishes, book in minutes.</Text>
                  <Text style={styles.previewMeta}>{menuSummary.count} live dishes</Text>
                  <Text style={styles.previewMeta}>
                    {featuredDishNames.length > 0 ? `Featured: ${featuredDishNames.join(' • ')}` : 'Featured menu drops coming soon'}
                  </Text>
                </View>
                <Pressable style={styles.exportButton} onPress={() => void exportSocialPreviewCard()}>
                  <Text style={styles.exportButtonText}>{Platform.OS === 'web' ? 'Download social card' : 'Copy social card text'}</Text>
                </Pressable>
                {exportStatus ? <Text style={styles.exportStatus}>{exportStatus}</Text> : null}
              </View>
            ) : null}

            {isLoading ? <Text style={styles.helper}>Loading menu...</Text> : null}
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {errorMessage && !isLoading ? (
              <>
                <Link href="/(customer)/discover" style={styles.fallbackLink}>Back to world feed</Link>
                <Link href="/(customer)/favorites" style={styles.fallbackLink}>Open saved cooks</Link>
              </>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <Link href={`/meals/${item.id}`} asChild>
            <Pressable style={styles.card} onPress={() => onPressDish(item)}>
              {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.cardPhoto} /> : null}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.pricePill}>${(item.price_cents / 100).toFixed(2)}</Text>
              </View>
              <Text style={styles.cardMeta}>Qty {item.quantity_available}</Text>
              <Text style={styles.cardMeta}>Service: {serviceLabel(item.service_type)}</Text>
              <Text style={styles.cta}>Choose this dish</Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.helper}>No menu items published yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    backgroundColor: '#fffaf0',
  },
  list: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#0f172a',
  },
  eyebrow: {
    color: '#fcd34d',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  title: {
    marginTop: 6,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    marginTop: 6,
    color: '#cbd5e1',
    fontSize: 15,
  },
  heroMeta: {
    marginTop: 10,
    color: '#fef3c7',
    fontWeight: '700',
  },
  adCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    padding: 12,
  },
  adTitle: {
    color: '#92400e',
    fontSize: 16,
    fontWeight: '800',
  },
  adBody: {
    marginTop: 6,
    color: '#78350f',
    lineHeight: 20,
  },
  shareCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    padding: 12,
  },
  shareTitle: {
    color: '#075985',
    fontWeight: '800',
    fontSize: 16,
  },
  shareBody: {
    marginTop: 6,
    color: '#0c4a6e',
  },
  shareUrl: {
    marginTop: 8,
    color: '#1d4ed8',
    fontWeight: '700',
  },
  qrFrame: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  previewCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fda4af',
    backgroundColor: '#fff1f2',
    padding: 12,
  },
  previewTitle: {
    color: '#9f1239',
    fontSize: 16,
    fontWeight: '800',
  },
  previewPanel: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#9f1239',
    padding: 10,
    gap: 4,
  },
  previewKitchen: {
    color: '#ffe4e6',
    fontSize: 17,
    fontWeight: '800',
  },
  previewTagline: {
    color: '#fecdd3',
  },
  previewMeta: {
    color: '#ffe4e6',
    fontSize: 12,
    fontWeight: '700',
  },
  exportButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#881337',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exportButtonText: {
    color: '#ffe4e6',
    fontWeight: '800',
    fontSize: 13,
  },
  exportStatus: {
    marginTop: 8,
    color: '#9f1239',
    fontWeight: '700',
  },
  helper: {
    marginTop: 12,
    color: '#475569',
  },
  error: {
    marginTop: 12,
    color: '#b91c1c',
  },
  fallbackLink: {
    marginTop: 10,
    color: '#0f766e',
    fontWeight: '700',
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
    paddingTop: 0,
    flexGrow: 1,
  },
  card: {
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  cardPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
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
  cardMeta: {
    marginTop: 6,
    color: '#475569',
    fontSize: 14,
  },
  cta: {
    marginTop: 10,
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

function escapeForSvg(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function buildSocialPreviewCardPng(input: {
  title: string;
  subtitle: string;
  visitsLine: string;
  dishLine: string;
  publicMenuUrl: string;
}): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available.');
  }

  context.fillStyle = '#9f1239';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, '#9f1239');
  background.addColorStop(1, '#be123c');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(255,255,255,0.08)';
  context.beginPath();
  context.arc(1020, 120, 180, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(980, 520, 220, 0, Math.PI * 2);
  context.fill();

  drawRoundedRect(context, 56, 56, 1088, 518, 36, 'rgba(17,24,39,0.18)');
  drawRoundedRect(context, 72, 72, 1056, 486, 28, 'rgba(255,255,255,0.08)');

  context.fillStyle = '#fecdd3';
  context.font = '700 36px Arial, sans-serif';
  context.fillText('Public Menu', 104, 134);

  context.fillStyle = '#ffe4e6';
  context.font = '700 72px Arial, sans-serif';
  wrapCanvasText(context, input.title, 104, 245, 980, 82);

  context.fillStyle = '#fecdd3';
  context.font = '500 40px Arial, sans-serif';
  context.fillText(input.subtitle, 104, 332);

  context.fillStyle = '#ffe4e6';
  context.font = '700 34px Arial, sans-serif';
  context.fillText(input.visitsLine, 104, 404);
  context.font = '700 28px Arial, sans-serif';
  wrapCanvasText(context, `Featured: ${input.dishLine}`, 104, 465, 980, 36);

  context.fillStyle = '#fecdd3';
  context.font = '500 24px Arial, sans-serif';
  wrapCanvasText(context, input.publicMenuUrl, 104, 556, 980, 28);

  return canvas.toDataURL('image/png');
}

function drawRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fillStyle: string) {
  context.fillStyle = fillStyle;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
  context.fill();
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  let currentY = y;

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    context.fillText(line, x, currentY);
  }
}
