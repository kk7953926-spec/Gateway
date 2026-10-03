import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderTransactionRecord } from '../types';

export function generateTransactionPdfReport(
  transactions: OrderTransactionRecord[],
  activeTab: string = 'All',
  merchantName: string = 'FamGateway Merchant'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner Background
  doc.setFillColor(30, 27, 75); // #1e1b4b
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
      `FamGateway Payment System  |  Page ${i} of ${pageCount}  |  Official Transaction History Record`,
      105,
      288,
      { align: 'center' }
    );
  }

  // Trigger Direct PDF Download!
  const fileName = `FamGateway_Transaction_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
