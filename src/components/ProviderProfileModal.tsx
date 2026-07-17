import React, { useEffect, useState } from 'react';
import { X, Star, Clock, Navigation, Shield, Award, MapPin } from 'lucide-react';

interface ProviderProfileModalProps {
  provider: any;
  isOpen: boolean;
  onClose: () => void;
  onBook: () => void;
}

export const ProviderProfileModal: React.FC<ProviderProfileModalProps> = ({ provider, isOpen, onClose, onBook }) => {
  if (!isOpen || !provider) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden relative">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto pb-6">
          <div className="px-6 sm:px-8 relative">
            <img
              src={provider.image}
              alt={provider.name}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white shadow-lg -mt-12 sm:-mt-16 relative z-10 bg-white"
            />
            
            <div className="mt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{provider.name}</h2>
                <p className="text-blue-600 font-medium text-lg">{provider.service}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1 font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    <Star className="h-4 w-4 fill-current" /> {provider.rating} Rating
                  </span>
                  <span className="flex items-center gap-1"><Navigation className="h-4 w-4" /> {provider.distance} away</span>
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {provider.eta} ETA</span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Starting from</p>
                <p className="text-3xl font-bold text-green-600">{provider.price}</p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6 mt-8">
              {/* About Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">About the Professional</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {provider.name} is a highly rated professional offering premium {provider.service} services. 
                  Committed to delivering excellent results with top-notch customer satisfaction.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Shield className="w-4 h-4 text-green-500" /> Background Verified
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Award className="w-4 h-4 text-blue-500" /> Top Rated Professional
                  </div>
                </div>
              </div>

              {/* Services List */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Services & Pricing</h3>
                <div className="space-y-3">
                  {provider.services && provider.services.length > 0 ? (
                    provider.services.map((svc: any) => (
                      <div key={svc.id || svc.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{svc.name}</p>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">₹{svc.price}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="font-medium text-gray-900 text-sm">Standard {provider.service}</p>
                      <span className="font-bold text-gray-900 text-sm">{provider.price}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
            Close
          </button>
          <button onClick={onBook} className="px-8 py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors">
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};
