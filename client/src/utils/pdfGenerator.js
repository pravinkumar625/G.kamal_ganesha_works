import { jsPDF } from 'jspdf';

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
 * @param {string} watermarkText "CHECKING BILL" or "ORIGINAL — GANESHA BILL"
 * @param {boolean} isChecking If true, appends the checking bill footnote.
 */
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

  // Watermark text rule:
  // For checking bill: "CHECKING BILL"
  // For finalized bill: "G.kamal ganesha works"
  const actualWatermark = isChecking
    ? 'CHECKING BILL'
    : (watermarkText && !watermarkText.includes('ORIGINAL') ? watermarkText : 'G.kamal ganesha works');

  // --- 1. WATERMARK BACKGROUND (Clipped strictly inside inner border) ---
  doc.saveGraphicsState();
  doc.rect(7, 7, pageWidth - 14, pageHeight - 14);
  doc.clip();

  doc.setTextColor(240, 232, 226);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  for (let y = 18; y < pageHeight - 5; y += 38) {
    for (let x = -10; x < pageWidth + 20; x += 75) {
      doc.text(actualWatermark, x, y, { angle: 30 });
    }
  }
  doc.restoreGraphicsState();

  // --- 2. GOLDEN BORDER ---
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.8);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
  doc.setLineWidth(0.2);
  doc.rect(6.5, 6.5, pageWidth - 13, pageHeight - 13);

  // --- 3. HEADER SECTION ---
  doc.setTextColor(107, 31, 31);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('G.KAMAL GANESHA WORKS', 12, 18);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(160, 120, 20);
  doc.text('PREMIUM CLAY IDOLS MANUFACTURER  |  BANGALORE', 12, 22.5);

  // Top-right business info
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Saraipalaya, Thanisandra Main Road', pageWidth - 12, 14, { align: 'right' });
  doc.text('Vidyasagar, Bangalore - 560077', pageWidth - 12, 18, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('Ph: 9739142445 / 8792044625', pageWidth - 12, 22.5, { align: 'right' });

  // Divider
  doc.setDrawColor(107, 31, 31);
  doc.setLineWidth(0.5);
  doc.line(10, 27, pageWidth - 10, 27);

  // --- 4. BILL REFERENCE & CUSTOMER ---
  // If checking bill, show "CHECKING BILL"; for finalized, no "ORIGINAL BILL" header (clean invoice format)
  if (isChecking) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 50, 50);
    doc.text('CHECKING BILL', pageWidth / 2, 33, { align: 'center' });
  }

  // Customer info (left)
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 12, 38);
  doc.setFont('helvetica', 'normal');

  const cust = order.customerDetails || {};
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(cust.name || 'Customer', 12, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Mobile: ${cust.mobile || 'N/A'}`, 12, 49);
  if (cust.email) doc.text(`Email: ${cust.email}`, 12, 53.5);

  const addressLines = cust.address
    ? doc.splitTextToSize(`Address: ${cust.address}`, 95)
    : ['Address: N/A'];
  doc.text(addressLines, 12, cust.email ? 58 : 53.5);

  // Order info (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('ORDER DETAILS:', pageWidth - 12, 38, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(`Order ID: #${order.id || 'N/A'}`, pageWidth - 12, 44, { align: 'right' });
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN')
    : new Date().toLocaleDateString('en-IN');
  doc.text(`Date: ${orderDate}`, pageWidth - 12, 49, { align: 'right' });

  const statusLabel = order.status === 'finalized' ? 'APPROVED' : 'PENDING REVIEW';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(order.status === 'finalized' ? 22 : 180, order.status === 'finalized' ? 120 : 80, order.status === 'finalized' ? 22 : 20);
  doc.text(`Status: ${statusLabel}`, pageWidth - 12, 54, { align: 'right' });

  // Divider
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(10, 65, pageWidth - 10, 65);

  // --- 5. ITEMS TABLE ---
  doc.setTextColor(107, 31, 31);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDER ITEMS', 12, 71);

  const tableStartY = 74;
  doc.setFillColor(107, 31, 31);
  doc.rect(10, tableStartY, pageWidth - 20, 7.5, 'F');

  doc.setTextColor(255, 253, 246);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('#', 13, tableStartY + 5);
  doc.text('Item Description', 22, tableStartY + 5);
  doc.text('Size', 96, tableStartY + 5);
  doc.text('Rate', 128, tableStartY + 5, { align: 'right' });
  doc.text('Qty', 152, tableStartY + 5, { align: 'right' });
  doc.text('Amount', pageWidth - 13, tableStartY + 5, { align: 'right' });

  let currentY = tableStartY + 7.5;
  doc.setFont('helvetica', 'normal');

  const items = order.items || [];
  items.forEach((item, idx) => {
    const rowBg = idx % 2 === 1;
    if (rowBg) {
      doc.setFillColor(255, 250, 238);
      doc.rect(10, currentY, pageWidth - 20, 7, 'F');
    }

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8.5);
    doc.text(String(idx + 1), 13, currentY + 5);

    const nameLines = doc.splitTextToSize(item.name || '', 68);
    doc.text(nameLines[0], 22, currentY + 5);

    doc.text(item.size || '', 96, currentY + 5);
    doc.text(`Rs.${Number(item.rate).toLocaleString('en-IN')}`, 128, currentY + 5, { align: 'right' });
    doc.text(String(item.quantity || 1), 152, currentY + 5, { align: 'right' });
    doc.text(`Rs.${Number(item.lineTotal || 0).toLocaleString('en-IN')}`, pageWidth - 13, currentY + 5, { align: 'right' });

    doc.setDrawColor(220, 210, 190);
    doc.setLineWidth(0.1);
    doc.line(10, currentY + 7, pageWidth - 10, currentY + 7);

    currentY += 7;
  });

  // Table bottom line
  doc.setDrawColor(107, 31, 31);
  doc.setLineWidth(0.4);
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
      doc.setTextColor(80, 40, 140);
      doc.text(`Extra Charges:`, summaryX, currentY);
      doc.text(`+ Rs.${extraCharges.toLocaleString('en-IN')}`, pageWidth - 13, currentY, { align: 'right' });
      currentY += 6;
      doc.setTextColor(60, 60, 60);
    }
  }

  // Grand Total
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text('Grand Total:', summaryX, currentY);
  doc.text(`Rs.${Number(order.grandTotal || 0).toLocaleString('en-IN')}`, pageWidth - 13, currentY, { align: 'right' });
  currentY += 6;

  // Advance Paid
  doc.setTextColor(22, 120, 22);
  doc.text('Advance Received:', summaryX, currentY);
  doc.text(`- Rs.${Number(order.advancePayment || 0).toLocaleString('en-IN')}`, pageWidth - 13, currentY, { align: 'right' });
  currentY += 7;

  // Balance Due (highlighted box)
  doc.setFillColor(255, 235, 235);
  doc.rect(summaryX - 2, currentY - 4.5, pageWidth - summaryX - 10, 7, 'F');
  doc.setTextColor(107, 31, 31);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BALANCE DUE:', summaryX, currentY);
  doc.text(`Rs.${Number(order.balanceDue || 0).toLocaleString('en-IN')}`, pageWidth - 13, currentY, { align: 'right' });

  // --- 7. DOWNSIDE GANESHA EMBLEM / ICON ---
  const ganeshaY = pageHeight - 34;
  const centerX = pageWidth / 2;

  // Gold outer circle halo
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.circle(centerX, ganeshaY, 7, 'S');
  doc.setFillColor(255, 248, 240);
  doc.circle(centerX, ganeshaY, 6.6, 'F');

  // Ganesha Ears (maroon arcs)
  doc.setDrawColor(107, 31, 31);
  doc.setLineWidth(0.4);
  doc.ellipse(centerX - 2.6, ganeshaY - 1, 1.8, 2.5, 'S');
  doc.ellipse(centerX + 2.6, ganeshaY - 1, 1.8, 2.5, 'S');

  // Crown Mukut (Golden Triangle + Maroon Bindi)
  doc.setFillColor(212, 175, 55);
  doc.triangle(centerX - 2.2, ganeshaY - 2.2, centerX + 2.2, ganeshaY - 2.2, centerX, ganeshaY - 5.5, 'FD');
  doc.setFillColor(107, 31, 31);
  doc.circle(centerX, ganeshaY - 5.5, 0.5, 'F');

  // Gold Tilak Lines
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(centerX - 1.2, ganeshaY - 1.5, centerX + 1.2, ganeshaY - 1.5);
  doc.setFillColor(180, 30, 30);
  doc.circle(centerX, ganeshaY - 0.8, 0.4, 'F');

  // Trunk
  doc.setDrawColor(107, 31, 31);
  doc.setLineWidth(0.5);
  doc.line(centerX, ganeshaY - 0.5, centerX, ganeshaY + 2);
  doc.line(centerX, ganeshaY + 2, centerX - 1.2, ganeshaY + 3.2);

  // Devotional chant text
  doc.setTextColor(107, 31, 31);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('||  SHRI GANESHAYA NAMAH  ||', centerX, ganeshaY + 8.5, { align: 'center' });

  // --- 8. FOOTER DISCLAIMER ---
  const footerY = pageHeight - 16;

  if (isChecking) {
    doc.setTextColor(180, 50, 50);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('** THIS IS A CHECKING BILL — NOT FOR PAYMENT **', pageWidth / 2, footerY - 5, { align: 'center' });
  }

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.line(10, footerY - 1, pageWidth - 10, footerY - 1);

  doc.setTextColor(130, 130, 130);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('All rights reserved © G.Kamal Ganesha Works', pageWidth / 2, footerY + 3, { align: 'center' });
  doc.text('G.Kamal: 9739142445  |  Pravin Kumar: 8792044625', pageWidth / 2, footerY + 7.5, { align: 'center' });

  return doc;
};
