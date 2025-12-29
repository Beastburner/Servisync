import React, { useState } from 'react';
import { useEffect } from 'react';
import { 
  DollarSign, 
  Clock, 
  Star, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Phone, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Map,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { getProviderBookings, getServiceProvider, updateLocationVisibility, acceptBooking, rejectBooking, updateBookingStatus, subscribeToProviderBookings, verifyArrivalOTP } from '../lib/supabase';
import { ProviderLocationTracker } from './ProviderLocationTracker';
import { LiveRouteTracker } from './LiveRouteTracker';

interface ProviderDashboardProps {
  userId: string;
  onClose: () => void;
  initialTab?: string;
  onManageServices?: () => void;
}

const ProviderDashboard: React.FC<ProviderDashboardProps> = ({ userId, onClose, initialTab = 'overview', onManageServices }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [bookings, setBookings] = useState<any[]>([]);
  const [providerData, setProviderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState({ lat: '', lng: '' });
  const [showMap, setShowMap] = useState(false);
  const [selectedBookingForMap, setSelectedBookingForMap] = useState<any>(null);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [selectedBookingForOTP, setSelectedBookingForOTP] = useState<any>(null);
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  // Calculate real stats from bookings and provider data
  const calculateStats = () => {
    const completedBookings = bookings.filter((b: any) => b.status === 'completed');
    const totalEarnings = completedBookings.reduce((sum: number, booking: any) => {
      return sum + (parseFloat(booking.total_amount) || parseFloat(booking.price) || 0);
    }, 0);
    
    const completedJobsCount = completedBookings.length;
    const averageRating = providerData?.rating || 0;
    const totalReviews = providerData?.total_reviews || 0;
    
    // Calculate pending bookings count
    const pendingBookings = bookings.filter((b: any) => ['pending', 'accepted', 'scheduled'].includes(b.status));
    
    return [
      {
        title: 'Total Earnings',
        value: `₹${totalEarnings.toLocaleString('en-IN')}`,
        change: completedJobsCount > 0 ? `${completedJobsCount} jobs` : 'No earnings yet',
        icon: DollarSign,
        color: 'text-green-600'
      },
      {
        title: 'Completed Jobs',
        value: completedJobsCount.toString(),
        change: pendingBookings.length > 0 ? `${pendingBookings.length} pending` : 'No pending jobs',
        icon: CheckCircle,
        color: 'text-blue-600'
      },
      {
        title: 'Average Rating',
        value: averageRating > 0 ? averageRating.toFixed(1) : '0.0',
        change: totalReviews > 0 ? `${totalReviews} reviews` : 'No reviews yet',
        icon: Star,
        color: 'text-yellow-600'
      },
      {
        title: 'Total Bookings',
        value: bookings.length.toString(),
        change: bookings.length > 0 ? 'All time' : 'No bookings yet',
        icon: Clock,
        color: 'text-purple-600'
      }
    ];
  };

  const stats = calculateStats();

  useEffect(() => {
    fetchProviderData();
    
    // Set up real-time subscription for bookings
    if (userId) {
      console.log('Setting up real-time subscription for provider:', userId);
      const unsubscribe = subscribeToProviderBookings(userId, (payload) => {
        console.log('Real-time booking update:', payload);
        if (payload.new) {
          // Refresh bookings when a new one is added
          fetchProviderData();
        }
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [userId]);

  const fetchProviderData = async () => {
    try {
      console.log('🔍 ===== FETCHING PROVIDER DATA =====');
      console.log('Provider userId (Firebase Auth UID):', userId);
      console.log('Type of userId:', typeof userId);
      console.log('UserId length:', userId?.length);
      
      // First, verify the provider exists
      const providerResult = await getServiceProvider(userId);
      console.log('Provider profile result:', providerResult);
      
      if (providerResult.data) {
        console.log('✅ Provider profile found:', {
          documentId: providerResult.data.id,
          user_id: providerResult.data.user_id,
          business_name: providerResult.data.business_name
        });
        setProviderData(providerResult.data);
        
        // Log provider status for debugging
        if (!providerResult.data.latitude || !providerResult.data.longitude) {
          console.warn('Provider missing location data. They will not appear on customer maps.');
        }
        if (providerResult.data.show_location === false) {
          console.warn('Provider has location visibility disabled.');
        }
      } else {
        console.error('❌ Provider profile NOT found for userId:', userId);
      }
      
      // Now fetch bookings
      const bookingsResult = await getProviderBookings(userId);
      console.log('📋 Bookings query result:', bookingsResult);

      if (bookingsResult.data) {
        console.log(`✅ Found ${bookingsResult.data.length} bookings for provider ${userId}:`, bookingsResult.data);
        bookingsResult.data.forEach((booking: any, index: number) => {
          console.log(`  📌 Booking ${index + 1}:`, {
            id: booking.id,
            provider_id: booking.provider_id,
            provider_id_type: typeof booking.provider_id,
            provider_id_length: booking.provider_id?.length,
            user_id: booking.user_id,
            status: booking.status,
            service_type: booking.service_type,
            matches: booking.provider_id === userId ? '✅ MATCHES' : '❌ MISMATCH'
          });
        });
        setBookings(bookingsResult.data);
      } else if (bookingsResult.error) {
        console.error('❌ Error fetching bookings:', bookingsResult.error);
        setBookings([]);
      } else {
        console.log('⚠️ No bookings found for provider:', userId);
        setBookings([]);
      }
      
      console.log('🔍 ===== END FETCH PROVIDER DATA =====');
      
      if (providerResult.data) {
        setProviderData(providerResult.data);
        
        // Log provider status for debugging
        if (!providerResult.data.latitude || !providerResult.data.longitude) {
          console.warn('Provider missing location data. They will not appear on customer maps.');
        }
        if (providerResult.data.show_location === false) {
          console.warn('Provider has location visibility disabled.');
        }
      }
    } catch (error) {
      console.error('Error fetching provider data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if provider can view map (30 minutes before scheduled time)
  const canViewMap = (job: any): { allowed: boolean; reason?: string } => {
    // If service is in-progress, allow viewing immediately
    if (job.status === 'in-progress' || job.status === 'arrived') {
      return { allowed: true };
    }

    // Check scheduled date and time
    const bookingDate = job.booking_date || job.date || job.bookingDate;
    const bookingTime = job.booking_time || job.time || job.bookingTime;
    
    if (!bookingDate || !bookingTime) {
      return { allowed: true, reason: 'No scheduled time found' };
    }

    // Parse booking date and time
    let scheduledDateTime: Date | null = null;
    try {
      const dateParts = bookingDate.includes('-') ? bookingDate.split('-') : [];
      let year, month, day;
      
      if (dateParts.length === 3) {
        // Check if it's YYYY-MM-DD or DD-MM-YYYY
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

      // Parse time (format: HH:MM AM/PM or HH:MM)
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
        reason: `Map viewing will be available 30 minutes before the scheduled time (${bookingDate} at ${bookingTime}). Currently ${timeStr} away.` 
      };
    }

    return { allowed: true };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      {onManageServices && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={onManageServices}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
            >
              <span>Manage Services & Prices</span>
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 font-medium"
            >
              <span>View All Bookings</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 font-medium"
            >
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gray-50 ${stat.color}`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <span className="text-sm text-green-600 font-semibold">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.title}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Jobs</h3>
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No upcoming jobs</p>
                <p className="text-xs text-gray-400 mt-2">Your scheduled bookings will appear here</p>
              </div>
            ) : (
              bookings
                .filter((job: any) => ['pending', 'accepted', 'scheduled', 'in-progress', 'arrived'].includes(job.status))
                .sort((a: any, b: any) => {
                  const dateA = a.booking_date || a.date || '';
                  const timeA = a.booking_time || a.time || '';
                  const dateB = b.booking_date || b.date || '';
                  const timeB = b.booking_time || b.time || '';
                  const dateTimeA = new Date(`${dateA}T${timeA}`).getTime();
                  const dateTimeB = new Date(`${dateB}T${timeB}`).getTime();
                  return dateTimeA - dateTimeB;
                })
                .slice(0, 3)
                .map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold capitalize">{job.service_type || job.service || 'Service'}</h4>
                        <p className="text-sm text-gray-600">{job.user_profiles?.full_name || job.customer || 'Customer'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status || 'pending')}`}>
                        {(job.status || 'pending').charAt(0).toUpperCase() + (job.status || 'pending').slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{job.booking_date || job.date || 'Not set'} at {job.booking_time || job.time || 'Not set'}</span>
                      <span className="font-semibold text-gray-900">₹{job.total_amount || job.price || '0'}</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No recent activity</p>
                <p className="text-xs text-gray-400 mt-2">Your bookings and updates will appear here</p>
              </div>
            ) : (
              bookings
                .sort((a: any, b: any) => {
                  const dateA = a.updated_at || a.created_at || '';
                  const dateB = b.updated_at || b.created_at || '';
                  return new Date(dateB).getTime() - new Date(dateA).getTime();
                })
                .slice(0, 4)
                .map((booking: any, index: number) => {
                  const getActivityColor = (status: string) => {
                    if (status === 'completed') return 'bg-green-500';
                    if (status === 'in-progress' || status === 'arrived') return 'bg-blue-500';
                    if (status === 'accepted' || status === 'scheduled') return 'bg-yellow-500';
                    if (status === 'pending') return 'bg-purple-500';
                    return 'bg-gray-500';
                  };

                  const getActivityText = (booking: any) => {
                    const serviceType = booking.service_type || booking.service || 'Service';
                    const customerName = booking.user_profiles?.full_name || 'Customer';
                    const status = booking.status || 'pending';
                    
                    if (status === 'completed') return `Completed ${serviceType} for ${customerName}`;
                    if (status === 'in-progress') return `Started ${serviceType} for ${customerName}`;
                    if (status === 'arrived') return `Arrived at ${customerName}'s location`;
                    if (status === 'accepted') return `Accepted booking from ${customerName}`;
                    if (status === 'scheduled') return `Scheduled ${serviceType} for ${customerName}`;
                    return `New booking from ${customerName}`;
                  };

                  const getTimeAgo = (dateString: string) => {
                    if (!dateString) return 'Recently';
                    const date = new Date(dateString);
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
                    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                    return date.toLocaleDateString();
                  };

                  const activityDate = booking.updated_at || booking.created_at || '';
                  
                  return (
                    <div key={booking.id || index} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 ${getActivityColor(booking.status || 'pending')} rounded-full`}></div>
                      <div className="flex-1">
                        <p className="text-sm">{getActivityText(booking)}</p>
                        <p className="text-xs text-gray-500">{getTimeAgo(activityDate)}</p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const handleToggleLocationVisibility = async () => {
    if (!providerData) return;
    
    setIsUpdatingLocation(true);
    // Default to true if undefined (backward compatibility)
    const currentVisibility = providerData.show_location !== undefined ? providerData.show_location : true;
    const newVisibility = !currentVisibility;
    
    try {
      const { error } = await updateLocationVisibility(userId, newVisibility);
      if (error) {
        alert('Error updating location visibility. Please try again.');
        console.error('Error:', error);
      } else {
        // Update local state
        setProviderData({
          ...providerData,
          show_location: newVisibility
        });
      }
    } catch (error) {
      console.error('Error toggling location visibility:', error);
      alert('Error updating location visibility. Please try again.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-6">Profile Settings</h3>
        
        {/* Location Visibility Toggle */}
        <div className="border-b pb-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {(() => {
                const showLocation = providerData?.show_location !== undefined ? providerData.show_location : true;
                return (
                  <>
                    <div className={`p-3 rounded-lg ${showLocation ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {showLocation ? (
                        <Eye className="h-6 w-6 text-green-600" />
                      ) : (
                        <EyeOff className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Show My Location</h4>
                      <p className="text-sm text-gray-600">
                        {showLocation 
                          ? 'Your location is visible to customers searching for services'
                          : 'Your location is hidden from customers'
                        }
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
            <button
              onClick={handleToggleLocationVisibility}
              disabled={isUpdatingLocation || !providerData}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                (providerData?.show_location !== undefined ? providerData.show_location : true) ? 'bg-blue-600' : 'bg-gray-200'
              } ${isUpdatingLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  (providerData?.show_location !== undefined ? providerData.show_location : true) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {providerData?.latitude && providerData?.longitude ? (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>Current Location: {providerData.latitude.toFixed(4)}, {providerData.longitude.toFixed(4)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">Location Not Set</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Your location is required for customers to find you. Use automatic detection or enter manually.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                      <button
                        onClick={async () => {
                          setIsUpdatingLocation(true);
                          try {
                            const { updateProviderLocationFromGeolocation } = await import('../lib/supabase');
                            const { error } = await updateProviderLocationFromGeolocation(userId);
                            if (error) {
                              const errorMsg = error.message || 'Unable to get location. Please allow location access or enter manually.';
                              alert(errorMsg);
                              setShowManualLocation(true); // Show manual option on error
                            } else {
                              // Refresh provider data
                              await fetchProviderData();
                              alert('Location updated successfully! You will now appear on customer maps.');
                            }
                          } catch (error: any) {
                            console.error('Error setting location:', error);
                            alert(error?.message || 'Error setting location. Please try again or enter manually.');
                            setShowManualLocation(true);
                          } finally {
                            setIsUpdatingLocation(false);
                          }
                        }}
                        disabled={isUpdatingLocation}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdatingLocation ? 'Getting Location...' : 'Use My Current Location'}
                      </button>
                      <button
                        onClick={() => setShowManualLocation(!showManualLocation)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                      >
                        {showManualLocation ? 'Cancel' : 'Enter Location Manually'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Location Entry */}
              {showManualLocation && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="text-sm font-semibold text-blue-900 mb-3">Enter Location Manually</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Latitude (e.g., 22.3072 for Vadodara)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={manualLocation.lat}
                        onChange={(e) => setManualLocation({ ...manualLocation, lat: e.target.value })}
                        placeholder="22.3072"
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Longitude (e.g., 73.1812 for Vadodara)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={manualLocation.lng}
                        onChange={(e) => setManualLocation({ ...manualLocation, lng: e.target.value })}
                        placeholder="73.1812"
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const lat = parseFloat(manualLocation.lat);
                          const lng = parseFloat(manualLocation.lng);
                          
                          if (isNaN(lat) || isNaN(lng)) {
                            alert('Please enter valid latitude and longitude values.');
                            return;
                          }
                          
                          if (lat < -90 || lat > 90) {
                            alert('Latitude must be between -90 and 90.');
                            return;
                          }
                          
                          if (lng < -180 || lng > 180) {
                            alert('Longitude must be between -180 and 180.');
                            return;
                          }
                          
                          setIsUpdatingLocation(true);
                          try {
                            const { updateServiceProviderLocation } = await import('../lib/supabase');
                            const { error } = await updateServiceProviderLocation(userId, lat, lng);
                            if (error) {
                              alert('Error saving location. Please try again.');
                            } else {
                              setShowManualLocation(false);
                              setManualLocation({ lat: '', lng: '' });
                              await fetchProviderData();
                              alert('Location saved successfully! You will now appear on customer maps.');
                            }
                          } catch (error) {
                            console.error('Error saving location:', error);
                            alert('Error saving location. Please try again.');
                          } finally {
                            setIsUpdatingLocation(false);
                          }
                        }}
                        disabled={isUpdatingLocation || !manualLocation.lat || !manualLocation.lng}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save Location
                      </button>
                      <button
                        onClick={() => {
                          // Try to get current location and populate fields
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                setManualLocation({
                                  lat: position.coords.latitude.toString(),
                                  lng: position.coords.longitude.toString()
                                });
                              },
                              () => {
                                // Silent fail, user can enter manually
                              }
                            );
                          }
                        }}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Use Current
                      </button>
                    </div>
                    <p className="text-xs text-blue-700">
                      💡 Tip: You can find your coordinates on <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="underline">Google Maps</a> by right-clicking on your location.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Provider Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <p className="text-gray-900">{providerData?.business_name || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <p className="text-gray-900 capitalize">{providerData?.service_type || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <p className="text-gray-900">{providerData?.phone || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${providerData?.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-gray-900">{providerData?.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-gray-900">{providerData?.rating?.toFixed(1) || '0.0'}</span>
              <span className="text-gray-500 text-sm">({providerData?.total_reviews || 0} reviews)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderJobs = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">All Jobs</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No bookings yet</p>
                <p className="text-sm text-gray-500 mt-2">Booking requests will appear here</p>
              </div>
            ) : (
              bookings.map((job) => (
                <div key={job.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold capitalize">{job.service_type || job.service || 'Service'}</h4>
                      <p className="text-gray-600">{job.user_profiles?.full_name || job.customer || 'Customer'}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status || 'pending')}`}>
                      {(job.status || 'pending').charAt(0).toUpperCase() + (job.status || 'pending').slice(1)}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{job.booking_date || job.date || 'Not set'} at {job.booking_time || job.time || 'Not set'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{job.service_address || job.address || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{job.customer_phone || job.phone || job.user_profiles?.phone || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold">₹{job.total_amount || job.price || '0'}</span>
                    </div>
                  </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex space-x-3">
                    {(!job.status || job.status === 'pending') && (
                      <>
                        <button 
                          onClick={async () => {
                            try {
                              const { error } = await acceptBooking(job.id);
                              if (error) {
                                alert(`Error accepting booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
                              } else {
                                alert('Booking accepted successfully!');
                                fetchProviderData(); // Refresh bookings
                              }
                            } catch (error: any) {
                              console.error('Error accepting booking:', error);
                              alert('Error accepting booking. Please try again.');
                            }
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={async () => {
                            const reason = prompt('Please provide a reason for declining (optional):');
                            try {
                              const { error } = await rejectBooking(job.id, reason || undefined);
                              if (error) {
                                alert(`Error rejecting booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
                              } else {
                                alert('Booking rejected.');
                                fetchProviderData(); // Refresh bookings
                              }
                            } catch (error: any) {
                              console.error('Error rejecting booking:', error);
                              alert('Error rejecting booking. Please try again.');
                            }
                          }}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {['scheduled', 'accepted'].includes(job.status || '') && (
                      <>
                        <div className="text-sm text-gray-600 italic">
                          Navigate to customer location. OTP will be generated automatically when you arrive at the doorstep (within 10m). 
                          If OTP isn't generated due to routing issues, you can manually request it from the map view.
                        </div>
                        {(() => {
                          const mapCheck = canViewMap(job);
                          return (
                            <button 
                              onClick={() => {
                                const mapCheck = canViewMap(job);
                                if (!mapCheck.allowed) {
                                  alert(mapCheck.reason || 'Map viewing is not available at this time.');
                                  return;
                                }
                                setSelectedBookingForMap({
                                  ...job,
                                  provider_id: userId,
                                  provider: {
                                    id: userId,
                                    name: providerData?.business_name || 'You',
                                    image: providerData?.image || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
                                    phone: providerData?.phone || job.customer_phone
                                  },
                                  service_type: job.service_type || job.service
                                });
                                setShowMap(true);
                              }}
                              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                                mapCheck.allowed 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                              disabled={!mapCheck.allowed}
                              title={mapCheck.allowed ? 'View Map' : mapCheck.reason || 'Map viewing not available'}
                            >
                              <Map className="h-4 w-4" />
                              <span>View Map</span>
                            </button>
                          );
                        })()}
                      </>
                    )}
                    {(job.status || '') === 'arrived' && (
                      <button 
                        onClick={() => {
                          setSelectedBookingForOTP(job);
                          setShowOTPVerification(true);
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Verify OTP & Start Service</span>
                      </button>
                    )}
                    {(job.status || '') === 'in-progress' && (
                      <>
                        {(() => {
                          const mapCheck = canViewMap(job);
                          return (
                            <button 
                              onClick={() => {
                                const mapCheck = canViewMap(job);
                                if (!mapCheck.allowed) {
                                  alert(mapCheck.reason || 'Map viewing is not available at this time.');
                                  return;
                                }
                                setSelectedBookingForMap({
                                  ...job,
                                  provider_id: userId,
                                  provider: {
                                    id: userId,
                                    name: providerData?.business_name || 'You',
                                    image: providerData?.image || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
                                    phone: providerData?.phone || job.customer_phone
                                  },
                                  service: job.service_type || job.service
                                });
                                setShowMap(true);
                              }}
                              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                                mapCheck.allowed 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                              disabled={!mapCheck.allowed}
                              title={mapCheck.allowed ? 'View Map' : mapCheck.reason || 'Map viewing not available'}
                            >
                              <Map className="h-4 w-4" />
                              <span>View Map</span>
                            </button>
                          );
                        })()}
                        <button 
                          onClick={async () => {
                            try {
                              const { error } = await updateBookingStatus(job.id, 'completed');
                              if (error) {
                                alert(`Error completing service: ${error instanceof Error ? error.message : 'Unknown error'}`);
                              } else {
                                alert('Service completed!');
                                fetchProviderData();
                              }
                            } catch (error: any) {
                              console.error('Error completing service:', error);
                              alert('Error completing service. Please try again.');
                            }
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Complete Service
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    {(() => {
                      const mapCheck = canViewMap(job);
                      return (
                        <button 
                          onClick={() => {
                            const mapCheck = canViewMap(job);
                            if (!mapCheck.allowed) {
                              alert(mapCheck.reason || 'Map viewing is not available at this time.');
                              return;
                            }
                            setSelectedBookingForMap({
                              ...job,
                              provider_id: userId,
                              provider: {
                                id: userId,
                                name: providerData?.business_name || 'You',
                                image: providerData?.image || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
                                phone: providerData?.phone || job.customer_phone
                              },
                              service_type: job.service_type || job.service
                            });
                            setShowMap(true);
                          }}
                          className={`font-medium flex items-center space-x-1 ${
                            mapCheck.allowed 
                              ? 'text-blue-600 hover:text-blue-700' 
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                          disabled={!mapCheck.allowed}
                          title={mapCheck.allowed ? 'View Map' : mapCheck.reason || 'Map viewing not available'}
                        >
                          <Map className="h-4 w-4" />
                          <span>View Map</span>
                        </button>
                      );
                    })()}
                    <button className="text-blue-600 hover:text-blue-700 font-medium">
                      View Details
                    </button>
                    <button 
                      onClick={() => window.open(`tel:${job.customer_phone || job.phone || job.user_profiles?.phone || ''}`)}
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Contact Customer
                    </button>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      {/* Location Tracker - Updates provider location while dashboard is open */}
      <ProviderLocationTracker 
        userId={userId} 
        isActive={true}
        updateInterval={5 * 60 * 1000} // Update every 5 minutes
      />
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto relative z-[10000]">
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-6">
                <button onClick={onClose} className="flex items-center text-blue-600 hover:text-blue-700">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back
                </button>
                <h2 className="text-2xl font-bold">Provider Dashboard</h2>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Online</span>
                </div>
              </div>

              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'jobs'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Jobs
                </button>
                <button
                  onClick={() => setActiveTab('earnings')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'earnings'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Earnings
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Profile
                </button>
              </div>
            </div>

            <div className="p-6 pt-0">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading dashboard...</p>
                </div>
              ) : (
                <>
                  {activeTab === 'overview' && renderOverview()}
                  {activeTab === 'jobs' && renderJobs()}
                  {activeTab === 'earnings' && (() => {
                    const completedBookings = bookings.filter((b: any) => b.status === 'completed');
                    const totalEarnings = completedBookings.reduce((sum: number, booking: any) => {
                      return sum + (parseFloat(booking.total_amount) || parseFloat(booking.price) || 0);
                    }, 0);
                    
                    const thisMonthBookings = completedBookings.filter((b: any) => {
                      const bookingDate = new Date(b.booking_date || b.date || b.updated_at || b.created_at);
                      const now = new Date();
                      return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
                    });
                    
                    const thisMonthEarnings = thisMonthBookings.reduce((sum: number, booking: any) => {
                      return sum + (parseFloat(booking.total_amount) || parseFloat(booking.price) || 0);
                    }, 0);
                    
                    return (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                                <DollarSign className="h-6 w-6" />
                              </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">₹{totalEarnings.toLocaleString('en-IN')}</h3>
                            <p className="text-sm text-gray-600">Total Earnings</p>
                            <p className="text-xs text-gray-500 mt-2">{completedBookings.length} completed jobs</p>
                          </div>
                          
                          <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                                <TrendingUp className="h-6 w-6" />
                              </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">₹{thisMonthEarnings.toLocaleString('en-IN')}</h3>
                            <p className="text-sm text-gray-600">This Month</p>
                            <p className="text-xs text-gray-500 mt-2">{thisMonthBookings.length} jobs this month</p>
                          </div>
                          
                          <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                                <CheckCircle className="h-6 w-6" />
                              </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">{completedBookings.length}</h3>
                            <p className="text-sm text-gray-600">Completed Jobs</p>
                            <p className="text-xs text-gray-500 mt-2">All time</p>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg shadow-md p-6">
                          <h3 className="text-lg font-semibold mb-4">Recent Earnings</h3>
                          <div className="space-y-4">
                            {completedBookings.length === 0 ? (
                              <div className="text-center py-8">
                                <p className="text-sm text-gray-500">No completed jobs yet</p>
                                <p className="text-xs text-gray-400 mt-2">Earnings will appear here after completing jobs</p>
                              </div>
                            ) : (
                              completedBookings
                                .sort((a: any, b: any) => {
                                  const dateA = new Date(a.updated_at || a.created_at || a.booking_date || '');
                                  const dateB = new Date(b.updated_at || b.created_at || b.booking_date || '');
                                  return dateB.getTime() - dateA.getTime();
                                })
                                .slice(0, 10)
                                .map((booking: any) => {
                                  const amount = parseFloat(booking.total_amount) || parseFloat(booking.price) || 0;
                                  const date = new Date(booking.updated_at || booking.created_at || booking.booking_date || '');
                                  
                                  return (
                                    <div key={booking.id} className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0">
                                      <div>
                                        <p className="font-semibold text-gray-900">{booking.service_type || booking.service || 'Service'}</p>
                                        <p className="text-sm text-gray-600">{booking.user_profiles?.full_name || 'Customer'}</p>
                                        <p className="text-xs text-gray-500 mt-1">{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-bold text-green-600">₹{amount.toLocaleString('en-IN')}</p>
                                        <p className="text-xs text-gray-500">Completed</p>
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {activeTab === 'profile' && renderProfile()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map View for In-Progress Services */}
      {showMap && selectedBookingForMap && (
        <LiveRouteTracker
          booking={selectedBookingForMap}
          onClose={() => {
            setShowMap(false);
            setSelectedBookingForMap(null);
          }}
          isProvider={true}
        />
      )}

      {/* OTP Verification Modal */}
      {showOTPVerification && selectedBookingForOTP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10050] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Verify Arrival OTP</h3>
              <p className="text-gray-600">
                Please ask the customer for the 6-digit OTP to verify your arrival and start the service.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => {
                    // Only allow numbers and limit to 6 digits
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpInput(value);
                  }}
                  placeholder="000000"
                  className="w-full p-4 text-2xl font-bold text-center tracking-widest border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The customer should have received the OTP when you arrived at their location.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowOTPVerification(false);
                    setSelectedBookingForOTP(null);
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

                    setIsVerifyingOTP(true);
                    try {
                      const { error } = await verifyArrivalOTP(selectedBookingForOTP.id, otpInput);
                      if (error) {
                        alert(`OTP verification failed: ${error instanceof Error ? error.message : 'Invalid OTP. Please try again.'}`);
                        setOtpInput('');
                      } else {
                        alert('✅ OTP verified successfully! Service started.');
                        setShowOTPVerification(false);
                        setSelectedBookingForOTP(null);
                        setOtpInput('');
                        fetchProviderData(); // Refresh bookings
                      }
                    } catch (error: any) {
                      console.error('Error verifying OTP:', error);
                      alert('Error verifying OTP. Please try again.');
                    } finally {
                      setIsVerifyingOTP(false);
                    }
                  }}
                  disabled={otpInput.length !== 6 || isVerifyingOTP}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifyingOTP ? 'Verifying...' : 'Verify & Start Service'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;

export { ProviderDashboard }