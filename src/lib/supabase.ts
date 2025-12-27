import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

// Helper function to convert Firestore timestamps to dates
const convertTimestamp = (timestamp: any): any => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
};

// Helper function to convert document data
const convertDocumentData = (docData: any): any => {
  if (!docData) return docData;
  const converted: any = { ...docData };
  
  // Convert timestamp fields
  if (converted.created_at) converted.created_at = convertTimestamp(converted.created_at);
  if (converted.updated_at) converted.updated_at = convertTimestamp(converted.updated_at);
  
  // Handle booking_date which might be a string or timestamp
  if (converted.booking_date) {
    if (converted.booking_date instanceof Timestamp || converted.booking_date?.toDate) {
      const date = converted.booking_date instanceof Timestamp 
        ? converted.booking_date.toDate() 
        : converted.booking_date.toDate();
      // Return as ISO string for consistency, but keep original format if it was a string
      converted.booking_date = date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }
    // If it's already a string, keep it as is
  }
  
  return converted;
};

// Auth functions
export const getCurrentUser = async () => {
  try {
    return new Promise<{ user: User | null; error: any }>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve({ user, error: null });
      }, (error) => {
        resolve({ user: null, error });
      });
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, error };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    // Verify auth is initialized
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please check your Firebase configuration.');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Error signing in:', error);
    
    // Provide helpful error messages
    if (error.code === 'auth/configuration-not-found' || error.code === 'auth/invalid-api-key') {
      return { 
        user: null, 
        error: {
          message: 'Firebase configuration error. Please check:\n' +
                   '1. Your .env file has correct Firebase credentials\n' +
                   '2. Authentication is enabled in Firebase Console\n' +
                   '3. Restart your dev server after updating .env file',
          code: error.code
        }
      };
    }
    
    return { user: null, error };
  }
};

export const signUp = async (email: string, password: string, userData: any) => {
  try {
    // Verify auth is initialized
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please check your Firebase configuration.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (user) {
      // Create profile based on user type
      if (userData.userType === 'customer') {
        await createUserProfile(user.uid, {
          full_name: userData.fullName,
          phone: userData.phone,
        });
      } else {
        await createServiceProvider(user.uid, {
          business_name: userData.businessName,
          service_type: userData.serviceType,
          phone: userData.phone,
        });
      }
    }

    return { user, error: null };
  } catch (error: any) {
    console.error('Error signing up:', error);
    
    // Provide helpful error messages
    if (error.code === 'auth/configuration-not-found' || error.code === 'auth/invalid-api-key') {
      return { 
        user: null, 
        error: {
          message: 'Firebase configuration error. Please check:\n' +
                   '1. Your .env file has correct Firebase credentials\n' +
                   '2. Authentication is enabled in Firebase Console\n' +
                   '3. Restart your dev server after updating .env file',
          code: error.code
        }
      };
    }
    
    return { user: null, error };
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
};

// User Profile functions
export const getUserProfile = async (userId: string) => {
  try {
    // Validate inputs
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('getUserProfile: Invalid userId provided');
      return { data: null, error: null };
    }

    // Check if db is initialized
    if (!db) {
      console.error('Firestore database is not initialized');
      return { data: null, error: new Error('Database not initialized') };
    }

    const docRef = doc(db, 'user_profiles', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = convertDocumentData({ id: docSnap.id, ...docSnap.data() });
      console.log(`User profile found for ${userId}:`, data.full_name);
      return { data, error: null };
    } else {
      console.log(`No user profile found for ${userId}`);
      return { data: null, error: null };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { data: null, error };
  }
};

export const createUserProfile = async (userId: string, profileData: any) => {
  try {
    const docRef = doc(db, 'user_profiles', userId);
    await setDoc(docRef, {
          user_id: userId,
          full_name: profileData.full_name,
          phone: profileData.phone,
      created_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    const data = convertDocumentData({ id: docSnap.id, ...docSnap.data() });
    return { data, error: null };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { data: null, error };
  }
};

export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    const docRef = doc(db, 'user_profiles', userId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    const data = convertDocumentData({ id: docSnap.id, ...docSnap.data() });
    return { data, error: null };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { data: null, error };
  }
};

// Service Provider functions
export const getServiceProvider = async (userId: string) => {
  try {
    // Validate inputs
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('getServiceProvider: Invalid userId provided');
      return { data: null, error: null };
    }

    // Check if db is initialized
    if (!db) {
      console.error('Firestore database is not initialized');
      return { data: null, error: new Error('Database not initialized') };
    }

    const docRef = doc(db, 'service_providers', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = convertDocumentData({ id: docSnap.id, ...docSnap.data() });
      console.log(`Service provider found for ${userId}:`, data.business_name);
      return { data, error: null };
    } else {
      console.log(`No service provider profile found for ${userId}`);
      return { data: null, error: null };
    }
  } catch (error) {
    console.error('Error getting service provider:', error);
    return { data: null, error };
  }
};

export const createServiceProvider = async (userId: string, providerData: any) => {
  try {
    const docRef = doc(db, 'service_providers', userId);
    await setDoc(docRef, {
          user_id: userId,
          business_name: providerData.business_name,
          service_type: providerData.service_type,
          phone: providerData.phone,
      latitude: providerData.latitude || null,
      longitude: providerData.longitude || null,
      show_location: providerData.show_location !== undefined ? providerData.show_location : true, // Default to true
          rating: 0,
          total_jobs_completed: 0,
          total_reviews: 0,
          is_verified: false,
          is_active: true,
      created_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    const data = convertDocumentData({ id: docSnap.id, ...docSnap.data() });
    return { data, error: null };
  } catch (error) {
    console.error('Error creating service provider:', error);
    return { data: null, error };
  }
};

export const updateServiceProvider = async (userId: string, updates: any) => {
  try {
    const docRef = doc(db, 'service_providers', userId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    const data = convertDocumentData({ id: docSnap.id, ...docSnap.data() });
    return { data, error: null };
  } catch (error) {
    console.error('Error updating service provider:', error);
    return { data: null, error };
  }
};

// Service management functions
export const getProviderServices = async (userId: string) => {
  try {
    const docRef = doc(db, 'service_providers', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { data: [], error: null };
    }
    
    const data = docSnap.data();
    const services = data.services || [];
    return { data: services, error: null };
  } catch (error) {
    console.error('Error getting provider services:', error);
    return { data: [], error };
  }
};

export const addProviderService = async (userId: string, service: { name: string; price: number; description?: string }) => {
  try {
    const docRef = doc(db, 'service_providers', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { data: null, error: new Error('Provider profile not found') };
    }
    
    const currentData = docSnap.data();
    const services = currentData.services || [];
    
    // Check if service already exists
    if (services.some((s: any) => s.name.toLowerCase() === service.name.toLowerCase())) {
      return { data: null, error: new Error('Service already exists') };
    }
    
    const newService = {
      id: Date.now().toString(), // Simple ID generation
      name: service.name,
      price: service.price,
      description: service.description || '',
      created_at: serverTimestamp(),
    };
    
    services.push(newService);
    
    await updateDoc(docRef, {
      services: services,
      updated_at: serverTimestamp(),
    });
    
    return { data: newService, error: null };
  } catch (error) {
    console.error('Error adding provider service:', error);
    return { data: null, error };
  }
};

export const updateProviderService = async (userId: string, serviceId: string, updates: { name?: string; price?: number; description?: string }) => {
  try {
    const docRef = doc(db, 'service_providers', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { data: null, error: new Error('Provider profile not found') };
    }
    
    const currentData = docSnap.data();
    const services = currentData.services || [];
    
    const serviceIndex = services.findIndex((s: any) => s.id === serviceId);
    if (serviceIndex === -1) {
      return { data: null, error: new Error('Service not found') };
    }
    
    services[serviceIndex] = {
      ...services[serviceIndex],
      ...updates,
      updated_at: serverTimestamp(),
    };
    
    await updateDoc(docRef, {
      services: services,
      updated_at: serverTimestamp(),
    });
    
    return { data: services[serviceIndex], error: null };
  } catch (error) {
    console.error('Error updating provider service:', error);
    return { data: null, error };
  }
};

export const deleteProviderService = async (userId: string, serviceId: string) => {
  try {
    const docRef = doc(db, 'service_providers', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { error: new Error('Provider profile not found') };
    }
    
    const currentData = docSnap.data();
    const services = currentData.services || [];
    
    const filteredServices = services.filter((s: any) => s.id !== serviceId);
    
    await updateDoc(docRef, {
      services: filteredServices,
      updated_at: serverTimestamp(),
    });
    
    return { error: null };
  } catch (error) {
    console.error('Error deleting provider service:', error);
    return { error };
  }
};

// Booking functions
export const createBooking = async (bookingData: any) => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const docRef = doc(bookingsRef);
    
      // Normalize booking data structure
      // Handle different field names that might come from different components
      // IMPORTANT: provider_id MUST be the Firebase Auth UID, not a document ID
      const normalizedBooking: any = {
        user_id: bookingData.user_id || bookingData.userId || null,
        // Prioritize provider_id from bookingData, but also check provider.user_id if available
        provider_id: bookingData.provider_id || bookingData.providerId || bookingData.provider?.user_id || bookingData.provider?.id || null,
      service_type: bookingData.service_type || bookingData.serviceType || bookingData.service?.name || bookingData.service || null,
      booking_date: bookingData.booking_date || bookingData.date || bookingData.bookingDate || null,
      booking_time: bookingData.booking_time || bookingData.time || bookingData.bookingTime || null,
      service_address: bookingData.service_address || bookingData.address || bookingData.serviceAddress || null,
      customer_phone: bookingData.customer_phone || bookingData.phone || bookingData.customerPhone || null,
      total_amount: bookingData.total_amount || bookingData.totalAmount || bookingData.price || bookingData.amount || 0,
      status: bookingData.status || 'pending', // Always start as pending, provider must accept
      payment_method: bookingData.payment_method || bookingData.paymentMethod || bookingData.payment || 'cash',
      notes: bookingData.notes || bookingData.additionalNotes || '',
      // Store user coordinates for routing
      user_latitude: bookingData.user_latitude || bookingData.userLatitude || null,
      user_longitude: bookingData.user_longitude || bookingData.userLongitude || null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    
    // Remove null values to keep Firestore clean
    Object.keys(normalizedBooking).forEach(key => {
      if (normalizedBooking[key] === null && key !== 'user_id' && key !== 'provider_id') {
        delete normalizedBooking[key];
      }
    });
    
    console.log('📝 ===== CREATING BOOKING IN FIRESTORE =====');
    console.log('Booking document ID (auto-generated):', docRef.id);
    console.log('Provider ID being saved:', normalizedBooking.provider_id);
    console.log('Provider ID type:', typeof normalizedBooking.provider_id);
    console.log('Provider ID length:', normalizedBooking.provider_id?.length);
    console.log('User ID (customer):', normalizedBooking.user_id);
    console.log('Status:', normalizedBooking.status);
    console.log('Full booking data:', normalizedBooking);
    
    await setDoc(docRef, normalizedBooking);
    
    console.log('✅ Booking saved to Firestore successfully!');
    console.log('📝 Document ID:', docRef.id);
    console.log('📝 Provider ID in document:', normalizedBooking.provider_id);
    console.log('📝 ===== END CREATE BOOKING =====');
    
    // Fetch provider data if provider_id exists
    let providerData = null;
    if (normalizedBooking.provider_id) {
      const providerDoc = await getDoc(doc(db, 'service_providers', normalizedBooking.provider_id));
      if (providerDoc.exists()) {
        providerData = { id: providerDoc.id, ...providerDoc.data() };
        console.log('Provider found:', providerData.id, providerData.business_name);
      } else {
        console.warn('Provider not found in Firestore:', normalizedBooking.provider_id);
      }
    } else {
      console.error('No provider_id in booking!');
    }
    
    const createdBooking = {
      id: docRef.id,
      ...normalizedBooking,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      service_providers: providerData ? {
        business_name: providerData.business_name,
        phone: providerData.phone,
        rating: providerData.rating,
        image: providerData.image || null
      } : null
    };
    
    return { data: createdBooking, error: null };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { data: null, error };
  }
};

export const getUserBookings = async (userId: string) => {
  try {
    if (!db || !userId) {
      console.error('getUserBookings: Invalid parameters', { db: !!db, userId });
      return { data: [], error: null };
    }

    // Verify authentication state
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ No authenticated user found!');
      return { data: [], error: new Error('User not authenticated') };
    }
    
    // Use the authenticated user's UID to ensure it matches
    const actualUserId = currentUser.uid;
    
    console.log(`🔍 Querying bookings for user_id: "${actualUserId}"`);
    console.log(`🔍 User ID type: ${typeof actualUserId}, length: ${actualUserId?.length}`);
    console.log(`🔍 Current authenticated user UID: "${currentUser.uid}"`);
    
    // Warn if the passed userId doesn't match
    if (userId !== actualUserId) {
      console.warn(`⚠️ Warning: Passed userId (${userId}) doesn't match authenticated UID (${actualUserId}). Using authenticated UID.`);
    }
    
    const bookingsRef = collection(db, 'bookings');
    
    // Try the indexed query first (with orderBy)
    let q = query(
      bookingsRef,
      where('user_id', '==', actualUserId),
      orderBy('created_at', 'desc')
    );
    
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
      console.log(`📊 Indexed query returned ${querySnapshot.docs.length} documents for user ${actualUserId}`);
    } catch (indexError: any) {
      // If index is missing, fall back to query without orderBy
      if (indexError.code === 'failed-precondition') {
        console.warn('⚠️ Index missing, using fallback query without orderBy');
        q = query(
          bookingsRef,
          where('user_id', '==', actualUserId)
        );
        querySnapshot = await getDocs(q);
        console.log(`📊 Fallback query returned ${querySnapshot.docs.length} documents for user ${actualUserId}`);
        
        // Sort in memory
        const docs = querySnapshot.docs;
        docs.sort((a, b) => {
          const aTime = a.data().created_at?.toMillis?.() || a.data().created_at || 0;
          const bTime = b.data().created_at?.toMillis?.() || b.data().created_at || 0;
          return bTime - aTime; // Descending
        });
        querySnapshot = { docs } as any;
      } else {
        throw indexError;
      }
    }
    
    // Debug: Log all bookings in database
    const allBookingsRef = collection(db, 'bookings');
    const allBookingsSnapshot = await getDocs(allBookingsRef);
    console.log(`📋 Total bookings in database: ${allBookingsSnapshot.docs.length}`);
    
    if (allBookingsSnapshot.docs.length > 0) {
      console.log('📋 All bookings in database:');
      allBookingsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const matches = data.user_id === actualUserId;
        console.log(`  ${matches ? '✅' : '❌'} Booking ${doc.id}:`, {
          user_id: data.user_id,
          user_id_type: typeof data.user_id,
          user_id_length: data.user_id?.length,
          provider_id: data.provider_id,
          status: data.status,
          matches_user: matches ? 'YES' : 'NO',
          service_type: data.service_type
        });
      });
    } else {
      console.log('📋 No bookings found in database at all');
    }
    
    const bookings: any[] = [];
    
    for (const bookingDoc of querySnapshot.docs) {
      let bookingData = convertDocumentData({ id: bookingDoc.id, ...bookingDoc.data() });
      
      console.log(`  ✅ Booking ${bookingData.id}:`, {
        status: bookingData.status,
        provider_id: bookingData.provider_id,
        user_id: bookingData.user_id,
        service_type: bookingData.service_type
      });
      
      // Fetch provider data
      if (bookingData.provider_id) {
        const providerDoc = await getDoc(doc(db, 'service_providers', bookingData.provider_id));
        if (providerDoc.exists()) {
          const providerData = providerDoc.data();
          bookingData.service_providers = {
            business_name: providerData.business_name,
            phone: providerData.phone,
            rating: providerData.rating,
            image: providerData.image || null
          };
        }
      }
      
      bookings.push(bookingData);
    }
    
    console.log(`✅ Returning ${bookings.length} bookings for user ${actualUserId}`);
    return { data: bookings, error: null };
  } catch (error: any) {
    console.error('❌ Error getting user bookings:', error);
    if (error.code === 'failed-precondition') {
      console.error('⚠️ Firestore index missing! You may need to create an index for user_id + created_at');
    } else if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      console.error('⚠️ Permission denied! Please check:');
      console.error('  1. Firestore security rules are deployed (Firebase Console → Firestore → Rules)');
      console.error('  2. You are signed in as the user');
      console.error('  3. The user_id in bookings matches your Firebase Auth UID');
      console.error('  4. Current auth UID:', auth.currentUser?.uid);
      console.error('  5. User ID being queried:', userId);
    }
    return { data: [], error };
  }
};

export const getProviderBookings = async (providerId: string) => {
  try {
    if (!db || !providerId) {
      console.error('getProviderBookings: Invalid parameters', { db: !!db, providerId });
      return { data: [], error: null };
    }

    // Verify authentication state
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ No authenticated user found!');
      return { data: [], error: new Error('User not authenticated') };
    }
    
    // Use the authenticated user's UID instead of the passed providerId to ensure it matches
    const actualProviderId = currentUser.uid;
    
    console.log(`🔍 Querying bookings for provider_id: "${actualProviderId}"`);
    console.log(`🔍 Provider ID type: ${typeof actualProviderId}, length: ${actualProviderId?.length}`);
    console.log(`🔍 Current authenticated user UID: "${currentUser.uid}"`);
    console.log(`🔍 Using authenticated UID for query: ✅ YES`);
    
    // Warn if the passed providerId doesn't match
    if (providerId !== actualProviderId) {
      console.warn(`⚠️ Warning: Passed providerId (${providerId}) doesn't match authenticated UID (${actualProviderId}). Using authenticated UID.`);
    }
    
    const bookingsRef = collection(db, 'bookings');
    
    // Use the authenticated user's UID for the query
    // Try the indexed query first (with orderBy)
    let q = query(
      bookingsRef,
      where('provider_id', '==', actualProviderId),
      orderBy('created_at', 'desc')
    );
    
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
      console.log(`📊 Indexed query returned ${querySnapshot.docs.length} documents for provider ${actualProviderId}`);
    } catch (indexError: any) {
      // If index is missing, fall back to query without orderBy
      if (indexError.code === 'failed-precondition') {
        console.warn('⚠️ Index missing, using fallback query without orderBy');
        q = query(
          bookingsRef,
          where('provider_id', '==', actualProviderId)
        );
        querySnapshot = await getDocs(q);
        console.log(`📊 Fallback query returned ${querySnapshot.docs.length} documents for provider ${actualProviderId}`);
        
        // Sort in memory
        const docs = querySnapshot.docs;
        docs.sort((a, b) => {
          const aTime = a.data().created_at?.toMillis?.() || a.data().created_at || 0;
          const bTime = b.data().created_at?.toMillis?.() || b.data().created_at || 0;
          return bTime - aTime; // Descending
        });
        querySnapshot = { docs } as any;
      } else {
        throw indexError;
      }
    }
    
    const bookings: any[] = [];
    
    for (const bookingDoc of querySnapshot.docs) {
      let bookingData = convertDocumentData({ id: bookingDoc.id, ...bookingDoc.data() });
      
      console.log(`  ✅ Booking ${bookingData.id}:`, {
        status: bookingData.status,
        provider_id: bookingData.provider_id,
        user_id: bookingData.user_id,
        service_type: bookingData.service_type
      });
      
      // Fetch user profile data
      if (bookingData.user_id) {
        const userDoc = await getDoc(doc(db, 'user_profiles', bookingData.user_id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          bookingData.user_profiles = {
            full_name: userData.full_name,
            phone: userData.phone
          };
        }
      }
      
      bookings.push(bookingData);
    }
    
    return { data: bookings, error: null };
  } catch (error: any) {
    console.error('❌ Error getting provider bookings:', error);
    if (error.code === 'failed-precondition') {
      console.error('⚠️ Firestore index missing! You may need to create an index for provider_id + created_at');
    } else if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      console.error('⚠️ Permission denied! Please check:');
      console.error('  1. Firestore security rules are deployed (Firebase Console → Firestore → Rules)');
      console.error('  2. You are signed in as the provider');
      console.error('  3. The provider_id in bookings matches your Firebase Auth UID');
      console.error('  4. Current auth UID:', auth.currentUser?.uid);
      console.error('  5. Provider ID being queried:', providerId);
    }
    return { data: null, error };
  }
};

export const updateBookingStatus = async (bookingId: string, status: string) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    await updateDoc(docRef, {
      status,
      updated_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    const data = convertDocumentData({ id: docSnap.id, ...docSnap.data() });
    return { data, error: null };
  } catch (error) {
    console.error('Error updating booking status:', error);
    return { data: null, error };
  }
};

// Generate OTP when provider arrives
export const generateArrivalOTP = async (bookingId: string) => {
  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const docRef = doc(db, 'bookings', bookingId);
    await updateDoc(docRef, {
      status: 'arrived',
      arrival_otp: otp,
      otp_generated_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    
    console.log('✅ OTP generated for booking:', bookingId, 'OTP:', otp);
    return { data: { otp }, error: null };
  } catch (error) {
    console.error('Error generating OTP:', error);
    return { data: null, error };
  }
};

// Verify OTP entered by provider
export const verifyArrivalOTP = async (bookingId: string, enteredOTP: string) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { data: null, error: new Error('Booking not found') };
    }
    
    const bookingData = docSnap.data();
    const storedOTP = bookingData.arrival_otp;
    
    if (!storedOTP) {
      return { data: null, error: new Error('No OTP found for this booking') };
    }
    
    if (enteredOTP !== storedOTP) {
      return { data: null, error: new Error('Invalid OTP. Please try again.') };
    }
    
    // OTP verified - update status to in-progress
    await updateDoc(docRef, {
      status: 'in-progress',
      otp_verified_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    
    const updatedDoc = await getDoc(docRef);
    const data = convertDocumentData({ id: updatedDoc.id, ...updatedDoc.data() });
    
    return { data, error: null };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { data: null, error };
  }
};

// Accept a booking (provider accepts the service request)
export const acceptBooking = async (bookingId: string) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(docRef);
    
    if (!bookingDoc.exists()) {
      return { data: null, error: new Error('Booking not found') };
    }
    
    const bookingData = bookingDoc.data();
    
    // Check if booking is in pending status
    if (bookingData.status !== 'pending') {
      return { data: null, error: new Error(`Cannot accept booking with status: ${bookingData.status}`) };
    }
    
    // Update status to 'accepted' or 'scheduled' based on date/time
    const bookingDate = bookingData.booking_date;
    const bookingTime = bookingData.booking_time;
    const now = new Date();
    
    // Parse booking date and time
    let scheduledDateTime: Date | null = null;
    if (bookingDate && bookingTime) {
      try {
        // Try to parse the date (format: YYYY-MM-DD or DD-MM-YYYY)
        const dateParts = bookingDate.includes('-') ? bookingDate.split('-') : [];
        let year, month, day;
        
        if (dateParts.length === 3) {
          // Check if it's YYYY-MM-DD or DD-MM-YYYY
          if (dateParts[0].length === 4) {
            [year, month, day] = dateParts;
          } else {
            [day, month, year] = dateParts;
          }
        } else {
          // Try parsing as ISO string
          scheduledDateTime = new Date(bookingDate);
        }
        
        if (!scheduledDateTime && year && month && day) {
          // Parse time (format: "10:00 AM" or "HH:MM")
          const timeMatch = bookingTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const period = timeMatch[3]?.toUpperCase();
            
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            
            scheduledDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, minutes);
          }
        }
      } catch (e) {
        console.error('Error parsing booking date/time:', e);
      }
    }
    
    // If scheduled time has passed or is very soon, set to 'in-progress', otherwise 'scheduled'
    let newStatus = 'scheduled';
    if (scheduledDateTime) {
      const timeDiff = scheduledDateTime.getTime() - now.getTime();
      const minutesUntilScheduled = timeDiff / (1000 * 60);
      
      // If scheduled time is within 15 minutes or has passed, set to in-progress
      if (minutesUntilScheduled <= 15) {
        newStatus = 'in-progress';
      }
    }
    
    await updateDoc(docRef, {
      status: newStatus,
      updated_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    const data = convertDocumentData({ id: docSnap.id, ...docSnap.data() });
    return { data, error: null };
  } catch (error) {
    console.error('Error accepting booking:', error);
    return { data: null, error };
  }
};

// Reject a booking (provider rejects the service request)
export const rejectBooking = async (bookingId: string, reason?: string) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(docRef);
    
    if (!bookingDoc.exists()) {
      return { data: null, error: new Error('Booking not found') };
    }
    
    const bookingData = bookingDoc.data();
    
    // Check if booking can be rejected (only pending or scheduled)
    if (!['pending', 'scheduled'].includes(bookingData.status)) {
      return { data: null, error: new Error(`Cannot reject booking with status: ${bookingData.status}`) };
    }
    
    await updateDoc(docRef, {
      status: 'rejected',
      rejection_reason: reason || '',
      updated_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    const data = convertDocumentData({ id: docSnap.id, ...docSnap.data() });
    return { data, error: null };
  } catch (error) {
    console.error('Error rejecting booking:', error);
    return { data: null, error };
  }
};

// Real-time subscriptions
export const subscribeToBookings = (userId: string, callback: (payload: any) => void) => {
  const bookingsRef = collection(db, 'bookings');
  const q = query(
    bookingsRef,
    where('user_id', '==', userId),
    orderBy('created_at', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const bookingData = convertDocumentData({ id: change.doc.id, ...change.doc.data() });
      callback({
        eventType: change.type,
        new: change.type === 'added' || change.type === 'modified' ? bookingData : null,
        old: change.type === 'removed' || change.type === 'modified' ? bookingData : null,
      });
    });
  });
};

// Subscribe to a single booking's status updates
export const subscribeToBooking = (bookingId: string, callback: (booking: any) => void) => {
  if (!db || !bookingId) {
    console.error('subscribeToBooking: Invalid parameters', { db: !!db, bookingId });
    return () => {};
  }

  const bookingRef = doc(db, 'bookings', bookingId);
  
  return onSnapshot(bookingRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const bookingData = convertDocumentData({ id: docSnapshot.id, ...docSnapshot.data() });
      console.log('📡 Real-time booking status update:', bookingData.status);
      callback(bookingData);
    } else {
      console.warn('Booking document does not exist:', bookingId);
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to booking:', error);
    callback(null);
  });
};

export const subscribeToProviderBookings = (providerId: string, callback: (payload: any) => void) => {
  if (!db || !providerId) {
    console.error('subscribeToProviderBookings: Invalid parameters', { db: !!db, providerId });
    return () => {}; // Return empty unsubscribe function
  }

  const bookingsRef = collection(db, 'bookings');
  
  // Start with query without orderBy to avoid permission/index issues
  // We can add orderBy later if needed, but for now this is more reliable
  const q = query(
    bookingsRef,
    where('provider_id', '==', providerId)
  );
  
  return onSnapshot(
    q, 
    (snapshot) => {
      // Sort in memory by created_at descending
      const sortedDocs = [...snapshot.docs].sort((a, b) => {
        const aTime = a.data().created_at?.toMillis?.() || a.data().created_at?.seconds * 1000 || 0;
        const bTime = b.data().created_at?.toMillis?.() || b.data().created_at?.seconds * 1000 || 0;
        return bTime - aTime; // Descending
      });
      
      // Process changes - note: without orderBy, we process all docs on each update
      sortedDocs.forEach((doc) => {
        const bookingData = convertDocumentData({ id: doc.id, ...doc.data() });
        // Check if this is a new document by comparing with previous snapshot
        // For simplicity, we'll treat all as modified on each update
        callback({
          eventType: 'modified',
          new: bookingData,
          old: null,
        });
      });
    },
    (error) => {
      console.error('❌ Error in provider bookings subscription:', error);
      if (error.code === 'permission-denied') {
        console.error('⚠️ Permission denied. Make sure the user is authenticated and security rules allow this query.');
      }
    }
  );
};

// Subscribe to real-time provider location updates
export const subscribeToProviderLocation = (
  providerId: string,
  callback: (location: { latitude: number; longitude: number; updatedAt: Date | null } | null) => void
) => {
  if (!db || !providerId) {
    console.error('subscribeToProviderLocation: Invalid parameters');
    callback(null);
    return () => {}; // Return empty unsubscribe function
  }

  const providerRef = doc(db, 'service_providers', providerId);
  
  return onSnapshot(
    providerRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const location = {
          latitude: data.latitude as number,
          longitude: data.longitude as number,
          updatedAt: data.location_updated_at?.toDate ? data.location_updated_at.toDate() : 
                     data.location_updated_at ? new Date(data.location_updated_at) : null
        };
        
        // Only call callback if location is valid
        if (location.latitude != null && location.longitude != null && 
            !isNaN(location.latitude) && !isNaN(location.longitude)) {
          callback(location);
        } else {
          console.warn(`Provider ${providerId} has invalid location data`);
          callback(null);
        }
      } else {
        console.warn(`Provider ${providerId} document does not exist`);
        callback(null);
      }
    },
    (error) => {
      console.error('Error subscribing to provider location:', error);
      callback(null);
    }
  );
};

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Get nearby service providers within a radius (in km)
export const getNearbyServiceProviders = async (
  centerLat: number,
  centerLng: number,
  radiusKm: number = 10,
  serviceType?: string
) => {
  try {
    if (!db) {
      console.error('Firestore database is not initialized');
      return { data: [], error: new Error('Database not initialized') };
    }

    console.log(`🔍 Searching for providers:`, {
      center: { lat: centerLat, lng: centerLng },
      radius: `${radiusKm}km`,
      serviceType: serviceType || 'all'
    });

    const providersRef = collection(db, 'service_providers');
    let q = query(
      providersRef,
      where('is_active', '==', true)
    );

    // If service type is specified, filter by it
    if (serviceType && serviceType !== 'all') {
      q = query(q, where('service_type', '==', serviceType));
    }

    const querySnapshot = await getDocs(q);
    const nearbyProviders: any[] = [];
    
    console.log(`📊 Found ${querySnapshot.docs.length} active providers in database (serviceType: ${serviceType || 'all'})`);

    for (const providerDoc of querySnapshot.docs) {
      const providerData = { 
        id: providerDoc.id, // Firestore document ID = Firebase Auth UID
        ...providerDoc.data() 
      };
      
      console.log(`Provider document:`, {
        documentId: providerDoc.id,
        user_id: providerData.user_id,
        business_name: providerData.business_name,
        note: 'Document ID should match user_id (Firebase Auth UID)'
      });
      
      // Check if provider has location data and location visibility is enabled
      // show_location defaults to true if not set (for backward compatibility)
      const showLocation = providerData.show_location !== undefined ? providerData.show_location : true;
      
      // Convert coordinates to numbers if they're stored as strings (defensive programming)
      let lat = providerData.latitude;
      let lng = providerData.longitude;
      
      if (typeof lat === 'string') {
        lat = parseFloat(lat);
        console.warn(`Provider ${providerData.business_name || providerData.id}: latitude stored as string, converting to number`);
      }
      if (typeof lng === 'string') {
        lng = parseFloat(lng);
        console.warn(`Provider ${providerData.business_name || providerData.id}: longitude stored as string, converting to number`);
      }
      
      // Debug logging
      console.log(`Checking provider: ${providerData.business_name || providerData.id}`, {
        is_active: providerData.is_active,
        show_location: showLocation,
        latitude: lat,
        longitude: lng,
        latitude_type: typeof lat,
        longitude_type: typeof lng
      });
      
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.log(`Provider ${providerData.business_name || providerData.id} missing or invalid location data (lat: ${lat}, lng: ${lng})`);
        continue;
      }
      
      if (showLocation === false) {
        console.log(`Provider ${providerData.business_name || providerData.id} has location visibility disabled`);
        continue;
      }
      
      // Calculate distance
      const distance = calculateDistance(
        centerLat,
        centerLng,
        lat,
        lng
      );

      console.log(`Provider ${providerData.business_name || providerData.id}: distance = ${distance.toFixed(2)}km (center: ${centerLat}, ${centerLng}, provider: ${lat}, ${lng})`);

      // Only include providers within the radius
      if (distance <= radiusKm) {
        const providerId = providerData.id || providerData.user_id;
        nearbyProviders.push({
          ...providerData,
          id: providerId, // Ensure ID is set (document ID = user_id)
          user_id: providerData.user_id || providerId, // Ensure user_id is set
          latitude: lat,
          longitude: lng,
          distance_km: distance
        });
        console.log(`✅ Added provider ${providerData.business_name || providerId}:`, {
          id: providerId,
          user_id: providerData.user_id,
          documentId: providerDoc.id,
          business_name: providerData.business_name
        });
      } else {
        console.log(`❌ Provider ${providerData.business_name || providerData.id} is ${distance.toFixed(2)}km away (outside ${radiusKm}km radius)`);
      }
    }
    
    console.log(`Returning ${nearbyProviders.length} providers within ${radiusKm}km`);

    // Sort by distance (closest first)
    nearbyProviders.sort((a, b) => a.distance_km - b.distance_km);

    return { data: nearbyProviders, error: null };
  } catch (error) {
    console.error('Error getting nearby service providers:', error);
    return { data: [], error };
  }
};

// Update service provider location
export const updateServiceProviderLocation = async (
  userId: string,
  latitude: number,
  longitude: number
) => {
  try {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return { error: new Error('Invalid userId') };
    }

    if (!db) {
      console.error('Firestore database is not initialized');
      return { error: new Error('Database not initialized') };
    }

    const docRef = doc(db, 'service_providers', userId);
    await updateDoc(docRef, {
      latitude,
      longitude,
      location_updated_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    
    return { error: null };
  } catch (error) {
    console.error('Error updating provider location:', error);
    return { error };
  }
};

// Update location visibility setting
export const updateLocationVisibility = async (userId: string, showLocation: boolean) => {
  try {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return { error: new Error('Invalid userId') };
    }

    if (!db) {
      console.error('Firestore database is not initialized');
      return { error: new Error('Database not initialized') };
    }

    const docRef = doc(db, 'service_providers', userId);
    await updateDoc(docRef, {
      show_location: showLocation,
      updated_at: serverTimestamp(),
    });
    
    return { error: null };
  } catch (error) {
    console.error('Error updating location visibility:', error);
    return { error };
  }
};

// Get current location and update provider location
export const updateProviderLocationFromGeolocation = async (userId: string) => {
  return new Promise<{ error: any }>((resolve) => {
    if (!navigator.geolocation) {
      resolve({ error: new Error('Geolocation is not supported by this browser. Please use a modern browser or enter location manually.') });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const result = await updateServiceProviderLocation(userId, latitude, longitude);
        resolve(result);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access was denied. Please allow location access in your browser settings and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'An unknown error occurred. Please try again or enter location manually.';
        }
        
        resolve({ error: new Error(errorMessage) });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 0 // Always get fresh location
      }
    );
  });
};
