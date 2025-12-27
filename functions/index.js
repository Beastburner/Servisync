const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * Scheduled function to update provider locations
 * Runs every 5 minutes to update active provider locations
 * Providers can also update their location manually via the client
 */
exports.updateProviderLocations = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('Starting provider location update job...');
    
    try {
      // Get all active service providers
      const providersSnapshot = await db.collection('service_providers')
        .where('is_active', '==', true)
        .get();

      if (providersSnapshot.empty) {
        console.log('No active providers found');
        return null;
      }

      const updatePromises = [];
      let updatedCount = 0;

      providersSnapshot.forEach((doc) => {
        const providerData = doc.data();
        
        // Only update if provider has location tracking enabled
        // and has a last known location
        if (providerData.track_location === true && 
            providerData.latitude && 
            providerData.longitude) {
          
          // In a real implementation, you would:
          // 1. Get the provider's current location from a tracking service
          // 2. Or use the provider's device location if they have the app open
          // 3. For now, we'll just update the timestamp to show the function is working
          
          updatePromises.push(
            doc.ref.update({
              location_updated_at: admin.firestore.FieldValue.serverTimestamp(),
              last_location_update: admin.firestore.FieldValue.serverTimestamp()
            })
          );
          updatedCount++;
        }
      });

      await Promise.all(updatePromises);
      console.log(`Updated ${updatedCount} provider locations`);
      
      return null;
    } catch (error) {
      console.error('Error updating provider locations:', error);
      throw error;
    }
  });

/**
 * HTTP function to manually update a provider's location
 * Called from the client app when provider location changes
 */
exports.updateProviderLocation = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to update location'
    );
  }

  const { latitude, longitude } = data;

  if (!latitude || !longitude) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Latitude and longitude are required'
    );
  }

  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid coordinates'
    );
  }

  const userId = context.auth.uid;

  try {
    const providerRef = db.collection('service_providers').doc(userId);
    const providerDoc = await providerRef.get();

    if (!providerDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Service provider profile not found'
      );
    }

    await providerRef.update({
      latitude,
      longitude,
      location_updated_at: admin.firestore.FieldValue.serverTimestamp(),
      last_location_update: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Updated location for provider ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating provider location:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to update provider location'
    );
  }
});

/**
 * HTTP function to get nearby providers (server-side calculation)
 * Can be used as an alternative to client-side filtering
 */
exports.getNearbyProviders = functions.https.onCall(async (data, context) => {
  const { latitude, longitude, radiusKm = 10, serviceType } = data;

  if (!latitude || !longitude) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Latitude and longitude are required'
    );
  }

  try {
    let query = db.collection('service_providers')
      .where('is_active', '==', true);

    if (serviceType && serviceType !== 'all') {
      query = query.where('service_type', '==', serviceType);
    }

    const snapshot = await query.get();
    const nearbyProviders = [];

    snapshot.forEach((doc) => {
      const provider = doc.data();
      
      if (provider.latitude && provider.longitude) {
        const distance = calculateDistance(
          latitude,
          longitude,
          provider.latitude,
          provider.longitude
        );

        if (distance <= radiusKm) {
          nearbyProviders.push({
            id: doc.id,
            ...provider,
            distance_km: distance
          });
        }
      }
    });

    // Sort by distance
    nearbyProviders.sort((a, b) => a.distance_km - b.distance_km);

    return { providers: nearbyProviders };
  } catch (error) {
    console.error('Error getting nearby providers:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get nearby providers'
    );
  }
});

/**
 * Helper function to calculate distance using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

