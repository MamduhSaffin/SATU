# TGPU Core v0.1

TGPU Core is the shared offline-first foundation intended for both **TEMAN Haramain** and **SATU**.

## Engineering rule

**Local-first. Core safety and essential tools must never depend on login or internet.**

## What exists in v0.1

- Native-browser IndexedDB storage adapter (`src/core/storage`)
- Offline sync queue that stores writes until connectivity returns (`src/core/sync`)
- Shared BM / Arabic / English locale layer with RTL support (`src/core/i18n`)
- Offline currency conversion engine using a saved/manual rate snapshot (`src/core/kira`)
- Connectivity helpers (`src/core/connectivity`)
- Local-notification adapter contract (`src/core/notifications`)
- Stronger app-shell/runtime Service Worker caching

## Storage strategy

### Web / PWA prototype

SATU currently uses the browser adapter based on IndexedDB. It works without internet and keeps data on the device.

### Android / iOS production

TEMAN and later SATU mobile builds should use the same `LocalStore` contract with a native encrypted SQLite adapter. The mobile implementation should use device secure storage for encryption-key material.

The browser adapter is intentionally **not described as encrypted storage**. Encryption belongs in the native adapter/key-management layer.

## Shared data namespaces

Use namespaced keys so products can coexist safely:

- `core.*` — TGPU Core internals
- `satu.*` — SATU user data
- `teman.*` — TEMAN user data

Examples:

- `core.sync.queue`
- `satu.notes`
- `satu.shopping`
- `teman.pilgrim.profile`
- `teman.travel.hotel`
- `teman.safety.card`

## Offline sync model

1. User action is saved locally first.
2. UI confirms the local save immediately.
3. If the action also needs cloud sync, add it to `OfflineSyncQueue`.
4. When connectivity returns, a sync worker sends queued operations to Azure.
5. Only successful operations are removed from the queue.
6. Failed operations remain locally with attempt/error metadata.

## TEMAN critical offline data

The following must be downloadable/saved before travel:

- Pilgrim profile
- Hotel details
- Group / bus / mutawwif
- Emergency contacts
- Safety Card
- Arabic emergency phrases and pre-recorded audio
- Core ibadah guide
- Health / hydration / medicine reminders
- Saved meeting points
- Last downloaded exchange-rate snapshot

Family Link, live location sharing, cloud backup, remote content updates and live exchange-rate refresh are online enhancements. Their absence must not block the core TEMAN experience.

## SATU shared use

SATU can reuse TGPU Core for:

- Notes and lists
- Shopping records
- Budgets
- Receipts metadata
- Currency calculations
- Offline sync
- Local reminders
- Shared language preferences

## Next implementation milestones

### v0.2 — TEMAN domain package

Create `src/teman/` models and repositories for pilgrim, travel, group, emergency card and offline readiness.

### v0.3 — Native mobile adapter

Add Capacitor and an encrypted SQLite implementation of `LocalStore` for Android-first deployment.

### v0.4 — Azure sync adapter

Add optional Azure authentication/sync for Family Link, cross-device backup and content updates.

### v0.5 — SATU integration

Move existing SATU notes, calculator, budget and receipt data behind TGPU Core repositories.
