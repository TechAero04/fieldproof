import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { generateInspectionPdf } from '@/lib/pdf-generator';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();

    const inspection = await prisma.inspection.findFirst({
      where: {
        id: params.id,
        organizationId: auth.organizationId,
      },
      include: {
        organization: {
          select: { name: true, industry: true, slug: true },
        },
        site: {
          select: { name: true, code: true, address: true },
        },
        asset: {
          select: { name: true, assetTag: true, category: true, status: true },
        },
        template: {
          select: { title: true, category: true },
        },
        inspector: {
          select: { name: true, email: true, title: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
        responses: {
          include: {
            question: {
              include: {
                section: true,
              },
            },
          },
        },
        evidence: true,
        gpsRecords: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        signatures: {
          orderBy: { signedAt: 'desc' },
          take: 1,
        },
        findings: {
          include: {
            correctiveActions: {
              include: { assignee: { select: { name: true } } },
            },
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: { name: true, email: true },
            },
          },
          orderBy: { reviewedAt: 'desc' },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    const latestGps = inspection.gpsRecords[0] || null;
    const latestSig = inspection.signatures[0] || null;

    // Prepare PDF Data structure
    const pdfPayload: any = {
      ...inspection,
      gpsLocation: latestGps,
      signature: latestSig ? {
        signerName: latestSig.signerName,
        signerRole: latestSig.signerTitle || latestSig.signerType,
        signatureDataUrl: latestSig.signatureDataUrl,
        signedAt: latestSig.signedAt,
      } : null,
    };

    // Generate the PDF
    const doc = generateInspectionPdf(pdfPayload);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const filename = `FieldProof_Audit_${inspection.siteName.replace(/[^a-zA-Z0-9]/g, '_')}_${inspection.id.substring(0, 8)}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF report' }, { status: 500 });
  }
}
