export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET queue play settings
export async function GET() {
  try {
    const setting = await prisma.log.findFirst({
      where: { user: 'SYSTEM_SETTING', userId: 'QUEUE_PLAY' },
      orderBy: { time: 'desc' },
    });

    const queuePlayEnabled = setting ? setting.message === 'ON' : false;

    return NextResponse.json({ success: true, queuePlayEnabled });
  } catch (error: any) {
    console.error('GET /api/media-jobs/public/settings error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST update queue play settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queuePlayEnabled } = body;

    const isEnabled = !!queuePlayEnabled;

    await prisma.log.create({
      data: {
        user: 'SYSTEM_SETTING',
        userId: 'QUEUE_PLAY',
        message: isEnabled ? 'ON' : 'OFF',
      },
    });

    return NextResponse.json({ success: true, queuePlayEnabled: isEnabled });
  } catch (error: any) {
    console.error('POST /api/media-jobs/public/settings error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
