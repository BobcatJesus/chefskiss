# Too Many Cooks Architecture

## Product Constraint For V1

- One city first
- Scheduled pickup only
- One cook per order
- Manual cook approval is acceptable early on
- Payments can be mocked before Stripe is added

## Recommended Stack

- Expo with Expo Router
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase Storage for meal photos
- Stripe Connect later for payouts

## Folder Structure

```txt
toomanycooks/
  app/
    _layout.tsx
    index.tsx
    (auth)/
      _layout.tsx
      sign-in.tsx
      sign-up.tsx
      complete-profile.tsx
    (customer)/
      _layout.tsx
      discover.tsx
      favorites.tsx
      orders.tsx
      profile.tsx
    (cook)/
      _layout.tsx
      dashboard.tsx
      meals.tsx
      orders.tsx
      profile.tsx
      availability.tsx
    cooks/
      [cookId].tsx
    meals/
      [mealId].tsx
      create.tsx
      edit/[mealId].tsx
    orders/
      [orderId].tsx
      checkout.tsx
    onboarding/
      become-cook.tsx
  components/
    ui/
      Button.tsx
      Input.tsx
      Screen.tsx
      EmptyState.tsx
      Badge.tsx
    cook/
      CookCard.tsx
      CookHeader.tsx
    meal/
      MealCard.tsx
      MealForm.tsx
    order/
      OrderCard.tsx
      OrderStatusPill.tsx
  features/
    auth/
      api.ts
      hooks.ts
      types.ts
      validators.ts
    cooks/
      api.ts
      hooks.ts
      selectors.ts
      types.ts
      validators.ts
    meals/
      api.ts
      hooks.ts
      selectors.ts
      types.ts
      validators.ts
    availability/
      api.ts
      hooks.ts
      types.ts
      validators.ts
    orders/
      api.ts
      hooks.ts
      selectors.ts
      types.ts
      validators.ts
    reviews/
      api.ts
      hooks.ts
      types.ts
  lib/
    supabase.ts
    env.ts
    money.ts
    date.ts
    auth.ts
  services/
    storage/
      uploadMealPhoto.ts
    notifications/
      registerPush.ts
  constants/
    cuisines.ts
    orderStatus.ts
  types/
    database.ts
    app.ts
  supabase/
    schema.sql
    policies.sql
    seed.sql
  docs/
    architecture.md
  README.md
```

## Why This Structure Works

- `app/` owns navigation and screens.
- `components/` holds reusable UI.
- `features/` holds business logic by domain, which scales better than grouping everything by component type.
- `lib/` holds shared primitives and clients.
- `supabase/` keeps backend schema close to the app.

## Screen Order To Build

### Core auth

- `app/(auth)/sign-in.tsx`
- `app/(auth)/sign-up.tsx`
- `app/(auth)/complete-profile.tsx`

### Cook supply

- `app/onboarding/become-cook.tsx`
- `app/(cook)/profile.tsx`
- `app/meals/create.tsx`
- `app/(cook)/meals.tsx`
- `app/(cook)/availability.tsx`

### Customer demand

- `app/(customer)/discover.tsx`
- `app/cooks/[cookId].tsx`
- `app/meals/[mealId].tsx`
- `app/orders/checkout.tsx`

### Order loop

- `app/(cook)/orders.tsx`
- `app/(customer)/orders.tsx`
- `app/orders/[orderId].tsx`

## V1 Client Data Types

```ts
export type Profile = {
  id: string
  fullName: string
  phone: string | null
  city: string | null
  isCook: boolean
}

export type CookProfile = {
  id: string
  userId: string
  displayName: string
  bio: string
  cuisines: string[]
  city: string
  fulfillmentModes: ("pickup" | "cook_delivery")[]
  ratingAverage: number
  ratingCount: number
  isActive: boolean
}

export type Meal = {
  id: string
  cookProfileId: string
  title: string
  description: string
  priceCents: number
  photoUrl: string | null
  quantityAvailable: number
  preorderNoticeHours: number
  isPublished: boolean
}

export type OrderStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "ready"
  | "completed"
  | "canceled"
```

## API Endpoints For V1

Even with Supabase, define a clear API contract. These can be implemented as Supabase Edge Functions or app-side data access wrappers.

### Auth and profile

- `POST /auth/sign-up`
- `POST /auth/sign-in`
- `POST /auth/sign-out`
- `GET /me`
- `PATCH /me`

### Cook profiles

- `POST /cook-profiles`
  - Create a cook profile for the signed-in user.
- `GET /cook-profiles?city=Houston&cuisine=Italian`
  - List active cooks for discovery.
- `GET /cook-profiles/:cookProfileId`
  - Get cook details with meals and ratings summary.
- `PATCH /cook-profiles/:cookProfileId`
  - Update own cook profile.

### Meals

- `POST /meals`
  - Create a meal for the signed-in cook.
- `GET /meals/:mealId`
  - Get one meal with cook metadata.
- `PATCH /meals/:mealId`
  - Update own meal.
- `POST /meals/:mealId/publish`
  - Publish a draft meal.
- `POST /meals/:mealId/unpublish`
  - Unpublish a meal.

### Availability

- `POST /availability-slots`
  - Create a slot for the signed-in cook.
- `GET /cook-profiles/:cookProfileId/availability-slots`
  - List current bookable slots.
- `PATCH /availability-slots/:slotId`
  - Update own slot.
- `DELETE /availability-slots/:slotId`
  - Remove own slot.

### Orders

- `POST /orders`
  - Create a pending order.
- `GET /orders/:orderId`
  - Get order detail for participant users.
- `GET /me/orders?role=customer`
  - List orders for the signed-in customer.
- `GET /me/orders?role=cook`
  - List orders for the signed-in cook.
- `POST /orders/:orderId/accept`
  - Cook accepts a pending order.
- `POST /orders/:orderId/decline`
  - Cook declines a pending order.
- `POST /orders/:orderId/ready`
  - Cook marks order ready for pickup.
- `POST /orders/:orderId/complete`
  - Customer or cook marks order completed.
- `POST /orders/:orderId/cancel`
  - Cancel before acceptance based on policy.

### Reviews

- `POST /orders/:orderId/reviews`
  - Customer leaves a review after completion.
- `GET /cook-profiles/:cookProfileId/reviews`
  - List reviews for a cook.

## Endpoint Rules

- A user can only edit their own profile.
- Only the cook who owns a meal can edit or publish it.
- Only order participants can fetch order details.
- Only the assigned cook can accept, decline, or mark ready.
- Only completed orders can receive reviews.

## Suggested First Technical Milestone

Build just these screens and endpoints first:

- Sign up
- Become cook
- Create meal
- Discover cooks
- View meal
- Create order
- Accept order

That is the first usable version of Too Many Cooks.