import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

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
      include: { site: true },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    if (auth.role === 'INSPECTOR' && inspection.inspectorId !== auth.session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Upsert Checklist Responses
    if (responses && Array.isArray(responses)) {
      for (const resp of responses) {
        if (!resp.questionId) continue;
        await prisma.inspectionResponse.upsert({
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
        });
      }
    }

    // 2. Save Evidence / Photos
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

    // 3. Save GPS Record if provided
    if (gpsLocation && gpsLocation.latitude && gpsLocation.longitude) {
      const lat = Number(gpsLocation.latitude);
      const lng = Number(gpsLocation.longitude);

      // Check distance from site if coordinates exist
      let distanceFromSite: number | null = null;
      let isWithinGeofence = true;
      if (inspection.site?.latitude && inspection.site?.longitude) {
        // Haversine formula
        const R = 6371e3; // metres
        const φ1 = (inspection.site.latitude * Math.PI) / 180;
        const φ2 = (lat * Math.PI) / 180;
        const Δφ = ((lat - inspection.site.latitude) * Math.PI) / 180;
        const Δλ = ((lng - inspection.site.longitude) * Math.PI) / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceFromSite = Math.round(R * c);
        // Geofence radius default: 500 meters
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

    // 4. Save Signature if provided
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

    // 5. Update inspection status if ASSIGNED
    const updateData: any = {};
    if (inspection.status === 'ASSIGNED') {
      updateData.status = 'IN_PROGRESS';
      updateData.startedAt = new Date();
    }

    await prisma.inspection.update({
      where: { id: params.id },
      data: updateData,
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      inspectionId: params.id,
      action: 'INSPECTION_DRAFT_SAVED',
      entity: 'Inspection',
      entityId: params.id,
      details: `Inspection draft updated by ${auth.session.name}`,
    });

    return NextResponse.json({ success: true, message: 'Draft saved successfully' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error saving draft:', error);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}
