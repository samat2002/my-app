export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint to get the currently playing job on the display screen
export async function GET() {
  try {
    const currentJob = await prisma.mediaJob.findFirst({
      where: { status: 'PLAYING' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!currentJob) {
      return NextResponse.json({ success: true, data: null });
    }

    const durationSec = currentJob.displayMinutes || 30;
    const startedAt = new Date(currentJob.updatedAt).getTime();
    const now = Date.now();
    const elapsedSec = (now - startedAt) / 1000;

    // Self-healing: If duration has expired while screen was offline
    if (elapsedSec >= durationSec) {
      await prisma.mediaJob.update({
        where: { id: currentJob.id },
        data: { status: 'COMPLETED' },
      }).catch(() => {});

      // Check if Queue Play is enabled
      const setting = await prisma.log.findFirst({
        where: { user: 'SYSTEM_SETTING', userId: 'QUEUE_PLAY' },
        orderBy: { time: 'desc' },
      });
      const queuePlayEnabled = setting ? setting.message === 'ON' : false;

      if (queuePlayEnabled) {
        // Look for next onQueue job
        const nextJob = await prisma.mediaJob.findFirst({
          where: { status: { in: ['onQueue', 'ON_QUEUE', 'APPROVED'] } },
          orderBy: [{ playOrder: 'asc' }, { createdAt: 'asc' }],
        });

        if (nextJob) {
          const updatedNext = await prisma.mediaJob.update({
            where: { id: nextJob.id },
            data: { status: 'PLAYING' },
          });

          return NextResponse.json({
            success: true,
            data: {
              ...updatedNext,
              displaySeconds: updatedNext.displayMinutes,
              startedAt: Date.now(),
              remainingSeconds: updatedNext.displayMinutes,
            },
          });
        }
      }

      return NextResponse.json({ success: true, data: null });
    }

    const remainingSeconds = Math.max(0, Math.ceil(durationSec - elapsedSec));

    return NextResponse.json({
      success: true,
      data: {
        ...currentJob,
        displaySeconds: currentJob.displayMinutes,
        startedAt,
        remainingSeconds,
      },
    });
  } catch (error: any) {
    console.error('GET /api/media-jobs/public/current error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
