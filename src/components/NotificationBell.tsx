import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { getUserBookings } from '../lib/supabase';

interface NotificationBellProps {
  userId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // Fetch bookings and convert them into notifications
    const fetchNotifications = async () => {
      const { data: bookings } = await getUserBookings(userId);
      if (bookings) {
        // Simple logic: bookings that are NOT pending or completed are active updates
        const recentUpdates = bookings
          .filter(b => b.status === 'accepted' || b.status === 'scheduled' || b.status === 'in-progress' || b.status === 'rejected')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5); // top 5
        
        setNotifications(recentUpdates);
        setUnreadCount(recentUpdates.length);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          setUnreadCount(0); // clear count on open
        }}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl z-50 border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-blue-50 transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-gray-900">
                      Booking for {notif.service_type || notif.service}
                    </p>
                    <p className="text-xs mt-1 text-gray-600">
                      Status updated to <span className="font-bold text-blue-600 uppercase">{notif.status}</span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  No new notifications
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
