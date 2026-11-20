export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all media jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category'); // 'current' | 'queue' | 'post'

    const where: any = {};
    let orderBy: any = { updatedAt: 'desc' };

    if (category === 'current') {
      where.status = 'PLAYING';
    } else if (category === 'queue') {
      where.status = { in: ['PENDING', 'onQueue', 'ON_QUEUE', 'APPROVED'] };
      orderBy = [{ playOrder: 'asc' }, { createdAt: 'asc' }];
    } else if (category === 'post') {
      where.status = { in: ['COMPLETED', 'REJECTED', 'CANCELLED'] };
      orderBy = { updatedAt: 'desc' };
    } else if (status) {
      where.status = status;
    }

    const jobs = await prisma.mediaJob.findMany({
      where,
      orderBy,
    });

    const mapped = jobs.map((j) => ({
      ...j,
      displaySeconds: j.displayMinutes,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    console.error('GET /api/media-jobs error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST create new media job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, type, mediaUrl, thumbnailUrl, cutDuration, displaySeconds, displayMinutes, submittedBy } = body;

    if (!mediaUrl || !type) {
      return NextResponse.json(
        { success: false, error: 'mediaUrl and type are required' },
        { status: 400 }
      );
    }

    const sec = displaySeconds !== undefined
      ? Number(displaySeconds)
      : displayMinutes !== undefined
      ? Number(displayMinutes)
      : (cutDuration ? Number(cutDuration) : 30);

    const job = await prisma.mediaJob.create({
      data: {
        title: title || (type === 'video' ? 'Video Submission' : 'Image Submission'),
        type,
        mediaUrl,
        thumbnailUrl: thumbnailUrl || null,
        cutDuration: cutDuration ? Number(cutDuration) : null,
        displayMinutes: sec,
        status: 'PENDING',
        submittedBy: submittedBy || 'User',
      },
    });

    return NextResponse.json({ success: true, data: { ...job, displaySeconds: job.displayMinutes } }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/media-jobs error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH update status or display duration of a media job
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, displaySeconds, displayMinutes, approvedBy, playOrder } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Job id is required' }, { status: 400 });
    }

    // If setting to PLAYING, complete any existing PLAYING jobs
    if (status === 'PLAYING') {
      await prisma.mediaJob.updateMany({
        where: {
          status: 'PLAYING',
          id: { not: Number(id) },
        },
        data: { status: 'COMPLETED' },
      }).catch(() => {});
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (playOrder !== undefined) updateData.playOrder = Number(playOrder);
    const sec = displaySeconds !== undefined
      ? Number(displaySeconds)
      : displayMinutes !== undefined
      ? Number(displayMinutes)
      : undefined;
    if (sec !== undefined) {
      updateData.displayMinutes = sec;
    }
    if (approvedBy !== undefined) updateData.approvedBy = approvedBy;

    const job = await prisma.mediaJob.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: { ...job, displaySeconds: job.displayMinutes } });
  } catch (error: any) {
    console.error('PATCH /api/media-jobs error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE a media job
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Job id is required' }, { status: 400 });
    }

    await prisma.mediaJob.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: 'Media job deleted' });
  } catch (error: any) {
    console.error('DELETE /api/media-jobs error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
