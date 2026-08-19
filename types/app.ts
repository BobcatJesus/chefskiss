export type FulfillmentMode = 'pickup' | 'cook_delivery';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'ready'
  | 'completed'
  | 'canceled';

export type Profile = {
  id: string;
  fullName: string;
  phone: string | null;
  city: string | null;
  isCook: boolean;
};

export type CookProfile = {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  cuisines: string[];
  city: string;
  fulfillmentModes: FulfillmentMode[];
  ratingAverage: number;
  ratingCount: number;
  isActive: boolean;
};

export type Meal = {
  id: string;
  cookProfileId: string;
  title: string;
  description: string;
  priceCents: number;
  photoUrl: string | null;
  quantityAvailable: number;
  preorderNoticeHours: number;
  isPublished: boolean;
};
