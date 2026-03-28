# PropertyFlow - Real Estate CRM

## Overview

PropertyFlow is a mobile-first Real Estate CRM application built for small real estate teams (2-5 people). It helps agents and team leads track leads through a sales pipeline, manage property listings, schedule follow-ups, and analyze business metrics. The app supports three user roles: Sales Agent, Team Lead, and Business Owner.

**Core features:**
- Lead management with pipeline stages (Inquiry → Site Visit → Negotiation → Offer → Closed/Dead)
- Property inventory management (Residential, Commercial, Rental, Land)
- Follow-up scheduling and tracking (Call, WhatsApp, Email, Site Visit, SMS)
- AI-powered lead-to-property matching
- Team management with role-based permissions
- Blacklist management for problematic contacts
- Dashboard with pipeline metrics and revenue tracking
- WhatsApp AI Agent integration (UI ready, requires external setup)
- Advanced property filtering with saved filters

**Design system:** Neo-Brutalist style with primary yellow (#ffe17c), charcoal dark (#171e19), and high-contrast black borders/shadows. Uses DM Sans font family.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend Architecture (React Native / Expo)

**Framework:** Expo SDK 54 with Expo Router v6 for file-based navigation. The app targets iOS, Android, and Web from a single codebase.

**Navigation structure:**
- `app/index.tsx` — Auth check entry point, redirects to login or tabs
- `app/login.tsx` — Simple name + phone login (no password)
- `app/(tabs)/` — Main tabbed interface (Dashboard, Leads, Properties, AI Tools, Pipeline)
- `app/lead/[id].tsx` — Lead detail with status management and AI matches
- `app/property/[id].tsx` — Property detail with status toggle and history
- `app/add-*.tsx` — Form sheets for creating leads, properties, follow-ups
- `app/admin/` — Admin panel for team permissions, blacklist, WhatsApp AI
- `app/advanced-filters.tsx` — Advanced property search with saved filters

**State management:** React Context API (`lib/data-context.tsx`) as the central data store. TanStack React Query is set up for server fetching but is not yet actively used — all data currently lives in AsyncStorage.

**Data persistence:** `@react-native-async-storage/async-storage` stores all app data locally on the device. This is the primary data store for now. Seed data is pre-loaded on first launch.

**Tab layout:** Adaptive — uses native iOS tab bar (via `expo-router/unstable-native-tabs`) when available (Liquid Glass on iOS 26+), otherwise falls back to a custom cross-platform tab bar with blur effects on iOS.

### Backend Architecture (Express)

**Server:** Express 5 running at `server/index.ts`, served alongside the Expo app. Routes are registered in `server/routes.ts` (currently a shell — no application routes implemented yet).

**Storage layer:** `server/storage.ts` exports a `MemStorage` class for in-memory user storage. This is a placeholder — no real backend data persistence is wired up yet.

**CORS:** Configured to allow requests from Replit dev/deployment domains and localhost ports (for Expo web).

**Proxy setup:** In development, the Expo packager is proxied through the Replit domain using environment variables (`REPLIT_DEV_DOMAIN`, `EXPO_PUBLIC_DOMAIN`).

### Database (Drizzle ORM + PostgreSQL)

**ORM:** Drizzle ORM configured for PostgreSQL (`drizzle.config.ts`). Schema lives in `shared/schema.ts`.

**Current schema:** Only a `users` table exists (id, username, password). The database is mostly unused — the app runs off AsyncStorage data currently.

**Migrations:** Stored in `./migrations/`, run via `drizzle-kit push` (`npm run db:push`).

**Important:** The database is provisioned but the app data (leads, properties, deals, follow-ups) has NOT been migrated to the database yet. Everything is stored in AsyncStorage. Future work should move this data to PostgreSQL tables.

### Authentication

Simple identity system — user enters their name and phone number, stored in AsyncStorage as a `UserProfile`. No passwords, no server-side session. `isLoggedIn` flag gates access to the app. Role-based permissions (`owner`, `team_lead`, `agent`, `custom`) are defined in `lib/types.ts` and enforced in the UI via the `ROLE_PERMISSIONS` constant.

### AI Features

Local matching algorithm in `lib/data-context.tsx` that scores property-to-lead compatibility based on budget, bedroom count, property type, city, and amenities. Scores and responses stored in AsyncStorage. No external AI API is integrated yet — the chat UI in the AI tab is a UI mockup.

---

## External Dependencies

### Core Mobile Stack
- **Expo SDK 54** — Build toolchain, native APIs
- **Expo Router v6** — File-based navigation
- **React Native 0.81.5** — Mobile rendering engine
- **React 19.1** — UI framework

### UI & Interaction
- `expo-blur` — Blur effects for tab bar on iOS
- `expo-glass-effect` — Liquid Glass tab bar (iOS 26+)
- `expo-haptics` — Haptic feedback on actions
- `expo-linear-gradient` — Gradient backgrounds
- `react-native-gesture-handler` — Gesture recognition
- `react-native-reanimated` — Animations
- `expo-image` / `expo-image-picker` — Image display and upload
- `@expo-google-fonts/dm-sans` — Typography
- `@expo/vector-icons` (Feather, Ionicons) — Icons
- `react-native-safe-area-context` — Safe area insets
- `react-native-keyboard-controller` — Keyboard-aware scroll views

### Data & State
- `@tanstack/react-query` — Server state management (configured, not heavily used)
- `@react-native-async-storage/async-storage` — Local device storage (primary data store)
- `drizzle-orm` + `drizzle-zod` — ORM and schema validation for PostgreSQL
- `pg` — PostgreSQL client for Node.js server

### Server
- `express` v5 — HTTP server
- `http-proxy-middleware` — Dev proxy for Expo bundler

### Other
- `expo-crypto` — UUID generation for new records
- `expo-location` — Location services (imported, used for property geo features)
- `expo-web-browser` — OAuth/external links
- `expo-constants` — App config access at runtime

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string (required for server and Drizzle)
- `REPLIT_DEV_DOMAIN` — Set automatically by Replit in development
- `EXPO_PUBLIC_DOMAIN` — Set via npm script for Expo client to find the API server