"use client";

import React, { useEffect, useState } from 'react';
import {
  Typography,
  Space,
  Button,
  Card,
  Image as AntImage,
  Tag,
  Spin,
  Empty,
  message,
  Tooltip,
} from 'antd';
import {
  ReloadOutlined,
  PictureOutlined,
  ArrowLeftOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface DiscordImageItem {
  id: number;
  user: string | null;
  userId: string | null;
  image: string;
  filename: string | null;
  channelId: string | null;
  messageId: string | null;
  time: string;
}

export default function ImagesGalleryPage() {
  const [images, setImages] = useState<DiscordImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/images');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setImages(json.data);
      }
    } catch (err) {
      console.error('Failed to load images:', err);
      message.error('Failed to load images from database.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanChannel = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/bot/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 }),
      });
      const data = await res.json();

      if (data.success) {
        message.success(data.message || 'Channel scan complete!');
        // Refresh the image list immediately after scan
        await fetchImages();
      } else {
        message.error(data.error || 'Failed to scan channel.');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      message.error(err?.message || 'Error communicating with server.');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          <Space orientation="horizontal" size="middle">
            <Link href="/" className="text-gray-500 hover:text-gray-800 transition-colors">
              <Button icon={<ArrowLeftOutlined />} shape="circle" />
            </Link>
            <PictureOutlined className="text-2xl text-blue-500" />
            <div>
              <Title level={4} className="m-0!">
                Discord Detached Images
              </Title>
              <Text type="secondary" className="text-sm">
                Saved permanently to Supabase Storage & PostgreSQL via Prisma
              </Text>
            </div>
          </Space>

          {/* Action buttons: Scan button on the left of Refresh button */}
          <Space orientation="horizontal" size="middle">
            <Tooltip title="Scan target Discord channel, detach images and upload to Supabase">
              <Button
                icon={<CloudDownloadOutlined />}
                loading={scanning}
                onClick={handleScanChannel}
                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
              >
                Scan Discord Channel
              </Button>
            </Tooltip>

            <Button
              type="primary"
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={fetchImages}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {/* Gallery Content */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Spin size="large" />
          </div>
        ) : images.length === 0 ? (
          <Empty
            className="bg-white rounded-2xl py-16 shadow-sm"
            description={
              <div className="flex flex-col items-center gap-2">
                <span>No Discord images saved yet.</span>
                <Text type="secondary" className="text-xs">
                  Click <b>&quot;Scan Discord Channel&quot;</b> above or send an image in your Discord channel!
                </Text>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((item) => (
              <Card
                key={item.id}
                hoverable
                className="overflow-hidden rounded-xl shadow-sm border border-gray-100 flex flex-col"
                cover={
                  <div className="bg-gray-100 flex items-center justify-center h-48 overflow-hidden">
                    <AntImage
                      src={item.image}
                      alt={item.filename || 'Discord Image'}
                      style={{ objectFit: 'cover', width: '100%', height: '192px' }}
                      fallback="/file.svg"
                    />
                  </div>
                }
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Tag color="blue" className="truncate max-w-35">
                      @{item.user || 'Unknown'}
                    </Tag>
                    <Text type="secondary" className="text-xs">
                      {dayjs(item.time).format('MMM D, HH:mm')}
                    </Text>
                  </div>

                  {item.filename && (
                    <Text ellipsis className="text-xs text-gray-500" title={item.filename}>
                      📁 {item.filename}
                    </Text>
                  )}

                  <a
                    href={item.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                  >
                    Open Full Image ↗
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
