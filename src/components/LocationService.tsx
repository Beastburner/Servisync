import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LocationData {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  placeId?: string;
}

interface LocationServiceProps {
  onLocationSelect: (location: LocationData) => void;
  apiKey?: string;
}

export const LocationService: React.FC<LocationServiceProps> = ({ onLocationSelect }) => {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Shows a "refine your location" hint after auto-detect
  const [showRefineHint, setShowRefineHint] = useState(false);
  const [detectedCity, setDetectedCity] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // ── Search (text / PIN code) ──────────────────────────────────────────────
  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Detect 6-digit Indian PIN code → append "India" for postal lookup
      const isPinCode = /^\d{6}$/.test(query.trim());
      const searchQuery = isPinCode ? `${query.trim()} India` : query;

      const params: any = {
        format: 'json',
        q: searchQuery,
        limit: '6',
        addressdetails: '1',
      };
      
      if (isPinCode) {
        params.countrycodes = 'in';
      }

      const searchParams = new URLSearchParams(params);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${searchParams}`,
        { headers: { 'Accept': 'application/json', 'Accept-Language': 'en' } }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data && data.length > 0 ? data : []);
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    setShowSuggestions(true);
    setShowRefineHint(false); // hide hint once user starts typing

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => searchPlaces(value), 300);
  };

  const handleSuggestionClick = (suggestion: any) => {
    const location: LocationData = {
      address: suggestion.display_name,
      coordinates: {
        lat: parseFloat(suggestion.lat),
        lng: parseFloat(suggestion.lon),
      },
      placeId: suggestion.place_id?.toString(),
    };

    setAddress(suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    setShowRefineHint(false);
    onLocationSelect(location);
  };

  // ── Reverse geocode lat/lng → address ────────────────────────────────────
  const resolveAndSelect = async (
    latitude: number,
    longitude: number,
    isApproximate = false
  ) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { 'Accept': 'application/json', 'Accept-Language': 'en' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          const location: LocationData = {
            address: data.display_name,
            coordinates: { lat: latitude, lng: longitude },
            placeId: data.place_id?.toString(),
          };

          // Extract city for the refine hint
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            data.display_name.split(',')[0];

          setAddress(data.display_name);
          onLocationSelect(location);

          if (isApproximate) {
            setDetectedCity(city);
            setShowRefineHint(true);
            // Focus input so user can immediately type PIN code
            setTimeout(() => inputRef.current?.focus(), 100);
          }
          return;
        }
      }
    } catch (e) {
      console.error('Nominatim reverse geocode failed:', e);
    }

    // Fallback
    const label = `My Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    setAddress(label);
    onLocationSelect({ address: label, coordinates: { lat: latitude, lng: longitude } });
    if (isApproximate) {
      setDetectedCity('your area');
      setShowRefineHint(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Auto-detect location ──────────────────────────────────────────────────
  const getCurrentLocation = async () => {
    setIsLoading(true);
    setShowRefineHint(false);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log('🛰️ Browser location accuracy:', accuracy, 'm');

          // Only trust browser location if accuracy < 500m (true GPS fix)
          // On a laptop, accuracy is typically 1000–20000m (WiFi triangulation)
          if (accuracy < 500) {
            console.log('✅ GPS fix — using browser location');
            await resolveAndSelect(latitude, longitude, false);
          } else {
            // No good option — use browser location anyway with refine prompt
            await resolveAndSelect(latitude, longitude, true);
          }
          setIsLoading(false);
        },
        async (error) => {
          console.warn('Browser geolocation error:', error.message);
          const msg =
            error.code === 1
              ? 'Location access denied. Please allow location in browser settings, or type your area/PIN code below.'
              : 'Could not detect location. Please type your area or PIN code.';
          alert(msg);
          setIsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      alert('Location detection not supported. Please type your area or PIN code.');
      setIsLoading(false);
    }
  };

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Input row */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={address}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Enter area, locality or PIN code..."
          className="w-full pl-12 pr-12 py-3 text-base md:text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
          title="Detect my location"
        >
          {isLoading ? (
            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Refine hint — shown after auto-detect on non-GPS devices */}
      {showRefineHint && (
        <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium text-amber-800">Approximate location detected near {detectedCity}.</span>
            <span className="text-amber-700"> For accuracy, type your </span>
            <button
              className="text-blue-600 underline font-medium"
              onClick={() => {
                setAddress('');
                setSuggestions([]);
                setShowSuggestions(false);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
            >
              PIN code or area name
            </button>
            <span className="text-amber-700"> above.</span>
          </div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || (isLoading && address.length > 0)) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
              Searching...
            </div>
          )}

          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
            >
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">
                    {suggestion.name || suggestion.display_name.split(',')[0]}
                  </div>
                  <div className="text-sm text-gray-500">{suggestion.display_name}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};