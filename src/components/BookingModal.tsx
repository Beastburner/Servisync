import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, MapPin, Navigation, Loader, CheckCircle, XCircle } from 'lucide-react';
import { LiveRouteTracker } from './LiveRouteTracker';
import { subscribeToBooking } from '../lib/supabase';

// Time Picker Component
interface TimePickerProps {
  selectedHour: number;
  selectedMinute: number;
  selectedPeriod: string;
  minAllowedTime: { hour24: number; minute: number } | null;
  onTimeChange: (hour: number, minute: number, period: string) => void;
}

const TimePicker: React.FC<TimePickerProps> = ({
  selectedHour,
  selectedMinute,
  selectedPeriod,
  minAllowedTime,
  onTimeChange
}) => {
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate hours (1-12)
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate minutes (0-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  
  const periods = ['AM', 'PM'];

  // Check if a time is allowed (for today's date)
  const isTimeAllowed = (hour: number, minute: number, period: string) => {
    if (!minAllowedTime) return true;
    
    // Convert to 24-hour format
    let hour24 = hour;
    if (period === 'PM' && hour !== 12) hour24 = hour + 12;
    if (period === 'AM' && hour === 12) hour24 = 0;
    
    const totalMinutes = hour24 * 60 + minute;
    const minTotalMinutes = minAllowedTime.hour24 * 60 + minAllowedTime.minute;
    
    return totalMinutes >= minTotalMinutes;
  };

  // Scroll to selected item on mount (only once)
  useEffect(() => {
    const scrollToItem = (ref: React.RefObject<HTMLDivElement>, value: number | string) => {
      if (ref.current) {
        const container = ref.current;
        const item = container.querySelector(`[data-item][data-value="${value}"]`) as HTMLElement;
        if (item) {
          const scrollPosition = item.offsetTop - (container.clientHeight / 2) + (item.offsetHeight / 2);
          container.scrollTo({ top: scrollPosition, behavior: 'auto' });
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(() => {
      scrollToItem(hoursRef, selectedHour);
      scrollToItem(minutesRef, selectedMinute);
      scrollToItem(periodRef, selectedPeriod);
    }, 100);

    return () => clearTimeout(timeout);
  }, []); // Only on mount

  // Apple-style scroll end detection
  const onScrollEnd = (
    ref: React.RefObject<HTMLDivElement>,
    type: 'hour' | 'minute' | 'period'
  ) => {
    if (!ref.current) return;

    const container = ref.current;
    const center = container.scrollTop + container.clientHeight / 2;

    const items = container.querySelectorAll('[data-item]');

    let closest: HTMLElement | null = null;
    let minDist = Infinity;

    for (let i = 0; i < items.length; i++) {
      const element = items[i] as HTMLElement;
      const elCenter = element.offsetTop + element.offsetHeight / 2;
      const dist = Math.abs(center - elCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = element;
      }
    }

    if (!closest) return;

    const value = closest.getAttribute('data-value');
    if (!value) return;

    if (type === 'hour') {
      const newHour = parseInt(value);
      if (!isNaN(newHour) && newHour !== selectedHour && isTimeAllowed(newHour, selectedMinute, selectedPeriod)) {
        onTimeChange(newHour, selectedMinute, selectedPeriod);
      }
    } else if (type === 'minute') {
      const newMinute = parseInt(value);
      if (!isNaN(newMinute) && newMinute !== selectedMinute && isTimeAllowed(selectedHour, newMinute, selectedPeriod)) {
        onTimeChange(selectedHour, newMinute, selectedPeriod);
      }
    } else if (type === 'period') {
      if (value !== selectedPeriod && isTimeAllowed(selectedHour, selectedMinute, value)) {
        onTimeChange(selectedHour, selectedMinute, value);
      }
    }
  };

  // Format time helper
  const formatTime = (hour: number, minute: number, period: string) => {
    return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-center items-center gap-2 h-64 relative">
        {/* Hours Column */}
        <div className="flex-1 h-full relative">
          <div
            ref={hoursRef}
            className="h-full overflow-y-auto scrollbar-hide time-wheel"
            onScroll={() => {
              if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
              scrollTimeoutRef.current = setTimeout(() => {
                onScrollEnd(hoursRef, 'hour');
              }, 120);
            }}
          >
            {/* Top padding for better scrolling */}
            <div className="h-[100px]" data-padding="true" />
            {hours.map((hour) => {
              const allowed = isTimeAllowed(hour, selectedMinute, selectedPeriod);
              const isSelected = hour === selectedHour;
              
              return (
                <div
                  key={hour}
                  data-item
                  data-value={hour}
                  className={`time-item h-[50px] flex items-center justify-center text-xl font-medium transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'text-white font-bold scale-110'
                      : allowed
                      ? 'text-gray-400'
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (allowed) {
                      onTimeChange(hour, selectedMinute, selectedPeriod);
                      // Let CSS snap handle the scroll
                      const item = hoursRef.current?.querySelector(`[data-item][data-value="${hour}"]`) as HTMLElement;
                      if (item && hoursRef.current) {
                        const scrollPosition = item.offsetTop - (hoursRef.current.clientHeight / 2) + (item.offsetHeight / 2);
                        hoursRef.current.scrollTo({ top: scrollPosition, behavior: 'smooth' });
                      }
                    }
                  }}
                >
                  {hour}
                </div>
              );
            })}
            {/* Bottom padding for better scrolling */}
            <div className="h-[100px]" data-padding="true" />
          </div>
        </div>

        {/* Minutes Column */}
        <div className="flex-1 h-full relative">
          <div
            ref={minutesRef}
            className="h-full overflow-y-auto scrollbar-hide time-wheel"
            onScroll={() => {
              if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
              scrollTimeoutRef.current = setTimeout(() => {
                onScrollEnd(minutesRef, 'minute');
              }, 120);
            }}
          >
            {/* Top padding for better scrolling */}
            <div className="h-[100px]" data-padding="true" />
            {minutes.map((minute) => {
              const allowed = isTimeAllowed(selectedHour, minute, selectedPeriod);
              const isSelected = minute === selectedMinute;
              
              return (
                <div
                  key={minute}
                  data-item
                  data-value={minute}
                  className={`time-item h-[50px] flex items-center justify-center text-xl font-medium transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'text-white font-bold scale-110'
                      : allowed
                      ? 'text-gray-400'
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (allowed) {
                      onTimeChange(selectedHour, minute, selectedPeriod);
                      // Let CSS snap handle the scroll
                      const item = minutesRef.current?.querySelector(`[data-item][data-value="${minute}"]`) as HTMLElement;
                      if (item && minutesRef.current) {
                        const scrollPosition = item.offsetTop - (minutesRef.current.clientHeight / 2) + (item.offsetHeight / 2);
                        minutesRef.current.scrollTo({ top: scrollPosition, behavior: 'smooth' });
                      }
                    }
                  }}
                >
                  {minute.toString().padStart(2, '0')}
                </div>
              );
            })}
            {/* Bottom padding for better scrolling */}
            <div className="h-[100px]" data-padding="true" />
          </div>
        </div>

        {/* AM/PM Column */}
        <div className="flex-1 h-full relative">
          <div
            ref={periodRef}
            className="h-full overflow-y-auto scrollbar-hide time-wheel"
            onScroll={() => {
              if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
              scrollTimeoutRef.current = setTimeout(() => {
                onScrollEnd(periodRef, 'period');
              }, 120);
            }}
          >
            {/* Top padding for better scrolling */}
            <div className="h-[100px]" data-padding="true" />
            {periods.map((period) => {
              const allowed = isTimeAllowed(selectedHour, selectedMinute, period);
              const isSelected = period === selectedPeriod;
              
              return (
                <div
                  key={period}
                  data-item
                  data-value={period}
                  className={`time-item h-[50px] flex items-center justify-center text-xl font-medium transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'text-white font-bold scale-110'
                      : allowed
                      ? 'text-gray-400'
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (allowed) {
                      onTimeChange(selectedHour, selectedMinute, period);
                      // Let CSS snap handle the scroll
                      const item = periodRef.current?.querySelector(`[data-item][data-value="${period}"]`) as HTMLElement;
                      if (item && periodRef.current) {
                        const scrollPosition = item.offsetTop - (periodRef.current.clientHeight / 2) + (item.offsetHeight / 2);
                        periodRef.current.scrollTo({ top: scrollPosition, behavior: 'smooth' });
                      }
                    }
                  }}
                >
                  {period}
                </div>
              );
            })}
            {/* Bottom padding for better scrolling */}
            <div className="h-[100px]" data-padding="true" />
          </div>
        </div>

        {/* Highlight overlay for selected row */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[50px] bg-gray-600/30 rounded-lg pointer-events-none z-0" />
      </div>
      
      {/* Selected time display */}
      <div className="mt-4 text-center">
        <div className="text-white text-lg font-semibold">
          Selected: {formatTime(selectedHour, selectedMinute, selectedPeriod)}
        </div>
        {minAllowedTime && (
          <div className="text-gray-400 text-sm mt-1">
            Minimum: {formatTime(
              minAllowedTime.hour24 > 12 ? minAllowedTime.hour24 - 12 : (minAllowedTime.hour24 === 0 ? 12 : minAllowedTime.hour24),
              minAllowedTime.minute,
              minAllowedTime.hour24 >= 12 ? 'PM' : 'AM'
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: any;
  service: string;
  onBookingConfirm: (bookingData: any) => void;
  apiKey: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({ 
  isOpen, 
  onClose, 
  provider, 
  service,
  onBookingConfirm,
  apiKey
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [currentLocationAddress, setCurrentLocationAddress] = useState<string>('');
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<string>('pending');
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    address: '',
    phone: '',
    notes: '',
    paymentMethod: 'cash'
  });

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current body overflow style
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // Disable body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore original overflow style when modal closes
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Subscribe to booking status updates when we have a confirmed booking
  useEffect(() => {
    if (confirmedBooking?.id && currentStep === 4) {
      console.log('📡 Subscribing to booking status updates for:', confirmedBooking.id);
      const unsubscribe = subscribeToBooking(confirmedBooking.id, (updatedBooking) => {
        if (updatedBooking) {
          console.log('📡 Booking status updated:', updatedBooking.status);
          setBookingStatus(updatedBooking.status);
          setConfirmedBooking((prev: any) => ({
            ...prev,
            ...updatedBooking,
            status: updatedBooking.status
          }));
          
          // If booking is accepted, show a success message
          if (updatedBooking.status === 'accepted' || updatedBooking.status === 'scheduled') {
            // Status will be shown in the UI automatically
          }
          
          // If booking is rejected, show rejection message
          if (updatedBooking.status === 'rejected') {
            // Status will be shown in the UI automatically
          }
        }
      });
      
      return () => {
        console.log('📡 Unsubscribing from booking updates');
        unsubscribe();
      };
    }
  }, [confirmedBooking?.id, currentStep]);

  // Parse time string to get hour, minute, and period
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: 12, minute: 0, period: 'AM' };
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      return {
        hour: parseInt(match[1]),
        minute: parseInt(match[2]),
        period: match[3].toUpperCase()
      };
    }
    return { hour: 12, minute: 0, period: 'AM' };
  };

  // Format time from hour, minute, period
  const formatTime = (hour: number, minute: number, period: string) => {
    return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // Get minimum allowed time for today (30 minutes from now)
  const getMinAllowedTime = () => {
    if (!bookingData.date) return null;
    
    const selectedDate = new Date(bookingData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate.getTime() === today.getTime()) {
      const now = new Date();
      const minTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      return {
        hour24: minTime.getHours(),
        minute: minTime.getMinutes()
      };
    }
    return null;
  };

  const minAllowedTime = getMinAllowedTime();
  
  // Initialize with a sensible default time if not set
  const getDefaultTime = () => {
    if (bookingData.time) {
      return parseTime(bookingData.time);
    }
    
    // If no time set, use minimum allowed time for today, or default to 12:00 PM
    if (minAllowedTime) {
      const hour24 = minAllowedTime.hour24;
      const minute = minAllowedTime.minute;
      let hour = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
      const period = hour24 >= 12 ? 'PM' : 'AM';
      return { hour, minute, period };
    }
    
    return { hour: 12, minute: 0, period: 'PM' };
  };
  
  // Update bookingData.time if it's not set or date changed
  useEffect(() => {
    if (!bookingData.time) {
      // Recalculate minAllowedTime inside effect to get fresh value
      const selectedDate = bookingData.date ? new Date(bookingData.date) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let calculatedMinTime = null;
      if (selectedDate) {
        selectedDate.setHours(0, 0, 0, 0);
        if (selectedDate.getTime() === today.getTime()) {
          const now = new Date();
          const minTime = new Date(now.getTime() + 30 * 60 * 1000);
          calculatedMinTime = {
            hour24: minTime.getHours(),
            minute: minTime.getMinutes()
          };
        }
      }
      
      // Calculate default time
      let defaultTime;
      if (calculatedMinTime) {
        const hour24 = calculatedMinTime.hour24;
        const minute = calculatedMinTime.minute;
        let hour = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
        const period = hour24 >= 12 ? 'PM' : 'AM';
        defaultTime = { hour, minute, period };
      } else {
        defaultTime = { hour: 12, minute: 0, period: 'PM' };
      }
      
      const timeStr = formatTime(defaultTime.hour, defaultTime.minute, defaultTime.period);
      setBookingData(prev => {
        if (!prev.time) {
          return { ...prev, time: timeStr };
        }
        return prev;
      });
    }
  }, [bookingData.date, bookingData.time]);

  // Calculate currentTime for TimePicker (after all hooks)
  const currentTime = getDefaultTime();

  if (!isOpen) return null;

  const getCurrentLocationAddress = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLoadingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use Nominatim (OpenStreetMap) Reverse Geocoding API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              const address = data.display_name;
              setCurrentLocationAddress(address);
              // Store both address and coordinates
              setBookingData(prev => ({ 
                ...prev, 
                address,
                user_latitude: latitude,
                user_longitude: longitude
              }));
            } else {
              alert('Unable to get address for current location');
            }
          } else {
            alert('Error fetching location address');
          }
        } catch (error) {
          console.error('Error getting current location address:', error);
          alert('Error getting current location address');
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting current location:', error);
        setIsLoadingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Location access denied by user.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            alert('Location request timed out.');
            break;
          default:
            alert('An unknown error occurred while getting location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handleInputChange = (field: string, value: string) => {
    setBookingData(prev => {
      const updated = { ...prev, [field]: value };
      // If date changes, reset time to ensure it's valid for the new date
      if (field === 'date' && prev.date !== value) {
        updated.time = '';
      }
      return updated;
    });
  };

  const handleNextStep = async () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Confirm booking - save to Firestore first
      setIsSavingBooking(true);
      
      const booking = {
        id: Date.now().toString(),
        provider_id: provider.id || provider.user_id,
        provider: {
          id: provider.id || provider.user_id,
          name: provider.name || provider.business_name,
          image: provider.image
        },
        service,
        ...bookingData,
        status: 'pending', // Provider must accept the booking
        createdAt: new Date().toISOString()
      };
      
      try {
        // Call onBookingConfirm which saves to Firestore and returns the created booking
        const result: any = await onBookingConfirm(booking);
        
        // Get the booking ID from the result
        // createBooking returns { data: { id, ... }, error }
        const createdBooking = result?.data || result;
        const createdBookingId = createdBooking?.id || booking.id;
        
        console.log('📝 Booking created with ID:', createdBookingId);
        console.log('📝 Full booking result:', result);
        
        // Set confirmed booking with pending status
        const confirmedBookingData = {
          ...booking,
          id: createdBookingId,
          status: 'pending',
          ...createdBooking // Include all booking data from Firestore
        };
        setConfirmedBooking(confirmedBookingData);
        setBookingStatus('pending');
        
        // Show success message
        setCurrentStep(4);
      } catch (error) {
        console.error('Error saving booking:', error);
        alert('Error saving booking. Please try again.');
      } finally {
        setIsSavingBooking(false);
      }
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return bookingData.date && bookingData.time;
      case 2:
        return bookingData.address && bookingData.phone;
      case 3:
        return bookingData.paymentMethod;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={bookingData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Time
              </label>
              <TimePicker
                selectedHour={currentTime.hour}
                selectedMinute={currentTime.minute}
                selectedPeriod={currentTime.period}
                minAllowedTime={minAllowedTime}
                onTimeChange={(hour, minute, period) => {
                  const timeStr = formatTime(hour, minute, period);
                  handleInputChange('time', timeStr);
                }}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Address
              </label>
              
              {/* Current Location Button */}
              <div className="mb-3">
                <button
                  type="button"
                  onClick={getCurrentLocationAddress}
                  disabled={isLoadingLocation}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingLocation ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  <span>
                    {isLoadingLocation ? 'Getting location...' : 'Use Current Location'}
                  </span>
                </button>
              </div>
              
              {/* Address Input */}
              <textarea
                value={bookingData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder={currentLocationAddress ? "Current location address loaded above, or enter a different address" : "Enter your complete address"}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              
              {/* Show current location address if available */}
              {currentLocationAddress && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Current Location:</p>
                      <p className="text-sm text-green-700">{currentLocationAddress}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={bookingData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={bookingData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any specific requirements or instructions"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Payment Method
              </label>
              <div className="space-y-3">
                {[
                  { id: 'cash', name: 'Cash on Delivery', desc: 'Pay after service completion' },
                  { id: 'card', name: 'Credit/Debit Card', desc: 'Secure online payment' },
                  { id: 'upi', name: 'UPI', desc: 'Pay via UPI apps' },
                  { id: 'wallet', name: 'Digital Wallet', desc: 'Paytm, PhonePe, etc.' }
                ].map((method) => (
                  <div
                    key={method.id}
                    onClick={() => handleInputChange('paymentMethod', method.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      bookingData.paymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        bookingData.paymentMethod === method.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {bookingData.paymentMethod === method.id && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-sm text-gray-600">{method.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Booking Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Provider:</span>
                  <span className="font-medium">{provider?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{bookingData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{bookingData.time}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-lg">{provider?.price}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        // Determine status display based on real-time updates
        const isAccepted = bookingStatus === 'accepted' || bookingStatus === 'scheduled';
        const isRejected = bookingStatus === 'rejected';
        const isPending = bookingStatus === 'pending' || !bookingStatus;
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              {isAccepted ? (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-green-600">Booking Confirmed! ✅</h3>
                  <p className="text-gray-600 mb-4">The provider has accepted your booking request. Your service is confirmed!</p>
                </>
              ) : isRejected ? (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-red-600">Booking Rejected</h3>
                  <p className="text-gray-600 mb-4">Unfortunately, the provider has declined your booking request.</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-orange-600 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-orange-600">Booking Request Sent!</h3>
                  <p className="text-gray-600 mb-4">Your booking request has been sent to the provider. They will review and accept it shortly.</p>
                </>
              )}
            </div>
            
            {/* Status Message - Updates in real-time */}
            {isAccepted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Booking Accepted!</p>
                    <p className="text-xs text-green-700 mt-1">
                      Your booking has been confirmed. You can track the provider's location once the service starts.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {isRejected && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Booking Rejected</p>
                    <p className="text-xs text-red-700 mt-1">
                      The provider has declined your booking request. You can try booking with another provider.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {isPending && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Waiting for Provider Acceptance</p>
                    <p className="text-xs text-orange-700 mt-1">
                      The provider will review your request and accept it. This page will update automatically when they respond.
                      You can close this window and check your bookings dashboard - the status will update there too.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-semibold mb-4">Booking Details</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Provider:</span>
                  <span className="font-medium">{provider?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{bookingData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{bookingData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    isAccepted ? 'text-green-600' : 
                    isRejected ? 'text-red-600' : 
                    'text-orange-600'
                  }`}>
                    {isAccepted ? 'Accepted' : 
                     isRejected ? 'Rejected' : 
                     'Pending'}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-lg">{provider?.price}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {isAccepted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>✅ Confirmed!</strong> Your booking is confirmed. You can track the provider's location once the service starts.
                  </p>
                </div>
              )}
              {isPending && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You can track the provider's location once they accept your request and it's time for your scheduled service.
                    You can close this window and check your bookings dashboard - the status will update automatically.
                  </p>
                </div>
              )}
              <button
                onClick={() => {
                  onClose();
                  // Reset form
                  setCurrentStep(1);
                  setCurrentLocationAddress('');
                  setBookingData({
                    date: '',
                    time: '',
                    address: '',
                    phone: '',
                    notes: '',
                    paymentMethod: 'cash'
                  });
                  setConfirmedBooking(null);
                  setShowLiveTracking(false);
                }}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = ['Date & Time', 'Address & Contact', 'Payment & Confirm'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Book {provider?.name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {stepTitles.map((title, index) => (
              <div key={index} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep > index + 1
                    ? 'bg-green-600 text-white'
                    : currentStep === index + 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > index + 1 ? '✓' : index + 1}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= index + 1 ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {title}
                  </p>
                </div>
                {index < stepTitles.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > index + 1 ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Provider Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <img
                src={provider?.image}
                alt={provider?.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-900">{provider?.name}</h3>
                <p className="text-sm text-gray-600">{service}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>⭐ {provider?.rating}</span>
                  <span>📍 {provider?.distance}</span>
                  <span>⏱️ {provider?.eta}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-6">
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            {currentStep > 1 && currentStep < 4 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Previous
              </button>
            )}
            {currentStep < 4 && <button
              onClick={handleNextStep}
              disabled={!canProceed() || isSavingBooking}
              className={`px-6 py-3 rounded-lg font-semibold ml-auto flex items-center space-x-2 ${
                canProceed() && !isSavingBooking
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSavingBooking ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Saving Request...</span>
                </>
              ) : (
                <span>{currentStep === 3 ? 'Send Booking Request' : 'Next'}</span>
              )}
            </button>}
          </div>
        </div>
      </div>

      {/* Live Route Tracker - Only show if booking is accepted/scheduled/in-progress */}
      {showLiveTracking && confirmedBooking && 
       confirmedBooking.status && 
       ['accepted', 'scheduled', 'in-progress'].includes(confirmedBooking.status) && (
       <div className="fixed inset-0 z-[10050] bg-white">
    <LiveRouteTracker
      booking={confirmedBooking}
      onClose={() => setShowLiveTracking(false)}
      apiKey={apiKey}
    />
  </div>
      )}
    </div>
  );
}; 