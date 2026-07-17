import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Shield, Info, Loader } from 'lucide-react';
import { getAllAvailableServices } from '../lib/supabase';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookService: (serviceName: string) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onBookService }) => {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getAllAvailableServices();
      if (!error && data) {
        // Deduplicate services by name to show base prices
        const uniqueServices = Array.from(new Map(data.map((item: any) => [item.service_type || item.service, item])).values());
        setServices(uniqueServices);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[12000] p-4 sm:p-6 backdrop-blur-sm">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] relative overflow-hidden">
        
        {/* Header */}
        <div className="bg-white px-6 py-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0 relative z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Transparent Pricing</h2>
            <p className="text-sm text-gray-500 mt-1">No hidden fees. See exactly what you'll pay.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors bg-gray-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Pricing Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          <div className="flex items-start gap-3 p-4 mb-8 bg-blue-50 border border-blue-100 rounded-xl text-blue-800">
            <Shield className="w-6 h-6 flex-shrink-0 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold">Our Price Guarantee</h4>
              <p className="text-sm mt-1 text-blue-700">The prices listed below are starting estimates based on local providers. You will always see the exact final price from your chosen provider before you confirm your booking.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Loading transparent prices...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((svc: any, index: number) => {
                const serviceName = svc.service_type || svc.service || 'Service';
                return (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-900 capitalize">{serviceName}</h3>
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                          Starting at
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {svc.description || `Professional ${serviceName} services by verified experts.`}
                      </p>
                      
                      <div className="flex items-end justify-between mt-6">
                        <div>
                          <p className="text-3xl font-extrabold text-blue-600">₹{svc.price || '499'}</p>
                          <p className="text-xs text-gray-500 font-medium">Estimated base price</p>
                        </div>
                        <button
                          onClick={() => onBookService(serviceName)}
                          className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          Find Provider
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                      <ul className="space-y-2">
                        <li className="flex items-center text-xs text-gray-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mr-2" /> Verified Professionals
                        </li>
                        <li className="flex items-center text-xs text-gray-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mr-2" /> Pay After Service
                        </li>
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {!isLoading && services.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-lg">No services found</p>
              <p className="text-gray-400 text-sm mt-1">Providers haven't listed any services yet.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
