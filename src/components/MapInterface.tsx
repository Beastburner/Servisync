import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Phone, Star, ArrowLeft, User } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  rating: number;
  distance: string;
  eta: string;
  price: string;
  image: string;
  location: { lat: number; lng: number };
  phone: string;
  reviews: number;
}

interface MapInterfaceProps {
  selectedService: any;
  currentBooking?: any;
  onBookingCreate: (booking: any) => void;
  onBack: () => void;
  isTracking?: boolean;
}

const MapInterface: React.FC<MapInterfaceProps> = ({ 
  selectedService, 
  currentBooking, 
  onBookingCreate, 
  onBack, 
  isTracking = false 
}) => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [bookingStatus, setBookingStatus] = useState('searching');
  const [providerLocation, setProviderLocation] = useState({ lat: 28.6139, lng: 77.2090 });

  const providers: Provider[] = [
    {
      id: '1',
      name: 'Rajesh Kumar',
      rating: 4.8,
      distance: '2.1 km',
      eta: '15 min',
      price: '₹299',
      image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
      location: { lat: 28.6139, lng: 77.2090 },
      phone: '+91 98765 43210',
      reviews: 152
    },
    {
      id: '2',
      name: 'Amit Sharma',
      rating: 4.9,
      distance: '3.2 km',
      eta: '22 min',
      price: '₹279',
      image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
      location: { lat: 28.6129, lng: 77.2080 },
      phone: '+91 98765 43211',
      reviews: 89
    },
    {
      id: '3',
      name: 'Priya Singh',
      rating: 4.7,
      distance: '1.8 km',
      eta: '12 min',
      price: '₹319',
      image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
      location: { lat: 28.6149, lng: 77.2100 },
      phone: '+91 98765 43212',
      reviews: 203
    }
  ];

  useEffect(() => {
    if (isTracking && currentBooking) {
      const interval = setInterval(() => {
        setProviderLocation(prev => ({
          lat: prev.lat + (Math.random() - 0.5) * 0.001,
          lng: prev.lng + (Math.random() - 0.5) * 0.001
        }));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isTracking, currentBooking]);

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
  };

  const handleBooking = () => {
    if (selectedProvider) {
      const booking = {
        id: Date.now().toString(),
        service: selectedService,
        provider: selectedProvider,
        status: 'confirmed',
        estimatedTime: selectedProvider.eta,
        location: 'Current Location'
      };
      onBookingCreate(booking);
      setBookingStatus('confirmed');
    }
  };

  if (isTracking && currentBooking) {
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        <div className="bg-white shadow-sm p-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center text-blue-600 hover:text-blue-700">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          <h2 className="text-lg font-semibold">Tracking Service</h2>
          <div></div>
        </div>

        <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-purple-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <img 
                  src={currentBooking.provider.image} 
                  alt={currentBooking.provider.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold">{currentBooking.provider.name}</h3>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">{currentBooking.provider.rating}</span>
                  </div>
                </div>
              </div>
              <button className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition-colors">
                <Phone className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Service:</span>
                <span className="font-semibold">{currentBooking.service.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  En Route
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ETA:</span>
                <span className="font-semibold text-blue-600">{currentBooking.estimatedTime}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="relative">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-12 w-12 text-blue-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <p className="text-gray-600 mb-2">Provider is on the way</p>
              <p className="text-sm text-gray-500">Live tracking in progress</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white shadow-sm p-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-blue-600 hover:text-blue-700">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <h2 className="text-lg font-semibold">{selectedService?.name}</h2>
        <div></div>
      </div>

      <div className="flex-1 flex">
        <div className="w-full lg:w-2/3 relative">
          <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 p-4 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Navigation className="h-16 w-16 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Map</h3>
              <p className="text-gray-600">Real-time provider locations</p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/3 bg-white shadow-lg overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Available Providers</h3>
            <div className="space-y-4">
              {providers.map((provider) => (
                <div 
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedProvider?.id === provider.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <img 
                      src={provider.image} 
                      alt={provider.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">{provider.name}</h4>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600">{provider.rating}</span>
                        <span className="text-sm text-gray-500">({provider.reviews})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm">
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
                </div>
              ))}
            </div>
            
            {selectedProvider && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2">Selected Provider</h4>
                <p className="text-sm text-gray-600 mb-4">{selectedProvider.name}</p>
                <button 
                  onClick={handleBooking}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Confirm Booking - {selectedProvider.price}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapInterface;