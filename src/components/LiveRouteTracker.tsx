import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import { Navigation, Phone, Clock, Car, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import { subscribeToProviderLocation, generateArrivalOTP, subscribeToBooking } from '../lib/supabase';

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

// Routing machine wrapper
const RoutingMachine: React.FC<{
  providerLocation: [number, number];
  userLocation: [number, number];
  setRouteInfo: (info: { distance: string; duration: string; traffic: string }) => void;
  bookingId: string | null;
  onArrival: () => void;
}> = ({ providerLocation, userLocation, setRouteInfo, bookingId, onArrival }) => {
  const map = useMap();
  const routingControlRef = useRef<L.Routing.Control | null>(null);

  useEffect(() => {
    if (!map) return;

    const createRouting = () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }

      const control = L.Routing.control({
        waypoints: [
          L.latLng(providerLocation[0], providerLocation[1]),
          L.latLng(userLocation[0], userLocation[1]),
        ],
        lineOptions: {
          styles: [{ color: '#4F46E5', weight: 5, opacity: 0.8 }],
        },
        show: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        routeWhileDragging: false,
        createMarker: () => null, // 🚫 prevent default markers
      })
        .on('routesfound', (e: any) => {
          const route = e.routes[0];
          const distanceKm = (route.summary.totalDistance / 1000).toFixed(1);
          const durationMin = Math.round(route.summary.totalTime / 60);
          setRouteInfo({
            distance: `${distanceKm} km`,
            duration: `${durationMin} mins`,
            traffic:
              durationMin < 5
                ? 'Very close'
                : durationMin < 15
                ? 'Light traffic'
                : 'Moderate traffic',
          });
          
          // Check if provider has arrived at doorstep (distance is 0.0km or very close - 10 meters)
          // Using 0.01 km (10 meters) as threshold for doorstep arrival
          const distanceValue = parseFloat(distanceKm);
          console.log('📍 Route found - Distance:', distanceKm, 'km, Value:', distanceValue, 'Booking ID:', bookingId, 'Has callback:', !!onArrival);
          
          if (distanceValue <= 0.01) { // 10 meters = doorstep
            console.log('✅ Provider at doorstep! Distance check passed (<= 0.01km / 10 meters)');
            if (!bookingId) {
              console.warn('⚠️ Booking ID is missing! Cannot generate OTP.');
            } else if (!onArrival) {
              console.warn('⚠️ onArrival callback is missing!');
            } else {
              console.log('🚨 Provider arrived at doorstep! Calling onArrival callback to generate OTP');
              // Call onArrival callback to handle OTP generation in parent component
              onArrival();
            }
          } else {
            console.log('⏳ Provider not yet at doorstep. Distance:', distanceValue.toFixed(3), 'km (', (distanceValue * 1000).toFixed(0), 'meters)');
          }
        })
        .on('routingerror', (e: any) => {
          console.error('Routing error:', e);
          // If routing fails, calculate direct distance as fallback
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
          
          const directDistance = calculateDistance(
            providerLocation[0], providerLocation[1],
            userLocation[0], userLocation[1]
          );
          const distanceKm = directDistance.toFixed(3);
          
          console.log('📍 Direct distance calculation (fallback):', distanceKm, 'km (', (directDistance * 1000).toFixed(0), 'meters)');
          
          // Only generate OTP when provider is at doorstep (0.01 km = 10 meters)
          if (directDistance <= 0.01 && bookingId && onArrival) {
            console.log('🚨 Provider arrived at doorstep (direct distance)! Calling onArrival callback');
            onArrival();
          }
        })
        .addTo(map);

      // 🚫 hide the default itinerary panel
      const panels = document.getElementsByClassName('leaflet-routing-container');
      Array.from(panels).forEach((p: any) => (p.style.display = 'none'));

      routingControlRef.current = control;
    };

    // Initial route
    createRouting();

    // Refresh route every 10 seconds
    const interval = setInterval(() => {
      createRouting();
    }, 10000);

    return () => {
      clearInterval(interval);
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
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
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [trackingAllowed, setTrackingAllowed] = useState<{ allowed: boolean; reason?: string }>({ allowed: false });
  const [arrivalOTP, setArrivalOTP] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string>(booking.status || booking.booking_status || '');
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const otpGeneratedRef = useRef(false);

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

      // Check time restriction based on user type
      // Providers can view map at any time
      // Customers can only view map 30 minutes before scheduled time
      if (isProvider) {
        // Providers can view map at any time
        setTrackingAllowed({ allowed: true });
        return;
      }

      // For customers, check if it's within 30 minutes of scheduled time
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
        
        setTrackingAllowed({ 
          allowed: false, 
          reason: `Map viewing will be available 30 minutes before your scheduled time (${bookingDate} at ${bookingTime}). Currently ${timeStr} away.` 
        });
        return;
      }

      // Tracking is allowed for customers (within 30 minutes)
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
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(serviceAddress)}&limit=1&addressdetails=1`
          );
          
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

    // Subscribe to real-time provider location
    const unsubscribe = subscribeToProviderLocation(providerId, (location) => {
      if (location && location.latitude != null && location.longitude != null) {
        setProviderLocation([location.latitude, location.longitude]);
        setLastUpdateTime(location.updatedAt || new Date());
        console.log('Provider location updated:', location);
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
        setBookingStatus(updatedBooking.status || '');
        if (updatedBooking.arrival_otp) {
          setArrivalOTP(updatedBooking.arrival_otp);
        }
      }
    });
    
    return () => unsubscribe();
  }, [booking.id]);

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
    
    // Check every 5 seconds
    const interval = setInterval(checkDistance, 5000);

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

            {/* Routing */}
            {providerLocation && (
              <RoutingMachine
                providerLocation={providerLocation}
                userLocation={userLocation}
                setRouteInfo={setRouteInfo}
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
