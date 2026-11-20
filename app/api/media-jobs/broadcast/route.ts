export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseStorage } from '@/lib/supabase-storage';
import { DISPLAY_CHANNEL_NAME, DISPLAY_EVENTS } from '@/lib/display-channel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    const channel = supabaseStorage.channel(DISPLAY_CHANNEL_NAME);

    // Subscribe and send broadcast
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(); // resolve anyway to avoid hanging
      }, 4000);

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel
            .send({
              type: 'broadcast',
              event: action,
              payload: payload || {},
            })
            .then(() => {
              clearTimeout(timeout);
              resolve();
            })
            .catch((err) => {
              clearTimeout(timeout);
              reject(err);
            });
        }
      });
    });

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    console.error('POST /api/media-jobs/broadcast error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
