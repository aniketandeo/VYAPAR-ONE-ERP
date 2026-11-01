/**
 * Financial and display formatting utilities for Vishwas Developer ERP
 */

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(val: number | undefined | null, decimals = 2): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const processCell = (cell: string | number) => {
    let str = cell === null || cell === undefined ? '' : String(cell);
    str = str.replace(/"/g, '""');
    if (str.search(/("|,|\n)/g) >= 0) {
      str = `"${str}"`;
    }
    return str;
  };

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.map(processCell).join(','), ...rows.map((row) => row.map(processCell).join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateBookingRef(existingCount: number): string {
  const year = new Date().getFullYear();
  const nextNum = (existingCount + 1).toString().padStart(3, '0');
  return `VD-BKG-${year}-${nextNum}`;
}

export function generateReceiptNumber(existingCount: number): string {
  const year = new Date().getFullYear();
  const nextNum = (existingCount + 1).toString().padStart(3, '0');
  return `VD-RCP-${year}-${nextNum}`;
}

export function generateVoucherNumber(prefix: string, existingCount: number): string {
  const year = new Date().getFullYear();
  const nextNum = (existingCount + 1).toString().padStart(3, '0');
  return `VD-${prefix}-${year}-${nextNum}`;
}
