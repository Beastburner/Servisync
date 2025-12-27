# User Role Detection Fix

## Problem

When a provider signs in, they were being shown the customer dashboard instead of the provider dashboard. This happened because the role detection logic checked user profiles before provider profiles.

## Solution

### Changes Made:

1. **Reversed Check Order**
   - Now checks **provider profile FIRST**
   - Only checks user profile if no provider profile exists
   - This ensures providers always get the provider dashboard

2. **Added Logging**
   - Console logs show which profile was found
   - Helps debug role detection issues
   - Shows: "Provider profile found" or "User profile found"

3. **Clear Profile State**
   - When provider profile is found, user profile is cleared
   - When user profile is found, provider profile is cleared
   - Prevents confusion from having both profiles

4. **Improved Timing**
   - Added small delay after signup to ensure profile is created
   - Prevents race conditions

## How It Works Now

### Sign In Flow:

1. User signs in with email/password
2. `checkUser()` function runs
3. **First**: Checks `service_providers/{userId}` collection
   - If found → Sets role to `'provider'` → Shows Provider Dashboard
   - Returns early (doesn't check user profile)
4. **Second** (only if no provider profile): Checks `user_profiles/{userId}` collection
   - If found → Sets role to `'customer'` → Shows Customer Dashboard
5. If neither found → Role is `null` (new user)

### Sign Up Flow:

1. User selects "Provide Services" or "Book Services"
2. Signs up with email/password
3. Profile is created based on selection:
   - **Provider**: Creates `service_providers/{userId}` document
   - **Customer**: Creates `user_profiles/{userId}` document
4. `checkUser()` runs after signup
5. Correct dashboard is shown based on profile type

## Debugging

### Check Browser Console:

When a user signs in, you should see:
```
Service provider found for user_abc123: Business Name
```
OR
```
User profile found for user_abc123: Full Name
```

### Check Firestore:

1. Go to Firebase Console → Firestore Database
2. Check which collection has the user's document:
   - `service_providers/{userId}` → Provider
   - `user_profiles/{userId}` → Customer
3. If user has document in BOTH collections, provider takes precedence

## Common Issues

### Issue: Provider sees customer dashboard

**Check:**
1. Does `service_providers/{userId}` document exist?
2. Check browser console for "Service provider found" message
3. If not found, provider profile might not have been created during signup

**Fix:**
- Provider needs to have a document in `service_providers` collection
- Document ID should be their Firebase Auth UID

### Issue: User has both profiles

**Check:**
- Look in both `service_providers` and `user_profiles` collections
- Provider profile takes precedence (by design)

**Fix:**
- Delete the incorrect profile document
- Or keep both - provider profile will be used

## Testing

1. **As Provider:**
   - Sign in with provider email
   - Should see "ServiSync Pro" header
   - Should see Provider Dashboard when clicking "Dashboard"

2. **As Customer:**
   - Sign in with customer email
   - Should see regular "ServiSync" header
   - Should see customer UI

3. **Check Console:**
   - Open DevTools (F12)
   - Look for profile detection messages
   - Verify correct role is set

