import React from 'react';
import { 
  Home, 
  Wrench, 
  Sparkles, 
  Zap, 
  Paintbrush, 
  Car, 
  Laptop, 
  Scissors,
  Star,
  Clock
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  price: string;
  rating: number;
  duration: string;
  color: string;
}

interface ServiceCategoriesProps {
  onServiceSelect: (service: Service) => void;
}

const ServiceCategories: React.FC<ServiceCategoriesProps> = ({ onServiceSelect }) => {
  const services: Service[] = [
    {
      id: 'cleaning',
      name: 'Home Cleaning',
      icon: Sparkles,
      description: 'Professional deep cleaning services',
      price: '₹299',
      rating: 4.8,
      duration: '2-3 hours',
      color: 'from-blue-400 to-blue-600'
    },
    {
      id: 'repair',
      name: 'Home Repairs',
      icon: Wrench,
      description: 'Plumbing, electrical, and general repairs',
      price: '₹199',
      rating: 4.7,
      duration: '1-2 hours',
      color: 'from-green-400 to-green-600'
    },
    {
      id: 'electrical',
      name: 'Electrical Services',
      icon: Zap,
      description: 'Wiring, installations, and repairs',
      price: '₹149',
      rating: 4.9,
      duration: '1 hour',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      id: 'painting',
      name: 'Painting',
      icon: Paintbrush,
      description: 'Interior and exterior painting',
      price: '₹499',
      rating: 4.6,
      duration: '4-6 hours',
      color: 'from-purple-400 to-purple-600'
    },
    {
      id: 'appliance',
      name: 'Appliance Repair',
      icon: Home,
      description: 'AC, refrigerator, washing machine repairs',
      price: '₹249',
      rating: 4.8,
      duration: '1-2 hours',
      color: 'from-red-400 to-red-600'
    },
    {
      id: 'automotive',
      name: 'Car Services',
      icon: Car,
      description: 'Car washing, detailing, and repairs',
      price: '₹399',
      rating: 4.5,
      duration: '2-3 hours',
      color: 'from-indigo-400 to-indigo-600'
    },
    {
      id: 'tech',
      name: 'Tech Support',
      icon: Laptop,
      description: 'Computer and device troubleshooting',
      price: '₹179',
      rating: 4.7,
      duration: '1 hour',
      color: 'from-teal-400 to-teal-600'
    },
    {
      id: 'beauty',
      name: 'Beauty Services',
      icon: Scissors,
      description: 'Salon services at home',
      price: '₹299',
      rating: 4.9,
      duration: '1-2 hours',
      color: 'from-pink-400 to-pink-600'
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Service
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional services delivered to your doorstep with real-time tracking
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.id}
                onClick={() => onServiceSelect(service)}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 group"
              >
                <div className={`bg-gradient-to-r ${service.color} p-6 rounded-t-xl`}>
                  <IconComponent className="h-8 w-8 text-white mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">{service.name}</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-gray-900">{service.price}</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{service.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{service.duration}</span>
                  </div>
                  <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors group-hover:bg-blue-700">
                    Book Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceCategories;