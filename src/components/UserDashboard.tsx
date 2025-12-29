import React, { useState } from 'react';
import { useEffect } from 'react';
import { Calendar, Clock, MapPin, Star, Phone, ArrowLeft, Filter, Search, Shield } from 'lucide-react';
import { getUserBookings, subscribeToBookings, getProviderServices } from '../lib/supabase';
import { LiveRouteTracker } from './LiveRouteTracker';

interface UserDashboardProps {
  userId: string;
  onClose: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ userId, onClose }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [providerServicesMap, setProviderServicesMap] = useState<{ [providerId: string]: any[] }>({});

  useEffect(() => {
    fetchBookings();
    
    // Subscribe to real-time booking updates
    if (userId) {
      const unsubscribe = subscribeToBookings(userId, (payload) => {
        console.log('Real-time booking update:', payload);
        // Refresh bookings when a booking is added, updated, or status changes
        if (payload.new || payload.old) {
          fetchBookings();
        }
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [userId]);

  const fetchBookings = async () => {
    try {
      console.log('🔍 Fetching bookings for user:', userId);
      setIsLoading(true);
      const { data, error } = await getUserBookings(userId);
      if (error) {
        console.error('❌ Error fetching bookings:', error);
        alert(`Error loading bookings: ${error.message || 'Please check console for details'}`);
        setBookings([]);
      } else {
        console.log(`✅ Fetched ${data?.length || 0} bookings`);
        setBookings(data || []);
        
        // Fetch services for each unique provider
        const providerIds = new Set<string>();
        (data || []).forEach((booking: any) => {
          if (booking.provider_id) {
            providerIds.add(booking.provider_id);
          }
        });
        
        // Fetch services for all providers
        const servicesMap: { [providerId: string]: any[] } = {};
        await Promise.all(
          Array.from(providerIds).map(async (providerId) => {
            try {
              const { data: services, error: servicesError } = await getProviderServices(providerId);
              if (!servicesError && services) {
                servicesMap[providerId] = services;
              }
            } catch (err) {
              console.error(`Error fetching services for provider ${providerId}:`, err);
            }
          })
        );
        
        setProviderServicesMap(servicesMap);
      }
    } catch (error: any) {
      console.error('❌ Error fetching bookings:', error);
      alert(`Error loading bookings: ${error.message || 'Please check console for details'}`);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.service_providers?.business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'pending') {
      matchesTab = booking.status === 'pending';
    } else if (activeTab === 'active') {
      matchesTab = ['accepted', 'scheduled', 'in-progress'].includes(booking.status);
    } else if (activeTab === 'completed') {
      matchesTab = ['completed', 'rejected', 'cancelled'].includes(booking.status);
    }
    // 'all' tab shows everything
    
    return matchesSearch && matchesTab;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative z-[10000]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={onClose} className="flex items-center text-blue-600 hover:text-blue-700">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
            <h2 className="text-2xl font-bold">My Bookings</h2>
            <div></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'pending'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'active'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'completed'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Completed
              </button>
            </div>

            <div className="flex-1 relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bookings...</p>
            </div>
          ) : (
            filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No bookings found</h3>
                <p className="text-gray-500 mb-4">
                  {activeTab === 'all' && 'You have no bookings yet'}
                  {activeTab === 'pending' && 'You have no pending bookings'}
                  {activeTab === 'active' && 'You have no active bookings at the moment'}
                  {activeTab === 'completed' && 'You have no completed bookings yet'}
                </p>
                {activeTab === 'all' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> To create a booking, go back to the map and select a service provider, then click "Book Now".
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={booking.service_providers?.image || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'}
                          alt={booking.service_providers?.business_name || 'Provider'}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div>
                          <h3 className="text-lg font-semibold">{booking.service_type}</h3>
                          <p className="text-gray-600">{booking.service_providers?.business_name}</p>
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm text-gray-600">{booking.service_providers?.rating || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('-', ' ')}
                        </span>
                        <p className="text-lg font-bold text-gray-900 mt-2">₹{booking.total_amount}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{booking.booking_time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{booking.service_address}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{booking.customer_phone}</span>
                      </div>
                    </div>

                    {/* Provider Services Section */}
                    {booking.provider_id && providerServicesMap[booking.provider_id] && providerServicesMap[booking.provider_id].length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Provider Services:</h4>
                        <div className="flex flex-wrap gap-2">
                          {providerServicesMap[booking.provider_id].map((service: any) => (
                            <div 
                              key={service.id} 
                              className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center justify-between min-w-[200px]"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{service.name}</p>
                                {service.service_type && (
                                  <p className="text-xs text-gray-500 capitalize">{service.service_type}</p>
                                )}
                                {service.description && (
                                  <p className="text-xs text-gray-600 mt-1">{service.description}</p>
                                )}
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-bold text-green-600">₹{service.price}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* OTP Display Section - Show when provider has arrived */}
                    {booking.status === 'arrived' && booking.arrival_otp && (
                      <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-500">
                        <div className="flex items-center justify-center space-x-3 mb-3">
                          <Shield className="h-6 w-6 text-green-600" />
                          <h4 className="text-lg font-bold text-green-800">Provider Has Arrived!</h4>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-700 mb-2">Share this OTP with the provider to verify arrival:</p>
                          <div className="bg-white rounded-lg p-4 border-2 border-green-500">
                            <p className="text-3xl font-bold text-green-600 tracking-widest">{booking.arrival_otp}</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">Provider will verify this OTP to start the service</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="flex space-x-3">
                        {booking.status === 'pending' && (
                          <div className="text-sm text-orange-600">
                            ⏳ Waiting for provider to accept your request
                          </div>
                        )}
                        {booking.status === 'rejected' && (
                          <div className="text-sm text-red-600">
                            ❌ This booking was rejected by the provider
                          </div>
                        )}
                        {booking.status === 'arrived' && (
                          <div className="text-sm text-green-600">
                            ✅ Provider has arrived! Check OTP above.
                          </div>
                        )}
                        {['accepted', 'scheduled', 'in-progress'].includes(booking.status) && (() => {
                          // Check if user can view map (30 minutes before scheduled time)
                          const canViewMap = () => {
                            // If service is in-progress, allow viewing immediately
                            if (booking.status === 'in-progress') {
                              return { allowed: true };
                            }

                            const bookingDate = booking.booking_date || booking.date;
                            const bookingTime = booking.booking_time || booking.time;
                            
                            if (!bookingDate || !bookingTime) {
                              return { allowed: true, reason: 'No scheduled time found' };
                            }

                            // Parse booking date and time
                            let scheduledDateTime: Date | null = null;
                            try {
                              const dateParts = bookingDate.includes('-') ? bookingDate.split('-') : [];
                              let year, month, day;
                              
                              if (dateParts.length === 3) {
                                if (dateParts[0].length === 4) {
                                  year = parseInt(dateParts[0]);
                                  month = parseInt(dateParts[1]) - 1;
                                  day = parseInt(dateParts[2]);
                                } else {
                                  day = parseInt(dateParts[0]);
                                  month = parseInt(dateParts[1]) - 1;
                                  year = parseInt(dateParts[2]);
                                }
                              } else {
                                return { allowed: true, reason: 'Invalid date format' };
                              }

                              const timeParts = bookingTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                              if (timeParts) {
                                let hours = parseInt(timeParts[1]);
                                const minutes = parseInt(timeParts[2]);
                                const period = timeParts[3]?.toUpperCase();

                                if (period === 'PM' && hours !== 12) {
                                  hours += 12;
                                } else if (period === 'AM' && hours === 12) {
                                  hours = 0;
                                }

                                scheduledDateTime = new Date(year, month, day, hours, minutes);
                              } else {
                                return { allowed: true, reason: 'Invalid time format' };
                              }
                            } catch (error) {
                              return { allowed: true, reason: 'Could not parse scheduled time' };
                            }

                            if (!scheduledDateTime) {
                              return { allowed: true, reason: 'Invalid scheduled time format' };
                            }

                            // Check if it's within 30 minutes of scheduled time
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
                              
                              return { 
                                allowed: false, 
                                reason: `Map viewing will be available 30 minutes before your scheduled time (${bookingDate} at ${bookingTime}). Currently ${timeStr} away.` 
                              };
                            }

                            return { allowed: true };
                          };

                          const mapCheck = canViewMap();
                          return (
                            <button 
                              onClick={() => {
                                const mapCheck = canViewMap();
                                if (!mapCheck.allowed) {
                                  alert(mapCheck.reason || 'Map viewing is not available at this time.');
                                  return;
                                }
                                setSelectedBooking({
                                  ...booking,
                                  provider_id: booking.provider_id,
                                  provider: {
                                    id: booking.provider_id,
                                    name: booking.service_providers?.business_name || 'Provider',
                                    image: booking.service_providers?.image || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
                                    phone: booking.service_providers?.phone || booking.customer_phone
                                  },
                                  service: booking.service_type || booking.service
                                });
                                setShowLiveTracking(true);
                              }}
                              className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center space-x-2 ${
                                mapCheck.allowed 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                              disabled={!mapCheck.allowed}
                              title={mapCheck.allowed ? 'Track Service' : mapCheck.reason || 'Map viewing not available'}
                            >
                              <MapPin className="h-4 w-4" />
                              <span>Track Service</span>
                            </button>
                          );
                        })()}
                        {booking.status === 'completed' && (
                          <button 
                            onClick={() => {
                              alert('Rating feature coming soon!');
                            }}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Rate Service
                          </button>
                        )}
                      </div>
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => {
                            alert(`Booking Details:\n\nService: ${booking.service_type}\nProvider: ${booking.service_providers?.business_name || 'N/A'}\nDate: ${booking.booking_date}\nTime: ${booking.booking_time}\nAddress: ${booking.service_address}\nStatus: ${booking.status}\nAmount: ₹${booking.total_amount}`);
                          }}
                          className="text-gray-600 hover:text-gray-800 font-medium"
                        >
                          View Details
                        </button>
                        {['pending', 'accepted', 'scheduled'].includes(booking.status) && (
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to cancel this booking?')) {
                                alert('Cancel booking feature coming soon!');
                              }
                            }}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Live Route Tracker */}
      {showLiveTracking && selectedBooking && (
        <LiveRouteTracker
          booking={selectedBooking}
          onClose={() => setShowLiveTracking(false)}
          isProvider={false}
        />
      )}
    </div>
  );
};

export default UserDashboard;

export { UserDashboard }