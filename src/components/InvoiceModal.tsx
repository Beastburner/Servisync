import React from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';

interface InvoiceModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ booking, isOpen, onClose }) => {
  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${booking.id.substring(0, 8).toUpperCase()}`;
  
  // Format date correctly
  const invoiceDate = new Date(booking.created_at || booking.createdAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[11000] p-4 sm:p-6 print:p-0 print:bg-white print:z-auto print:static">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] relative print:shadow-none print:max-w-none print:h-auto print:max-h-none print:overflow-visible">
        
        {/* Header - Hidden when printing */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0 print:hidden">
          <h2 className="text-xl font-bold text-gray-900">Invoice {invoiceNumber}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto print:overflow-visible bg-gray-50 print:bg-white">
          <div className="p-6 sm:p-10 max-w-2xl mx-auto bg-white my-6 shadow-sm border border-gray-200 print:border-none print:shadow-none print:m-0 print:max-w-none">
            
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b pb-8 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-blue-600 tracking-tight">ServiSync</h1>
                <p className="text-sm text-gray-500 mt-1">Professional Home Services</p>
                <div className="mt-4 flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full w-fit">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Paid</span>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">INVOICE</h2>
                <p className="text-gray-600 text-sm">{invoiceNumber}</p>
                <p className="text-gray-600 text-sm mt-1">Date: {invoiceDate}</p>
              </div>
            </div>

            {/* Bill To & Provider */}
            <div className="flex justify-between gap-8 border-b pb-8 mb-8">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Service Provided By</h3>
                <p className="font-medium text-gray-800">{booking.provider?.name || booking.provider?.business_name || 'Service Provider'}</p>
                <p className="text-sm text-gray-600 mt-1">Provider ID: {booking.provider_id.substring(0, 8)}</p>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Billed To</h3>
                <p className="text-sm text-gray-600">{booking.service_address}</p>
                <p className="text-sm text-gray-600 mt-1">Phone: {booking.customer_phone}</p>
              </div>
            </div>

            {/* Service Details Table */}
            <div className="mb-8 border rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900">Description</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900 w-1/4">Date & Time</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-900 text-right w-1/4">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-4 text-gray-800">
                      <p className="font-medium">{booking.service_type || booking.service}</p>
                      <p className="text-sm text-gray-500 mt-1">Completed Service</p>
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-sm">
                      {booking.booking_date}<br/>{booking.booking_time}
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-900 text-right">
                      ₹{booking.total_amount || booking.price || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full sm:w-1/2 space-y-3 border-t pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{booking.total_amount || booking.price || 0}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (0%)</span>
                  <span>₹0</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-b py-3 mt-3">
                  <span>Total Paid</span>
                  <span>₹{booking.total_amount || booking.price || 0}</span>
                </div>
                <p className="text-xs text-gray-500 text-right mt-2">
                  Payment Method: <span className="uppercase font-medium">{booking.payment_method || 'Cash'}</span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
              <p>Thank you for using ServiSync!</p>
              <p className="mt-1">For any queries regarding this invoice, please contact support@servisync.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Global styles for printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed {
            position: static !important;
          }
          .print\\:visible, .print\\:visible * {
            visibility: visible;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};
