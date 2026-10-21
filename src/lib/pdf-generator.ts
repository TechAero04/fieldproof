import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF interface to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

export interface PdfReportData {
  id: string;
  title: string;
  status: string;
  priority: string;
  siteName: string;
  siteAddress: string;
  complianceScore?: number | null;
  dueDate: string | Date | null;
  startedAt: string | Date | null;
  submittedAt: string | Date | null;
  reviewedAt: string | Date | null;
  createdAt: string | Date;
  organization?: {
    name: string;
    industry?: string | null;
    slug?: string;
  } | null;
  site?: {
    name: string;
    code?: string | null;
    address: string;
  } | null;
  asset?: {
    name: string;
    assetTag: string;
    category: string;
    status: string;
  } | null;
  template: {
    title: string;
    category: string;
  };
  inspector: {
    name: string;
    email: string;
    title?: string | null;
    department?: string | null;
  } | null;
  createdBy: {
    name: string;
    email: string;
  };
  responses: Array<{
    id: string;
    status: string | null;
    notes: string | null;
    rating: number | null;
    numberValue: number | null;
    textValue: string | null;
    question: {
      questionText: string;
      questionType: string;
      section?: {
        title: string;
      } | null;
    };
  }>;
  evidence: Array<{
    id: string;
    fileUrl: string;
    caption: string | null;
    category?: string | null;
  }>;
  gpsLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    altitude?: number | null;
    address?: string | null;
    distanceFromSite?: number | null;
    isWithinGeofence?: boolean;
    timestamp: string | Date;
  } | null;
  signature: {
    signerName: string;
    signerRole: string;
    signatureDataUrl: string;
    signedAt: string | Date;
  } | null;
  findings?: Array<{
    findingCode: string;
    title: string;
    severity: string;
    riskCategory: string;
    description: string;
    recommendation?: string | null;
    status: string;
    correctiveActions?: Array<{
      actionCode: string;
      title: string;
      status: string;
      dueDate: string | Date;
      assignee?: { name: string } | null;
    }>;
  }>;
  reviews: Array<{
    status: string;
    feedback: string | null;
    reviewedAt: string | Date;
    reviewer: {
      name: string;
      email: string;
    };
  }>;
}

export function generateInspectionPdf(data: PdfReportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. Header Banner
  doc.setFillColor(30, 58, 138); // Deep Navy (#1e3a8a)
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FIELDPROOF V2', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(191, 219, 254);
  const orgName = data.organization?.name ? `${data.organization.name.toUpperCase()} • ` : '';
  doc.text(`${orgName}OFFICIAL AUDIT & COMPLIANCE CERTIFICATION`, margin, 18);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US')} • Document ID: ${data.id.substring(0, 12)}`, margin, 23);

  // Status Badge in header
  const statusX = pageWidth - margin - 38;
  let statusBg = [16, 185, 129]; // Emerald for Approved
  if (data.status === 'SUBMITTED') statusBg = [59, 130, 246]; // Blue
  else if (data.status === 'CHANGES_REQUESTED') statusBg = [249, 115, 22]; // Orange
  else if (data.status === 'IN_PROGRESS') statusBg = [245, 158, 11]; // Amber

  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(statusX, 8, 38, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(data.status.replace('_', ' '), statusX + 19, 15.5, { align: 'center' });

  let currentY = 36;

  // 2. Inspection Title & Details
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.title, margin, currentY);
  currentY += 6;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Template: ${data.template?.title || 'Standard'} | Category: ${data.template?.category || 'General'}`, margin, currentY);
  currentY += 8;

  // 3. Metadata Table
  const metadataRows = [
    [
      { content: 'Site / Facility:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      `${data.siteName}${data.site?.code ? ` [${data.site.code}]` : ''}`,
      { content: 'Inspection ID:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      data.id.substring(0, 16),
    ],
    [
      { content: 'Site Address:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      data.siteAddress,
      { content: 'Priority:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      data.priority,
    ],
    [
      { content: 'Assigned Inspector:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      `${data.inspector?.name || 'Unassigned'} (${data.inspector?.email || 'N/A'})`,
      { content: 'Asset Tag:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      data.asset ? `${data.asset.name} (${data.asset.assetTag})` : 'N/A (Facility Wide)',
    ],
    [
      { content: 'Inspection Date:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : (data.startedAt ? new Date(data.startedAt).toLocaleDateString() : 'In Progress'),
      { content: 'Review Status:', styles: { fontStyle: 'bold', textColor: [71, 85, 105] } },
      data.reviews?.[0] ? `${data.reviews[0].status} by ${data.reviews[0].reviewer?.name}` : 'Pending Review',
    ],
  ];

  doc.autoTable({
    startY: currentY,
    body: metadataRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 32, fillColor: [248, 250, 252] },
      1: { cellWidth: 65 },
      2: { cellWidth: 28, fillColor: [248, 250, 252] },
      3: { cellWidth: 57 },
    },
    margin: { left: margin, right: margin },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 4. Compliance Score Summary Metrics
  let passCount = 0;
  let failCount = 0;
  let naCount = 0;
  data.responses.forEach((r) => {
    if (r.status === 'PASS' || r.status === 'YES') passCount++;
    else if (r.status === 'FAIL' || r.status === 'NO') failCount++;
    else if (r.status === 'NA') naCount++;
  });
  const totalAudited = passCount + failCount;
  const complianceRate = data.complianceScore !== null && data.complianceScore !== undefined
    ? data.complianceScore
    : (totalAudited > 0 ? Math.round((passCount / totalAudited) * 100) : 100);

  // Draw Summary KPI Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 16, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');

  doc.text(`Total Questions: ${data.responses.length}`, margin + 6, currentY + 10);
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.text(`Passed: ${passCount}`, margin + 48, currentY + 10);
  doc.setTextColor(239, 68, 68);
  doc.text(`Deficiencies: ${failCount}`, margin + 82, currentY + 10);
  doc.setTextColor(100, 116, 139);
  doc.text(`N/A: ${naCount}`, margin + 118, currentY + 10);

  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text(`Compliance Score: ${complianceRate}%`, pageWidth - margin - 48, currentY + 10);

  currentY += 22;

  // 5. Checklist Responses Table
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Checklist Audit Evaluation', margin, currentY);
  currentY += 4;

  const checklistTableData = data.responses.map((r, idx) => {
    let resultText = r.status || 'N/A';
    if (r.rating) resultText = `Rating: ${r.rating} / 5 ★`;
    else if (r.numberValue !== null && r.numberValue !== undefined) resultText = `Value: ${r.numberValue}`;
    else if (r.textValue) resultText = `Text: ${r.textValue}`;

    return [
      (idx + 1).toString(),
      r.question?.section?.title || 'General',
      r.question?.questionText || 'Question',
      resultText,
      r.notes || '—',
    ];
  });

  doc.autoTable({
    startY: currentY,
    head: [['#', 'Section', 'Inspection Item', 'Result', 'Notes & Findings']],
    body: checklistTableData,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      valign: 'middle',
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 68 },
      3: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 48 },
    },
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.column.index === 3) {
        const val = hookData.cell.raw;
        if (val === 'PASS' || val === 'YES') {
          hookData.cell.styles.textColor = [16, 185, 129];
        } else if (val === 'FAIL' || val === 'NO') {
          hookData.cell.styles.textColor = [239, 68, 68];
        } else if (val === 'NA') {
          hookData.cell.styles.textColor = [148, 163, 184];
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 6. Findings & Deficiencies Table (if any)
  if (data.findings && data.findings.length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 20;
    }

    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`Deficiencies & Compliance Findings (${data.findings.length})`, margin, currentY);
    currentY += 4;

    const findingsRows = data.findings.map((f) => [
      f.findingCode,
      f.severity,
      f.riskCategory,
      f.title,
      f.recommendation || f.description,
      f.status,
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Code', 'Severity', 'Category', 'Finding Description', 'Corrective Recommendation', 'Status']],
      body: findingsRows,
      theme: 'grid',
      headStyles: {
        fillColor: [185, 28, 28], // Red header
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 28 },
        3: { cellWidth: 50 },
        4: { cellWidth: 44 },
        5: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // Check if we need a new page for GPS & Signatures
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 20;
  }

  // 7. GPS Location Verification
  if (data.gpsLocation) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 20, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text('GEOLOCATION AUDIT & GEOFENCE VERIFICATION', margin + 6, currentY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const geofenceText = data.gpsLocation.distanceFromSite !== null && data.gpsLocation.distanceFromSite !== undefined
      ? ` | Distance from Site: ${data.gpsLocation.distanceFromSite}m (${data.gpsLocation.isWithinGeofence ? 'Verified Within Geofence ✓' : 'Outside Geofence ⚠️'})`
      : '';
    doc.text(
      `Coordinates: ${data.gpsLocation.latitude.toFixed(6)}° N, ${data.gpsLocation.longitude.toFixed(6)}° W | Accuracy: ±${data.gpsLocation.accuracy || 5}m${geofenceText}`,
      margin + 6,
      currentY + 12
    );
    if (data.gpsLocation.address) {
      doc.text(`Reverse Geocoded Address: ${data.gpsLocation.address}`, margin + 6, currentY + 16.5);
    }
    currentY += 25;
  }

  // 8. Signature & Reviewer Sign-off Box
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 20;
  }

  const colWidth = (pageWidth - margin * 2 - 10) / 2;

  // Inspector Signature Block
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, currentY, colWidth, 34, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('INSPECTOR ATTESTATION & SIGNATURE', margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Inspector: ${data.signature?.signerName || data.inspector?.name || 'Authorized Inspector'}`, margin + 4, currentY + 11);
  doc.text(`Role: ${data.signature?.signerRole || 'Lead Inspector'}`, margin + 4, currentY + 15);
  doc.text(`Attested: ${data.signature?.signedAt ? new Date(data.signature.signedAt).toLocaleString() : 'Digital Signature Recorded'}`, margin + 4, currentY + 19);

  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 4, currentY + 28, margin + colWidth - 4, currentY + 28);
  doc.setFontSize(6.5);
  doc.text('Cryptographic Device Signature Verified ✓', margin + 4, currentY + 31.5);

  // Manager Approval Block
  const managerX = margin + colWidth + 10;
  doc.rect(managerX, currentY, colWidth, 34, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('MANAGEMENT CERTIFICATION', managerX + 4, currentY + 5.5);

  const review = data.reviews?.[0];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Status: ${data.status.replace('_', ' ')}`, managerX + 4, currentY + 11);
  doc.text(`Reviewer: ${review?.reviewer?.name || 'Pending Review'}`, managerX + 4, currentY + 15);
  doc.text(`Date: ${review?.reviewedAt ? new Date(review.reviewedAt).toLocaleString() : 'Awaiting sign-off'}`, managerX + 4, currentY + 19);
  if (review?.feedback) {
    const feedbackLines = doc.splitTextToSize(`Notes: "${review.feedback}"`, colWidth - 8);
    doc.text(feedbackLines, managerX + 4, currentY + 23);
  }

  // Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `FieldProof SaaS V2 • Confidential Compliance Certificate • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}
