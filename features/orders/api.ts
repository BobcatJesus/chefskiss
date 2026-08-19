import { ensureProfile } from '@/features/profiles/api';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type OrderRecord = {
  id: string;
  customer_user_id: string;
  cook_profile_id: string;
  meal_id: string;
  availability_slot_id: string | null;
  quantity: number;
  fulfillment_mode: 'pickup' | 'cook_delivery';
  ingredient_model: 'cook_provides' | 'customer_provides';
  status: string;
  scheduled_for: string;
  subtotal_cents: number;
  service_fee_cents: number;
  total_cents: number;
  special_instructions: string;
  created_at: string;
  meal_title: string | null;
};

type CreateOrderInput = {
  mealId: string;
  quantity: number;
  fulfillmentMode: 'pickup' | 'cook_delivery';
  ingredientModel: 'cook_provides' | 'customer_provides';
  scheduledFor: string;
  specialInstructions: string;
};

function normalizeOrder(row: any): OrderRecord {
  return {
    id: String(row.id),
    customer_user_id: String(row.customer_user_id),
    cook_profile_id: String(row.cook_profile_id),
    meal_id: String(row.meal_id),
    availability_slot_id: row.availability_slot_id ? String(row.availability_slot_id) : null,
    quantity: Number(row.quantity || 0),
    fulfillment_mode: row.fulfillment_mode === 'cook_delivery' ? 'cook_delivery' : 'pickup',
    ingredient_model: row.ingredient_model === 'customer_provides' ? 'customer_provides' : 'cook_provides',
    status: String(row.status || 'pending'),
    scheduled_for: String(row.scheduled_for || ''),
    subtotal_cents: Number(row.subtotal_cents || 0),
    service_fee_cents: Number(row.service_fee_cents || 0),
    total_cents: Number(row.total_cents || 0),
    special_instructions: String(row.special_instructions || ''),
    created_at: String(row.created_at || ''),
    meal_title: typeof row.meals?.title === 'string' ? row.meals.title : null,
  };
}

async function getMealForOrder(mealId: string) {
  const { data, error } = await supabase
    .from('meals')
    .select('id, cook_profile_id, price_cents, quantity_available, title, is_published, ingredient_model, offers_pickup, offers_cook_delivery')
    .eq('id', mealId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const { user } = await ensureProfile();
  const meal = await getMealForOrder(input.mealId);

  if (!meal.is_published) {
    throw new Error('This meal is not published.');
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error('Quantity must be a whole number greater than 0.');
  }

  if (input.quantity > Number(meal.quantity_available || 0)) {
    throw new Error('Requested quantity exceeds available inventory.');
  }

  if (input.fulfillmentMode === 'pickup' && meal.offers_pickup === false) {
    throw new Error('This meal does not offer pickup fulfillment.');
  }

  if (input.fulfillmentMode === 'cook_delivery' && meal.offers_cook_delivery === false) {
    throw new Error('This meal does not offer cook delivery fulfillment.');
  }

  if (meal.ingredient_model === 'cook_provides' && input.ingredientModel !== 'cook_provides') {
    throw new Error('This meal requires cook-provided ingredients.');
  }

  if (meal.ingredient_model === 'customer_provides' && input.ingredientModel !== 'customer_provides') {
    throw new Error('This meal requires customer-provided ingredients.');
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_user_id: user.id,
      cook_profile_id: meal.cook_profile_id,
      meal_id: meal.id,
      availability_slot_id: null,
      quantity: input.quantity,
      fulfillment_mode: input.fulfillmentMode,
      ingredient_model: input.ingredientModel,
      status: 'pending',
      scheduled_for: input.scheduledFor,
      service_fee_cents: 0,
      special_instructions: input.specialInstructions.trim(),
    })
    .select('id, customer_user_id, cook_profile_id, meal_id, availability_slot_id, quantity, fulfillment_mode, ingredient_model, status, scheduled_for, subtotal_cents, service_fee_cents, total_cents, special_instructions, created_at, meals(title)')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeOrder(data);
}

export async function getOrderById(orderId: string): Promise<OrderRecord> {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase configuration.');
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_user_id, cook_profile_id, meal_id, availability_slot_id, quantity, fulfillment_mode, ingredient_model, status, scheduled_for, subtotal_cents, service_fee_cents, total_cents, special_instructions, created_at, meals(title)')
    .eq('id', orderId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeOrder(data);
}

export async function listCustomerOrders(): Promise<OrderRecord[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { user } = await ensureProfile();
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_user_id, cook_profile_id, meal_id, availability_slot_id, quantity, fulfillment_mode, ingredient_model, status, scheduled_for, subtotal_cents, service_fee_cents, total_cents, special_instructions, created_at, meals(title)')
    .eq('customer_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => normalizeOrder(row));
}

export async function acceptOrder(): Promise<void> {
  throw new Error('Not implemented: accept order');
}
