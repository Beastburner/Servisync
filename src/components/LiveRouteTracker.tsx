import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Phone, Clock, Car, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import { subscribeToProviderLocation, generateArrivalOTP, subscribeToBooking, verifyArrivalOTP } from '../lib/supabase';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LiveRouteTrackerProps {
  booking: any;
  onClose: () => void;
  apiKey?: string;
  isProvider?: boolean; // If true, hide OTP display (OTP is for customer only)
}

// Custom icons
const userIcon = new Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#EF4444" viewBox="0 0 24 24">
        <path d="M12 3l9 9-1.5 1.5L18 12.5V20h-5v-5H11v5H6v-7.5l-1.5 1.5L3 12l9-9z"/>
      </svg>
    `),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const providerIcon = new Icon({
 iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#2563EB" viewBox="0 0 24 24">
        <circle cx="12" cy="7" r="5"/>
        <path d="M12 14c-5 0-9 3-9 7v1h18v-1c0-4-4-7-9-7z"/>
      </svg>
    `),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Direct OSRM API call to get route coordinates that follow roads
const RoutingMachine: React.FC<{
  providerLocation: [number, number];
  userLocation: [number, number];
  setRouteInfo: (info: { distance: string; duration: string; traffic: string }) => void;
  setRouteCoordinates: (coords: [number, number][] | null) => void;
  bookingId: string | null;
  onArrival: () => void;
}> = ({ providerLocation, userLocation, setRouteInfo, setRouteCoordinates, bookingId, onArrival }) => {
  const map = useMap();
  const routeRetryRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (!map) return;

    const fetchRoute = async () => {
      console.log('🗺️ Fetching route from OSRM:', {
        provider: [providerLocation[0], providerLocation[1]],
        user: [userLocation[0], userLocation[1]]
      });

      // Try multiple routing services in order of preference
      // 1. OpenRouteService (free tier, good CORS support)
      // 2. OSRM with CORS proxy
      // 3. Direct OSRM (may timeout)
      
      const coordinates = `${userLocation[1]},${userLocation[0]};${providerLocation[1]},${providerLocation[0]}`;
      
      // Try OpenRouteService first (free, no API key needed for basic usage)
      let url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248e8b0e3c8b8c84c4da8c64b3c9b8c84c4d&coordinates=${coordinates}&geometry=true&geometry_format=geojson`;
      
      try {
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        let response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        // If OpenRouteService fails, try OSRM with CORS proxy
        if (!response.ok) {
          console.log('⚠️ OpenRouteService failed, trying OSRM...');
          const osrmCoordinates = `${userLocation[1]},${userLocation[0]};${providerLocation[1]},${providerLocation[0]}`;
          // Use a CORS proxy for OSRM
          url = `https://cors-anywhere.herokuapp.com/https://router.project-osrm.org/route/v1/driving/${osrmCoordinates}?overview=full&geometries=geojson&alternatives=false`;
          
          const osrmController = new AbortController();
          const osrmTimeoutId = setTimeout(() => osrmController.abort(), 8000);
          
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            signal: osrmController.signal,
          });
          
          clearTimeout(osrmTimeoutId);
        }

        if (!response.ok) {
          throw new Error(`OSRM API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Handle OpenRouteService response format
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          routeRetryRef.current = 0; // Reset retry counter on success

          // Extract coordinates from GeoJSON geometry
          // OpenRouteService returns coordinates as [lng, lat] pairs in GeoJSON format
          const geometry = route.geometry;
          let routeCoords: [number, number][] = [];

          if (geometry && geometry.coordinates && Array.isArray(geometry.coordinates)) {
            routeCoords = geometry.coordinates.map((coord: [number, number]) => {
              // Convert from [lng, lat] to [lat, lng] for Leaflet
              return [coord[1], coord[0]] as [number, number];
            });

            if (routeCoords.length > 0) {
              setRouteCoordinates(routeCoords);
              console.log('✅ Route coordinates extracted from OpenRouteService:', routeCoords.length, 'points');
              console.log('📍 First point:', routeCoords[0], 'Last point:', routeCoords[routeCoords.length - 1]);
            }
          }

          // Extract distance and duration (OpenRouteService format)
          const distanceMeters = route.summary?.distance || route.distance || 0;
          const durationSeconds = route.summary?.duration || route.duration || 0;
          const distanceKm = (distanceMeters / 1000).toFixed(1);
          const durationMin = Math.round(durationSeconds / 60);

          setRouteInfo({
            distance: `${distanceKm} km`,
            duration: `${durationMin} mins`,
            traffic: durationMin < 5 ? 'Very close' : durationMin < 15 ? 'Light traffic' : 'Moderate traffic',
          });

          // Check for arrival
          const distanceValue = parseFloat(distanceKm);
          if (distanceValue <= 0.01 && bookingId && onArrival) {
            console.log('🚨 Provider arrived at doorstep!');
            onArrival();
          }
        } 
        // Handle OSRM response format (fallback)
        else if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          routeRetryRef.current = 0;

          const geometry = route.geometry;
          let routeCoords: [number, number][] = [];

          if (geometry && geometry.coordinates && Array.isArray(geometry.coordinates)) {
            routeCoords = geometry.coordinates.map((coord: [number, number]) => {
              return [coord[1], coord[0]] as [number, number];
            });

            if (routeCoords.length > 0) {
              setRouteCoordinates(routeCoords);
              console.log('✅ Route coordinates extracted from OSRM:', routeCoords.length, 'points');
            }
          }

          const distanceMeters = route.distance || 0;
          const durationSeconds = route.duration || 0;
          const distanceKm = (distanceMeters / 1000).toFixed(1);
          const durationMin = Math.round(durationSeconds / 60);

          setRouteInfo({
            distance: `${distanceKm} km`,
            duration: `${durationMin} mins`,
            traffic: durationMin < 5 ? 'Very close' : durationMin < 15 ? 'Light traffic' : 'Moderate traffic',
          });

          const distanceValue = parseFloat(distanceKm);
          if (distanceValue <= 0.01 && bookingId && onArrival) {
            console.log('🚨 Provider arrived at doorstep!');
            onArrival();
          }
        } else {
          throw new Error(`Routing service returned error: ${data.error?.message || data.code || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.warn('⚠️ Routing service error, using fallback:', error);

        // Fallback to direct distance calculation
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };

        const directDistance = calculateDistance(
          providerLocation[0], providerLocation[1],
          userLocation[0], userLocation[1]
        );
        const distanceKm = directDistance.toFixed(1);
        const estimatedMinutes = Math.round((directDistance / 30) * 60);

        setRouteInfo({
          distance: `${distanceKm} km`,
          duration: `${estimatedMinutes} mins`,
          traffic: estimatedMinutes < 15 ? 'Light traffic' : 'Moderate traffic',
        });

        // Use direct line as fallback
        setRouteCoordinates(null);

        // Check for arrival
        if (directDistance <= 0.01 && bookingId && onArrival) {
          console.log('🚨 Provider arrived at doorstep (fallback)!');
          onArrival();
        }

        // Retry routing after delay if under max retries
        if (routeRetryRef.current < MAX_RETRIES) {
          routeRetryRef.current++;
          setTimeout(() => {
            console.log(`🔄 Retrying route (attempt ${routeRetryRef.current}/${MAX_RETRIES})...`);
            fetchRoute();
          }, 5000 * routeRetryRef.current); // Exponential backoff
        }
      }
    };

    // Initial route fetch
    fetchRoute();

    // Refresh route every 60 seconds (longer interval to avoid rate limiting)
    const interval = setInterval(() => {
      routeRetryRef.current = 0; // Reset retry counter
      fetchRoute();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [map, providerLocation, userLocation, bookingId, onArrival]);

  return null;
};

export const LiveRouteTracker: React.FC<LiveRouteTrackerProps> = ({
  booking,
  onClose,
  isProvider = false,
}) => {
  const [providerLocation, setProviderLocation] = useState<[number, number] | null>(
    null
  );
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeInfo, setRouteInfo] = useState({
    distance: '—',
    duration: '—',
    traffic: 'Fetching...',
  });
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [trackingAllowed, setTrackingAllowed] = useState<{ allowed: boolean; reason?: string }>({ allowed: false });
  const [arrivalOTP, setArrivalOTP] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string>(booking.status || booking.booking_status || '');
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const otpGeneratedRef = useRef(false);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [isRequestingOTP, setIsRequestingOTP] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);

  // Get booking ID - check multiple possible fields
  const bookingId = booking.id || booking.booking_id || null;
  
  // Get provider ID from booking
  const providerId = booking.provider_id || booking.provider?.id || null;
  
  // Debug: Log booking object structure
  useEffect(() => {
    console.log('📋 Booking object:', {
      id: booking.id,
      booking_id: booking.booking_id,
      bookingId: bookingId,
      status: booking.status || booking.booking_status,
    });
  }, [booking, bookingId]);

  // Check if tracking is allowed based on booking status and scheduled time
  useEffect(() => {
    const checkTrackingAllowed = () => {
      // Check booking status
      const status = booking.status || booking.booking_status;
      
      // If provider has started the service, allow tracking immediately
      if (status === 'in-progress') {
        setTrackingAllowed({ allowed: true });
        return;
      }
      
      // Only allow tracking for accepted, scheduled, in-progress, or arrived bookings
      if (!['accepted', 'scheduled', 'in-progress', 'arrived'].includes(status)) {
        if (status === 'pending') {
          setTrackingAllowed({ 
            allowed: false, 
            reason: 'Waiting for provider to accept your booking request' 
          });
          return;
        } else if (status === 'rejected') {
          setTrackingAllowed({ 
            allowed: false, 
            reason: 'This booking has been rejected by the provider' 
          });
          return;
        } else if (status === 'completed') {
          setTrackingAllowed({ 
            allowed: false, 
            reason: 'This service has already been completed' 
          });
          return;
        } else {
          setTrackingAllowed({ 
            allowed: false, 
            reason: `Tracking not available for status: ${status}` 
          });
          return;
        }
      }

      // Check scheduled date and time
      const bookingDate = booking.booking_date || booking.date || booking.bookingDate;
      const bookingTime = booking.booking_time || booking.time || booking.bookingTime;
      
      if (!bookingDate || !bookingTime) {
        setTrackingAllowed({ 
          allowed: true, 
          reason: 'No scheduled time found, tracking enabled' 
        });
        return;
      }

      // Parse booking date and time
      let scheduledDateTime: Date | null = null;
      try {
        // Try to parse the date (format: YYYY-MM-DD or DD-MM-YYYY)
        const dateParts = bookingDate.includes('-') ? bookingDate.split('-') : [];
        let year, month, day;
        
        if (dateParts.length === 3) {
          // Check if it's YYYY-MM-DD or DD-MM-YYYY
          if (dateParts[0].length === 4) {
            [year, month, day] = dateParts;
          } else {
            [day, month, year] = dateParts;
          }
        } else {
          // Try parsing as ISO string
          scheduledDateTime = new Date(bookingDate);
        }
        
        if (!scheduledDateTime && year && month && day) {
          // Parse time (format: "10:00 AM" or "HH:MM")
          const timeMatch = bookingTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const period = timeMatch[3]?.toUpperCase();
            
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            
            scheduledDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, minutes);
          }
        }
      } catch (e) {
        console.error('Error parsing booking date/time:', e);
        setTrackingAllowed({ 
          allowed: true, 
          reason: 'Could not parse scheduled time, tracking enabled' 
        });
        return;
      }

      if (!scheduledDateTime) {
        setTrackingAllowed({ 
          allowed: true, 
          reason: 'Invalid scheduled time format, tracking enabled' 
        });
        return;
      }

      // Check time restriction - both providers and customers can only view map 30 minutes before scheduled time
      // Exception: If service is in-progress, allow tracking immediately
      const now = new Date();
      const timeDiff = scheduledDateTime.getTime() - now.getTime();
      const minutesUntilScheduled = timeDiff / (1000 * 60);

      if (minutesUntilScheduled > 30) {
        const hoursUntil = Math.floor(minutesUntilScheduled / 60);
        const minsUntil = Math.floor(minutesUntilScheduled % 60);
        let timeStr = '';
        if (hoursUntil > 0) {
          timeStr = `${hoursUntil} hour${hoursUntil > 1 ? 's' : ''} ${minsUntil > 0 ? `${minsUntil} min${minsUntil > 1 ? 's' : ''}` : ''}`;
        } else {
          timeStr = `${minsUntil} minute${minsUntil > 1 ? 's' : ''}`;
        }
        
        const userType = isProvider ? 'Map viewing' : 'Map viewing';
        setTrackingAllowed({ 
          allowed: false, 
          reason: `${userType} will be available 30 minutes before the scheduled time (${bookingDate} at ${bookingTime}). Currently ${timeStr} away.` 
        });
        return;
      }

      // Tracking is allowed (within 30 minutes or service in-progress)
      setTrackingAllowed({ allowed: true });
    };

    checkTrackingAllowed();
    
    // Re-check every minute to update the countdown
    const interval = setInterval(checkTrackingAllowed, 60000);
    
    return () => clearInterval(interval);
  }, [booking, isProvider]);

  // Get user location from booking or geolocation
  useEffect(() => {
    const getUserLocation = async () => {
      // Try to get user location from booking first (if stored)
      if (booking.user_latitude && booking.user_longitude) {
        setUserLocation([booking.user_latitude, booking.user_longitude]);
        setIsGettingLocation(false);
        return;
      }

      // Try to geocode service address if available
      const serviceAddress = booking.service_address || booking.address;
      if (serviceAddress) {
        try {
          setIsGettingLocation(true);
          // Use Nominatim with CORS proxy
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(serviceAddress)}&limit=1&addressdetails=1`;
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(nominatimUrl)}`;
          
          const response = await fetch(proxyUrl, {
            headers: {
              'User-Agent': 'Servisync/1.0'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              setUserLocation([lat, lng]);
              setIsGettingLocation(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error geocoding service address:', error);
        } finally {
          setIsGettingLocation(false);
        }
      }

      // Fallback to geolocation API
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            setUserLocation([userLat, userLng]);
            setIsGettingLocation(false);
          },
          (error) => {
            console.error('Error getting user location:', error);
            // Don't use default location - show error instead
            setIsGettingLocation(false);
            alert('Unable to get your location. Please enable location permissions or ensure your service address is correct.');
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        // Geolocation not supported - show error
        setIsGettingLocation(false);
        alert('Geolocation is not supported by your browser. Please ensure your service address is correct.');
      }
    };

    getUserLocation();
  }, [booking]);

  // Subscribe to real-time provider location updates
  useEffect(() => {
    if (!providerId) {
      console.error('LiveRouteTracker: No provider ID found in booking');
      setIsGettingLocation(false);
      return;
    }

    console.log('Subscribing to provider location updates for:', providerId);

    // Debounce location updates to prevent too frequent updates
    let lastUpdateTimestamp = 0;
    const MIN_UPDATE_INTERVAL = 5000; // Minimum 5 seconds between updates

    // Subscribe to real-time provider location
    const unsubscribe = subscribeToProviderLocation(providerId, (location) => {
      if (location && location.latitude != null && location.longitude != null) {
        const now = Date.now();
        
        // Only update if enough time has passed since last update
        if (now - lastUpdateTimestamp >= MIN_UPDATE_INTERVAL) {
          setProviderLocation([location.latitude, location.longitude]);
          const updateTime = location.updatedAt ? new Date(location.updatedAt) : new Date();
          setLastUpdateTime(updateTime);
          lastUpdateTimestamp = now;
          console.log('Provider location updated:', {
            lat: location.latitude,
            lng: location.longitude,
            updatedAt: updateTime.toISOString()
          });
        } else {
          console.log('Location update skipped (too frequent):', now - lastUpdateTimestamp, 'ms ago');
        }
      } else {
        console.warn('Provider location is null or invalid');
        setProviderLocation(null);
      }
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [providerId]);

  // Subscribe to booking status updates to get OTP
  useEffect(() => {
    if (!booking.id) return;
    
    const unsubscribe = subscribeToBooking(booking.id, (updatedBooking) => {
      if (updatedBooking) {
        const newStatus = updatedBooking.status || '';
        setBookingStatus(newStatus);
        if (updatedBooking.arrival_otp) {
          setArrivalOTP(updatedBooking.arrival_otp);
        }
        // Show OTP input for providers when status is 'arrived' (OTP may be generated separately)
        if (isProvider && newStatus === 'arrived') {
          setShowOTPInput(true);
        }
      }
    });
    
    return () => unsubscribe();
  }, [booking.id, isProvider]);

  // Continuous distance check (independent of routing service)
  useEffect(() => {
    if (!providerLocation || !userLocation || !bookingId || otpGeneratedRef.current) {
      return;
    }

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Radius of the Earth in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const checkDistance = () => {
      const directDistance = calculateDistance(
        providerLocation[0], providerLocation[1],
        userLocation[0], userLocation[1]
      );
      
      // Update current distance for manual OTP request button
      setCurrentDistance(directDistance);
      
      console.log('📏 Direct distance check:', directDistance.toFixed(3), 'km (', (directDistance * 1000).toFixed(0), 'meters)');
      
      // Only generate OTP when provider is at doorstep (0.01 km = 10 meters)
      if (directDistance <= 0.01 && bookingId && !otpGeneratedRef.current) {
        console.log('🚨 Provider arrived at doorstep (direct distance check)! Generating OTP for booking:', bookingId);
        otpGeneratedRef.current = true;
        generateArrivalOTP(bookingId).then((result) => {
          if (result.data && result.data.otp) {
            setArrivalOTP(result.data.otp);
            setBookingStatus('arrived');
            console.log('✅ OTP generated successfully:', result.data.otp);
          } else if (result.error) {
            console.error('❌ Error generating OTP:', result.error);
            otpGeneratedRef.current = false; // Reset to allow retry
          }
        }).catch((error) => {
          console.error('❌ Exception generating OTP:', error);
          otpGeneratedRef.current = false; // Reset to allow retry
        });
      }
    };

    // Check immediately
    checkDistance();
    
    // Check every 10 seconds (reduced frequency to prevent too fast updates)
    const interval = setInterval(checkDistance, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [providerLocation, userLocation, bookingId]);

  if (isGettingLocation || !userLocation) {
    return (
      <div className="fixed inset-0 bg-white z-[10050] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Loading tracking data...</h3>
          <p className="text-gray-600">
            {!userLocation ? 'Getting your location...' : 'Waiting for provider location...'}
          </p>
        </div>
      </div>
    );
  }

  // Check if tracking is allowed
  if (!trackingAllowed.allowed) {
    return (
      <div className="fixed inset-0 bg-white z-[10050] flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Tracking Not Available</h3>
          <p className="text-gray-600 mb-4">
            {trackingAllowed.reason || 'Tracking is not available at this time.'}
          </p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!providerLocation) {
    return (
      <div className="fixed inset-0 bg-white z-[10050] flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="h-8 w-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Provider Location Unavailable</h3>
          <p className="text-gray-600 mb-4">
            The provider's location is not available yet. They may not have shared their location.
          </p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate center point for map (between user and provider)
  const mapCenter = userLocation && providerLocation
    ? [
        (userLocation[0] + providerLocation[0]) / 2,
        (userLocation[1] + providerLocation[1]) / 2
      ]
    : userLocation || providerLocation || [22.3072, 73.1812];

  return (
    <div className="fixed inset-0 bg-white z-[10050] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <button
          onClick={onClose}
          className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <h2 className="text-lg font-semibold">Live Route Tracking</h2>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Live</span>
        </div>
      </div>

      {/* Map (Full Screen) */}
      <div className="flex-1 relative">
        {userLocation && (
          <MapContainer 
            center={mapCenter as [number, number]} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            key={`${userLocation[0]}-${userLocation[1]}-${providerLocation?.[0]}-${providerLocation?.[1]}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User Location Marker */}
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold">Your Location</p>
                  <p className="text-xs text-gray-600">{booking.service_address || booking.address || 'Service Location'}</p>
                </div>
              </Popup>
            </Marker>

            {/* Provider Location Marker */}
            {providerLocation && (
              <Marker position={providerLocation} icon={providerIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">{booking.provider?.name || 'Provider'}</p>
                    <p className="text-xs text-gray-600">On the way</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route Line - Show proper road route if available, otherwise direct line */}
            {/* Note: The routing control also draws its own line, but we use Polyline for better control */}
            {providerLocation && userLocation && routeCoordinates && routeCoordinates.length > 0 && (
              <Polyline
                positions={routeCoordinates}
                pathOptions={{
                  color: '#2563EB',
                  weight: 8,
                  opacity: 0.95,
                  dashArray: undefined // Solid blue line for road route
                }}
              />
            )}
            {/* Fallback direct line if routing failed */}
            {providerLocation && userLocation && (!routeCoordinates || routeCoordinates.length === 0) && (
              <Polyline
                positions={[providerLocation, userLocation]}
                pathOptions={{
                  color: '#2563EB',
                  weight: 6,
                  opacity: 0.7,
                  dashArray: '10, 10' // Dashed line for direct/fallback
                }}
              />
            )}

            {/* Routing - Get proper road route */}
            {providerLocation && (
              <RoutingMachine
                providerLocation={providerLocation}
                userLocation={userLocation}
                setRouteInfo={setRouteInfo}
                setRouteCoordinates={setRouteCoordinates}
                bookingId={bookingId}
                onArrival={async () => {
                  if (!otpGeneratedRef.current && bookingId) {
                    otpGeneratedRef.current = true;
                    console.log('🚨 Provider arrived! Generating OTP for booking:', bookingId);
                    try {
                      const result = await generateArrivalOTP(bookingId);
                      if (result.data && result.data.otp) {
                        setArrivalOTP(result.data.otp);
                        setBookingStatus('arrived');
                        console.log('✅ OTP generated successfully:', result.data.otp);
                      } else if (result.error) {
                        console.error('❌ Error generating OTP:', result.error);
                        otpGeneratedRef.current = false; // Reset to allow retry
                      }
                    } catch (error) {
                      console.error('❌ Exception generating OTP:', error);
                      otpGeneratedRef.current = false; // Reset to allow retry
                    }
                  }
                }}
              />
            )}
          </MapContainer>
        )}
      </div>

      {/* Bottom Info Panel */}
      <div className="bg-white border-t shadow-lg p-4">
        {/* Route Info */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Route Information</h3>
            <span className="text-sm text-green-600 font-medium bg-green-100 px-3 py-1 rounded-full">
              {routeInfo.traffic}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center space-x-2 mb-1">
                <Navigation className="h-5 w-5 text-blue-600" />
                <span className="text-xs text-gray-600 uppercase tracking-wide">Distance</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{routeInfo.distance}</span>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="h-5 w-5 text-green-600" />
                <span className="text-xs text-gray-600 uppercase tracking-wide">Estimated Time</span>
              </div>
              <span className="text-xl font-bold text-gray-900">{routeInfo.duration}</span>
            </div>
          </div>
        </div>

        {/* Provider Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center space-x-4">
            <img
              src={booking.provider?.image || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'}
              alt={booking.provider?.name || 'Provider'}
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">{booking.provider?.name || 'Provider'}</h3>
              <p className="text-gray-600">{booking.service || booking.service_type || 'Service'}</p>
              <div className="flex items-center space-x-4 mt-2">
                {bookingStatus === 'arrived' ? (
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">Provider has arrived!</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-1">
                      <Car className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-700 font-medium">On the way</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700 font-medium">
                        Arriving in {routeInfo.duration}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <button 
              className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition-colors shadow-md"
              onClick={() => {
                const phone = booking.provider?.phone || booking.customer_phone;
                if (phone) {
                  window.open(`tel:${phone}`);
                }
              }}
            >
              <Phone className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Manual OTP Request Button for Providers - Show when close but OTP not generated */}
        {isProvider && 
         bookingStatus !== 'arrived' && 
         bookingStatus !== 'in-progress' && 
         currentDistance !== null && 
         currentDistance <= 0.05 && 
         !otpGeneratedRef.current && (
          <div className="mt-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border-2 border-orange-400">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <Shield className="h-6 w-6 text-orange-600" />
              <h4 className="text-lg font-bold text-orange-800">At Location - Request OTP</h4>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-700 mb-3">
                You're at the customer location ({currentDistance ? (currentDistance * 1000).toFixed(0) : '0'}m away). 
                If OTP wasn't generated automatically due to routing issues, you can request it manually.
              </p>
              <button
                onClick={async () => {
                  if (!bookingId) {
                    alert('Booking ID not found. Please try again.');
                    return;
                  }
                  
                  setIsRequestingOTP(true);
                  try {
                    const result = await generateArrivalOTP(bookingId);
                    if (result.data && result.data.otp) {
                      setArrivalOTP(result.data.otp);
                      setBookingStatus('arrived');
                      otpGeneratedRef.current = true;
                      setShowOTPInput(true);
                      alert(`✅ OTP generated successfully! Please ask the customer for OTP: ${result.data.otp}`);
                      console.log('✅ OTP generated manually:', result.data.otp);
                    } else if (result.error) {
                      console.error('❌ Error generating OTP:', result.error);
                      alert(`Error generating OTP: ${result.error instanceof Error ? result.error.message : 'Unknown error'}. Please try again.`);
                    }
                  } catch (error) {
                    console.error('❌ Exception generating OTP:', error);
                    alert('Error generating OTP. Please try again.');
                  } finally {
                    setIsRequestingOTP(false);
                  }
                }}
                disabled={isRequestingOTP || !bookingId}
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isRequestingOTP ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Generating OTP...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    <span>Request OTP from Customer</span>
                  </>
                )}
              </button>
              <p className="text-xs text-gray-600 mt-2">
                After requesting, ask the customer for the OTP and verify it to start the service.
              </p>
            </div>
          </div>
        )}

        {/* OTP Verification Input for Providers - Show when OTP is available */}
        {isProvider && 
         bookingStatus === 'arrived' && 
         showOTPInput && (
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-500">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <h4 className="text-lg font-bold text-blue-800">Verify OTP & Start Service</h4>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-700 mb-3">
                Ask the customer for the OTP and enter it below to verify arrival and start the service.
              </p>
              <div className="mb-3">
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpInput(value);
                  }}
                  placeholder="Enter 6-digit OTP"
                  className="w-full p-3 text-center text-2xl font-bold tracking-widest border-2 border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={6}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowOTPInput(false);
                    setOtpInput('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (otpInput.length !== 6) {
                      alert('Please enter a 6-digit OTP');
                      return;
                    }

                    if (!bookingId) {
                      alert('Booking ID not found. Please try again.');
                      return;
                    }

                    setIsVerifyingOTP(true);
                    try {
                      const result = await verifyArrivalOTP(bookingId, otpInput);
                      if (result.error) {
                        alert(`OTP verification failed: ${result.error instanceof Error ? result.error.message : 'Invalid OTP. Please try again.'}`);
                        setOtpInput('');
                      } else {
                        alert('✅ OTP verified successfully! Service started.');
                        setBookingStatus('in-progress');
                        setShowOTPInput(false);
                        setOtpInput('');
                        console.log('✅ OTP verified, service started');
                      }
                    } catch (error: any) {
                      console.error('Error verifying OTP:', error);
                      alert('Error verifying OTP. Please try again.');
                    } finally {
                      setIsVerifyingOTP(false);
                    }
                  }}
                  disabled={otpInput.length !== 6 || isVerifyingOTP || !bookingId}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isVerifyingOTP ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Verify & Start Service</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OTP Display when provider arrives - Only show to customers, not providers */}
        {arrivalOTP && bookingStatus === 'arrived' && !isProvider && (
          <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-500">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <Shield className="h-6 w-6 text-green-600" />
              <h4 className="text-lg font-bold text-green-800">Provider Has Arrived!</h4>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-700 mb-2">Share this OTP with the provider to verify arrival:</p>
              <div className="bg-white rounded-lg p-4 border-2 border-green-500">
                <p className="text-3xl font-bold text-green-600 tracking-widest">{arrivalOTP}</p>
              </div>
              <p className="text-xs text-gray-600 mt-2">Provider will verify this OTP to start the service</p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="mt-3 text-center">
          <div className="text-sm text-gray-600">
            {bookingStatus === 'arrived' ? (
              <span className="text-green-600 font-medium">
                {isProvider ? '✓ You have arrived at the customer location' : '✓ Provider has arrived at your location'}
              </span>
            ) : bookingStatus === 'in-progress' ? (
              <span className="text-blue-600 font-medium">
                {isProvider ? '✓ Service is in progress' : '✓ Service is in progress'}
              </span>
            ) : providerLocation ? (
              <span className="text-green-600 font-medium">
                {isProvider ? '✓ You are moving towards the customer location' : '✓ Provider is moving towards your location'}
              </span>
            ) : (
              <span className="text-yellow-600 font-medium">
                {isProvider ? '⏳ Waiting for your location...' : '⏳ Waiting for provider location...'}
              </span>
            )}
          </div>
          {lastUpdateTime && (
            <div className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdateTime.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
