# Firebase Migration Guide

Your project has been successfully migrated from Supabase to Firebase!

## ✅ What's Been Done

1. ✅ Removed `@supabase/supabase-js` package
2. ✅ Installed `firebase` package
3. ✅ Created Firebase configuration (`src/lib/firebase.ts`)
4. ✅ Replaced all Supabase code with Firebase implementation (`src/lib/supabase.ts`)
5. ✅ Updated environment variables template (`.env.example`)
6. ✅ All imports remain compatible (no code changes needed in components)

## 🔧 Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** authentication
3. Save changes

### 3. Create Firestore Database

1. Go to **Firestore Database** in Firebase Console
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select a location for your database
5. Click "Enable"

### 4. Get Firebase Configuration

1. Go to **Project Settings** (gear icon) > **General**
2. Scroll down to "Your apps"
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app (you can skip Firebase Hosting for now)
5. Copy the Firebase configuration object

### 5. Set Environment Variables

Create a `.env` file in the `project` folder with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 6. Create Firestore Indexes

Firestore requires composite indexes for queries with multiple conditions. Create these indexes:

1. Go to **Firestore Database** > **Indexes** tab
2. Click "Create Index"
3. Create these indexes:

**Index 1: User Bookings**
- Collection ID: `bookings`
- Fields to index:
  - `user_id` (Ascending)
  - `created_at` (Descending)
- Query scope: Collection

**Index 2: Provider Bookings**
- Collection ID: `bookings`
- Fields to index:
  - `provider_id` (Ascending)
  - `created_at` (Descending)
- Query scope: Collection

Alternatively, when you run the app and Firestore detects missing indexes, it will provide a link to create them automatically.

### 7. Set Up Firestore Security Rules (Important!)

For production, update your Firestore security rules. Go to **Firestore Database** > **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles - users can read/write their own profile
    match /user_profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Service providers - users can read/write their own provider profile
    match /service_providers/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // Allow authenticated users to read providers
    }
    
    // Bookings - users can read/write their own bookings
    match /bookings/{bookingId} {
      allow read: if request.auth != null && (
        resource.data.user_id == request.auth.uid ||
        resource.data.provider_id == request.auth.uid
      );
      allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      allow update: if request.auth != null && (
        resource.data.user_id == request.auth.uid ||
        resource.data.provider_id == request.auth.uid
      );
    }
  }
}
```

**Note:** The test mode rules allow all reads/writes. Update these for production!

## 🚀 Running the App

1. Make sure your `.env` file is configured
2. Restart your dev server:
   ```bash
   npm run dev
   ```

## 📊 Database Structure

Your Firestore database will have these collections:

### `user_profiles`
- Document ID: `{userId}` (same as Firebase Auth UID)
- Fields: `user_id`, `full_name`, `phone`, `created_at`, `updated_at`

### `service_providers`
- Document ID: `{userId}` (same as Firebase Auth UID)
- Fields: `user_id`, `business_name`, `service_type`, `phone`, `rating`, `total_jobs_completed`, `total_reviews`, `is_verified`, `is_active`, `created_at`, `updated_at`

### `bookings`
- Document ID: Auto-generated
- Fields: `id`, `user_id`, `provider_id`, `service_type`, `booking_date`, `booking_time`, `service_address`, `customer_phone`, `total_amount`, `status`, `payment_method`, `notes`, `created_at`, `updated_at`

## 🔄 Key Differences from Supabase

1. **Real-time subscriptions**: Firestore uses `onSnapshot` instead of Supabase channels
2. **Timestamps**: Firestore uses `Timestamp` objects, which are automatically converted to ISO strings
3. **Queries**: Firestore requires composite indexes for queries with multiple `where` clauses and `orderBy`
4. **Data structure**: Firestore is document-based, not relational, so joins are handled manually

## 🐛 Troubleshooting

### "Missing or insufficient permissions"
- Check your Firestore security rules
- Make sure you're authenticated

### "The query requires an index"
- Click the link in the error message to create the index automatically
- Or manually create indexes as described above

### "Failed to fetch" or connection errors
- Verify your `.env` file has correct Firebase credentials
- Check that your Firebase project has Firestore enabled
- Ensure Authentication is enabled

## 📝 Next Steps

1. Test user registration and login
2. Test creating bookings
3. Test real-time updates
4. Update Firestore security rules for production
5. Consider setting up Firebase Hosting for deployment

## 🆘 Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

