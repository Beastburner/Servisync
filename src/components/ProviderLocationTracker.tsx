import { useEffect, useRef } from 'react';
import { updateProviderLocationFromGeolocation } from '../lib/supabase';

interface ProviderLocationTrackerProps {
  userId: string;
  isActive: boolean;
  updateInterval?: number; // in milliseconds, default 5 minutes
}

/**
 * Component to track and update provider location regularly
 * Should be used in the Provider Dashboard or when provider is active
 */
export const ProviderLocationTracker: React.FC<ProviderLocationTrackerProps> = ({
  userId,
  isActive,
  updateInterval = 5 * 60 * 1000 // 5 minutes default
}) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || !userId) {
      // Clear any existing tracking
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    // Initial location update - force immediate update
    const updateLocation = async () => {
      try {
        // Force fresh location by setting maximumAge to 0
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              try {
                const { updateServiceProviderLocation } = await import('../lib/supabase');
                const { error } = await updateServiceProviderLocation(userId, latitude, longitude);
                if (error) {
                  console.error('Error updating provider location:', error);
                } else {
                  console.log('Provider location updated immediately:', { latitude, longitude });
                }
              } catch (error) {
                console.error('Error updating location:', error);
              }
            },
            async (error) => {
              console.error('Geolocation error, trying fallback:', error);
              // Fallback to updateProviderLocationFromGeolocation
              const { updateProviderLocationFromGeolocation } = await import('../lib/supabase');
              const { error: fallbackError } = await updateProviderLocationFromGeolocation(userId);
              if (fallbackError) {
                console.error('Error updating provider location (fallback):', fallbackError);
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0 // Force fresh location
            }
          );
        } else {
          // Fallback if geolocation not available
          const { updateProviderLocationFromGeolocation } = await import('../lib/supabase');
          const { error } = await updateProviderLocationFromGeolocation(userId);
          if (error) {
            console.error('Error updating provider location:', error);
          }
        }
      } catch (error) {
        console.error('Error in updateLocation:', error);
      }
    };

    // Update location immediately when component mounts or becomes active
    updateLocation();

    // Set up periodic updates
    intervalRef.current = setInterval(() => {
      updateLocation();
    }, updateInterval);

    // Use geolocation watch for more frequent updates when available
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { updateServiceProviderLocation } = await import('../lib/supabase');
            await updateServiceProviderLocation(userId, latitude, longitude);
          } catch (error) {
            console.error('Error updating location from watch:', error);
          }
        },
        (error) => {
          console.error('Geolocation watch error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // Accept location up to 1 minute old
        }
      );
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [userId, isActive, updateInterval]);

  // This component doesn't render anything
  return null;
};

