# Location Tracking Setup Guide

This guide explains how the location tracking system works for service providers.

## Overview

The location tracking system allows service providers to:
1. Share their current location with the system
2. Be found by customers within a 10km radius
3. Have their location updated automatically while active

## Components

### 1. Client-Side Location Tracking

**File**: `src/components/ProviderLocationTracker.tsx`

This component automatically tracks and updates provider location:
- Updates location when provider dashboard is open
- Uses browser geolocation API
- Updates every 5 minutes (configurable)
- Also uses geolocation watch for real-time updates

**Usage**:
```tsx
<ProviderLocationTracker 
  userId={userId} 
  isActive={true}
  updateInterval={5 * 60 * 1000} // 5 minutes
/>
```

### 2. Firebase Cloud Functions

**Directory**: `functions/`

#### Functions Available:

1. **`updateProviderLocations`** (Scheduled)
   - Runs every 5 minutes
   - Updates location timestamps for active providers
   - Can be extended to integrate with external tracking services

2. **`updateProviderLocation`** (Callable)
   - Manually update provider location
   - Called from client app
   - Requires authentication

3. **`getNearbyProviders`** (Callable)
   - Server-side calculation of nearby providers
   - Alternative to client-side filtering

## Setup Instructions

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Firebase Functions (if not already done)

```bash
cd project
firebase init functions
```

Select:
- JavaScript
- ESLint: Yes
- Install dependencies: Yes

### Step 4: Install Function Dependencies

```bash
cd functions
npm install
```

### Step 5: Deploy Functions

```bash
cd ..
firebase deploy --only functions
```

## Firestore Data Structure

### Service Providers Collection

Each service provider document should have:

```javascript
{
  user_id: "provider_user_id",
  business_name: "Provider Name",
  service_type: "cleaning",
  phone: "+91 98765 43210",
  latitude: 28.6139,        // REQUIRED for location-based search
  longitude: 77.2090,       // REQUIRED for location-based search
  is_active: true,
  track_location: true,     // Optional: enable/disable tracking
  location_updated_at: Timestamp,
  rating: 4.8,
  // ... other fields
}
```

## How It Works

### For Providers:

1. **Registration**: When a provider registers, they can optionally set their location
2. **Dashboard**: When provider opens dashboard, `ProviderLocationTracker` starts tracking
3. **Automatic Updates**: Location updates every 5 minutes while dashboard is open
4. **Manual Updates**: Provider can manually update location using the update function

### For Customers:

1. **Search**: Customer searches for services in their area
2. **Distance Calculation**: System calculates distance using Haversine formula
3. **Filtering**: Only providers within 10km are shown
4. **Real-time**: Map shows current provider locations

## Location Update Flow

```
Provider Opens Dashboard
    ↓
ProviderLocationTracker Component Mounts
    ↓
Requests Geolocation Permission
    ↓
Gets Current Location
    ↓
Updates Firestore (updateServiceProviderLocation)
    ↓
Sets up Geolocation Watch (for real-time updates)
    ↓
Periodic Updates (every 5 minutes)
    ↓
Cloud Function (optional) - Scheduled updates
```

## Security Considerations

1. **Permissions**: Providers must grant location permissions
2. **Authentication**: Only authenticated providers can update their location
3. **Privacy**: Location data is only visible to:
   - The provider themselves
   - Customers searching for services (within radius)
   - System administrators

## Firestore Security Rules

Add these rules to protect location data:

```javascript
match /service_providers/{userId} {
  // Providers can read/write their own data
  allow read, write: if request.auth != null && request.auth.uid == userId;
  
  // Authenticated users can read active providers (for search)
  allow read: if request.auth != null && 
    resource.data.is_active == true;
}
```

## Testing

### Test Location Updates

1. Open provider dashboard
2. Grant location permissions
3. Check browser console for "Provider location updated successfully"
4. Check Firestore to see `latitude`, `longitude`, and `location_updated_at` fields

### Test Nearby Provider Search

1. Set provider location in Firestore
2. Search for services as a customer
3. Verify providers within 10km appear on map

## Troubleshooting

### Location Not Updating

1. Check browser console for errors
2. Verify location permissions are granted
3. Check if `isActive` prop is `true`
4. Verify Firebase configuration

### Providers Not Showing on Map

1. Check if provider has `latitude` and `longitude` set
2. Verify `is_active` is `true`
3. Check if provider is within 10km radius
4. Verify service type matches search

### Cloud Functions Not Working

1. Check Firebase project is linked: `firebase use --add`
2. Verify functions are deployed: `firebase functions:list`
3. Check function logs: `firebase functions:log`
4. Ensure billing is enabled (required for scheduled functions)

## Future Enhancements

1. **Background Location Tracking**: Track location even when app is in background
2. **Geofencing**: Alert providers when they enter/exit service areas
3. **Route Optimization**: Suggest optimal routes for providers
4. **Location History**: Store location history for analytics
5. **Battery Optimization**: Reduce update frequency when battery is low

## API Reference

### Client Functions

```typescript
// Update provider location
updateServiceProviderLocation(userId: string, latitude: number, longitude: number)

// Get nearby providers
getNearbyServiceProviders(lat: number, lng: number, radiusKm: number, serviceType?: string)

// Update from geolocation
updateProviderLocationFromGeolocation(userId: string)
```

### Cloud Functions

```javascript
// Callable function
const updateLocation = httpsCallable(functions, 'updateProviderLocation');
await updateLocation({ latitude: 28.6139, longitude: 77.2090 });

// Get nearby providers
const getNearby = httpsCallable(functions, 'getNearbyProviders');
const result = await getNearby({
  latitude: 28.6139,
  longitude: 77.2090,
  radiusKm: 10,
  serviceType: 'cleaning'
});
```

