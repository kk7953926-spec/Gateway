import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderTransactionRecord } from '../types';

export interface ReceiptData {
  merchantName: string;
  orderId: string;
  transactionId?: string;
  amount: number;
  utrRef?: string;
  upiId?: string;
  customerName?: string;
  customerEmail?: string;
  date?: string;
  status?: string;
  note?: string;
}

/**
 * Universal safe PDF downloader for desktop & mobile browsers / iframes
 */
export function saveOrDownloadPdf(doc: jsPDF, fileName: string) {
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 3000);
  } catch (err) {
    console.warn('Blob download failed, attempting direct jsPDF save fallback:', err);
    try {
      doc.save(fileName);
    } catch (saveErr) {
      console.error('jsPDF doc.save failed:', saveErr);
      const dataUri = doc.output('datauristring');
      const fallbackLink = document.createElement('a');
      fallbackLink.href = dataUri;
      fallbackLink.download = fileName;
      fallbackLink.target = '_blank';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      setTimeout(() => document.body.removeChild(fallbackLink), 3000);
    }
  }
}

/**
 * Universal safe PDF printer via hidden iframe (avoids window.open popup blockers)
 */
export function printPdfDocument(doc: jsPDF) {
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 8000);
      }, 400);
    };
  } catch {
    window.print();
  }
}

/**
 * Builds the PDF jsPDF document for Merchant Transaction Ledger Reports
 */
export function buildTransactionPdfDocument(
  transactions: OrderTransactionRecord[],
  activeTab: string = 'All',
  merchantName: string = 'FamGateway Merchant'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Title & Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FAMGATEWAY TRANSACTION REPORT', 14, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Merchant: ${merchantName}   |   Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}   |   Filter: ${activeTab}`,
    14,
    24
  );

  // Summary Metrics Card
  const totalCount = transactions.length;
  const capturedList = transactions.filter((t) => t.status === 'CAPTURED' || (t as any).status === 'CONFIRMED');
  const capturedCount = capturedList.length;
  const totalVolume = capturedList.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const pendingCount = totalCount - capturedCount;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 38, 182, 20, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  doc.text(`Total Transactions: ${totalCount}`, 20, 50);
  doc.text(`Successful: ${capturedCount}`, 70, 50);
  doc.text(`Pending: ${pendingCount}`, 115, 50);
  doc.text(`Volume: INR ${totalVolume.toFixed(2)}`, 150, 50);

  // Table Setup
  const tableData = transactions.map((t, idx) => {
    const txnId = t?.id || '';
    const isApi = Boolean(txnId && typeof txnId === 'string' && txnId.startsWith('txn_')) || Boolean((t as any)?.source === 'api');
    const statusText = t.status === 'CAPTURED' ? 'CONFIRMED' : (t.status || 'PENDING');

    return [
      String(idx + 1),
      txnId,
      isApi ? 'API' : 'LINK',
      t.upi_id || 'Merchant UPI',
      `INR ${(Number(t.amount) || 0).toFixed(2)}`,
      statusText,
      (t as any)?.transaction_ref || '-',
      t.created_at ? new Date(t.created_at).toLocaleDateString() : '-',
    ];
  });

  autoTable(doc, {
    startY: 64,
    head: [['#', 'Order ID', 'Type', 'UPI ID', 'Amount', 'Status', 'UTR / Bank Ref', 'Date']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229], // #4f46e5 Indigo
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
    margin: { left: 14, right: 14 },
  });

  // Footer & Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `FamGateway Payment System  |  Page ${i} of ${pageCount}  |  Official Transaction Record`,
      105,
      288,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Triggers Direct PDF Download for Transactions Report
 */
export function generateTransactionPdfReport(
  transactions: OrderTransactionRecord[],
  activeTab: string = 'All',
  merchantName: string = 'FamGateway Merchant'
) {
  const doc = buildTransactionPdfDocument(transactions, activeTab, merchantName);
  const fileName = `FamGateway_Transaction_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  saveOrDownloadPdf(doc, fileName);
}

/**
 * Triggers Print Dialog for Transactions Report
 */
export function printTransactionPdfReport(
  transactions: OrderTransactionRecord[],
  activeTab: string = 'All',
  merchantName: string = 'FamGateway Merchant'
) {
  const doc = buildTransactionPdfDocument(transactions, activeTab, merchantName);
  printPdfDocument(doc);
}

/**
 * Builds clean, professional Single Payment Receipt PDF Document
 */
export function buildReceiptPdfDocument(data: ReceiptData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 150], // Receipt format 100mm x 150mm
  });

  // Background Header
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, 100, 26, 'F');

  // Brand Name & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(data.merchantName || 'FamGateway Merchant', 50, 11, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL PAYMENT RECEIPT', 50, 18, { align: 'center' });

  // Status Badge
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(25, 30, 50, 8, 2, 2, 'FD');

  doc.setTextColor(22, 101, 52); // emerald-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PAID / CONFIRMED', 50, 35.5, { align: 'center' });

  // Amount Block
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`INR ${(Number(data.amount) || 0).toFixed(2)}`, 50, 48, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Zero Platform Fee • Direct UPI Payment', 50, 53, { align: 'center' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(10, 57, 90, 57);

  // Key Details Table / Rows
  const details = [
    { label: 'Order ID:', value: data.orderId || '-' },
    { label: 'Bank UTR:', value: data.utrRef || '-' },
    { label: 'Transaction Ref:', value: data.transactionId || data.orderId || '-' },
    { label: 'Paid To UPI:', value: data.upiId || 'FamGateway Merchant' },
    { label: 'Customer:', value: data.customerName || data.customerEmail || 'Customer' },
    { label: 'Date & Time:', value: data.date || new Date().toLocaleString() },
  ];

  let yPos = 65;
  doc.setFontSize(7.5);

  details.forEach((row) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(row.label, 12, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    // Truncate if too long
    const val = row.value.length > 25 ? row.value.slice(0, 23) + '..' : row.value;
    doc.text(val, 88, yPos, { align: 'right' });

    yPos += 7.5;
  });

  // Divider
  doc.line(10, yPos + 2, 90, yPos + 2);

  // Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Verified securely in real-time via FamGateway Engine.', 50, yPos + 10, { align: 'center' });
  doc.text('Thank you for your payment!', 50, yPos + 14, { align: 'center' });

  return doc;
}

/**
 * Triggers Direct PDF Download for Single Customer Receipt
 */
export function generateReceiptPdf(data: ReceiptData) {
  const doc = buildReceiptPdfDocument(data);
  const fileName = `Receipt_${data.orderId || 'Payment'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  saveOrDownloadPdf(doc, fileName);
}

/**
 * Triggers Print Dialog for Single Customer Receipt
 */
export function printReceiptPdf(data: ReceiptData) {
  const doc = buildReceiptPdfDocument(data);
  printPdfDocument(doc);
}

/**
 * Fallback Clean HTML Receipt Printer (Uses hidden iframe - guaranteed no popup block)
 */
export function printHtmlReceipt(data: ReceiptData) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${data.merchantName || 'FamGateway'}</title>
        <style>
          @page { size: auto; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
          .card { max-width: 420px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px; }
          .brand { font-size: 20px; font-weight: 800; color: #4338ca; }
          .tag { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-top: 4px; }
          .amount-box { text-align: center; background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
          .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 8px; }
          .amount { font-size: 28px; font-weight: 800; color: #0f172a; font-family: monospace; }
          .rows { margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; font-size: 13px; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }
          .row-label { color: #64748b; font-weight: 500; }
          .row-val { font-weight: 700; color: #0f172a; font-family: monospace; }
          .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="brand">${data.merchantName || 'FamGateway Merchant'}</div>
            <div class="tag">Official Payment Receipt</div>
          </div>
          <div class="amount-box">
            <div class="badge">✓ PAYMENT CONFIRMED</div>
            <div class="amount">₹${(Number(data.amount) || 0).toFixed(2)}</div>
          </div>
          <div class="rows">
            <div class="row"><span class="row-label">Order ID:</span><span class="row-val">${data.orderId || '-'}</span></div>
            <div class="row"><span class="row-label">Bank UTR / Ref:</span><span class="row-val">${data.utrRef || '-'}</span></div>
            <div class="row"><span class="row-label">Transaction Ref:</span><span class="row-val">${data.transactionId || data.orderId || '-'}</span></div>
            <div class="row"><span class="row-label">Merchant UPI:</span><span class="row-val">${data.upiId || 'FamGateway Merchant'}</span></div>
            <div class="row"><span class="row-label">Customer:</span><span class="row-val">${data.customerName || data.customerEmail || 'Valued Customer'}</span></div>
            <div class="row"><span class="row-label">Timestamp:</span><span class="row-val">${data.date || new Date().toLocaleString()}</span></div>
          </div>
          <div class="footer">
            Verified in real-time by FamGateway Engine • Zero Platform Fee
          </div>
        </div>
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    }, 400);
  } else {
    window.print();
  }
}
