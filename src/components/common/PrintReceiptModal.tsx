import React from 'react';
import { CustomerPaymentReceipt, CompanySettings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Printer, X, Download, Share2 } from 'lucide-react';

interface PrintReceiptModalProps {
  receipt: CustomerPaymentReceipt | null;
  company: CompanySettings;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ receipt, company, onClose }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const text = `*${company.companyName}*\nMoney Receipt: ${receipt.receiptNumber}\nDate: ${formatDate(receipt.paymentDate)}\nCustomer: ${receipt.customerName}\nProject: ${receipt.projectName}\nProperty: ${receipt.propertyNumber}\nAmount Received: ${formatCurrency(receipt.amount)}\nBalance Remaining: ${formatCurrency(receipt.remainingBalance)}\nThank you!`;
    if (navigator.share) {
      navigator.share({ title: `Receipt ${receipt.receiptNumber}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Receipt summary copied to clipboard! You can paste and share via WhatsApp.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-semibold text-slate-800 text-sm">Official Receipt Preview</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              title="Share via WhatsApp / Text"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Printable Area */}
        <div className="printable-area p-8 text-slate-800 font-sans">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-5 mb-5 text-center relative">
            <div className="inline-block border border-indigo-900 bg-indigo-50/50 px-3 py-0.5 rounded text-[10px] tracking-wider font-bold text-indigo-900 uppercase mb-1">
              {company.businessNature}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">
              {company.companyName}
            </h1>
            <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1 leading-relaxed">
              {company.companyAddress}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 mt-2 font-medium">
              <span>Mobile: {company.mobileNumber}</span>
              <span>Email: {company.email}</span>
              {company.gstNumber && <span>GSTIN: <span className="font-mono font-semibold">{company.gstNumber}</span></span>}
            </div>

            <div className="mt-4 inline-block bg-slate-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded">
              {company.receiptHeader || 'MONEY RECEIPT'}
            </div>
          </div>

          {/* Receipt Meta Details */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <p className="text-slate-500 font-medium">Receipt No:</p>
              <p className="font-mono font-bold text-slate-900 text-sm">{receipt.receiptNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 font-medium">Receipt Date:</p>
              <p className="font-semibold text-slate-900">{formatDate(receipt.paymentDate)}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Booking Reference:</p>
              <p className="font-mono font-semibold text-slate-800">{receipt.bookingRef}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 font-medium">Payment Mode:</p>
              <p className="font-semibold text-slate-800">
                {receipt.paymentMode} {receipt.referenceNumber ? `(${receipt.referenceNumber})` : ''}
              </p>
            </div>
          </div>

          {/* Customer & Property Block */}
          <div className="mb-6 space-y-2 text-sm">
            <div className="flex border-b border-slate-200 pb-2">
              <span className="w-36 text-slate-500 font-medium text-xs uppercase tracking-wider">Received From:</span>
              <span className="font-bold text-slate-900 flex-1">{receipt.customerName}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-2">
              <span className="w-36 text-slate-500 font-medium text-xs uppercase tracking-wider">Project Name:</span>
              <span className="font-semibold text-slate-800 flex-1">{receipt.projectName}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-2">
              <span className="w-36 text-slate-500 font-medium text-xs uppercase tracking-wider">Unit / Property:</span>
              <span className="font-semibold text-slate-800 flex-1">{receipt.propertyNumber}</span>
            </div>
            <div className="flex border-b border-slate-200 pb-2">
              <span className="w-36 text-slate-500 font-medium text-xs uppercase tracking-wider">Credit Account:</span>
              <span className="text-slate-700 flex-1">{receipt.receivingAccount}</span>
            </div>
            {receipt.remarks && (
              <div className="flex border-b border-slate-200 pb-2">
                <span className="w-36 text-slate-500 font-medium text-xs uppercase tracking-wider">Particulars / Remarks:</span>
                <span className="text-slate-700 flex-1 text-xs">{receipt.remarks}</span>
              </div>
            )}
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4 text-left">Description</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">Previous Outstanding Balance</td>
                  <td className="py-2.5 px-4 text-right font-medium text-slate-700">{formatCurrency(receipt.previousBalance)}</td>
                </tr>
                <tr className="bg-emerald-50/70 font-semibold">
                  <td className="py-3 px-4 text-emerald-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Amount Received Now ({receipt.paymentMode})
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-800 text-sm font-bold font-mono">
                    {formatCurrency(receipt.amount)}
                  </td>
                </tr>
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2.5 px-4 text-slate-800">Remaining Balance Due</td>
                  <td className="py-2.5 px-4 text-right text-rose-700 font-mono text-sm">
                    {formatCurrency(receipt.remainingBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bank details and notes */}
          <div className="text-[11px] text-slate-500 mb-8 border-l-2 border-indigo-400 pl-3">
            <p className="font-semibold text-slate-700">Company Bank Details:</p>
            <p>{company.bankName} | A/C: {company.accountNumber} | IFSC: {company.ifscCode} | Branch: {company.bankBranch}</p>
            <p className="mt-1 italic text-slate-400">{company.receiptFooterNote}</p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-200 text-xs">
            <div className="text-center">
              <div className="h-10"></div>
              <div className="border-t border-slate-300 pt-2 font-medium text-slate-600">
                Customer Signature / Acknowledgement
              </div>
            </div>
            <div className="text-center">
              <div className="h-10 text-[10px] text-slate-400 flex items-end justify-center pb-1">
                For {company.companyName}
              </div>
              <div className="border-t border-slate-300 pt-2 font-semibold text-slate-800">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="no-print px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-black transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Copy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
