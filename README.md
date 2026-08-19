# Chefskiss MVP

Chefskiss is a marketplace for independent home chefs. The first product goal is narrow:

One cook can create a profile, publish a meal, set availability, and another user can place a scheduled pickup order.

## Two-Week MVP Roadmap

### Week 1

#### Day 1: Product rules and setup

- Choose one launch city.
- Limit v1 fulfillment to scheduled pickup.
- Limit v1 orders to a single cook per checkout.
- Decide your stack: Expo, Supabase, Stripe later.
- Create the Expo app and Supabase project.

Deliverable:

- Working app shell and database project.

#### Day 2: Auth and user profile

- Add email and password auth.
- Create `profiles` row on signup.
- Build onboarding for name, phone, city.

Deliverable:

- A signed-in user exists in app and in Supabase.

#### Day 3: Cook activation

- Let any user activate a cook profile.
- Build create and edit cook profile flow.
- Capture display name, bio, cuisines, city, fulfillment mode.

Deliverable:

- A user can become a cook and publish a profile.

#### Day 4: Meal management

- Build create meal screen.
- Add title, description, price, photo, quantity, preorder notice.
- Add meal list for the cook.

Deliverable:

- A cook can publish at least one meal.

#### Day 5: Availability slots

- Build weekly or date-based availability slots.
- Add cutoff time for each slot.
- Tie meals to active cook availability.

Deliverable:

- A cook can expose bookable time windows.

### Week 2

#### Day 6: Customer discovery

- Build discover screen with cook cards.
- Filter by city and cuisine.
- Show cook profile and published meals.

Deliverable:

- A customer can browse live cooks and meals.

#### Day 7: Meal detail and order creation

- Build meal detail screen.
- Let a user pick a quantity and slot.
- Create pending order in Supabase.

Deliverable:

- A customer can place a scheduled pickup order.

#### Day 8: Cook order management

- Build orders inbox for cooks.
- Accept or decline a pending order.
- Show accepted and completed states.

Deliverable:

- Cooks can process incoming orders.

#### Day 9: Customer order tracking

- Show order history for customers.
- Add status progression: pending, accepted, ready, completed.
- Add basic notifications in-app or polling.

Deliverable:

- Customers can see what is happening with their order.

#### Day 10: Reviews and QA

- Add simple review flow after completion.
- Validate permissions and row-level security.
- Test the full loop with two real accounts.

Deliverable:

- End-to-end MVP ready for pilot users.

## Success Criteria

The MVP is working when all of this is true:

- A new user can sign up.
- The user can activate a cook profile.
- The cook can publish a meal.
- Another user can browse that meal.
- The second user can place a scheduled pickup order.
- The cook can accept the order.
- Both users can see the order status.

## What To Skip In V1

- Real-time driver logistics
- Multi-cook carts
- In-app chat
- Subscription plans
- Referral systems
- AI recommendations
- Platform-managed payouts beyond basic planning

## Next Build Step

Use [docs/architecture.md](docs/architecture.md) as the app structure source of truth and [supabase/schema.sql](supabase/schema.sql) as the initial backend model.

## Permanent QR Codes

Use the root query format `/?go=:code` for any QR code you plan to print or share long-term.

- Example stable QR target: `/?go=app`
- Current campaign redirect map is in `constants/permanentQrLinks.ts`
- You can change destination routes later by editing the map without regenerating the QR image

Current campaign codes:

- `app`
- `discover`
- `cooks`
- `signup`
- `becomeacook`
- `flyer`
- `event`
- `menu`

Suggested approach:

1. Keep one code forever (for example: `app`).
2. Print the QR with that one URL path.
3. Update only the map when your app routes change.

Generate QR assets:

1. Set your canonical public URL once per terminal session to a domain that is already deployed and reachable:
   - PowerShell: `$env:PUBLIC_APP_URL='https://your-live-domain.com'`
2. Run `npm run qr:generate`
3. Generated files:
	- `assets/qr/app-permanent.svg`
	- `assets/qr/app-permanent.png`

## Deploy With Vercel

1. Import this repository into Vercel.
2. Set Build Command to `npm run export:web`.
3. Set Output Directory to `dist`.
4. Add your production domain in Vercel project settings.
5. After the domain is live, regenerate QR assets with that exact domain:
   - PowerShell: `$env:PUBLIC_APP_URL='https://your-live-domain.com'`
   - Then run: `npm run qr:generate`

Notes:

- `vercel.json` includes a redirect from `/go/:code` to `/?go=:code` for compatibility with older printed links.
- Current stable URL format for new QR codes is `https://your-live-domain.com/?go=app`.