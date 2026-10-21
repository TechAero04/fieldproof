import prisma from './prisma';

export interface CreateNotificationParams {
  organizationId: string;
  userId: string;
  title: string;
  message: string;
  type?: 'ASSIGNMENT' | 'REVIEW' | 'CAPA' | 'DEADLINE' | 'SYSTEM';
  linkUrl?: string | null;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        linkUrl: params.linkUrl || null,
      },
    });

    // Development Email Adapter: Log simulated email dispatch
    console.log(`[EMAIL DISPATCH SIMULATION] To User: ${params.userId} | Subject: ${params.title} | ${params.message}`);

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}
