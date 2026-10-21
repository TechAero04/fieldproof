export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await requireTenantAuth();

    const notifications = await prisma.notification.findMany({
      where: {
        userId: auth.session.userId,
        organizationId: auth.organizationId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireTenantAuth();
    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          userId: auth.session.userId,
          organizationId: auth.organizationId,
          isRead: false,
        },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: 'All marked as read' });
    }

    if (notificationId) {
      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true, notification: updated });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
