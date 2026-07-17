import React, { useState, useEffect } from 'react';
import { X, Shield, Search, CheckCircle, XCircle } from 'lucide-react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const providersRef = collection(db, 'service_providers');
      const snapshot = await getDocs(providersRef);
      const providersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProviders(providersList);
    } catch (error) {
      console.error('Error fetching providers:', error);
      alert('Error fetching providers');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVerification = async (providerId: string, currentStatus: boolean) => {
    try {
      const providerRef = doc(db, 'service_providers', providerId);
      await updateDoc(providerRef, {
        is_verified: !currentStatus
      });
      
      // Update local state
      setProviders(providers.map(p => 
        p.id === providerId ? { ...p, is_verified: !currentStatus } : p
      ));
    } catch (error) {
      console.error('Error updating verification status:', error);
      alert('Failed to update verification status');
    }
  };

  const filteredProviders = providers.filter(p => 
    p.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm) ||
    p.service_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-gray-50 z-[1000] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Service Providers Verification</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                  <th className="p-4 font-semibold">Business Name</th>
                  <th className="p-4 font-semibold">Service Type</th>
                  <th className="p-4 font-semibold">Phone</th>
                  <th className="p-4 font-semibold">Jobs Completed</th>
                  <th className="p-4 font-semibold">Rating</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                      Loading providers...
                    </td>
                  </tr>
                ) : filteredProviders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No providers found.
                    </td>
                  </tr>
                ) : (
                  filteredProviders.map(provider => (
                    <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{provider.business_name}</td>
                      <td className="p-4 text-gray-600 capitalize">{provider.service_type}</td>
                      <td className="p-4 text-gray-600">{provider.phone}</td>
                      <td className="p-4 text-gray-600">{provider.total_jobs_completed || 0}</td>
                      <td className="p-4 text-gray-600">{provider.rating ? provider.rating.toFixed(1) : 'N/A'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          provider.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {provider.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => toggleVerification(provider.id, provider.is_verified)}
                          className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white ${
                            provider.is_verified ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {provider.is_verified ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1.5" />
                              Revoke
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                              Verify
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
