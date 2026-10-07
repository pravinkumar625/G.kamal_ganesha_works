import { jsPDF } from 'jspdf';
import { LOGO_BASE64 } from '../assets/logoBase64';

/**
 * Downloads a PDF using a Blob URL (works offline, no internet needed).
 * This avoids browser restrictions on data: URI downloads.
 */
export const downloadPDFBlob = (doc, filename) => {
  try {
    // Generate raw PDF bytes as an ArrayBuffer
    const pdfArrayBuffer = doc.output('arraybuffer');
    const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Clean up after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
    }, 1000);
  } catch (err) {
    console.error('PDF download error:', err);
    // Fallback: use jsPDF's built-in save (may trigger browser download dialog)
    doc.save(filename);
  }
};

/**
 * Generates a styled Bill PDF — fully offline, no internet required.
 * Uses only jsPDF built-in fonts (helvetica, times) — no CDN fonts.
 * @param {Object} order The order object containing details.
 * @param {string} watermarkText Custom watermark text or default.
 * @param {boolean} isChecking If true, appends the checking bill footnote.
 */
export const generateBillPDF = (order, watermarkText, isChecking = true) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  // --- 1. FULL PAGE LOGO WATERMARK BACKGROUND ---
  // (Scales official logo to fill whole page background with light subtle opacity)
  doc.saveGraphicsState();
  try {
    if (LOGO_BASE64) {
      if (typeof doc.GState === 'function') {
        doc.setGState(new doc.GState({ opacity: 0.075 }));
      }
      const wmWidth = 185;  // 185mm wide (spans whole page background)
      const wmHeight = 185; // 185mm high
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight - wmHeight) / 2;
      doc.addImage(LOGO_BASE64, 'JPEG', wmX, wmY, wmWidth, wmHeight);
    }
  } catch (e) {
    console.error('Logo watermark render error:', e);
  }
  doc.restoreGraphicsState();

  // --- 2. GOLDEN BORDER (Matching Logo Theme) ---
  doc.setDrawColor(212, 175, 55); // Rich Gold
  doc.setLineWidth(0.8);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
  doc.setLineWidth(0.2);
  doc.rect(6.5, 6.5, pageWidth - 13, pageHeight - 13);

  // --- 3. HEADER SECTION WITH OFFICIAL LOGO & BRANDING ---
  try {
    if (LOGO_BASE64) {
      // Golden circle framed logo
      doc.setFillColor(255, 248, 225);
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.circle(19, 17, 9.5, 'FD');
      doc.addImage(LOGO_BASE64, 'JPEG', 10, 8, 18, 18);
    }
  } catch (e) {
    console.error('Failed to add header logo image to PDF:', e);
  }

  // Brand Name in Royal Maroon (#6B1F1F)
  doc.setTextColor(107, 31, 31);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('G.KAMAL GANESHA WORKS', 31, 15.5);

  // Subtitle in Deep Gold / Ochre
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 135, 20);
  doc.text('PREMIUM CLAY IDOLS MANUFACTURER  |  BANGALORE', 31, 21);

  // Business info on Top Right
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Saraipalaya, Thanisandra Main Road', pageWidth - 12, 13.5, { align: 'right' });
  doc.text('Vidyasagar, Bangalore - 560077', pageWidth - 12, 17.5, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 31, 31);
  doc.text('Ph: 9739142445 / 8792044625', pageWidth - 12, 22, { align: 'right' });

  // Divider Line in Royal Maroon
  doc.setDrawColor(107, 31, 31);
  doc.setLineWidth(0.6);
  doc.line(10, 27, pageWidth - 10, 27);

  // --- 4. BILL TYPE & CUSTOMER / ORDER DETAILS ---
  let headerOffset = 33;
  if (isChecking) {
    // Elegant Checking Bill Badge
    doc.setFillColor(107, 31, 31);
    doc.rect((pageWidth - 46) / 2, 28.5, 46, 6, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 215, 0); // Gold text
    doc.text('CHECKING BILL', pageWidth / 2, 32.8, { align: 'center' });
    headerOffset = 38.5;
  }

  const boxWidth = (pageWidth - 26) / 2; // 92mm width each
  const boxHeight = 26;

  // --- LEFT BOX: BILL TO / CUSTOMER ---
  doc.setFillColor(255, 252, 245); // Warm Cream background fill
  doc.setDrawColor(212, 175, 55);  // Gold border
  doc.setLineWidth(0.3);
  doc.roundedRect(10, headerOffset, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setTextColor(107, 31, 31); // Royal Maroon Title
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO / CUSTOMER:', 13, headerOffset + 5);

  const cust = order.customerDetails || {};
  doc.setTextColor(20, 20, 20); // Dark text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(cust.name || 'Customer', 13, headerOffset + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Mobile: ${cust.mobile || 'N/A'}`, 13, headerOffset + 15.5);

  const addressText = cust.address ? `Address: ${cust.address}` : 'Address: Bangalore';
  const addressLines = doc.splitTextToSize(addressText, boxWidth - 6);
  doc.text(addressLines[0], 13, headerOffset + 20.5);

  // --- RIGHT BOX: ORDER DETAILS ---
  const rightBoxX = 10 + boxWidth + 6;

  doc.setFillColor(255, 252, 245); // Explicit Warm Cream background fill!
  doc.setDrawColor(212, 175, 55);  // Gold border
  doc.setLineWidth(0.3);
  doc.roundedRect(rightBoxX, headerOffset, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setTextColor(107, 31, 31); // Royal Maroon Title
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDER DETAILS:', rightBoxX + 3, headerOffset + 5);

  doc.setTextColor(20, 20, 20); // Crisp dark text
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Order ID: #${order.id || 'N/A'}`, rightBoxX + 3, headerOffset + 10.5);

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN')
    : new Date().toLocaleDateString('en-IN');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Date: ${orderDate}`, rightBoxX + 3, headerOffset + 15.5);

  const statusLabel = order.status === 'finalized' ? 'APPROVED' : (isChecking ? 'ESTIMATE / CHECKING' : 'PENDING REVIEW');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(order.status === 'finalized' ? 22 : 180, order.status === 'finalized' ? 120 : 70, order.status === 'finalized' ? 22 : 20);
  doc.text(`Status: ${statusLabel}`, rightBoxX + 3, headerOffset + 20.5);

  const currentYAfterCust = headerOffset + 30;

  // --- 5. ITEMS TABLE (Logo Theme: Maroon Header, Gold Trim, Alternating Cream Rows) ---
  doc.setTextColor(107, 31, 31);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDER ITEMS', 12, currentYAfterCust);

  const tableStartY = currentYAfterCust + 3;
  // Header background in Royal Maroon
  doc.setFillColor(107, 31, 31);
  doc.rect(10, tableStartY, pageWidth - 20, 7.5, 'F');

  // Header text in Bright Gold/Cream
  doc.setTextColor(255, 235, 140); // Bright Gold Accent
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('#', 13, tableStartY + 5);
  doc.text('Item Description', 22, tableStartY + 5);
  doc.text('Rate', 138, tableStartY + 5, { align: 'right' });
  doc.text('Qty', 162, tableStartY + 5, { align: 'right' });
  doc.text('Amount', pageWidth - 13, tableStartY + 5, { align: 'right' });

  let currentY = tableStartY + 7.5;
  doc.setFont('helvetica', 'normal');

  const items = order.items || [];
  items.forEach((item, idx) => {
    const rowBg = idx % 2 === 1;
    if (rowBg) {
      doc.setFillColor(255, 250, 240); // Soft Warm Cream
      doc.rect(10, currentY, pageWidth - 20, 7, 'F');
    }

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8.5);
    doc.text(String(idx + 1), 13, currentY + 5);

    const nameLines = doc.splitTextToSize(item.name || '', 100);
    doc.text(nameLines[0], 22, currentY + 5);

    const rateVal = Number(item.rate !== undefined && !isNaN(item.rate) ? item.rate : (item.quantity ? ((item.lineTotal || 0) / item.quantity) : 0));
    doc.text(`Rs.${rateVal.toLocaleString('en-IN')}`, 138, currentY + 5, { align: 'right' });
    doc.text(String(item.quantity || 1), 162, currentY + 5, { align: 'right' });
    const lineTotalVal = Number(item.lineTotal !== undefined && !isNaN(item.lineTotal) ? item.lineTotal : (rateVal * (item.quantity || 1)));
    doc.text(`Rs.${lineTotalVal.toLocaleString('en-IN')}`, pageWidth - 13, currentY + 5, { align: 'right' });

    doc.setDrawColor(230, 215, 185);
    doc.setLineWidth(0.1);
    doc.line(10, currentY + 7, pageWidth - 10, currentY + 7);

    currentY += 7;
  });

  // Table bottom line in Royal Maroon
  doc.setDrawColor(107, 31, 31);
  doc.setLineWidth(0.5);
  doc.line(10, currentY, pageWidth - 10, currentY);

  // --- 6. TOTALS SUMMARY ---
  currentY += 8;
  const summaryX = pageWidth - 90;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  // Items Subtotal
  const itemsSubtotal = items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0);
  const discount = Number(order.discount) || 0;
  const extraCharges = Number(order.extraCharges) || 0;

  if (discount > 0 || extraCharges > 0) {
    doc.text('Items Subtotal:', summaryX, currentY);
    doc.text(`Rs.${itemsSubtotal.toLocaleString('en-IN')}`, pageWidth - 13, currentY, { align: 'right' });
    currentY += 6;

    if (discount > 0) {
      doc.setTextColor(22, 120, 22);
      doc.text(`Discount / Offer:`, summaryX, currentY);
      doc.text(`- Rs.${discount.toLocaleString('en-IN')}`, pageWidth - 13, currentY, { align: 'right' });
      currentY += 6;
      doc.setTextColor(60, 60, 60);
    }

    if (extraCharges > 0) {
      doc.setTextColor(107, 31, 31);
      doc.text(`Extra Charges:`, summaryX, currentY);
      doc.text(`+ Rs.${extraCharges.toLocaleString('en-IN')}`, pageWidth - 13, currentY, { align: 'right' });
      currentY += 6;
      doc.setTextColor(60, 60, 60);
    }
  }

  // Grand Total
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', summaryX, currentY);
  doc.text(`Rs.${Number(order.grandTotal || 0).toLocaleString('en-IN')}`, pageWidth - 13, currentY, { align: 'right' });
  currentY += 6;

  // Advance Paid
  doc.setTextColor(22, 120, 22);
  doc.setFont('helvetica', 'normal');
  doc.text('Advance Received:', summaryX, currentY);
  doc.text(`- Rs.${Number(order.advancePayment || 0).toLocaleString('en-IN')}`, pageWidth - 13, currentY, { align: 'right' });
  currentY += 7;

  // Balance Due (Royal Maroon & Gold Highlighted Box matching logo theme)
  doc.setFillColor(107, 31, 31);
  doc.roundedRect(summaryX - 3, currentY - 5, pageWidth - summaryX - 7, 8, 1, 1, 'F');
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.roundedRect(summaryX - 3, currentY - 5, pageWidth - summaryX - 7, 8, 1, 1, 'S');

  doc.setTextColor(255, 215, 0); // Gold text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BALANCE DUE:', summaryX, currentY + 0.5);
  doc.text(`Rs.${Number(order.balanceDue || 0).toLocaleString('en-IN')}`, pageWidth - 13, currentY + 0.5, { align: 'right' });

  // --- 7. DOWNSIDE GANESHA EMBLEM & DEVOTIONAL CHANT ---
  const ganeshaY = pageHeight - 32;
  const centerX = pageWidth / 2;

  try {
    if (LOGO_BASE64) {
      doc.addImage(LOGO_BASE64, 'JPEG', centerX - 8, ganeshaY - 8, 16, 16);
    }
  } catch (e) {
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.4);
    doc.circle(centerX, ganeshaY, 7, 'S');
  }

  doc.setTextColor(107, 31, 31);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('||  SHRI GANESHAYA NAMAH  ||', centerX, ganeshaY + 10.5, { align: 'center' });

  // --- 8. FOOTER ---
  const footerY = pageHeight - 14;

  if (isChecking) {
    doc.setTextColor(180, 50, 50);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('** THIS IS A CHECKING BILL — NOT FOR PAYMENT **', pageWidth / 2, footerY - 5, { align: 'center' });
  }

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.line(10, footerY - 1, pageWidth - 10, footerY - 1);

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('All rights reserved © G.Kamal Ganesha Works', pageWidth / 2, footerY + 3, { align: 'center' });
  doc.text('G.Kamal: 9739142445  |  Pravin Kumar: 8792044625', pageWidth / 2, footerY + 7, { align: 'center' });

  return doc;
};
