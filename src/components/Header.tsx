import React from 'react';
import { Menu, User, MapPin, Home } from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onHome: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, onHome }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button
              onClick={onHome}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <MapPin className="h-8 w-8" />
              <span className="text-xl font-bold">UrbanServe</span>
            </button>
          </div>

          <nav className="hidden md:flex space-x-8">
            <button
              onClick={() => onViewChange('home')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors ${
                currentView === 'home'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </button>
            <button
              onClick={() => onViewChange('services')}
              className={`px-3 py-2 rounded-md transition-colors ${
                currentView === 'services'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => onViewChange('dashboard')}
              className={`px-3 py-2 rounded-md transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              My Bookings
            </button>
            <button
              onClick={() => onViewChange('provider')}
              className={`px-3 py-2 rounded-md transition-colors ${
                currentView === 'provider'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Provider
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
              <User className="h-5 w-5 text-gray-600" />
            </button>
            <button className="md:hidden p-2">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;