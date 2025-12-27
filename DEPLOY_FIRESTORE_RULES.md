# Deploy Firestore Security Rules

The Firestore security rules have been created in `firestore.rules`, but they need to be deployed to your Firebase project for them to take effect.

## Option 1: Deploy via Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **servisync-17fbd**
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Copy the entire contents of `project/firestore.rules` file
6. Paste it into the rules editor in the Firebase Console
7. Click **Publish** button

## Option 2: Deploy via Firebase CLI

If you have Firebase CLI installed:

```bash
cd project
firebase deploy --only firestore:rules
```

## What These Rules Do

The security rules allow:

1. **User Profiles**: Users can read/write their own profile
2. **Service Providers**: 
   - Providers can read/write their own profile
   - Anyone can read active providers with location visibility enabled (for customer search)
3. **Bookings**:
   - Users can read bookings where they are the customer (`user_id`)
   - Providers can read bookings where they are the provider (`provider_id`)
   - Users can create bookings (must set `user_id` to their own UID)
   - Providers can update bookings assigned to them
   - Users can update their own bookings

## After Deployment

Once the rules are deployed:
1. Refresh your browser
2. Sign in as a provider
3. The provider dashboard should now be able to fetch and display booking requests

## Troubleshooting

If you still see permission errors after deploying:
1. Make sure you're signed in as the correct provider (check the `userId` in console logs)
2. Verify the booking document has `provider_id` matching the provider's Firebase Auth UID
3. Check the Firebase Console → Firestore → Rules tab to confirm the rules were published

