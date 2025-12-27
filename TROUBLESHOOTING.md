# Firebase Configuration Troubleshooting

## Error: `auth/configuration-not-found`

This error means Firebase cannot find your authentication configuration. Follow these steps:

### Step 1: Verify Your .env File

1. Make sure `.env` file exists in the `project` folder (same level as `package.json`)
2. Check that all variables are set (not empty):
   ```env
   VITE_FIREBASE_API_KEY=AIza... (should start with AIza)
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

### Step 2: Restart Your Dev Server

**IMPORTANT:** After creating or updating `.env` file, you MUST restart your dev server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

Vite only reads environment variables when it starts, so changes won't take effect until you restart.

### Step 3: Verify Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** > **Sign-in method**
4. Make sure **Email/Password** is enabled (toggle should be ON)
5. Click "Save" if you just enabled it

### Step 4: Verify Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Click on your web app (or create one if you haven't)
4. Copy the configuration values exactly as shown
5. Make sure `authDomain` ends with `.firebaseapp.com` or `.web.app`

### Step 5: Check Browser Console

Open browser DevTools (F12) and check:
- Are there any errors about missing environment variables?
- Does it say "✅ Firebase initialized successfully"?

### Common Issues

#### Issue: Environment variables are undefined
**Solution:** 
- Make sure `.env` is in the `project` folder, not the root
- Restart dev server
- Check for typos in variable names (must start with `VITE_`)

#### Issue: "Invalid API key"
**Solution:**
- Verify API key in Firebase Console > Project Settings
- Make sure you copied the entire key (they're long)
- Check for extra spaces or quotes in `.env` file

#### Issue: "Auth domain not found"
**Solution:**
- Format should be: `your-project-id.firebaseapp.com`
- Don't include `https://` prefix
- Make sure project ID matches

#### Issue: Authentication not enabled
**Solution:**
- Go to Firebase Console > Authentication
- Enable Email/Password provider
- Save changes

### Quick Test

To verify your configuration is working, add this to your browser console:

```javascript
console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? 'Set' : 'Missing');
console.log('Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
```

If any show as "Missing" or undefined, your `.env` file isn't being loaded.

### Still Not Working?

1. **Clear browser cache** and hard refresh (Ctrl+Shift+R)
2. **Delete node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```
3. **Check Firebase project status** - make sure it's not suspended or deleted
4. **Verify billing** - some Firebase features require billing enabled (though basic auth is free)

### Getting Your Firebase Config

If you need to get your Firebase configuration again:

1. Go to https://console.firebase.google.com/
2. Select your project
3. Click the gear icon ⚙️ > **Project settings**
4. Scroll to **Your apps** section
5. If you don't have a web app, click **Add app** > **Web** (`</>`)
6. Register the app (you can skip hosting)
7. Copy the `firebaseConfig` object values to your `.env` file

