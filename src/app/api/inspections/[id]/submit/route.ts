import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireTenantAuth();
    const body = await req.json();
    const { responses, photos, evidence, gpsLocation, signature } = body;

    const inspection = await prisma.inspection.findFirst({
      where: { id: params.id, organizationId: auth.organizationId },
      include: {
        site: true,
        templateVersion: {
          include: {
            sections: {
              include: { questions: true },
            },
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    if (auth.role === 'INSPECTOR' && inspection.inspectorId !== auth.session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Upsert Responses
    const upsertedResponses: any[] = [];
    if (responses && Array.isArray(responses)) {
      for (const resp of responses) {
        if (!resp.questionId) continue;
        const res = await prisma.inspectionResponse.upsert({
          where: {
            inspectionId_questionId: {
              inspectionId: params.id,
              questionId: resp.questionId,
            },
          },
          update: {
            status: resp.status || null,
            notes: resp.notes || null,
            rating: resp.rating !== undefined && resp.rating !== null ? Number(resp.rating) : null,
            numberValue: resp.numberValue !== undefined && resp.numberValue !== '' && resp.numberValue !== null ? Number(resp.numberValue) : null,
            textValue: resp.textValue || null,
            selectedOptions: resp.selectedOptions ? (typeof resp.selectedOptions === 'string' ? resp.selectedOptions : JSON.stringify(resp.selectedOptions)) : null,
          },
          create: {
            inspectionId: params.id,
            questionId: resp.questionId,
            status: resp.status || null,
            notes: resp.notes || null,
            rating: resp.rating !== undefined && resp.rating !== null ? Number(resp.rating) : null,
            numberValue: resp.numberValue !== undefined && resp.numberValue !== '' && resp.numberValue !== null ? Number(resp.numberValue) : null,
            textValue: resp.textValue || null,
            selectedOptions: resp.selectedOptions ? (typeof resp.selectedOptions === 'string' ? resp.selectedOptions : JSON.stringify(resp.selectedOptions)) : null,
          },
          include: { question: true },
        });
        upsertedResponses.push(res);
      }
    }

    // 2. Save Evidence
    const evidenceList = evidence || photos;
    if (evidenceList && Array.isArray(evidenceList)) {
      for (const item of evidenceList) {
        if (!item.id && item.fileUrl) {
          await prisma.evidenceFile.create({
            data: {
              inspectionId: params.id,
              questionId: item.questionId || null,
              findingId: item.findingId || null,
              mediaType: item.mediaType || 'PHOTO',
              fileUrl: item.fileUrl,
              fileName: item.fileName || 'evidence.jpg',
              caption: item.caption || null,
              category: item.category || 'DEFICIENCY',
              mimeType: item.mimeType || 'image/jpeg',
              fileSize: item.fileSize ? Number(item.fileSize) : null,
            },
          });
        }
      }
    }

    // 3. Save GPS Record
    if (gpsLocation && gpsLocation.latitude && gpsLocation.longitude) {
      const lat = Number(gpsLocation.latitude);
      const lng = Number(gpsLocation.longitude);

      let distanceFromSite: number | null = null;
      let isWithinGeofence = true;
      if (inspection.site?.latitude && inspection.site?.longitude) {
        const R = 6371e3;
        const φ1 = (inspection.site.latitude * Math.PI) / 180;
        const φ2 = (lat * Math.PI) / 180;
        const Δφ = ((lat - inspection.site.latitude) * Math.PI) / 180;
        const Δλ = ((lng - inspection.site.longitude) * Math.PI) / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceFromSite = Math.round(R * c);
        isWithinGeofence = distanceFromSite <= 500;
      }

      await prisma.gPSRecord.create({
        data: {
          inspectionId: params.id,
          latitude: lat,
          longitude: lng,
          accuracy: gpsLocation.accuracy ? Number(gpsLocation.accuracy) : null,
          altitude: gpsLocation.altitude ? Number(gpsLocation.altitude) : null,
          address: gpsLocation.address || null,
          distanceFromSite,
          isWithinGeofence,
        },
      });
    }

    // 4. Save Signature
    if (signature && signature.signatureDataUrl) {
      await prisma.signature.create({
        data: {
          inspectionId: params.id,
          signerName: signature.signerName || auth.session.name,
          signerType: signature.signerType || 'INSPECTOR',
          signerTitle: signature.signerTitle || 'Field Inspector',
          signatureDataUrl: signature.signatureDataUrl,
        },
      });
    }

    // 5. Calculate Compliance Score & Auto-Generate Findings for Failures
    let passCount = 0;
    let failCount = 0;
    let totalScoreable = 0;

    for (const r of upsertedResponses) {
      if (r.status === 'PASS' || r.status === 'YES') {
        passCount++;
        totalScoreable++;
      } else if (r.status === 'FAIL' || r.status === 'NO') {
        failCount++;
        totalScoreable++;

        // Auto-generate a finding if one doesn't exist yet for this question & inspection
        const existingFinding = await prisma.finding.findFirst({
          where: { inspectionId: params.id, questionId: r.questionId },
        });

        if (!existingFinding) {
          const findingCount = await prisma.finding.count({
            where: { organizationId: auth.organizationId },
          });
          const findingCode = `FND-${new Date().getFullYear()}-${String(findingCount + 1).padStart(4, '0')}`;

          await prisma.finding.create({
            data: {
              organizationId: auth.organizationId,
              inspectionId: params.id,
              questionId: r.questionId,
              responseId: r.id,
              siteId: inspection.siteId,
              assetId: inspection.assetId,
              findingCode,
              title: `Deficiency: ${r.question?.questionText || 'Non-compliance detected'}`,
              description: r.notes || `Requirement failed inspection check at ${inspection.siteName}. Immediate corrective remediation required.`,
              severity: 'HIGH',
              riskCategory: 'Regulatory Compliance & Safety',
              recommendation: 'Perform immediate corrective maintenance, reinspect, and verify remediation.',
              status: 'OPEN',
            },
          });
        }
      }
    }

    const calculatedScore = totalScoreable > 0 ? Math.round((passCount / totalScoreable) * 100) : 100;

    // 6. Update inspection to SUBMITTED
    const updated = await prisma.inspection.update({
      where: { id: params.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        complianceScore: calculatedScore,
      },
      include: {
        template: true,
        site: true,
        findings: true,
      },
    });

    // 7. Notify Managers
    const managers = await prisma.organizationMembership.findMany({
      where: {
        organizationId: auth.organizationId,
        role: { in: ['ORG_ADMIN', 'MANAGER'] },
      },
      select: { userId: true },
    });

    for (const m of managers) {
      await createNotification({
        organizationId: auth.organizationId,
        userId: m.userId,
        title: 'Inspection Submitted for Review',
        message: `${updated.title} submitted by ${auth.session.name} with score ${calculatedScore}%. (${failCount} deficiencies detected)`,
        type: 'REVIEW',
        linkUrl: `/manager/inspections/${updated.id}`,
      });
    }

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      inspectionId: params.id,
      action: 'INSPECTION_SUBMITTED',
      entity: 'Inspection',
      entityId: params.id,
      details: `Inspection officially submitted with score ${calculatedScore}% (${failCount} findings flagged)`,
    });

    return NextResponse.json({
      success: true,
      message: 'Inspection submitted successfully',
      complianceScore: calculatedScore,
      findingsCreated: failCount,
      inspection: updated,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error submitting inspection:', error);
    return NextResponse.json({ error: 'Failed to submit inspection' }, { status: 500 });
  }
}
