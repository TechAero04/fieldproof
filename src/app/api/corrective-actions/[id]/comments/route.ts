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
    const { comment } = body;

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    const action = await prisma.correctiveAction.findFirst({
      where: { id: params.id, organizationId: auth.organizationId },
    });

    if (!action) {
      return NextResponse.json({ error: 'Corrective action not found' }, { status: 404 });
    }

    const created = await prisma.correctiveActionComment.create({
      data: {
        actionId: params.id,
        userId: auth.session.userId,
        comment: comment.trim(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await recordAuditLog({
      organizationId: auth.organizationId,
      userId: auth.session.userId,
      inspectionId: action.inspectionId,
      action: 'CAPA_COMMENT_ADDED',
      entity: 'CorrectiveAction',
      entityId: params.id,
      details: `Comment added to ${action.actionCode} by ${auth.session.name}`,
    });

    return NextResponse.json({ success: true, comment: created });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error posting comment:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
