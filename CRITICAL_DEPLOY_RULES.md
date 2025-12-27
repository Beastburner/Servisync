# ⚠️ CRITICAL: Deploy Firestore Rules NOW

## The Problem
You're getting "Missing or insufficient permissions" errors because the Firestore security rules are **NOT deployed** to your Firebase project.

## Step-by-Step Deployment (DO THIS NOW)

### 1. Open Firebase Console
- Go to: https://console.firebase.google.com/
- Select project: **servisync-17fbd**

### 2. Navigate to Firestore Rules
- Click **Firestore Database** in the left sidebar
- Click the **Rules** tab at the top

### 3. Copy the Rules
- Open `project/firestore.rules` in your code editor
- Select ALL the text (Ctrl+A / Cmd+A)
- Copy it (Ctrl+C / Cmd+C)

### 4. Paste into Firebase Console
- In the Firebase Console Rules editor, select ALL existing text
- Delete it
- Paste the new rules (Ctrl+V / Cmd+V)

### 5. Publish (CRITICAL STEP)
- Click the **Publish** button (blue button at the top)
- Wait for the success message: "Rules published successfully"
- **DO NOT** just close the tab - you MUST click Publish!

### 6. Verify Deployment
- Look for a timestamp showing when rules were last published
- The rules should show exactly what's in `project/firestore.rules`

### 7. Wait for Propagation
- Wait 30-60 seconds for rules to propagate globally
- Close and reopen your app
- Sign out and sign back in

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
      allow list: if isAuthenticated();
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

## Common Mistakes

❌ **Mistake 1**: Editing rules but not clicking "Publish"
- **Fix**: You MUST click the "Publish" button

❌ **Mistake 2**: Only saving, not publishing
- **Fix**: "Save" doesn't deploy - only "Publish" does

❌ **Mistake 3**: Rules have syntax errors
- **Fix**: Check the Rules editor for red error messages

❌ **Mistake 4**: Not waiting for propagation
- **Fix**: Wait 30-60 seconds after publishing

## After Deployment

1. **Hard refresh your browser**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Sign out completely** from your app
3. **Sign back in** as the provider
4. **Check the console** - the permission errors should be gone

## Still Not Working?

If you still get errors after deploying:
1. Take a screenshot of the Rules tab in Firebase Console
2. Check if there are any error messages in the Rules editor
3. Verify the rules match exactly what's in `project/firestore.rules`
4. Try signing out and back in again

