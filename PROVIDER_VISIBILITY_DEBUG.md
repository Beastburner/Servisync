# Provider Visibility Debugging Guide

## Why Providers Don't Appear on Customer Maps

A provider must meet **ALL** of these conditions to appear on customer maps:

### ✅ Required Conditions:

1. **`is_active: true`** ✓
   - Provider must be marked as active
   - Check in Provider Dashboard → Profile tab

2. **Has Location Data** ⚠️ **MOST COMMON ISSUE**
   - `latitude` must be set (not null)
   - `longitude` must be set (not null)
   - Location is set when provider opens dashboard (if permissions granted)

3. **Location Visibility Enabled**
   - `show_location: true` (or undefined, defaults to true)
   - Can be toggled in Provider Dashboard → Profile tab

4. **Within 10km Radius**
   - Provider must be within 10km of customer's search location
   - Distance calculated using Haversine formula

5. **Service Type Match** (if service selected)
   - If customer selects a specific service, provider's `service_type` must match
   - If "all" is selected, all service types are shown

## 🔍 How to Debug

### Step 1: Check Browser Console

Open browser DevTools (F12) and look for these messages:

```
Found X active providers in database
Provider [name] missing location data
Provider [name] has location visibility disabled
Provider [name] is X.XXkm away (outside 10km radius)
Returning X providers within 10km
```

### Step 2: Check Provider Data in Firestore

1. Go to Firebase Console → Firestore Database
2. Open `service_providers` collection
3. Click on provider's document (document ID = userId)
4. Check these fields:

```javascript
{
  is_active: true,           // ✅ Must be true
  latitude: 28.6139,        // ✅ Must have value
  longitude: 77.2090,       // ✅ Must have value
  show_location: true,      // ✅ Should be true (or undefined)
  service_type: "cleaning"  // ✅ Should match customer's search
}
```

### Step 3: Check Provider Dashboard

1. Provider opens their dashboard
2. Go to **Profile** tab
3. Check:
   - **Location Status**: Shows if location is set
   - **Show My Location Toggle**: Should be ON
   - **Current Location**: Should show coordinates

## 🛠️ Common Issues & Solutions

### Issue 1: Location Not Set

**Symptoms**: 
- Provider is active but doesn't appear
- Console shows "Provider missing location data"

**Solution**:
1. Provider opens dashboard (triggers location tracking)
2. Grants location permissions when prompted
3. Or click "Set My Location Now" button in Profile tab

### Issue 2: Location Visibility Disabled

**Symptoms**:
- Provider has location but doesn't appear
- Console shows "Provider has location visibility disabled"

**Solution**:
1. Go to Provider Dashboard → Profile tab
2. Toggle "Show My Location" to ON
3. Location will become visible immediately

### Issue 3: Outside Radius

**Symptoms**:
- Provider has location but doesn't appear
- Console shows "Provider is X.XXkm away (outside 10km radius)"

**Solution**:
- Provider is too far from customer's search location
- Customer needs to search from a different location
- Or increase radius in code (currently 10km)

### Issue 4: Service Type Mismatch

**Symptoms**:
- Provider appears for "all" but not for specific service

**Solution**:
- Check provider's `service_type` matches customer's search
- Update provider's service type if needed

### Issue 5: Location Permissions Denied

**Symptoms**:
- Location never gets set
- "Set My Location Now" button doesn't work

**Solution**:
1. Check browser location permissions
2. Allow location access for the site
3. Try again

## 📊 Debug Checklist

For each provider not appearing, check:

- [ ] `is_active` is `true` in Firestore
- [ ] `latitude` has a value (not null)
- [ ] `longitude` has a value (not null)
- [ ] `show_location` is `true` or `undefined`
- [ ] Provider is within 10km of customer location
- [ ] `service_type` matches (if specific service selected)
- [ ] Browser console shows no errors
- [ ] Location permissions are granted

## 🔧 Quick Fixes

### Fix 1: Set Location Manually

Provider can click "Set My Location Now" in Profile tab, or:

```javascript
// In browser console (as provider)
import { updateServiceProviderLocation } from './lib/supabase';
await updateServiceProviderLocation(userId, 28.6139, 77.2090);
```

### Fix 2: Enable Location Visibility

Provider toggles "Show My Location" to ON in Profile tab.

### Fix 3: Check Distance

Calculate distance manually:
```javascript
// Customer location: Vadodara (22.3072, 73.1812)
// Provider location: Check in Firestore
// Distance must be <= 10km
```

## 🎯 Testing Steps

1. **As Provider**:
   - Open dashboard
   - Check Profile tab
   - Ensure location is set
   - Ensure "Show My Location" is ON

2. **As Customer**:
   - Search for services
   - Check browser console for debug messages
   - Verify provider appears on map

3. **In Firestore**:
   - Verify provider document has all required fields
   - Check location coordinates are valid numbers

## 📝 Notes

- Location updates automatically when provider opens dashboard
- Location tracking requires browser permissions
- Hidden providers (`show_location: false`) won't appear even if active
- Distance calculation is client-side (Haversine formula)
- 10km radius is hardcoded (can be changed in code)

