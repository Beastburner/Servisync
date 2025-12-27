import React from 'react';
import { ArrowRight, MapPin, Clock, Shield } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  return (
    <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Urban Services
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500"> On-Demand</span>
            </h1>
            <p className="text-xl mb-8 text-blue-100 leading-relaxed">
              Get professional home services at your doorstep. From cleaning to repairs, 
              book trusted professionals with real-time tracking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button
                onClick={onGetStarted}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <span>Book Now</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300">
                Become a Provider
              </button>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                <p className="text-sm text-blue-100">24/7 Availability</p>
              </div>
              <div className="text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm text-blue-100">Verified Professionals</p>
              </div>
              <div className="text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                <p className="text-sm text-blue-100">Real-time Tracking</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
              <div className="space-y-4">
                <div className="h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"></div>
                <div className="h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full w-3/4"></div>
                <div className="h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;