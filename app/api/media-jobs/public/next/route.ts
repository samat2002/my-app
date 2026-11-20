export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint for display screen to fetch the next queued media job
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeId = searchParams.get('excludeId');

    const where: any = {
      status: { in: ['onQueue', 'ON_QUEUE', 'APPROVED'] },
    };

    if (excludeId) {
      where.id = { not: Number(excludeId) };
    }

    const nextJob = await prisma.mediaJob.findFirst({
      where,
      orderBy: [{ playOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const data = nextJob ? { ...nextJob, displaySeconds: nextJob.displayMinutes } : null;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('GET /api/media-jobs/public/next error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
