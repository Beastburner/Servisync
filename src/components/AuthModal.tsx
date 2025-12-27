import React, { useState } from 'react';
import { X, Mail, Lock, User, Building, Phone } from 'lucide-react';
import { signIn, signUp, signInWithGoogle } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<'customer' | 'provider'>('customer');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    businessName: '',
    serviceType: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleProviderForm, setShowGoogleProviderForm] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      
      if (isLogin) {
        result = await signIn(formData.email, formData.password);
      } else {
        result = await signUp(formData.email, formData.password, {
          userType,
          fullName: formData.fullName,
          businessName: formData.businessName,
          serviceType: formData.serviceType,
          phone: formData.phone,
        });
      }

      if (result.error) {
        alert(`Error: ${result.error.message}`);
      } else {
        onAuthSuccess();
        onClose();
        // Reset form
        setFormData({
          email: '',
          password: '',
          fullName: '',
          phone: '',
          businessName: '',
          serviceType: ''
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // For provider sign-up, always require additional info
      if (!isLogin && userType === 'provider') {
        // First authenticate with Google
        const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');
        
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Check if user already exists
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        
        const providerProfileRef = doc(db, 'service_providers', user.uid);
        const providerProfileSnap = await getDoc(providerProfileRef);
        
        if (providerProfileSnap.exists()) {
          // User already exists, complete sign-in
          onAuthSuccess();
          onClose();
          setIsLoading(false);
          return;
        }
        
        // User doesn't exist, show form to collect provider details
        setGoogleUser(user);
        setShowGoogleProviderForm(true);
        setIsLoading(false);
        return;
      }
      
      // For customer sign-up or any sign-in, proceed normally
      let additionalData: any = {};
      
      if (!isLogin && userType === 'customer') {
        // For customer sign-up, phone is optional but recommended
        if (formData.phone) {
          additionalData = {
            phone: formData.phone
          };
        }
      }
      // For sign-in, we don't need additional data - just use Google directly

      const result = await signInWithGoogle(userType, additionalData);

      if (result.error) {
        alert(`Error: ${result.error.message}`);
      } else {
        onAuthSuccess();
        onClose();
        // Reset form
        setFormData({
          email: '',
          password: '',
          fullName: '',
          phone: '',
          businessName: '',
          serviceType: ''
        });
      }
    } catch (error: any) {
      console.error('Google authentication error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        alert('An error occurred during Google authentication');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteGoogleProviderSignUp = async () => {
    if (!googleUser) return;
    
    if (!formData.businessName || !formData.serviceType || !formData.phone) {
      alert('Please fill in all required fields: Business Name, Service Type, and Phone Number.');
      return;
    }
    
    setIsLoading(true);
    try {
      const additionalData = {
        businessName: formData.businessName,
        serviceType: formData.serviceType,
        phone: formData.phone
      };
      
      const result = await signInWithGoogle('provider', additionalData);
      
      if (result.error) {
        alert(`Error: ${result.error.message}`);
      } else {
        onAuthSuccess();
        onClose();
        // Reset form
        setFormData({
          email: '',
          password: '',
          fullName: '',
          phone: '',
          businessName: '',
          serviceType: ''
        });
        setShowGoogleProviderForm(false);
        setGoogleUser(null);
      }
    } catch (error) {
      console.error('Error completing provider sign-up:', error);
      alert('An error occurred while completing sign-up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative z-[10000]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {!isLogin && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I want to:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('customer')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    userType === 'customer'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <User className="h-5 w-5 mx-auto mb-1" />
                  Book Services
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('provider')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    userType === 'provider'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Building className="h-5 w-5 mx-auto mb-1" />
                  Provide Services
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {userType === 'provider' ? 'Business Name' : 'Full Name'}
                  </label>
                  <div className="relative">
                    {userType === 'provider' ? (
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    ) : (
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    )}
                    <input
                      type="text"
                      name={userType === 'provider' ? 'businessName' : 'fullName'}
                      value={userType === 'provider' ? formData.businessName : formData.fullName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={userType === 'provider' ? 'Enter business name' : 'Enter your full name'}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>

                {userType === 'provider' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Type
                    </label>
                    <select
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select service type</option>
                      <option value="cleaning">Home Cleaning</option>
                      <option value="repair">Repairs & Maintenance</option>
                      <option value="beauty">Beauty & Wellness</option>
                      <option value="fitness">Fitness Training</option>
                      <option value="electrical">Electrical Services</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="painting">Painting</option>
                      <option value="appliance">Appliance Repair</option>
                    </select>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="mt-4 w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLoading ? 'Signing in...' : `Sign ${isLogin ? 'in' : 'up'} with Google`}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {isLogin && (
            <div className="mt-4 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-700">
                Forgot your password?
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Google Provider Sign-Up Form Modal */}
      {showGoogleProviderForm && googleUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-[10002]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Complete Your Provider Profile
                </h2>
                <button
                  onClick={() => {
                    setShowGoogleProviderForm(false);
                    setGoogleUser(null);
                    // Sign out the Google user if they cancel
                    import('../lib/firebase').then(({ auth }) => {
                      import('firebase/auth').then(({ signOut }) => {
                        signOut(auth);
                      });
                    });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Signed in as:</strong> {googleUser.displayName || googleUser.email}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Please provide the following information to complete your provider account setup.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your business name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type *
                  </label>
                  <select
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select service type</option>
                    <option value="cleaning">Home Cleaning</option>
                    <option value="repair">Repairs & Maintenance</option>
                    <option value="beauty">Beauty & Wellness</option>
                    <option value="fitness">Fitness Training</option>
                    <option value="electrical">Electrical Services</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="painting">Painting</option>
                    <option value="appliance">Appliance Repair</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>

                <button
                  onClick={handleCompleteGoogleProviderSignUp}
                  disabled={isLoading || !formData.businessName || !formData.serviceType || !formData.phone}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Creating Account...
                    </div>
                  ) : (
                    'Complete Sign Up'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};