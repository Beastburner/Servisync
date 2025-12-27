import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Save } from 'lucide-react';
import { getProviderServices, addProviderService, updateProviderService, deleteProviderService } from '../lib/supabase';

interface Service {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface ServiceManagementModalProps {
  userId: string;
  onClose: () => void;
}

const ServiceManagementModal: React.FC<ServiceManagementModalProps> = ({ userId, onClose }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', description: '' });

  useEffect(() => {
    fetchServices();
  }, [userId]);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await getProviderServices(userId);
      if (error) {
        console.error('Error fetching services:', error);
        alert('Error loading services. Please try again.');
      } else {
        setServices(data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      alert('Error loading services. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!formData.name.trim() || !formData.price) {
      alert('Please fill in service name and price');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    try {
      const { data, error } = await addProviderService(userId, {
        name: formData.name.trim(),
        price: price,
        description: formData.description.trim() || undefined,
      });

      if (error) {
        alert(`Error adding service: ${error.message || 'Unknown error'}`);
      } else {
        setFormData({ name: '', price: '', description: '' });
        setShowAddForm(false);
        fetchServices();
      }
    } catch (error: any) {
      alert(`Error adding service: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUpdateService = async (serviceId: string) => {
    if (!formData.name.trim() || !formData.price) {
      alert('Please fill in service name and price');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    try {
      const { data, error } = await updateProviderService(userId, serviceId, {
        name: formData.name.trim(),
        price: price,
        description: formData.description.trim() || undefined,
      });

      if (error) {
        alert(`Error updating service: ${error.message || 'Unknown error'}`);
      } else {
        setEditingId(null);
        setFormData({ name: '', price: '', description: '' });
        fetchServices();
      }
    } catch (error: any) {
      alert(`Error updating service: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      const { error } = await deleteProviderService(userId, serviceId);
      if (error) {
        alert(`Error deleting service: ${error.message || 'Unknown error'}`);
      } else {
        fetchServices();
      }
    } catch (error: any) {
      alert(`Error deleting service: ${error.message || 'Unknown error'}`);
    }
  };

  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      description: service.description || '',
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', price: '', description: '' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Manage Services & Prices</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading services...</p>
            </div>
          ) : (
            <>
              {/* Add Service Button */}
              {!showAddForm && !editingId && (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setFormData({ name: '', price: '', description: '' });
                  }}
                  className="mb-6 w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add New Service</span>
                </button>
              )}

              {/* Add Service Form */}
              {showAddForm && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Service</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Deep Cleaning, AC Repair"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (₹) *
                      </label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="e.g., 500"
                        min="0"
                        step="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of the service"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleAddService}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Service</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setFormData({ name: '', price: '', description: '' });
                        }}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Services List */}
              <div className="space-y-4">
                {services.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-2">No services added yet</p>
                    <p className="text-sm text-gray-500">Click "Add New Service" to get started</p>
                  </div>
                ) : (
                  services.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      {editingId === service.id ? (
                        // Edit Form
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Service Name *
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Price (₹) *
                            </label>
                            <input
                              type="number"
                              value={formData.price}
                              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                              min="0"
                              step="1"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description (Optional)
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleUpdateService(service.id)}
                              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                            >
                              <Save className="w-4 h-4" />
                              <span>Save Changes</span>
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display Mode
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {service.name}
                            </h3>
                            {service.description && (
                              <p className="text-gray-600 mb-3">{service.description}</p>
                            )}
                            <div className="flex items-center space-x-4">
                              <div>
                                <span className="text-sm text-gray-500">Price:</span>
                                <span className="ml-2 text-xl font-bold text-green-600">
                                  ₹{service.price}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => startEdit(service)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                              title="Edit Service"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                              title="Delete Service"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceManagementModal;

