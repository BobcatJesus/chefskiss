import { inferFoodCategories } from '@/features/meals/foodCategories';
import { ensureCookProfile } from '@/features/profiles/api';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type MealRecord = {
  id: string;
  cook_profile_id: string;
  service_type: 'prepared_meals' | 'meal_prep' | 'in_home_chef';
  ingredient_model: 'cook_provides' | 'customer_provides' | 'customer_chooses';
  offers_pickup: boolean;
  offers_cook_delivery: boolean;
  offers_platform_delivery: boolean;
  title: string;
  description: string;
  photo_url: string | null;
  price_cents: number;
  quantity_available: number;
  is_published: boolean;
  is_available_now: boolean;
  available_until: string | null;
  current_offer_note: string;
  updated_at: string;
  food_categories: string[];
};

export type DiscoverMeal = MealRecord & {
  cook_display_name: string;
  cook_city: string;
};

export type MealPublishReadiness = {
  is_ready: boolean;
  missing_requirements: string[];
};

type SaveMealInput = {
  serviceType: 'prepared_meals' | 'meal_prep' | 'in_home_chef';
  ingredientModel: 'cook_provides' | 'customer_provides' | 'customer_chooses';
  offersPickup: boolean;
  offersCookDelivery: boolean;
  offersPlatformDelivery: boolean;
  title: string;
  description: string;
  photoUrl?: string | null;
  priceCents: number;
  quantityAvailable: number;
  isPublished: boolean;
  isAvailableNow?: boolean;
  availableUntil?: string | null;
  currentOfferNote?: string;
};

function toSafeMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

async function assertCookCanPublishMeals(cookProfileId: string): Promise<void> {
  const readiness = await getMealPublishReadinessByCookProfileId(cookProfileId);

  if (!readiness.is_ready) {
    throw new Error(`Cannot publish meal yet. Missing: ${readiness.missing_requirements.join(', ')}`);
  }
}

async function getMealPublishReadinessByCookProfileId(cookProfileId: string): Promise<MealPublishReadiness> {
  const { data, error } = await supabase
    .from('cook_profiles')
    .select('full_legal_name, phone_number, physical_address, cook_types, food_handler_permit_url, food_handler_permit_expires_on, attests_cottage_food_law_compliance, attests_package_labeling_compliance, attests_kitchen_sanitation_standards')
    .eq('id', cookProfileId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const missingRequirements: string[] = [];

  if (!hasText(data.full_legal_name)) {
    missingRequirements.push('full legal name');
  }

  if (!hasText(data.phone_number)) {
    missingRequirements.push('phone number');
  }

  if (!hasText(data.physical_address)) {
    missingRequirements.push('physical address');
  }

  if (!Array.isArray(data.cook_types) || data.cook_types.length === 0) {
    missingRequirements.push('at least one cook type');
  }

  if (!hasText(data.food_handler_permit_url)) {
    missingRequirements.push('food handler permit upload');
  }

  if (!hasText(data.food_handler_permit_expires_on)) {
    missingRequirements.push('permit expiration date');
  }

  if (data.attests_cottage_food_law_compliance !== true) {
    missingRequirements.push('cottage food law attestation');
  }

  if (data.attests_package_labeling_compliance !== true) {
    missingRequirements.push('package labeling attestation');
  }

  if (data.attests_kitchen_sanitation_standards !== true) {
    missingRequirements.push('kitchen sanitation attestation');
  }

  const expiresOn = new Date(`${String(data.food_handler_permit_expires_on)}T00:00:00.000Z`);
  if (Number.isNaN(expiresOn.getTime())) {
    missingRequirements.push('valid permit expiration date');
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  if (!Number.isNaN(expiresOn.getTime()) && expiresOn < todayUtc) {
    missingRequirements.push('unexpired food handler permit');
  }

  return {
    is_ready: missingRequirements.length === 0,
    missing_requirements: missingRequirements,
  };
}

export async function getOwnMealPublishReadiness(): Promise<MealPublishReadiness> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const cookProfileId = await ensureCookProfile();
  return getMealPublishReadinessByCookProfileId(cookProfileId);
}

function normalizeMeal(row: any): MealRecord {
  return {
    id: String(row.id),
    cook_profile_id: String(row.cook_profile_id),
    service_type:
      row.service_type === 'meal_prep' || row.service_type === 'in_home_chef' ? row.service_type : 'prepared_meals',
    ingredient_model:
      row.ingredient_model === 'customer_provides' || row.ingredient_model === 'customer_chooses'
        ? row.ingredient_model
        : 'cook_provides',
    offers_pickup: row.offers_pickup !== false,
    offers_cook_delivery: Boolean(row.offers_cook_delivery),
    offers_platform_delivery: Boolean(row.offers_platform_delivery),
    title: String(row.title || ''),
    description: String(row.description || ''),
    photo_url: typeof row.photo_url === 'string' && row.photo_url.trim().length > 0 ? row.photo_url : null,
    price_cents: Number(row.price_cents || 0),
    quantity_available: Number(row.quantity_available || 0),
    is_published: Boolean(row.is_published),
    is_available_now: Boolean(row.is_available_now),
    available_until: typeof row.available_until === 'string' ? row.available_until : null,
    current_offer_note: String(row.current_offer_note || ''),
    updated_at: String(row.updated_at || ''),
    food_categories: inferFoodCategories(String(row.title || ''), String(row.description || '')),
  };
}

export async function listOwnMeals(): Promise<MealRecord[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    await ensureCookProfile();

    const { data, error } = await supabase
      .from('meals')
      .select('id, cook_profile_id, service_type, ingredient_model, offers_pickup, offers_cook_delivery, offers_platform_delivery, title, description, photo_url, price_cents, quantity_available, is_published, is_available_now, available_until, current_offer_note, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((row) => normalizeMeal(row));
  } catch (error) {
    throw new Error(toSafeMessage(error, 'Unable to load your meals.'));
  }
}

export async function getMealById(mealId: string): Promise<MealRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const { data, error } = await supabase
    .from('meals')
    .select('id, cook_profile_id, service_type, ingredient_model, offers_pickup, offers_cook_delivery, offers_platform_delivery, title, description, photo_url, price_cents, quantity_available, is_published, is_available_now, available_until, current_offer_note, updated_at')
    .eq('id', mealId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeMeal(data);
}

export async function createMeal(input: SaveMealInput): Promise<MealRecord> {
  const cookProfileId = await ensureCookProfile();

  if (input.isPublished) {
    await assertCookCanPublishMeals(cookProfileId);
  }

  const payload = {
    cook_profile_id: cookProfileId,
    service_type: input.serviceType,
    ingredient_model: input.ingredientModel,
    offers_pickup: input.offersPickup,
    offers_cook_delivery: input.offersCookDelivery,
    offers_platform_delivery: input.offersPlatformDelivery,
    title: input.title.trim(),
    description: input.description.trim(),
    photo_url: input.photoUrl ?? null,
    price_cents: input.priceCents,
    quantity_available: input.quantityAvailable,
    is_published: input.isPublished,
    is_available_now: Boolean(input.isAvailableNow),
    available_until: input.availableUntil ?? null,
    current_offer_note: input.currentOfferNote?.trim() || '',
  };

  const { data, error } = await supabase
    .from('meals')
    .insert(payload)
    .select('id, cook_profile_id, service_type, ingredient_model, offers_pickup, offers_cook_delivery, offers_platform_delivery, title, description, photo_url, price_cents, quantity_available, is_published, is_available_now, available_until, current_offer_note, updated_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeMeal(data);
}

export async function updateMeal(mealId: string, input: SaveMealInput): Promise<MealRecord> {
  if (input.isPublished) {
    const { data: existingMeal, error: existingMealError } = await supabase
      .from('meals')
      .select('cook_profile_id')
      .eq('id', mealId)
      .single();

    if (existingMealError) {
      throw new Error(existingMealError.message);
    }

    await assertCookCanPublishMeals(String(existingMeal.cook_profile_id));
  }

  const payload = {
    service_type: input.serviceType,
    ingredient_model: input.ingredientModel,
    offers_pickup: input.offersPickup,
    offers_cook_delivery: input.offersCookDelivery,
    offers_platform_delivery: input.offersPlatformDelivery,
    title: input.title.trim(),
    description: input.description.trim(),
    photo_url: input.photoUrl ?? null,
    price_cents: input.priceCents,
    quantity_available: input.quantityAvailable,
    is_published: input.isPublished,
    is_available_now: Boolean(input.isAvailableNow),
    available_until: input.availableUntil ?? null,
    current_offer_note: input.currentOfferNote?.trim() || '',
  };

  const { data, error } = await supabase
    .from('meals')
    .update(payload)
    .eq('id', mealId)
    .select('id, cook_profile_id, service_type, ingredient_model, offers_pickup, offers_cook_delivery, offers_platform_delivery, title, description, photo_url, price_cents, quantity_available, is_published, is_available_now, available_until, current_offer_note, updated_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeMeal(data);
}

export async function setMealAvailableNow(mealId: string, isAvailableNow: boolean): Promise<void> {
  const { error } = await supabase
    .from('meals')
    .update({
      is_available_now: isAvailableNow,
      available_until: null,
    })
    .eq('id', mealId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setMealPublished(mealId: string, isPublished: boolean): Promise<MealRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  if (isPublished) {
    const { data: existingMeal, error: existingMealError } = await supabase
      .from('meals')
      .select('cook_profile_id')
      .eq('id', mealId)
      .single();

    if (existingMealError) {
      throw new Error(existingMealError.message);
    }

    await assertCookCanPublishMeals(String(existingMeal.cook_profile_id));
  }

  const { data, error } = await supabase
    .from('meals')
    .update({ is_published: isPublished })
    .eq('id', mealId)
    .select('id, cook_profile_id, service_type, ingredient_model, offers_pickup, offers_cook_delivery, offers_platform_delivery, title, description, photo_url, price_cents, quantity_available, is_published, is_available_now, available_until, current_offer_note, updated_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeMeal(data);
}

export async function listPublishedMeals(): Promise<DiscoverMeal[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from('meals')
    .select(
      'id, cook_profile_id, service_type, ingredient_model, offers_pickup, offers_cook_delivery, offers_platform_delivery, title, description, photo_url, price_cents, quantity_available, is_published, is_available_now, available_until, current_offer_note, updated_at, cook_profiles!inner(display_name, city, is_active)'
    )
    .eq('is_published', true)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => {
    const meal = normalizeMeal(row);
    const cook = Array.isArray(row.cook_profiles) ? row.cook_profiles[0] : row.cook_profiles;

    return {
      ...meal,
      cook_display_name: String(cook?.display_name || 'Cook'),
      cook_city: String(cook?.city || 'Unknown city'),
    };
  });
}