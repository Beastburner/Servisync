import React, { useState } from 'react';
import { useEffect } from 'react';
import { LocationService } from './components/LocationService';
import { ServiceAreaMap } from './components/ServiceAreaMap';
import { AuthModal } from './components/AuthModal';
import { UserDashboard } from './components/UserDashboard';
import { ProviderDashboard } from './components/ProviderDashboard';
import { getCurrentUser, getUserProfile, getServiceProvider, signOut } from './lib/supabase';
import { 
  Search, 
  Star, 
  Users, 
  Clock, 
  Shield, 
  ChevronRight,
  MapPin,
  Phone,
  CheckCircle,
  TrendingUp,
  Award,
  Zap,
  Heart,
  Menu,
  X,
  LogOut
} from 'lucide-react';

interface LocationData {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  placeId?: string;
}

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<'customer' | 'provider' | null>(null);
  const [showUserDashboard, setShowUserDashboard] = useState(false);
  const [showProviderDashboard, setShowProviderDashboard] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showServiceArea, setShowServiceArea] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  
  // Replace with your actual GoMaps Pro API key
  const GOMAPS_API_KEY = 'AlzaSyRlrmye1NQMYYb1UfqLXmT8fC-SHVmE0UY';

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { user, error } = await getCurrentUser();

      if (user) {
        setUser(user);
        
        // Try to get user profile first
        const { data: userProfileData } = await getUserProfile(user.id);
        if (userProfileData) {
          setUserProfile(userProfileData);
          setUserRole('customer');
        }
        
        // Try to get provider profile
        const { data: providerProfileData } = await getServiceProvider(user.id);
        if (providerProfileData) {
          setProviderProfile(providerProfileData);
          // If user has both profiles, provider takes precedence
          setUserRole('provider');
        }
      } else {
        // No user logged in, reset state
        setUser(null);
        setUserProfile(null);
        setProviderProfile(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      // Reset state on error
      setUser(null);
      setUserProfile(null);
      setProviderProfile(null);
      setUserRole(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setUserProfile(null);
    setProviderProfile(null);
    setUserRole(null);
  };

  const services = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Home Cleaning",
      description: "Professional cleaning services",
      image: "https://images.pexels.com/photos/4099230/pexels-photo-4099230.jpeg?auto=compress&cs=tinysrgb&w=400",
      searchTerm: "cleaning"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Repairs & Maintenance",
      description: "Fix anything in your home",
      image: "https://images.pexels.com/photos/5691627/pexels-photo-5691627.jpeg?auto=compress&cs=tinysrgb&w=400",
      searchTerm: "repair"
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Beauty & Wellness",
      description: "Salon services at home",
      image: "https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg?auto=compress&cs=tinysrgb&w=400",
      searchTerm: "beauty"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Fitness Training",
      description: "Personal trainers & coaches",
      image: "https://images.pexels.com/photos/416809/pexels-photo-416809.jpeg?auto=compress&cs=tinysrgb&w=400",
      searchTerm: "fitness"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      rating: 5,
      text: "Amazing service! The cleaning team was professional and thorough. Highly recommend.",
      service: "Home Cleaning"
    },
    {
      name: "Mike Chen",
      rating: 5,
      text: "Fixed my AC within 2 hours. Great communication and fair pricing.",
      service: "Repairs"
    },
    {
      name: "Emma Wilson",
      rating: 5,
      text: "The beauty service was exceptional. Felt like I was at a luxury spa.",
      service: "Beauty"
    }
  ];

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location);
    setShowServiceArea(true);
  };

  const handleServiceSelect = (searchTerm: string) => {
    setSelectedServiceType(searchTerm);
    if (selectedLocation) {
      setShowServiceArea(true);
    }
  };

  const handleAuthSuccess = () => {
    checkUser();
  };

  // If user is a provider, show provider-focused UI
  if (userRole === 'provider') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Provider Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">ServiSync Pro</span>
                </div>
              </div>
              
              {/* Provider Navigation */}
              <nav className="hidden md:flex space-x-8">
                <button
                  onClick={() => setShowProviderDashboard(true)}
                  className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
                >
                  Dashboard
                </button>
                <a href="#bookings" className="text-gray-700 hover:text-purple-600 transition-colors">My Bookings</a>
                <a href="#earnings" className="text-gray-700 hover:text-purple-600 transition-colors">Earnings</a>
                <a href="#profile" className="text-gray-700 hover:text-purple-600 transition-colors">Profile</a>
              </nav>

              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{providerProfile?.business_name}</div>
                  <div className="text-xs text-gray-500">
                    {providerProfile?.is_verified ? '✓ Verified' : 'Pending Verification'}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden bg-white border-t">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <button
                  onClick={() => setShowProviderDashboard(true)}
                  className="block px-3 py-2 text-gray-700 hover:text-purple-600 font-medium"
                >
                  Dashboard
                </button>
                <a href="#bookings" className="block px-3 py-2 text-gray-700 hover:text-purple-600">My Bookings</a>
                <a href="#earnings" className="block px-3 py-2 text-gray-700 hover:text-purple-600">Earnings</a>
                <a href="#profile" className="block px-3 py-2 text-gray-700 hover:text-purple-600">Profile</a>
                <div className="px-3 py-2 border-t">
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left text-gray-700 hover:text-purple-600"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Provider Dashboard Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {providerProfile?.business_name}!
            </h1>
            <p className="text-gray-600">
              Manage your services, bookings, and grow your business.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{providerProfile?.total_jobs_completed || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{providerProfile?.rating?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{providerProfile?.total_reviews || 0}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Status</p>
                  <p className="text-lg font-semibold text-green-600">
                    {providerProfile?.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowProviderDashboard(true)}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  View All Bookings
                </button>
                <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  Update Availability
                </button>
                <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  Manage Services
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>No recent activity</p>
                <p className="text-xs text-gray-500">Your recent bookings and updates will appear here</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips & Resources</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-600">Complete your profile to get more bookings</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <p className="text-gray-600">Respond quickly to booking requests</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <p className="text-gray-600">Maintain high service quality for better ratings</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Provider Dashboard Modal */}
        {showProviderDashboard && (
          <ProviderDashboard
            userId={user.id}
            onClose={() => setShowProviderDashboard(false)}
          />
        )}
      </div>
    );
  }

  // Regular customer UI (existing UI with some modifications)
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">ServiSync</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#services" className="text-gray-700 hover:text-blue-600 transition-colors">Services</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors">How it Works</a>
              <a href="#professionals" className="text-gray-700 hover:text-blue-600 transition-colors">For Professionals</a>
              <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors">About</a>
            </nav>

            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {userProfile?.full_name || user.email}
                    </div>
                    <div className="text-xs text-gray-500">Customer</div>
                  </div>
                  {userRole === 'customer' && (
                    <button
                      onClick={() => setShowUserDashboard(true)}
                      className="text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      My Bookings
                    </button>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                Get Started
              </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="#services" className="block px-3 py-2 text-gray-700 hover:text-blue-600">Services</a>
              <a href="#how-it-works" className="block px-3 py-2 text-gray-700 hover:text-blue-600">How it Works</a>
              <a href="#professionals" className="block px-3 py-2 text-gray-700 hover:text-blue-600">For Professionals</a>
              <a href="#about" className="block px-3 py-2 text-gray-700 hover:text-blue-600">About</a>
              {user ? (
                <div className="px-3 py-2 space-y-2">
                  {userRole === 'customer' && (
                    <button
                      onClick={() => setShowUserDashboard(true)}
                      className="block w-full text-left text-gray-700 hover:text-blue-600"
                    >
                      My Bookings
                    </button>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left text-gray-700 hover:text-blue-600"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex space-x-4 px-3 py-2">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-gray-700 hover:text-blue-600"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                  Get Started
                </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 md:mb-6 leading-tight">
              Your Home Services,
              <br className="sm:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {" "}Simplified
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6 md:mb-8 max-w-3xl mx-auto px-4">
              Connect with trusted professionals for all your home needs. From cleaning to repairs, 
              beauty to fitness - we've got you covered.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-4xl mx-auto mb-6 md:mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Where do you need the service?
                  </label>
                  <LocationService 
                    onLocationSelect={handleLocationSelect}
                    apiKey={GOMAPS_API_KEY}
                  />
                </div>
                
                {/* Service Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    What service do you need?
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search for services..."
                      className="w-full pl-12 pr-4 py-3 text-base md:text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <button 
                  className="bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
                  disabled={!selectedLocation || !user}
                  onClick={() => setShowServiceArea(true)}
                  title={!user ? "Please sign in to find services" : !selectedLocation ? "Please select a location" : ""}
                >
                  {!user ? "Sign In to Find Services" : "Find Services"}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-2">50,000+</div>
                <div className="text-sm md:text-base text-gray-600">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-2">10,000+</div>
                <div className="text-sm md:text-base text-gray-600">Service Professionals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-2">4.9/5</div>
                <div className="text-sm md:text-base text-gray-600 flex items-center justify-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  Average Rating
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Area Map Section */}
      {showServiceArea && selectedLocation && (
        <section className="py-12 md:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Available in Your Area
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 px-4">
                Professional services near {selectedLocation.address.split(',')[0]}
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <ServiceAreaMap 
                location={selectedLocation.coordinates}
                apiKey={GOMAPS_API_KEY}
                selectedService={selectedServiceType}
              />
            </div>
          </div>
        </section>
      )}

      {/* Services Section */}
      <section id="services" className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Popular Services
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Discover our most requested services
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                onMouseEnter={() => setActiveService(index)}
                onClick={() => handleServiceSelect(service.searchTerm)}
              >
                <div className="relative h-40 sm:h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-2">
                    <div className="text-blue-600">{service.icon}</div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Starting from ₹500</span>
                    <ChevronRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Get your service in 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Search className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">1. Book Your Service</h3>
              <p className="text-sm sm:text-base text-gray-600 px-4">
                Choose your service, select date and time, and provide details about your needs.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">2. Get Matched</h3>
              <p className="text-sm sm:text-base text-gray-600 px-4">
                We'll connect you with verified professionals in your area who fit your requirements.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">3. Service Delivered</h3>
              <p className="text-sm sm:text-base text-gray-600 px-4">
                Enjoy professional service at your convenience with guaranteed satisfaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose ServiceHub?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              We're committed to delivering excellence
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center">
              <div className="bg-blue-600 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Verified Professionals</h3>
              <p className="text-sm sm:text-base text-gray-600 px-2">All service providers are background-checked and verified.</p>
            </div>

            <div className="text-center">
              <div className="bg-green-600 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">On-Time Service</h3>
              <p className="text-sm sm:text-base text-gray-600 px-2">We guarantee punctual service delivery every time.</p>
            </div>

            <div className="text-center">
              <div className="bg-yellow-600 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Quality Guaranteed</h3>
              <p className="text-sm sm:text-base text-gray-600 px-2">100% satisfaction guarantee or your money back.</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-600 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-sm sm:text-base text-gray-600 px-2">Round-the-clock customer support for all your needs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Real reviews from real customers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-700 mb-6 italic">"{testimonial.text}"</p>
                <div className="flex items-center">
                  <div className="bg-gray-300 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                    <span className="text-gray-600 font-semibold text-sm sm:text-base">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">{testimonial.name}</div>
                    <div className="text-gray-600 text-xs sm:text-sm">{testimonial.service}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            Join thousands of satisfied customers who trust ServiceHub for their home services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto sm:max-w-none">
            <button className="bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              {user ? "Book a Service" : "Get Started"}
            </button>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Become a Professional
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">ServiceHub</span>
              </div>
              <p className="text-gray-400 mb-4 text-sm sm:text-base">
                Connecting you with trusted professionals for all your home service needs.
              </p>
              <div className="flex space-x-4">
                <div className="bg-gray-800 w-10 h-10 rounded-full flex items-center justify-center">
                  <span className="text-sm">f</span>
                </div>
                <div className="bg-gray-800 w-10 h-10 rounded-full flex items-center justify-center">
                  <span className="text-sm">t</span>
                </div>
                <div className="bg-gray-800 w-10 h-10 rounded-full flex items-center justify-center">
                  <span className="text-sm">in</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition-colors">Home Cleaning</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Repairs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Beauty</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Fitness</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Safety</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 md:mt-12 pt-6 md:pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 ServiceHub. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* User Dashboard */}
      {showUserDashboard && user && userRole === 'customer' && (
        <UserDashboard
          userId={user.id}
          onClose={() => setShowUserDashboard(false)}
        />
      )}
    </div>
  );
}

export default App;