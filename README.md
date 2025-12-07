# Family Finance Manager

A production-ready, secure, and responsive finance manager for couples, built with Next.js 14 and Firebase.

## Features

- **Auth**: Email/Password + Google Login.
- **Roles**: Admin & User (Household members).
- **Transactions**: Income, Expense, Recurring rules.
- **Vault**: Client-side encrypted storage for Jewellery & Property photos.
- **Investments**: Track Gold, FDs, Stocks.
- **Budgeting**: Monthly/Annual categories.
- **Multi-currency**: USD, EUR, etc.
- **Design**: Minimalist white theme + Dark mode.

## Architecture

- **Frontend**: Next.js (App Router), React, Tailwind CSS.
- **Backend**: Firebase Cloud Functions (Serverless).
- **Database**: Cloud Firestore (NoSQL).
- **Storage**: Firebase Storage (Encrypted at rest + Client-side encryption for sensitive files).
- **Security**: Firestore Rules + Client-side AES-GCM encryption.

## Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase Project (Blaze plan required for Cloud Functions/Storage limits, though Spark works for basic DB).

## Setup & Local Development

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd family-expense-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Copy `.env.example` to `.env.local` and fill in your Firebase config keys.
   ```bash
   cp .env.example .env.local
   ```
   > You can get these keys from Firebase Console -> Project Settings -> General -> Web App.

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Seeding Data

To populate the database with demo data (Users, Household, Transactions):

1. **Service Account**:
   - Go to Firebase Console -> Project Settings -> Service Accounts.
   - Generate a new private key and save the JSON file.
   - Set `GOOGLE_APPLICATION_CREDENTIALS` path or rely on `firebase login`.

2. **Run Seed Script**:
   ```bash
   npx tsx src/scripts/seed.ts
   ```
   *Note: Ensure `.env.local` contains `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.*

## Deployment

1. **Build**:
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**:
   ```bash
   firebase login
   firebase init  # Select Hosting, Firestore, Storage, Functions (if not configured)
   firebase deploy
   ```

## Security Note

This app uses **Client-Side Encryption** (AES-GCM) for sensitive files (Jewellery photos). 
- Keys are generated in the browser.
- Encrypted data is sent to Firebase Storage.
- Decryption happens only in the browser of authorized household members.

## Testing

- **Unit Tests**: `npm run test` (Jest)
- **E2E Tests**: Cypress (Configured in `cypress/`)

## License

MIT
