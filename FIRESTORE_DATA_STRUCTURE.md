# Firestore Data Structure - Location Storage

This document explains how Firebase Firestore stores location data for service providers.

## 📊 Data Storage Structure

### Service Providers Collection

**Collection Name**: `service_providers`

**Document ID**: `{userId}` (same as Firebase Auth UID)

**Document Structure**:
```javascript
{
  // Basic Information
  user_id: "abc123xyz",                    // Firebase Auth UID
  business_name: "Rajesh Cleaning Services",
  service_type: "cleaning",                // cleaning, repair, beauty, etc.
  phone: "+91 98765 43210",
  
  // Location Data (NEW - Required for map display)
  latitude: 28.6139,                       // Number: -90 to 90
  longitude: 77.2090,                      // Number: -180 to 180
  location_updated_at: Timestamp,          // Server timestamp
  last_location_update: Timestamp,         // Last update time
  
  // Status & Settings
  is_active: true,                         // Boolean: Provider is active
  track_location: true,                    // Boolean: Enable location tracking
  is_verified: false,                      // Boolean: Provider verified
  
  // Ratings & Stats
  rating: 4.8,                             // Number: Average rating
  total_jobs_completed: 43,                // Number: Total jobs
  total_reviews: 38,                       // Number: Total reviews
  
  // Timestamps
  created_at: Timestamp,                   // When profile was created
  updated_at: Timestamp,                   // Last profile update
  
  // Optional Fields
  image: "https://...",                     // Profile image URL
  price: "₹299",                           // Default service price
  description: "Professional cleaning...",  // Service description
}
```

## 🔍 Example Documents

### Example 1: Active Provider with Location
```javascript
// Document ID: "user_abc123"
{
  user_id: "user_abc123",
  business_name: "Rajesh Cleaning Services",
  service_type: "cleaning",
  phone: "+91 98765 43210",
  latitude: 28.6139,           // ✅ Has location
  longitude: 77.2090,          // ✅ Has location
  location_updated_at: Timestamp("2025-12-27T10:30:00Z"),
  is_active: true,             // ✅ Active provider
  track_location: true,
  rating: 4.8,
  total_jobs_completed: 43,
  total_reviews: 38,
  is_verified: true,
  created_at: Timestamp("2025-01-15T08:00:00Z"),
  updated_at: Timestamp("2025-12-27T10:30:00Z")
}
```

### Example 2: Provider Without Location
```javascript
// Document ID: "user_xyz789"
{
  user_id: "user_xyz789",
  business_name: "Amit Repair Services",
  service_type: "repair",
  phone: "+91 98765 43211",
  latitude: null,              // ❌ No location set
  longitude: null,             // ❌ No location set
  is_active: true,
  rating: 4.6,
  // ... other fields
}
```
**Note**: This provider won't appear on the map because they don't have location data.

## 📍 How Location is Stored

### 1. **Data Types**
- `latitude`: **Number** (not string) - Range: -90 to 90
- `longitude`: **Number** (not string) - Range: -180 to 180
- `location_updated_at`: **Timestamp** - Server timestamp

### 2. **Storage Format**
```javascript
// ✅ CORRECT - Numbers
{
  latitude: 28.6139,
  longitude: 77.2090
}

// ❌ WRONG - Strings
{
  latitude: "28.6139",
  longitude: "77.2090"
}
```

### 3. **Geographic Points**
Firestore stores coordinates as simple numbers. For example:
- **Delhi, India**: `{ latitude: 28.6139, longitude: 77.2090 }`
- **Mumbai, India**: `{ latitude: 19.0760, longitude: 72.8777 }`
- **Bangalore, India**: `{ latitude: 12.9716, longitude: 77.5946 }`

## 🔄 How Location Updates Work

### When Provider Opens Dashboard:

1. **Component Mounts**: `ProviderLocationTracker` starts
2. **Get Location**: Browser geolocation API
3. **Update Firestore**:
   ```javascript
   // Updates this document:
   service_providers/{userId}
   
   // Sets these fields:
   {
     latitude: 28.6139,                    // New latitude
     longitude: 77.2090,                  // New longitude
     location_updated_at: Timestamp,       // Server timestamp
     last_location_update: Timestamp       // Server timestamp
   }
   ```

### Update Flow:
```
Browser Geolocation API
    ↓
getCurrentPosition() / watchPosition()
    ↓
updateServiceProviderLocation(userId, lat, lng)
    ↓
Firestore updateDoc()
    ↓
service_providers/{userId} document updated
```

## 📐 Distance Calculation

### How Distance is Calculated:

The system uses the **Haversine formula** to calculate distance between two coordinates:

```javascript
// Customer location
const customerLat = 28.6139;
const customerLng = 77.2090;

// Provider location (from Firestore)
const providerLat = 28.6200;  // Stored in Firestore
const providerLng = 77.2100;  // Stored in Firestore

// Calculate distance
const distance = calculateDistance(customerLat, customerLng, providerLat, providerLng);
// Result: ~0.7 km
```

### Query Process:

1. **Fetch All Active Providers**:
   ```javascript
   // Firestore Query
   service_providers
     .where('is_active', '==', true)
     .where('service_type', '==', 'cleaning')  // Optional filter
   ```

2. **Calculate Distance** (Client-side):
   ```javascript
   // For each provider document
   providers.forEach(provider => {
     const distance = calculateDistance(
       customerLat, customerLng,
       provider.latitude, provider.longitude
     );
     
     if (distance <= 10) {  // Within 10km
       nearbyProviders.push({ ...provider, distance_km: distance });
     }
   });
   ```

3. **Sort by Distance**:
   ```javascript
   nearbyProviders.sort((a, b) => a.distance_km - b.distance_km);
   ```

## 🔍 Firestore Queries

### Query 1: Get Active Providers
```javascript
const providersRef = collection(db, 'service_providers');
const q = query(
  providersRef,
  where('is_active', '==', true)
);
```

### Query 2: Get Providers by Service Type
```javascript
const q = query(
  providersRef,
  where('is_active', '==', true),
  where('service_type', '==', 'cleaning')
);
```

### Query 3: Get Providers with Location
```javascript
// Note: Firestore doesn't support "where field != null"
// So we fetch all and filter client-side
const q = query(
  providersRef,
  where('is_active', '==', true)
);

// Then filter in code:
providers.filter(p => p.latitude != null && p.longitude != null);
```

## 📊 Indexes Required

Firestore needs composite indexes for queries with multiple `where` clauses:

### Index 1: Active Providers by Service Type
```
Collection: service_providers
Fields:
  - is_active (Ascending)
  - service_type (Ascending)
```

**How to Create**:
1. Run a query that needs this index
2. Firebase will show an error with a link
3. Click the link to create the index automatically
4. Or create manually in Firebase Console > Firestore > Indexes

## 🔐 Security Rules

### Recommended Firestore Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /service_providers/{userId} {
      // Providers can read/write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Authenticated users can read active providers (for search)
      allow read: if request.auth != null && 
        resource.data.is_active == true &&
        resource.data.latitude != null &&
        resource.data.longitude != null;
    }
  }
}
```

## 💾 Storage Costs

### Document Size:
- **Basic provider**: ~500 bytes
- **With location**: ~600 bytes
- **With image URL**: ~700 bytes

### Storage Example:
- 1,000 providers = ~600 KB
- 10,000 providers = ~6 MB
- 100,000 providers = ~60 MB

**Note**: Firestore free tier includes 1 GB storage, so location data is very efficient!

## 🔄 Real-Time Updates

### Using onSnapshot:

```javascript
// Listen to provider location changes
const providerRef = doc(db, 'service_providers', userId);
onSnapshot(providerRef, (doc) => {
  const data = doc.data();
  console.log('Location updated:', data.latitude, data.longitude);
});
```

### Update Frequency:
- **Client-side**: Every 5 minutes (configurable)
- **Geolocation watch**: Real-time when available
- **Cloud Function**: Every 5 minutes (scheduled)

## 📝 Best Practices

### 1. **Always Validate Coordinates**
```javascript
if (latitude < -90 || latitude > 90) {
  throw new Error('Invalid latitude');
}
if (longitude < -180 || longitude > 180) {
  throw new Error('Invalid longitude');
}
```

### 2. **Handle Missing Location**
```javascript
if (!provider.latitude || !provider.longitude) {
  // Skip this provider
  return;
}
```

### 3. **Update Timestamps**
```javascript
await updateDoc(docRef, {
  latitude,
  longitude,
  location_updated_at: serverTimestamp(),  // Always use serverTimestamp()
});
```

### 4. **Privacy Considerations**
- Only store location when provider is active
- Allow providers to disable location tracking
- Don't store location history (unless needed)
- Clear location when provider goes offline

## 🎯 Summary

**Firestore stores location as:**
- Simple **Number** fields (`latitude`, `longitude`)
- **Timestamp** for tracking updates
- In the `service_providers` collection
- One document per provider (document ID = userId)

**Key Points:**
- ✅ Numbers, not strings
- ✅ Stored in provider document
- ✅ Updated via `updateDoc()`
- ✅ Queried with `where()` clauses
- ✅ Distance calculated client-side
- ✅ Real-time updates via `onSnapshot()`

