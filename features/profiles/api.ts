import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { uploadFoodHandlerPermit } from '@/services/storage/uploadFoodHandlerPermit';

type EnsureProfileOptions = {
  isCook?: boolean;
};

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error('You must be signed in to continue.');
  }

  return user;
}

export async function ensureProfile(options: EnsureProfileOptions = {}) {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const user = await getCurrentUser();
  const email = user.email?.trim().toLowerCase() || '';

  if (!email) {
    throw new Error('Signed-in account is missing an email address.');
  }

  const fullNameHint =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    email.split('@')[0] ||
    'User';

  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id, is_cook')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!existing) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      email,
      full_name: fullNameHint,
      city: 'TBD',
      is_cook: Boolean(options.isCook),
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  } else if (options.isCook && !existing.is_cook) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_cook: true })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return {
    user,
    email,
    fullNameHint,
  };
}

export async function ensureCookProfile() {
  const { user, fullNameHint } = await ensureProfile({ isCook: true });

  const { data: existingCook, error: cookFetchError } = await supabase
    .from('cook_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (cookFetchError) {
    throw new Error(cookFetchError.message);
  }

  if (existingCook?.id) {
    return existingCook.id as string;
  }

  const { data: newCook, error: cookInsertError } = await supabase
    .from('cook_profiles')
    .insert({
      user_id: user.id,
      display_name: `${fullNameHint}'s Kitchen`,
      city: 'TBD',
      is_active: true,
    })
    .select('id')
    .single();

  if (cookInsertError) {
    throw new Error(cookInsertError.message);
  }

  return newCook.id as string;
}

export type CookProfileRecord = {
  id: string;
  user_id: string;
  display_name: string;
  public_menu_slug: string;
  bio: string;
  city: string;
  cuisines: string[];
  food_safety_badge: string | null;
  identity_verified: boolean;
  rating_average: number;
  rating_count: number;
  is_active: boolean;
  follower_count: number;
  verification_level: 'bronze' | 'silver' | 'gold';
  repeat_customer_rate: number;
  total_completed_orders: number;
  cook_types: CookType[];
};

export type OwnCookProfileRecord = CookProfileRecord & {
  full_legal_name: string | null;
  phone_number: string | null;
  physical_address: string | null;
  food_handler_permit_url: string | null;
  food_handler_permit_expires_on: string | null;
  food_handler_permit_number: string | null;
  attests_cottage_food_law_compliance: boolean;
  attests_package_labeling_compliance: boolean;
  attests_kitchen_sanitation_standards: boolean;
  legal_attested_at: string | null;
};

export type FoodHandlerPermitUploadInput = {
  uri: string;
  name: string;
  mimeType?: string | null;
  webFile?: Blob | null;
};

export type CookType = 'home_kitchen' | 'commercial_kitchen' | 'in_home_personal_chef' | 'hosted_home_dining';

const ALLOWED_COOK_TYPES: ReadonlyArray<CookType> = [
  'home_kitchen',
  'commercial_kitchen',
  'in_home_personal_chef',
  'hosted_home_dining',
];

export type FollowOfferEventRecord = {
  id: string;
  customer_user_id: string;
  cook_profile_id: string;
  meal_id: string;
  event_type: string;
  seen_at: string | null;
  created_at: string;
};

export type MenuSlugAvailability = {
  normalized_slug: string;
  is_available: boolean;
  is_current: boolean;
};

export type MenuAnalyticsSnapshot = {
  range_label: string;
  total_menu_views: number;
  menu_views_last_7_days: number;
  direct_menu_views: number;
  direct_menu_views_last_7_days: number;
  total_short_link_visits: number;
  short_link_visits_last_7_days: number;
  total_dish_clicks: number;
  total_checkout_starts: number;
  dish_click_to_checkout_rate: number;
  menu_view_to_checkout_rate: number;
  top_viewed_dish_title: string | null;
  top_viewed_dish_clicks: number;
};

export type MenuAnalyticsRange = '7d' | '30d' | 'all';

function normalizeMenuSlug(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'cook';
}

function resolveVerificationLevel(input: {
  identity_verified: boolean;
  food_safety_badge: string | null;
  rating_count: number;
}): 'bronze' | 'silver' | 'gold' {
  if (input.identity_verified && input.food_safety_badge && input.rating_count >= 10) {
    return 'gold';
  }

  if (input.identity_verified) {
    return 'silver';
  }

  return 'bronze';
}

function normalizeFollowerCount(row: any): number {
  const relation = row?.cook_follows;
  if (Array.isArray(relation) && relation.length > 0) {
    const count = relation[0]?.count;
    return Number.isFinite(Number(count)) ? Number(count) : 0;
  }

  return 0;
}

function normalizeTrustMetrics(row: any): { total_completed_orders: number; repeat_customer_rate: number } {
  const relation = row?.cook_trust_metrics;
  const source = Array.isArray(relation) ? relation[0] : relation;

  return {
    total_completed_orders: Number(source?.total_completed_orders || 0),
    repeat_customer_rate: Number(source?.repeat_customer_rate || 0),
  };
}

function mergeTrustMetrics(profileRow: any, metricsRow: any) {
  return {
    ...profileRow,
    cook_trust_metrics: metricsRow || null,
  };
}

function normalizeCookProfile(row: any): CookProfileRecord {
  const ratingCount = Number(row.rating_count || 0);
  const identityVerified = Boolean(row.identity_verified);
  const foodSafetyBadge = typeof row.food_safety_badge === 'string' ? row.food_safety_badge : null;
  const trust = normalizeTrustMetrics(row);

  const cookTypes = Array.isArray(row.cook_types)
    ? row.cook_types
      .map((entry: unknown) => String(entry))
      .filter((entry: string): entry is CookType => ALLOWED_COOK_TYPES.includes(entry as CookType))
    : [];

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    display_name: String(row.display_name || 'Cook'),
    public_menu_slug: String(row.public_menu_slug || ''),
    bio: String(row.bio || ''),
    city: String(row.city || 'Unknown city'),
    cuisines: Array.isArray(row.cuisines) ? row.cuisines.map((entry: unknown) => String(entry)) : [],
    food_safety_badge: foodSafetyBadge,
    identity_verified: identityVerified,
    rating_average: Number(row.rating_average || 0),
    rating_count: ratingCount,
    is_active: Boolean(row.is_active),
    follower_count: normalizeFollowerCount(row),
    verification_level: resolveVerificationLevel({
      identity_verified: identityVerified,
      food_safety_badge: foodSafetyBadge,
      rating_count: ratingCount,
    }),
    repeat_customer_rate: trust.repeat_customer_rate,
    total_completed_orders: trust.total_completed_orders,
    cook_types: Array.from(new Set(cookTypes)),
  };
}

function normalizeOwnCookProfile(
  baseProfile: CookProfileRecord,
  privateRow: any
): OwnCookProfileRecord {
  const fullLegalName =
    typeof privateRow?.full_legal_name === 'string' && privateRow.full_legal_name.trim()
      ? privateRow.full_legal_name.trim()
      : null;
  const phoneNumber =
    typeof privateRow?.phone_number === 'string' && privateRow.phone_number.trim()
      ? privateRow.phone_number.trim()
      : null;
  const physicalAddress =
    typeof privateRow?.physical_address === 'string' && privateRow.physical_address.trim()
      ? privateRow.physical_address.trim()
      : null;
  const foodHandlerPermitUrl =
    typeof privateRow?.food_handler_permit_url === 'string' && privateRow.food_handler_permit_url.trim()
      ? privateRow.food_handler_permit_url.trim()
      : null;
  const foodHandlerPermitExpiresOn =
    typeof privateRow?.food_handler_permit_expires_on === 'string' && privateRow.food_handler_permit_expires_on.trim()
      ? privateRow.food_handler_permit_expires_on.trim()
      : null;
  const foodHandlerPermitNumber =
    typeof privateRow?.food_handler_permit_number === 'string' && privateRow.food_handler_permit_number.trim()
      ? privateRow.food_handler_permit_number.trim()
      : null;
  const legalAttestedAt =
    typeof privateRow?.legal_attested_at === 'string' && privateRow.legal_attested_at.trim()
      ? privateRow.legal_attested_at.trim()
      : null;

  return {
    ...baseProfile,
    full_legal_name: fullLegalName,
    phone_number: phoneNumber,
    physical_address: physicalAddress,
    food_handler_permit_url: foodHandlerPermitUrl,
    food_handler_permit_expires_on: foodHandlerPermitExpiresOn,
    food_handler_permit_number: foodHandlerPermitNumber,
    attests_cottage_food_law_compliance: Boolean(privateRow?.attests_cottage_food_law_compliance),
    attests_package_labeling_compliance: Boolean(privateRow?.attests_package_labeling_compliance),
    attests_kitchen_sanitation_standards: Boolean(privateRow?.attests_kitchen_sanitation_standards),
    legal_attested_at: legalAttestedAt,
  };
}

export async function listActiveCookProfiles(): Promise<CookProfileRecord[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('cook_profiles')
    .select('id, user_id, display_name, public_menu_slug, bio, city, cuisines, cook_types, food_safety_badge, identity_verified, rating_average, rating_count, is_active, cook_follows(count)')
    .eq('is_active', true)
    .order('rating_average', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const cookIds = (data || []).map((row: any) => String(row.id));
  if (cookIds.length === 0) {
    return [];
  }

  const { data: metricsRows, error: metricsError } = await supabase
    .from('cook_trust_metrics')
    .select('cook_profile_id, total_completed_orders, repeat_customer_rate')
    .in('cook_profile_id', cookIds);

  if (metricsError) {
    throw new Error(metricsError.message);
  }

  const metricsByCookId = new Map(
    (metricsRows || []).map((row: any) => [String(row.cook_profile_id), row])
  );

  return (data || []).map((row: any) => normalizeCookProfile(mergeTrustMetrics(row, metricsByCookId.get(String(row.id)))));
}

export async function getCookProfileById(cookId: string): Promise<CookProfileRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const { data, error } = await supabase
    .from('cook_profiles')
    .select('id, user_id, display_name, public_menu_slug, bio, city, cuisines, cook_types, food_safety_badge, identity_verified, rating_average, rating_count, is_active, cook_follows(count)')
    .eq('id', cookId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: metricsRow, error: metricsError } = await supabase
    .from('cook_trust_metrics')
    .select('cook_profile_id, total_completed_orders, repeat_customer_rate')
    .eq('cook_profile_id', cookId)
    .maybeSingle();

  if (metricsError) {
    throw new Error(metricsError.message);
  }

  return normalizeCookProfile(mergeTrustMetrics(data, metricsRow));
}

export async function getCookProfileBySlug(slug: string): Promise<CookProfileRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const { data, error } = await supabase
    .from('cook_profiles')
    .select('id')
    .eq('public_menu_slug', slug)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return getCookProfileById(String((data as any).id));
}

export async function getOwnCookProfile(): Promise<OwnCookProfileRecord> {
  const cookId = await ensureCookProfile();
  const baseProfile = await getCookProfileById(cookId);
  const { data: privateRow, error: privateError } = await supabase
    .from('cook_profiles')
    .select('full_legal_name, phone_number, physical_address, food_handler_permit_url, food_handler_permit_expires_on, food_handler_permit_number, attests_cottage_food_law_compliance, attests_package_labeling_compliance, attests_kitchen_sanitation_standards, legal_attested_at')
    .eq('id', cookId)
    .single();

  if (privateError) {
    throw new Error(privateError.message);
  }

  return normalizeOwnCookProfile(baseProfile, privateRow);
}

export async function updateOwnCookPublicMenuSlug(inputSlug: string): Promise<OwnCookProfileRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const cookId = await ensureCookProfile();
  const nextSlug = inputSlug.trim();

  if (!nextSlug) {
    throw new Error('Slug cannot be empty.');
  }

  const { error } = await supabase
    .from('cook_profiles')
    .update({ public_menu_slug: nextSlug })
    .eq('id', cookId);

  if (error) {
    throw new Error(error.message);
  }

  return getOwnCookProfile();
}

type UpdateOwnCookRequiredProfileInfoInput = {
  fullLegalName: string;
  phoneNumber: string;
  physicalAddress: string;
  cookTypes: CookType[];
  foodHandlerPermitUrl: string;
  foodHandlerPermitExpiresOn: string;
  foodHandlerPermitNumber?: string;
};

export async function updateOwnCookRequiredProfileInfo(
  input: UpdateOwnCookRequiredProfileInfoInput
): Promise<OwnCookProfileRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const fullLegalName = input.fullLegalName.trim();
  const phoneNumber = input.phoneNumber.trim();
  const physicalAddress = input.physicalAddress.trim();
  const cookTypes = Array.from(new Set(input.cookTypes.filter((value) => ALLOWED_COOK_TYPES.includes(value))));
  const foodHandlerPermitUrl = input.foodHandlerPermitUrl.trim();
  const foodHandlerPermitExpiresOn = input.foodHandlerPermitExpiresOn.trim();
  const foodHandlerPermitNumber = input.foodHandlerPermitNumber?.trim() || null;

  if (!fullLegalName) {
    throw new Error('Full legal name is required.');
  }

  if (!phoneNumber) {
    throw new Error('Phone number is required.');
  }

  if (!physicalAddress) {
    throw new Error('Physical address is required.');
  }

  if (cookTypes.length === 0) {
    throw new Error('Choose at least one cook type.');
  }

  if (!foodHandlerPermitUrl) {
    throw new Error('Food handler permit upload is required.');
  }

  if (!foodHandlerPermitExpiresOn) {
    throw new Error('Food handler permit expiration date is required.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(foodHandlerPermitExpiresOn) || Number.isNaN(Date.parse(foodHandlerPermitExpiresOn))) {
    throw new Error('Expiration date must use YYYY-MM-DD format.');
  }

  const { user } = await ensureProfile({ isCook: true });
  const cookId = await ensureCookProfile();

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: fullLegalName,
      phone: phoneNumber,
    })
    .eq('id', user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: cookProfileError } = await supabase
    .from('cook_profiles')
    .update({
      full_legal_name: fullLegalName,
      phone_number: phoneNumber,
      physical_address: physicalAddress,
      cook_types: cookTypes,
      food_handler_permit_url: foodHandlerPermitUrl,
      food_handler_permit_expires_on: foodHandlerPermitExpiresOn,
      food_handler_permit_number: foodHandlerPermitNumber,
    })
    .eq('id', cookId);

  if (cookProfileError) {
    throw new Error(cookProfileError.message);
  }

  return getOwnCookProfile();
}

export async function uploadOwnFoodHandlerPermit(input: FoodHandlerPermitUploadInput): Promise<string> {
  const { user } = await ensureProfile({ isCook: true });

  return uploadFoodHandlerPermit({
    userId: user.id,
    uri: input.uri,
    name: input.name,
    mimeType: input.mimeType || null,
    webFile: input.webFile || null,
  });
}

type UpdateOwnCookLegalAttestationInput = {
  attestsCottageFoodLawCompliance: boolean;
  attestsPackageLabelingCompliance: boolean;
  attestsKitchenSanitationStandards: boolean;
};

export async function updateOwnCookLegalAttestation(
  input: UpdateOwnCookLegalAttestationInput
): Promise<OwnCookProfileRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  if (!input.attestsCottageFoodLawCompliance) {
    throw new Error('You must attest compliance with cottage food laws.');
  }

  if (!input.attestsPackageLabelingCompliance) {
    throw new Error('You must agree to package and label items correctly.');
  }

  if (!input.attestsKitchenSanitationStandards) {
    throw new Error('You must acknowledge kitchen sanitation standards.');
  }

  const cookId = await ensureCookProfile();

  const { error } = await supabase
    .from('cook_profiles')
    .update({
      attests_cottage_food_law_compliance: true,
      attests_package_labeling_compliance: true,
      attests_kitchen_sanitation_standards: true,
      legal_attested_at: new Date().toISOString(),
    })
    .eq('id', cookId);

  if (error) {
    throw new Error(error.message);
  }

  return getOwnCookProfile();
}

export async function checkOwnCookPublicMenuSlugAvailability(inputSlug: string): Promise<MenuSlugAvailability> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const cookId = await ensureCookProfile();
  const normalizedSlug = normalizeMenuSlug(inputSlug);

  const { data: ownRow, error: ownError } = await supabase
    .from('cook_profiles')
    .select('public_menu_slug')
    .eq('id', cookId)
    .single();

  if (ownError) {
    throw new Error(ownError.message);
  }

  const currentSlug = String((ownRow as any).public_menu_slug || '');
  if (normalizedSlug === currentSlug) {
    return {
      normalized_slug: normalizedSlug,
      is_available: true,
      is_current: true,
    };
  }

  const { data: conflictRow, error: conflictError } = await supabase
    .from('cook_profiles')
    .select('id')
    .eq('public_menu_slug', normalizedSlug)
    .neq('id', cookId)
    .maybeSingle();

  if (conflictError) {
    throw new Error(conflictError.message);
  }

  return {
    normalized_slug: normalizedSlug,
    is_available: !conflictRow,
    is_current: false,
  };
}

export async function trackMenuEvent(input: {
  cookProfileId: string;
  eventType: 'short_link_visit' | 'menu_dish_click' | 'menu_page_view' | 'checkout_start';
  mealId?: string;
  mealTitle?: string;
  sourceSlug?: string;
}): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  // Analytics should never block UX; swallow errors intentionally.
  try {
    await supabase.from('menu_events').insert({
      cook_profile_id: input.cookProfileId,
      meal_id: input.mealId || null,
      meal_title: input.mealTitle || null,
      source_slug: input.sourceSlug || null,
      event_type: input.eventType,
    });
  } catch {
    // no-op
  }
}

function resolveAnalyticsRangeWindow(range: MenuAnalyticsRange) {
  if (range === '30d') {
    return { label: '30 days', cutoffMs: Date.now() - 30 * 24 * 60 * 60 * 1000 };
  }

  if (range === '7d') {
    return { label: '7 days', cutoffMs: Date.now() - 7 * 24 * 60 * 60 * 1000 };
  }

  return { label: 'all time', cutoffMs: null };
}

export async function getOwnMenuAnalytics(range: MenuAnalyticsRange = 'all'): Promise<MenuAnalyticsSnapshot> {
  const cookId = await ensureCookProfile();
  const { data, error } = await supabase
    .from('menu_events')
    .select('event_type, meal_title, source_slug, created_at')
    .eq('cook_profile_id', cookId);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data || [];
  const rangeWindow = resolveAnalyticsRangeWindow(range);
  const selectedRows = rangeWindow.cutoffMs === null ? rows : rows.filter((row: any) => new Date(String(row.created_at)).getTime() >= rangeWindow.cutoffMs!);

  let totalVisits = 0;
  let totalMenuViews = 0;
  let directMenuViews = 0;
  let totalDishClicks = 0;
  let totalCheckoutStarts = 0;
  const clicksByDish = new Map<string, number>();

  for (const row of selectedRows as any[]) {
    if (row.event_type === 'short_link_visit') {
      totalVisits += 1;
      continue;
    }

    if (row.event_type === 'menu_page_view') {
      totalMenuViews += 1;
      const hasSourceSlug = Boolean(String(row.source_slug || '').trim());
      if (!hasSourceSlug) {
        directMenuViews += 1;
      }

      continue;
    }

    if (row.event_type === 'menu_dish_click' && row.meal_title) {
      totalDishClicks += 1;
      const title = String(row.meal_title);
      clicksByDish.set(title, (clicksByDish.get(title) || 0) + 1);
      continue;
    }

    if (row.event_type === 'menu_dish_click') {
      totalDishClicks += 1;
      continue;
    }

    if (row.event_type === 'checkout_start') {
      totalCheckoutStarts += 1;
    }
  }

  let topTitle: string | null = null;
  let topClicks = 0;
  for (const [title, count] of clicksByDish.entries()) {
    if (count > topClicks) {
      topTitle = title;
      topClicks = count;
    }
  }

  const dishClickToCheckoutRate = totalDishClicks > 0 ? totalCheckoutStarts / totalDishClicks : 0;
  const menuViewToCheckoutRate = totalMenuViews > 0 ? totalCheckoutStarts / totalMenuViews : 0;

  return {
    range_label: rangeWindow.label,
    total_menu_views: totalMenuViews,
    menu_views_last_7_days: totalMenuViews,
    direct_menu_views: directMenuViews,
    direct_menu_views_last_7_days: directMenuViews,
    total_short_link_visits: totalVisits,
    short_link_visits_last_7_days: totalVisits,
    total_dish_clicks: totalDishClicks,
    total_checkout_starts: totalCheckoutStarts,
    dish_click_to_checkout_rate: dishClickToCheckoutRate,
    menu_view_to_checkout_rate: menuViewToCheckoutRate,
    top_viewed_dish_title: topTitle,
    top_viewed_dish_clicks: topClicks,
  };
}

export async function listFollowedCookIds(): Promise<Set<string>> {
  if (!isSupabaseConfigured) {
    return new Set();
  }

  const { user } = await ensureProfile();
  const { data, error } = await supabase
    .from('cook_follows')
    .select('cook_profile_id')
    .eq('customer_user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data || []).map((row: any) => String(row.cook_profile_id)));
}

export async function setCookFollow(cookId: string, shouldFollow: boolean): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const { user } = await ensureProfile();

  if (shouldFollow) {
    const { error } = await supabase
      .from('cook_follows')
      .upsert(
        {
          cook_profile_id: cookId,
          customer_user_id: user.id,
        },
        { onConflict: 'cook_profile_id,customer_user_id', ignoreDuplicates: true }
      );

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase
    .from('cook_follows')
    .delete()
    .eq('cook_profile_id', cookId)
    .eq('customer_user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeFollowOfferEvent(row: any): FollowOfferEventRecord {
  return {
    id: String(row.id),
    customer_user_id: String(row.customer_user_id),
    cook_profile_id: String(row.cook_profile_id),
    meal_id: String(row.meal_id),
    event_type: String(row.event_type || 'meal_published'),
    seen_at: row.seen_at ? String(row.seen_at) : null,
    created_at: String(row.created_at),
  };
}

export async function listUnseenFollowOfferEvents(): Promise<FollowOfferEventRecord[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { user } = await ensureProfile();
  const { data, error } = await supabase
    .from('follow_offer_events')
    .select('id, customer_user_id, cook_profile_id, meal_id, event_type, seen_at, created_at')
    .eq('customer_user_id', user.id)
    .is('seen_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => normalizeFollowOfferEvent(row));
}

export async function markFollowOfferEventsSeen(eventIds: string[]): Promise<void> {
  if (!isSupabaseConfigured || eventIds.length === 0) {
    return;
  }

  const { user } = await ensureProfile();
  const { error } = await supabase
    .from('follow_offer_events')
    .update({ seen_at: new Date().toISOString() })
    .eq('customer_user_id', user.id)
    .in('id', eventIds)
    .is('seen_at', null);

  if (error) {
    throw new Error(error.message);
  }
}