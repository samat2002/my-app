export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint called by /display screen when a media finishes playing its duration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (jobId) {
      // Mark current job as COMPLETED (has played once -> moved to Post Jobs)
      await prisma.mediaJob.update({
        where: { id: Number(jobId) },
        data: { status: 'COMPLETED' },
      }).catch((err) => {
        console.warn(`Could not update job #${jobId} to COMPLETED:`, err.message);
      });
    }

    // Check if Queue Play mode is enabled
    const setting = await prisma.log.findFirst({
      where: { user: 'SYSTEM_SETTING', userId: 'QUEUE_PLAY' },
      orderBy: { time: 'desc' },
    });
    const queuePlayEnabled = setting ? setting.message === 'ON' : false;

    // If Queue Play is OFF, do not auto-play next job
    if (!queuePlayEnabled) {
      return NextResponse.json({
        success: true,
        finishedJobId: jobId || null,
        nextJob: null,
      });
    }

    // Look for the next onQueue/APPROVED job in the queue (FIFO order)
    const nextJob = await prisma.mediaJob.findFirst({
      where: { status: { in: ['onQueue', 'ON_QUEUE', 'APPROVED'] } },
      orderBy: [{ playOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (nextJob) {
      // Mark next job as PLAYING
      const updated = await prisma.mediaJob.update({
        where: { id: nextJob.id },
        data: { status: 'PLAYING' },
      });

      return NextResponse.json({
        success: true,
        finishedJobId: jobId || null,
        nextJob: {
          ...updated,
          displaySeconds: updated.displayMinutes,
        },
      });
    }

    return NextResponse.json({
      success: true,
      finishedJobId: jobId || null,
      nextJob: null,
    });
  } catch (error: any) {
    console.error('POST /api/media-jobs/public/finish error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
