# Verify Firestore Security Rules

If you're still getting "Missing or insufficient permissions" errors after deploying the rules, follow these steps:

## Step 1: Verify Rules Are Deployed

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **servisync-17fbd**
3. Navigate to **Firestore Database** → **Rules** tab
4. Verify the rules match exactly what's in `project/firestore.rules`
5. Make sure you clicked **Publish** (not just Save)
6. Wait 10-30 seconds for rules to propagate

## Step 2: Test Rules in Rules Playground

1. In Firebase Console → Firestore → Rules tab
2. Click **Rules Playground** (top right)
3. Set up a test:
   - **Location**: `bookings/{bookingId}`
   - **Authenticated**: Yes
   - **User ID**: Your provider's Firebase Auth UID (e.g., `NH0UTLafaCOHZ0nnq5fDtz5R4332`)
   - **Operation**: `get` or `list`
   - **Document data**: 
     ```json
     {
       "provider_id": "NH0UTLafaCOHZ0nnq5fDtz5R4332",
       "user_id": "cYrCoX1B2UONtnn7rp69ehCXyVF3",
       "status": "pending"
     }
     ```
4. Click **Run** - it should show "Allow"

## Step 3: Check Browser Console

After refreshing your app, check the browser console for:
- `🔍 Current authenticated user UID: "..."` - Should show your provider's UID
- `🔍 Provider ID matches auth UID: ✅ YES` - Should match
- If it shows `❌ NO`, the `userId` prop doesn't match the authenticated user

## Step 4: Verify Booking Document Structure

In Firebase Console → Firestore Database → `bookings` collection:
1. Open a booking document
2. Verify it has:
   - `provider_id` field (should match provider's Firebase Auth UID)
   - `user_id` field (should match customer's Firebase Auth UID)
   - Both fields should be strings, not numbers

## Step 5: Common Issues

### Issue 1: Rules Not Published
- **Symptom**: Still getting permission errors
- **Fix**: Make sure you clicked **Publish** in Firebase Console, not just typed the rules

### Issue 2: User Not Authenticated
- **Symptom**: Console shows "No authenticated user found"
- **Fix**: Sign out and sign back in as the provider

### Issue 3: Provider ID Mismatch
- **Symptom**: Console shows "Provider ID matches auth UID: ❌ NO"
- **Fix**: The `userId` prop passed to `ProviderDashboard` must match the Firebase Auth UID

### Issue 4: Rules Syntax Error
- **Symptom**: Rules won't publish, shows syntax error
- **Fix**: Copy the entire contents of `project/firestore.rules` exactly as shown

## Step 6: Test with Simple Query

If rules still don't work, try this temporary permissive rule (for testing only):

```javascript
// TEMPORARY - FOR TESTING ONLY
match /bookings/{bookingId} {
  allow read, write: if request.auth != null;
}
```

If this works, then the issue is with the rule logic, not deployment.

## Current Rules (Should be in Firebase Console)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    match /user_profiles/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    match /service_providers/{providerId} {
      allow read, write: if isOwner(providerId);
      allow read: if resource.data.is_active == true && resource.data.show_location == true;
    }
    
    match /bookings/{bookingId} {
      allow read: if isAuthenticated() && (
        resource.data.user_id == request.auth.uid ||
        resource.data.provider_id == request.auth.uid
      );
      allow list: if isAuthenticated();
      allow create: if isAuthenticated() && 
        request.resource.data.user_id == request.auth.uid;
      allow update: if isAuthenticated() && 
        resource.data.provider_id == request.auth.uid;
      allow update: if isAuthenticated() && 
        resource.data.user_id == request.auth.uid;
    }
  }
}
```

