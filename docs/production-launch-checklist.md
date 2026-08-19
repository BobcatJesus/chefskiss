# Production Launch Checklist

Owner: Team
Status date: 2026-08-10

## Launch Decision
- [ ] Soft launch date set
- [ ] Full launch date set
- [ ] Rollback owner assigned

## P0 Blockers (Must Pass)

### Security and dependency posture
- [ ] Resolve current audit baseline (22 vulnerabilities: 14 high, 8 moderate)
- [ ] Pin safe versions for Expo and React Native stack
- [ ] Run `npm audit --omit=dev` with no high/critical issues

### Auth and account integrity
- [ ] Confirm production auth provider and email confirmation UX
- [ ] Verify sign-in/sign-up/reset password flows on web and mobile
- [ ] Add clear user-facing errors for unconfirmed email states

### Data and abuse controls
- [ ] Add rate limiting strategy for public analytics writes
- [ ] Add retention policy for `menu_events`
- [ ] Add server-side guardrails for malformed analytics payloads

### Observability and incident readiness
- [ ] Add centralized app error monitoring (frontend + API)
- [ ] Add release health dashboard (errors, p95 load, auth failures)
- [ ] Add alert thresholds and on-call contact

### Core flow reliability
- [ ] Smoke test critical flows: discover -> meal -> checkout -> order detail
- [ ] Smoke test cook flow: profile slug -> public menu -> share link -> analytics refresh
- [ ] Validate route access controls for signed-out users

## P1 Hardening (Before Full Launch)

### Product analytics quality
- [ ] Add human/test traffic flag to analytics writes
- [ ] Add unique visitor/session approximation for funnel sanity
- [ ] Add weekly exports for analytics QA

### UX and performance
- [ ] Mobile viewport pass for all primary pages
- [ ] Lighthouse performance pass on web routes
- [ ] Empty/error/loading state copy pass

### Data lifecycle
- [ ] Backup and restore drill for Supabase project
- [ ] Migration rollback rehearsals for last 3 migrations
- [ ] Verify RLS policies for all write paths

## Tests and CI
- [ ] Add unit tests for analytics aggregation in `features/profiles/api.ts`
- [ ] Add integration tests for slug availability and updates
- [ ] Add e2e smoke test for checkout start analytics event
- [ ] Block merge on `npx tsc --noEmit` and test pass

## Release Controls
- [ ] Environment separation confirmed (dev/staging/prod)
- [ ] Runtime env validation at app boot
- [ ] Feature flags for risky launch features (analytics cards, export)

## Compliance and trust
- [ ] Privacy policy and terms linked in app
- [ ] Data deletion request path documented
- [ ] Cookie/telemetry disclosure reviewed

## Go/No-Go Checklist (Day of Launch)
- [ ] No P0 blockers open
- [ ] Error rate stable for 24h before launch
- [ ] Rollback command and owner confirmed
- [ ] Support and escalation channel live

## Current Reality Snapshot
- Typecheck: passing (`npx tsc --noEmit`)
- Prototype core flows: functional
- Known launch risk: dependency vulnerability baseline is above production threshold
