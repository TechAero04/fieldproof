import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    const body = await req.json();
    const { operations } = body;

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: 'An array of sync operations with idempotency keys is required' },
        { status: 400 }
      );
    }

    const results: any[] = [];

    for (const op of operations) {
      const { idempotencyKey, operation, entityId, payload } = op;

      if (!idempotencyKey || !operation) {
        results.push({
          idempotencyKey: idempotencyKey || 'unknown',
          status: 'FAILED',
          error: 'Missing required idempotencyKey or operation',
        });
        continue;
      }

      // Check if already processed
      const existingOp = await prisma.offlineSyncOperation.findUnique({
        where: { idempotencyKey },
      });

      if (existingOp && existingOp.status === 'PROCESSED') {
        results.push({
          idempotencyKey,
          status: 'ALREADY_PROCESSED',
          processedAt: existingOp.processedAt,
        });
        continue;
      }

      // Create or update sync operation log
      const syncRecord = await prisma.offlineSyncOperation.upsert({
        where: { idempotencyKey },
        update: {
          operation,
          entityType: 'Inspection',
          entityId: entityId || 'unknown',
          payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
          status: 'PENDING',
        },
        create: {
          userId: auth.session.userId,
          idempotencyKey,
          operation,
          entityType: 'Inspection',
          entityId: entityId || 'unknown',
          payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
          status: 'PENDING',
        },
      });

      try {
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

        if (operation === 'SAVE_DRAFT' || operation === 'SUBMIT_INSPECTION') {
          const inspectionId = entityId;
          const { responses, evidence, photos, gpsLocation, signature } = data;

          const inspection = await prisma.inspection.findFirst({
            where: { id: inspectionId, organizationId: auth.organizationId },
          });

          if (!inspection) {
            throw new Error(`Inspection ${inspectionId} not found in active tenant`);
          }

          // 1. Upsert Responses
          if (responses && Array.isArray(responses)) {
            for (const resp of responses) {
              if (!resp.questionId) continue;
              await prisma.inspectionResponse.upsert({
                where: {
                  inspectionId_questionId: {
                    inspectionId,
                    questionId: resp.questionId,
                  },
                },
                update: {
                  status: resp.status || null,
                  notes: resp.notes || null,
                  rating: resp.rating !== undefined ? Number(resp.rating) : null,
                  numberValue: resp.numberValue !== undefined && resp.numberValue !== '' ? Number(resp.numberValue) : null,
                  textValue: resp.textValue || null,
                  selectedOptions: resp.selectedOptions ? (typeof resp.selectedOptions === 'string' ? resp.selectedOptions : JSON.stringify(resp.selectedOptions)) : null,
                },
                create: {
                  inspectionId,
                  questionId: resp.questionId,
                  status: resp.status || null,
                  notes: resp.notes || null,
                  rating: resp.rating !== undefined ? Number(resp.rating) : null,
                  numberValue: resp.numberValue !== undefined && resp.numberValue !== '' ? Number(resp.numberValue) : null,
                  textValue: resp.textValue || null,
                  selectedOptions: resp.selectedOptions ? (typeof resp.selectedOptions === 'string' ? resp.selectedOptions : JSON.stringify(resp.selectedOptions)) : null,
                },
              });
            }
          }

          // 2. Save Evidence
          const evidenceList = evidence || photos;
          if (evidenceList && Array.isArray(evidenceList)) {
            for (const item of evidenceList) {
              if (!item.id && item.fileUrl) {
                await prisma.evidenceFile.create({
                  data: {
                    inspectionId,
                    questionId: item.questionId || null,
                    findingId: item.findingId || null,
                    mediaType: item.mediaType || 'PHOTO',
                    fileUrl: item.fileUrl,
                    fileName: item.fileName || 'offline-evidence.jpg',
                    caption: item.caption || null,
                    category: item.category || 'DEFICIENCY',
                    mimeType: item.mimeType || 'image/jpeg',
                    fileSize: item.fileSize ? Number(item.fileSize) : null,
                  },
                });
              }
            }
          }

          // 3. Save GPS
          if (gpsLocation && gpsLocation.latitude && gpsLocation.longitude) {
            await prisma.gPSRecord.create({
              data: {
                inspectionId,
                latitude: Number(gpsLocation.latitude),
                longitude: Number(gpsLocation.longitude),
                accuracy: gpsLocation.accuracy ? Number(gpsLocation.accuracy) : null,
                address: gpsLocation.address || null,
              },
            });
          }

          // 4. Save Signature
          if (signature && signature.signatureDataUrl) {
            await prisma.signature.create({
              data: {
                inspectionId,
                signerName: signature.signerName || auth.session.name,
                signerType: signature.signerType || 'INSPECTOR',
                signatureDataUrl: signature.signatureDataUrl,
              },
            });
          }

          // 5. Update Status
          const isSubmit = operation === 'SUBMIT_INSPECTION';
          await prisma.inspection.update({
            where: { id: inspectionId },
            data: {
              status: isSubmit ? 'SUBMITTED' : (inspection.status === 'ASSIGNED' ? 'IN_PROGRESS' : inspection.status),
              submittedAt: isSubmit ? new Date() : inspection.submittedAt,
              startedAt: inspection.startedAt || new Date(),
            },
          });
        }

        // Mark operation processed
        await prisma.offlineSyncOperation.update({
          where: { id: syncRecord.id },
          data: {
            status: 'PROCESSED',
            processedAt: new Date(),
          },
        });

        results.push({
          idempotencyKey,
          status: 'PROCESSED',
          processedAt: new Date(),
        });
      } catch (err: any) {
        console.error(`Sync error for ${idempotencyKey}:`, err);
        await prisma.offlineSyncOperation.update({
          where: { id: syncRecord.id },
          data: {
            status: 'FAILED',
            errorMessage: err.message,
          },
        });

        results.push({
          idempotencyKey,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      action: 'OFFLINE_SYNC_BATCH',
      entity: 'OfflineSyncOperation',
      details: `Processed batch of ${operations.length} offline sync operations`,
    });

    return NextResponse.json({
      success: true,
      processedCount: results.filter((r) => r.status === 'PROCESSED' || r.status === 'ALREADY_PROCESSED').length,
      results,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error during batch sync:', error);
    return NextResponse.json({ error: 'Batch sync failed' }, { status: 500 });
  }
}
