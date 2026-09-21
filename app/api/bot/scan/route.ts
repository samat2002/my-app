export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { batchSaveImages, SaveImageData } from '@lib/discord-db';

// POST /api/bot/scan - Scan Discord channel directly via REST API from the web app
export async function POST(request: NextRequest) {
  const token = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;

  if (!token || !channelId) {
    return NextResponse.json(
      { success: false, error: 'BOT_TOKEN or CHANNEL_ID not configured in .env' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(100, body.limit || 50);

    // Fetch messages from target channel via Discord HTTP API using axios
    const response = await axios.get(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        params: { limit },
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const messages = response.data;

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response format from Discord API' },
        { status: 500 }
      );
    }

    const imageItems: SaveImageData[] = [];

    for (const msg of messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        for (const attachment of msg.attachments) {
          const isImage =
            attachment.content_type?.startsWith('image') ||
            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.filename || '');

          if (isImage) {
            imageItems.push({
              user: msg.author?.username || 'Unknown',
              userId: msg.author?.id,
              image: attachment.url,
              filename: attachment.filename || 'image',
              contentType: attachment.content_type,
              channelId: msg.channel_id,
              messageId: msg.id,
              time: msg.timestamp,
              uploadToStorage: true,
            });
          }
        }
      }
    }

    if (imageItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Scanned ${messages.length} messages. No new images found.`,
        scanned: messages.length,
        found: 0,
        saved: 0,
        skipped: 0,
      });
    }

    const result = await batchSaveImages(imageItems);

    return NextResponse.json({
      success: true,
      message: `Scanned ${messages.length} messages. Found ${imageItems.length} images (${result.saved} newly saved to Supabase Storage, ${result.skipped} already existed).`,
      scanned: messages.length,
      found: imageItems.length,
      saved: result.saved,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error scanning Discord channel:', error);
    const status = error.response?.status || 500;
    const errorDetails = error.response?.data
      ? typeof error.response.data === 'string'
        ? error.response.data
        : JSON.stringify(error.response.data)
      : error?.message || 'Failed to scan Discord channel';

    return NextResponse.json(
      { success: false, error: `Discord API Error: ${errorDetails}` },
      { status }
    );
  }
}
