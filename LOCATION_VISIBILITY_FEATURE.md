# Location Visibility Feature

## Overview

Providers can now control whether their location is visible to customers searching for services. This gives providers privacy control over their location data.

## How It Works

### For Providers:

1. **Toggle Location Visibility**
   - Go to Provider Dashboard → Profile tab
   - Toggle "Show My Location" switch
   - When ON: Customers can see you on the map
   - When OFF: You're hidden from customer searches

2. **Location Still Tracked**
   - Your location is still updated automatically
   - It's just not visible to customers when toggle is OFF
   - You can turn it back ON anytime

### For Customers:

- Only providers with `show_location: true` appear on the map
- Hidden providers won't show up in search results
- This ensures privacy for providers who don't want to be found

## Database Field

### New Field: `show_location`

**Type**: Boolean  
**Default**: `true` (for new providers)  
**Location**: `service_providers/{userId}` document

```javascript
{
  show_location: true,  // true = visible, false = hidden
  // ... other fields
}
```

## Firestore Query

The query filters providers by:
1. `is_active == true`
2. `show_location == true` (or undefined, defaults to true)
3. Has valid `latitude` and `longitude`
4. Within 10km radius

## UI Components

### Provider Dashboard - Profile Tab

- **Toggle Switch**: ON/OFF for location visibility
- **Status Indicator**: Shows current visibility state
- **Current Location**: Displays coordinates (if available)
- **Provider Info**: Business name, service type, rating, etc.

## Functions Added

### `updateLocationVisibility(userId, showLocation)`

Updates the `show_location` field for a provider.

**Parameters**:
- `userId`: Provider's user ID
- `showLocation`: Boolean (true to show, false to hide)

**Returns**:
- `{ error: null }` on success
- `{ error: Error }` on failure

## Backward Compatibility

- Existing providers without `show_location` field default to `true` (visible)
- This ensures existing providers continue to appear on the map
- New providers get `show_location: true` by default

## Security

- Only the provider themselves can update their location visibility
- Enforced by Firestore security rules
- Location data is still stored, just not shown to customers

## Use Cases

1. **Privacy**: Provider wants to work but not be found by location
2. **Offline**: Provider is not available but wants to keep profile active
3. **Selective Availability**: Provider only wants to be found during certain hours
4. **Testing**: Provider wants to test the app without appearing on map

## Future Enhancements

- Schedule-based visibility (auto-hide during certain hours)
- Location-based visibility (only show in specific areas)
- Temporary hide (auto-show after X hours)
- Visibility analytics (how many customers saw your location)

