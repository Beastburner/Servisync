import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Star, Phone, Navigation, Clock, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { BookingModal } from './BookingModal';
import { ProviderProfileModal } from './ProviderProfileModal';
import { getNearbyServiceProviders, createBooking, subscribeToProviderLocation } from '../lib/supabase';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ServiceProvider {
  id: string;
  name: string;
  rating: number;
  distance: string;
  eta: string;
  price: string;
  service: string;
  phone: string;
  coordinates: { lat: number; lng: number };
  image: string;
  services?: Array<{ id: string; name: string; price: number; description?: string; service_type: string }>;
}

interface ServiceAreaMapProps {
  location: { lat: number; lng: number };
  apiKey?: string; // Not needed for Leaflet but keeping for compatibility
  selectedService: string;
  userId?: string; // Current user ID for booking creation
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
  iconSize: [32, 32],
  iconAnchor: [16, 16],
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
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Component to handle map centering
const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  
  return null;
};

export const ServiceAreaMap: React.FC<ServiceAreaMapProps> = ({ location, selectedService, userId }) => {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingProvider, setBookingProvider] = useState<ServiceProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Filter & sort state
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'price'>('distance');
  const [onlyTopRated, setOnlyTopRated] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch real service providers from Firestore
  useEffect(() => {
    const fetchProviders = async () => {
      setIsLoading(true);
      try {
        const { data: providersData, error } = await getNearbyServiceProviders(
          location.lat,
          location.lng,
          10, // 10km radius
          selectedService === 'all' ? undefined : selectedService
        );

        if (error) {
          console.error('Error fetching providers:', error);
          setProviders([]);
          return;
        }

        // Transform Firestore data to ServiceProvider format
        const transformedProviders: ServiceProvider[] = providersData.map((provider: any) => {
          const distanceKm = provider.distance_km || 0;
          const distanceStr = distanceKm < 1 
            ? `${Math.round(distanceKm * 1000)}m` 
            : `${distanceKm.toFixed(1)} km`;
          
          // Estimate ETA (roughly 1 minute per 100m + 5 minutes base)
          const etaMinutes = Math.round(distanceKm * 10 + 5);
          const etaStr = `${etaMinutes} min`;

          // Get price from provider's services array if available, otherwise use default
          let price = '₹299'; // Default fallback
          
          // Check if provider has a services array with prices
          if (provider.services && Array.isArray(provider.services) && provider.services.length > 0) {
            // Find service matching the selected service type
            const matchingService = provider.services.find((s: any) => 
              s.name.toLowerCase().includes(selectedService.toLowerCase()) || 
              selectedService === 'all'
            );
            
            if (matchingService && matchingService.price) {
              price = `₹${matchingService.price}`;
            } else if (provider.services[0] && provider.services[0].price) {
              // Use first service price if no match found
              price = `₹${provider.services[0].price}`;
            }
          } else if (provider.price) {
            // Fallback to provider.price field if services array doesn't exist
            price = typeof provider.price === 'string' ? provider.price : `₹${provider.price}`;
          } else {
            // Default price based on service type
            const defaultPrices: { [key: string]: string } = {
              'cleaning': '₹299',
              'repair': '₹319',
              'beauty': '₹279',
              'fitness': '₹349',
              'electrical': '₹399',
              'plumbing': '₹379',
              'painting': '₹449',
              'appliance': '₹329'
            };
            price = defaultPrices[provider.service_type] || '₹299';
          }

          // ALWAYS use user_id (Firebase Auth UID) as the primary identifier
          // The document ID should match user_id, but user_id is the source of truth
          const providerId = provider.user_id || provider.id;
          console.log('Transforming provider for display:', {
            originalId: provider.id,
            originalUserId: provider.user_id,
            finalId: providerId,
            business_name: provider.business_name,
            note: 'Using user_id (Firebase Auth UID) as primary identifier'
          });
          
          return {
            id: providerId, // Use Firebase Auth UID (user_id) as the ID
            user_id: provider.user_id || providerId, // Firebase Auth UID - this is what we'll use for booking
            name: provider.business_name || 'Service Provider',
            rating: provider.rating || 0,
            distance: distanceStr,
            eta: etaStr,
            price: price,
            service: provider.service_type || 'Service',
            phone: provider.phone || '',
            coordinates: {
              lat: provider.latitude,
              lng: provider.longitude
            },
            image: provider.image || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
            services: provider.services || [] // Include provider's services array
          };
        });

        setProviders(transformedProviders);
      } catch (error) {
        console.error('Error in fetchProviders:', error);
        setProviders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviders();
  }, [location.lat, location.lng, selectedService]);

  // Filtered + sorted provider list
  const displayedProviders = useMemo(() => {
    let list = [...providers];
    if (onlyTopRated) list = list.filter(p => p.rating >= 4);
    list.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price') {
        const aPrice = parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0;
        const bPrice = parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0;
        return aPrice - bPrice;
      }
      // distance (default) — already sorted by API
      const aDist = parseFloat(a.distance) || 0;
      const bDist = parseFloat(b.distance) || 0;
      return aDist - bDist;
    });
    return list;
  }, [providers, sortBy, onlyTopRated]);

  // Subscribe to real-time location updates for all visible providers
  useEffect(() => {
    if (providers.length === 0) {
      console.log('📍 No providers to subscribe to');
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const providerIds = providers.map(p => p.user_id || p.id).filter(Boolean);

    console.log('📍 Setting up real-time location subscriptions for providers:', providerIds);
    console.log('📍 Current provider locations:', providers.map(p => ({
      id: p.user_id || p.id,
      lat: p.coordinates.lat,
      lng: p.coordinates.lng
    })));

    // Subscribe to location updates for each provider
    providerIds.forEach((providerId) => {
      if (providerId) {
        const unsubscribe = subscribeToProviderLocation(providerId, (newLocation) => {
          if (newLocation && newLocation.latitude != null && newLocation.longitude != null) {
            console.log(`🔄 Real-time location update for provider ${providerId}:`, {
              lat: newLocation.latitude,
              lng: newLocation.longitude,
              updatedAt: newLocation.updatedAt
            });
            
            // Update the provider's coordinates and recalculate distance
            setProviders((prevProviders) => {
              return prevProviders.map((p) => {
                const pId = p.user_id || p.id;
                if (pId === providerId) {
                  // Recalculate distance with new coordinates
                  const R = 6371; // Earth's radius in kilometers
                  const dLat = (newLocation.latitude - location.lat) * Math.PI / 180;
                  const dLon = (newLocation.longitude - location.lng) * Math.PI / 180;
                  const a = 
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(location.lat * Math.PI / 180) * Math.cos(newLocation.latitude * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  const distanceKm = R * c;
                  
                  const distanceStr = distanceKm < 1 
                    ? `${Math.round(distanceKm * 1000)}m` 
                    : `${distanceKm.toFixed(1)} km`;
                  
                  const etaMinutes = Math.round(distanceKm * 10 + 5);
                  const etaStr = `${etaMinutes} min`;

                  console.log(`✅ Updated provider ${providerId} location on map:`, {
                    old: { lat: p.coordinates.lat, lng: p.coordinates.lng },
                    new: { lat: newLocation.latitude, lng: newLocation.longitude },
                    distance: distanceStr
                  });

                  return {
                    ...p,
                    coordinates: {
                      lat: newLocation.latitude,
                      lng: newLocation.longitude
                    },
                    distance: distanceStr,
                    eta: etaStr
                  };
                }
                return p;
              });
            });
          } else {
            console.warn(`⚠️ Invalid location update for provider ${providerId}:`, newLocation);
          }
        });
        unsubscribes.push(unsubscribe);
      }
    });

    // Also set up periodic refetch to ensure we have the latest data (every 30 seconds)
    const refetchInterval = setInterval(async () => {
      try {
        const { data: providersData, error } = await getNearbyServiceProviders(
          location.lat,
          location.lng,
          10,
          selectedService === 'all' ? undefined : selectedService
        );

        if (!error && providersData) {
          const transformedProviders: ServiceProvider[] = providersData.map((provider: any) => {
            const distanceKm = provider.distance_km || 0;
            const distanceStr = distanceKm < 1 
              ? `${Math.round(distanceKm * 1000)}m` 
              : `${distanceKm.toFixed(1)} km`;
            const etaMinutes = Math.round(distanceKm * 10 + 5);
            const etaStr = `${etaMinutes} min`;

            let price = '₹299';
            if (provider.services && Array.isArray(provider.services) && provider.services.length > 0) {
              const matchingService = provider.services.find((s: any) => 
                s.name.toLowerCase().includes(selectedService.toLowerCase()) || 
                selectedService === 'all'
              );
              if (matchingService && matchingService.price) {
                price = `₹${matchingService.price}`;
              } else if (provider.services[0] && provider.services[0].price) {
                price = `₹${provider.services[0].price}`;
              }
            } else if (provider.price) {
              price = typeof provider.price === 'string' ? provider.price : `₹${provider.price}`;
            } else {
              const defaultPrices: { [key: string]: string } = {
                'cleaning': '₹299', 'repair': '₹319', 'beauty': '₹279', 'fitness': '₹349',
                'electrical': '₹399', 'plumbing': '₹379', 'painting': '₹449', 'appliance': '₹329'
              };
              price = defaultPrices[provider.service_type] || '₹299';
            }

            const providerId = provider.user_id || provider.id;
            return {
              id: providerId,
              user_id: provider.user_id || providerId,
              name: provider.business_name || 'Service Provider',
              rating: provider.rating || 0,
              distance: distanceStr,
              eta: etaStr,
              price: price,
              service: provider.service_type || 'Service',
              phone: provider.phone || '',
              coordinates: {
                lat: provider.latitude,
                lng: provider.longitude
              },
              image: provider.image || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
              services: provider.services || [] // Include provider's services array
            };
          });

          setProviders(transformedProviders);
          console.log('🔄 Periodic refetch completed, updated providers list');
        }
      } catch (error) {
        console.error('Error in periodic refetch:', error);
      }
    }, 30000); // Refetch every 30 seconds

    // Cleanup subscriptions and interval
    return () => {
      console.log('🧹 Cleaning up location subscriptions');
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      clearInterval(refetchInterval);
    };
  }, [providers.map(p => p.user_id || p.id).join(','), location.lat, location.lng, selectedService]);

  const handleProviderSelect = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
  };

  const handleBookProvider = (provider: ServiceProvider) => {
    console.log('📋 Booking provider selected:', {
      id: provider.id,
      name: provider.name,
      user_id: (provider as any).user_id
    });
    setBookingProvider(provider);
    setShowBookingModal(true);
  };

  const handleBookingConfirm = async (bookingData: any) => {
    if (!userId) {
      alert('Please sign in to create a booking.');
      return;
    }

    // Get provider ID from bookingProvider (the provider selected for booking)
    // ALWAYS prioritize user_id (Firebase Auth UID) over document ID
    // Priority: bookingProvider.user_id > bookingProvider.id > bookingData.provider_id > bookingData.provider?.id
    const providerId = (bookingProvider as any)?.user_id || bookingProvider?.id || bookingData.provider_id || bookingData.provider?.id;
    
    console.log('📝 ===== CREATING BOOKING =====');
    console.log('Customer userId (Firebase Auth UID):', userId);
    console.log('Provider ID sources:', {
      'bookingProvider?.id': bookingProvider?.id,
      'bookingData.provider_id': bookingData.provider_id,
      'bookingData.provider?.id': bookingData.provider?.id,
      'final providerId': providerId
    });
    console.log('Provider ID type:', typeof providerId);
    console.log('Provider ID length:', providerId?.length);
    console.log('Full bookingProvider:', bookingProvider);
    console.log('Full bookingData:', bookingData);

    if (!providerId) {
      alert('Error: Provider ID is missing. Please try again.');
      console.error('❌ Provider ID is missing!', { 
        bookingProvider, 
        bookingData,
        'bookingProvider?.id': bookingProvider?.id,
        'bookingData.provider_id': bookingData.provider_id,
        'bookingData.provider?.id': bookingData.provider?.id
      });
      return;
    }
    
    // Verify provider ID format (should be a Firebase UID, typically 28 characters)
    if (typeof providerId !== 'string' || providerId.length < 20) {
      console.warn('⚠️ Provider ID format looks unusual:', providerId);
    } else {
      console.log('✅ Provider ID format looks correct:', providerId);
    }

    try {
      // Prepare booking data for Firestore
      const bookingPayload = {
        user_id: userId,
        provider_id: providerId, // Use the provider ID from bookingProvider
        service_type: bookingData.service || bookingData.service_type,
        booking_date: bookingData.date || bookingData.booking_date,
        booking_time: bookingData.time || bookingData.booking_time,
        service_address: bookingData.address || bookingData.service_address,
        customer_phone: bookingData.phone || bookingData.customer_phone,
        total_amount: bookingData.price || bookingData.total_amount || 0,
        payment_method: bookingData.paymentMethod || bookingData.payment_method || 'cash',
        notes: bookingData.notes || '',
        // Include user coordinates if available
        user_latitude: bookingData.user_latitude || bookingData.userLatitude || null,
        user_longitude: bookingData.user_longitude || bookingData.userLongitude || null,
        status: 'pending', // Provider must accept
      };

      console.log('📦 Booking payload to save:', bookingPayload);
      console.log('📦 Provider ID in payload:', bookingPayload.provider_id);
      console.log('📦 Provider ID matches bookingProvider?.id:', bookingPayload.provider_id === bookingProvider?.id);

      const { data, error } = await createBooking(bookingPayload);
      
      console.log('📝 Booking creation response:', { data, error });
      
      if (error) {
        console.error('Error creating booking:', error);
        alert(`Error creating booking: ${error.message || 'Please try again.'}`);
        throw error; // Re-throw so BookingModal can handle it
      } else {
        console.log('Booking created successfully:', data);
        // Return the created booking data so BookingModal can subscribe to updates
        return data;
      }
    } catch (error: any) {
      console.error('Error in handleBookingConfirm:', error);
      alert('Error creating booking. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="grid lg:grid-cols-3 gap-0">
        {/* Map */}
        <div className="lg:col-span-2 h-96 lg:h-[500px] relative z-0">
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={14}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            className="rounded-l-xl lg:rounded-l-xl"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapController center={[location.lat, location.lng]} />
            
            {/* User location marker */}
            <Marker position={[location.lat, location.lng]} icon={userIcon}>
              <Popup>Your Location</Popup>
            </Marker>
            
            {/* Provider markers */}
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-[1000]">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading providers...</p>
                </div>
              </div>
            ) : (
              providers.map((provider) => (
                <Marker
                  key={`${provider.user_id || provider.id}-${provider.coordinates.lat.toFixed(6)}-${provider.coordinates.lng.toFixed(6)}`}
                  position={[provider.coordinates.lat, provider.coordinates.lng]}
                  icon={providerIcon}
                  eventHandlers={{
                    click: () => handleProviderSelect(provider),
                  }}
                >
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-semibold">{provider.name}</h3>
                      <p className="text-sm text-gray-600">{provider.service}</p>
                      <div className="flex items-center justify-center space-x-1 mt-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="text-xs">{provider.rating}</span>
                      </div>
                      <p className="text-sm font-semibold text-green-600 mt-1">{provider.price}</p>
                    </div>
                  </Popup>
                </Marker>
              ))
            )}
          </MapContainer>
        </div>

        {/* Provider List */}
        <div className="p-4 bg-gray-50 lg:h-[500px] overflow-y-auto">
          {/* Header + filter toggle */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">
              Available Providers
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({isLoading ? '...' : displayedProviders.length} found)
              </span>
            </h3>
            <button
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filter/sort panel */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Sort by</p>
                <div className="flex gap-2">
                  {(['distance','rating','price'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        sortBy === s
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyTopRated}
                    onChange={e => setOnlyTopRated(e.target.checked)}
                    className="accent-blue-600"
                  />
                  <span className="text-xs text-gray-700">Top rated only (★ 4.0+)</span>
                </label>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-medium text-gray-500">Max Price (₹)</p>
                  <p className="text-xs font-bold text-gray-700">{maxPrice === null ? 'Any' : `₹${maxPrice}`}</p>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={maxPrice || 5000}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 5000) setMaxPrice(null);
                    else setMaxPrice(val);
                  }}
                  className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-1 px-1">
                  <span className="text-[10px] text-gray-400">₹100</span>
                  <span className="text-[10px] text-gray-400">Any</span>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-600">Loading providers...</p>
            </div>
          ) : (
            <div className="space-y-4">
            {displayedProviders.map((provider) => (
              <div
                key={provider.id}
                onClick={() => handleProviderSelect(provider)}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedProvider?.id === provider.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src={provider.image}
                    alt={provider.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{provider.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Provider Services */}
                {provider.services && provider.services.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Services Offered:</p>
                    <div className="flex flex-wrap gap-2">
                      {provider.services.map((service: any) => (
                        <div
                          key={service.id || service.name}
                          className="bg-blue-50 border border-blue-200 rounded-md px-2 py-1 text-xs"
                        >
                          <span className="font-medium text-blue-900">{service.name}</span>
                          <span className="text-blue-700 ml-1">₹{service.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div className="text-center">
                    <p className="text-gray-500">Distance</p>
                    <p className="font-semibold">{provider.distance}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">ETA</p>
                    <p className="font-semibold text-blue-600">{provider.eta}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Price</p>
                    <p className="font-semibold text-green-600">{provider.price}</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookProvider(provider);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Book Now
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`tel:${provider.phone}`);
                    }}
                    className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            </div>
          )}

          {!isLoading && displayedProviders.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No providers found within 10km</p>
              <p className="text-sm text-gray-400">Try selecting a different service or removing filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Provider Full Profile Modal */}
      <ProviderProfileModal
        provider={selectedProvider}
        isOpen={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
        onBook={() => {
          if (selectedProvider) {
            handleBookProvider(selectedProvider);
            setSelectedProvider(null);
          }
        }}
      />

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        provider={bookingProvider}
        service={bookingProvider?.service || selectedService}
        onBookingConfirm={handleBookingConfirm}
        apiKey=""
        providerServices={bookingProvider?.services || []}
      />
    </div>
  );
};