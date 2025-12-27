import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Star, Phone, Navigation, Clock } from 'lucide-react';
import { BookingModal } from './BookingModal';
import { getNearbyServiceProviders, createBooking } from '../lib/supabase';
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
          const price = provider.price || defaultPrices[provider.service_type] || '₹299';

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
            image: provider.image || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
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
                  key={provider.id}
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
        <div className="p-6 bg-gray-50 lg:h-[500px] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Available Providers
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({isLoading ? '...' : providers.length} found)
            </span>
          </h3>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-600">Loading providers...</p>
            </div>
          ) : (
            <div className="space-y-4">
            {providers.map((provider) => (
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
                    <p className="text-sm text-gray-600">{provider.service}</p>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{provider.rating}</span>
                    </div>
                  </div>
                </div>

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

          {!isLoading && providers.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No providers found within 10km</p>
              <p className="text-sm text-gray-400">Try selecting a different service</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Provider Details */}
      {selectedProvider && (
        <div className="p-6 border-t bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={selectedProvider.image}
                alt={selectedProvider.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedProvider.name}</h3>
                <p className="text-gray-600">{selectedProvider.service}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">{selectedProvider.rating}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedProvider.eta}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Navigation className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{selectedProvider.distance}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{selectedProvider.price}</p>
              <button
                onClick={() => handleBookProvider(selectedProvider)}
                className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Book {selectedProvider.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        provider={bookingProvider}
        service={bookingProvider?.service || selectedService}
        onBookingConfirm={handleBookingConfirm}
      />
    </div>
  );
};