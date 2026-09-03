export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getImages, saveImageRecord } from '@lib/discord-db';

// GET /api/images - Retrieve saved Discord images
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const channelId = searchParams.get('channelId') || undefined;

    const images = await getImages({ limit, offset, channelId });

    return NextResponse.json({ success: true, count: images.length, data: images });
  } catch (error: any) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

// POST /api/images - Save an image manually or from webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, userId, image, filename, channelId, messageId, time } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: image' },
        { status: 400 }
      );
    }

    const result = await saveImageRecord({
      user,
      userId,
      image,
      filename,
      channelId,
      messageId,
      time,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error saving image:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save image' },
      { status: 500 }
    );
  }
}
