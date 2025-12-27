# Firebase Cloud Functions - Service Provider Location Updates

This directory contains Firebase Cloud Functions for managing service provider locations.

## Functions

### 1. `updateProviderLocations` (Scheduled)
- **Trigger**: Runs every 5 minutes
- **Purpose**: Updates location timestamps for active providers
- **Note**: In production, this would integrate with a location tracking service

### 2. `updateProviderLocation` (Callable)
- **Trigger**: Called from client app
- **Purpose**: Manually update a provider's location
- **Authentication**: Required
- **Parameters**: 
  - `latitude` (number)
  - `longitude` (number)

### 3. `getNearbyProviders` (Callable)
- **Trigger**: Called from client app
- **Purpose**: Get nearby providers with server-side distance calculation
- **Parameters**:
  - `latitude` (number)
  - `longitude` (number)
  - `radiusKm` (number, default: 10)
  - `serviceType` (string, optional)

## Setup

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

4. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```

## Local Development

1. Start Firebase emulators:
   ```bash
   firebase emulators:start
   ```

2. Test functions locally:
   ```bash
   npm run serve
   ```

## Usage in Client

### Update Provider Location
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const updateLocation = httpsCallable(functions, 'updateProviderLocation');

// Update location
await updateLocation({ latitude: 28.6139, longitude: 77.2090 });
```

### Get Nearby Providers
```javascript
const getNearby = httpsCallable(functions, 'getNearbyProviders');

const result = await getNearby({
  latitude: 28.6139,
  longitude: 77.2090,
  radiusKm: 10,
  serviceType: 'cleaning'
});
```

## Notes

- The scheduled function runs every 5 minutes. Adjust the schedule in `index.js` if needed.
- For production, consider integrating with a real-time location tracking service.
- Provider locations should be updated when:
  - Provider opens the app
  - Provider starts/ends a service
  - Provider manually updates location
  - Periodic background updates (if app is open)

