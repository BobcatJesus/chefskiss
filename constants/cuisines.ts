export const cuisines = [
  'Italian',
  'Indian',
  'Mexican',
  'BBQ',
  'Meal Prep',
  'Mediterranean',
] as const;

export type Cuisine = (typeof cuisines)[number];