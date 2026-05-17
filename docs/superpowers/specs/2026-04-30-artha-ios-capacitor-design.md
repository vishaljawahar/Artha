# Artha iOS App — Capacitor Remote Shell Design

**Date:** 2026-04-30  
**Status:** Draft  
**Author:** Vishal

---

## Context

Artha is a personal finance tracker web app built on Next.js 14 (App Router), deployed on Vercel, with a PostgreSQL backend on Neon. The app was designed with a mobile-first UI — it already has an iOS-style bottom tab bar, responsive layouts, and touch-friendly components.

The goal is to ship Artha as a proper installable iOS app distributed to ≤20 users via TestFlight. The motivation is to move from a browser bookmark to a first-class home screen app with a native feel — full-screen, no browser chrome, app icon, splash screen.

---

## Approach: Capacitor Remote Shell

### Why Capacitor over alternatives

- **PWA rejected:** iOS severely limits PWAs — no push notifications, no biometrics, no splash screen, limited storage. Not a real app.
- **React Native rejected:** Would require rewriting the entire frontend UI. The web UI already works well on mobile. Weeks of duplicated work for ≤20 users.
- **Capacitor chosen:** Creates a real native iOS Xcode project that loads the live Vercel URL in a full-screen WKWebView. The entire Next.js backend stays on Vercel as-is. No frontend code duplication.

### Key architectural implication

Since the Next.js app uses server-side API routes (Prisma → Neon PostgreSQL), the app **cannot be bundled locally** — it requires a Node.js runtime that only exists on the Vercel server. The Capacitor shell therefore loads the remote Vercel URL rather than bundling static files. This means:

- Internet connection is required to use the app (acceptable for a personal finance tracker)
- Vercel deployments automatically update the app — no App Store re-submission needed for feature changes
- The iOS shell only needs to be re-submitted to TestFlight when native-layer changes are made (app icon, splash screen, new native plugins)

---

## Architecture

```
┌─────────────────────────────────────┐
│           iOS Device                │
│  ┌───────────────────────────────┐  │
│  │    Capacitor iOS Shell        │  │
│  │  (Xcode project, signed app)  │  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  WKWebView              │  │  │
│  │  │  loads artha.vercel.app │  │  │
│  │  └────────────┬────────────┘  │  │
│  └───────────────┼───────────────┘  │
└──────────────────┼──────────────────┘
                   │ HTTPS
        ┌──────────▼──────────┐
        │   Vercel (Next.js)  │
        │   - Page routes     │
        │   - API routes      │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │   Neon PostgreSQL   │
        └─────────────────────┘
```

---

## What Gets Built

### Capacitor project additions to the existing repo

```
artha/
├── capacitor.config.ts       ← new: points to Vercel URL
├── ios/                      ← new: generated Xcode project (git-tracked)
│   └── App/
│       ├── App/
│       │   ├── AppDelegate.swift
│       │   ├── Info.plist    ← app name, permissions
│       │   └── Assets.xcassets/
│       │       ├── AppIcon.appiconset/   ← 1024×1024 icon
│       │       └── Splash.imageset/     ← splash screen asset
│       └── App.xcodeproj
├── package.json              ← updated: @capacitor/core, @capacitor/ios, @capacitor/cli
```

### capacitor.config.ts (core config)

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vishal.artha',
  appName: 'Artha',
  webDir: 'out',          // not used in remote mode, but required
  server: {
    url: 'https://<your-vercel-url>',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',   // respect safe area (notch / Dynamic Island)
    backgroundColor: '#ffffff',
  },
};

export default config;
```

---

## iOS-Specific Tweaks Required

These are small changes to the Next.js app to make the web UI feel native inside the shell.

### 1. Safe area insets (notch / Dynamic Island)
The WKWebView needs to respect the device safe area. In Next.js 14 App Router, set via the `viewport` export in `src/app/layout.tsx`:
```ts
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',   // ← this is the key addition
};
```
And update the bottom nav in `src/components/MobileNav.tsx` to add `pb-safe` (Tailwind safe area padding). Add `tailwindcss-safe-area` plugin to `tailwind.config.ts`.

### 2. Disable WKWebView bounce scroll
The default WebView bounces on over-scroll (rubber-band effect). Add to `src/app/globals.css`:
```css
html, body {
  overscroll-behavior: none;
}
```

### 3. Status bar style
Set status bar to light (dark text on white background) in `capacitor.config.ts`:
```ts
plugins: {
  StatusBar: {
    style: 'LIGHT',
    backgroundColor: '#ffffff',
  },
}
```
Install `@capacitor/status-bar` plugin.

### 4. App icon
A single 1024×1024 PNG. Capacitor CLI auto-generates all required sizes.

### 5. Splash screen
A simple white screen with the Artha logo/wordmark. Install `@capacitor/splash-screen` plugin.

---

## Distribution Plan

### TestFlight flow

1. Enroll in **Apple Developer Program** at [developer.apple.com](https://developer.apple.com) — $99 USD/year, identity verification takes 1–2 business days.
2. In **App Store Connect**, create a new app record (bundle ID: `com.vishal.artha`).
3. In Xcode: set team → automatic signing → archive the app.
4. Upload to TestFlight via Xcode Organizer (or `xcrun altool`).
5. Add up to ≤20 internal testers by Apple ID email in App Store Connect.
6. Testers install the TestFlight app from the App Store, then accept the invite email.

### Update workflow

- **UI/feature changes:** Deploy to Vercel. App updates instantly — no TestFlight re-submission.
- **Native layer changes** (new plugin, app icon, Info.plist): `npx cap sync` → rebuild in Xcode → new TestFlight build.

---

## Cost Summary

| Item | Cost | Cadence |
|------|------|---------|
| Apple Developer Program | $99 USD/year (~₹8,200) | Annual renewal |
| Capacitor | Free | — |
| Vercel | Free | — |
| Xcode | Free | — |
| **Total** | **$99 USD/year** | — |

No one-time fees. All tooling is free except the Apple Developer Program membership.

---

## Optional Native Enhancements (Post-MVP)

These are not in scope for the initial ship but can be added incrementally without a full rewrite:

| Enhancement | Capacitor Plugin | Effort |
|-------------|-----------------|--------|
| Biometric login (Face ID / Touch ID) | `@capacitor-community/biometric-auth` | ~1 day |
| Push notifications (budget alerts) | `@capacitor/push-notifications` | ~2 days |
| Haptic feedback on actions | `@capacitor/haptics` | ~2 hours |
| Local storage / offline cache | `@capacitor/preferences` | ~1 day |

---

## Prerequisites Checklist

Before starting implementation:

- [ ] Mac with Xcode 15+ installed (free from Mac App Store, ~12 GB)
- [ ] Apple Developer Program enrollment approved ($99 USD at developer.apple.com)
- [ ] Artha Vercel URL noted (the production URL, not a preview URL)
- [ ] Node.js and npm available (already confirmed)
- [ ] CocoaPods installed: `sudo gem install cocoapods` (required by Capacitor iOS)

---

## Verification

End-to-end test after setup:

1. Run `npx cap open ios` — Xcode opens the project without errors
2. Build to iOS Simulator in Xcode — app launches, loads the Vercel URL, bottom nav works
3. Build to a physical iPhone — same as simulator, no layout clipping at notch/Dynamic Island
4. Login flow works inside the WebView (session persists across app restarts)
5. Upload to TestFlight, install via TestFlight app on iPhone, verify all 7 sections load correctly
6. Deploy a trivial change to Vercel — verify the app auto-updates without a new TestFlight build

---

## Implementation Steps

1. Install Capacitor dependencies
2. Initialize Capacitor in the Artha repo
3. Configure `capacitor.config.ts` with Vercel URL
4. Apply iOS web tweaks (viewport, overscroll, safe area)
5. Add `@capacitor/status-bar` and `@capacitor/splash-screen` plugins
6. Add iOS platform (`npx cap add ios`), run `npx cap sync`
7. Generate and set app icon + splash screen assets
8. Open in Xcode, configure signing with Apple Developer account
9. Build to simulator → test
10. Archive and upload to TestFlight
11. Invite testers via App Store Connect
