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
import axios from 'axios';
import type { DiscordImageItem } from '@/types/types';

const { Title, Text } = Typography;

export default function ImagesGalleryPage() {
  const [images, setImages] = useState<DiscordImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/images');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setImages(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load images:', err);
      message.error(err.response?.data?.error || 'Failed to load images from database.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanChannel = async () => {
    setScanning(true);
    try {
      const res = await axios.post('/api/bot/scan', { limit: 50 });
      const data = res.data;

      if (data?.success) {
        message.success(data.message || 'Channel scan complete!');
        // Refresh the image list immediately after scan
        await fetchImages();
      } else {
        message.error(data?.error || 'Failed to scan channel.');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      const errorMsg = err.response?.data?.error || err?.message || 'Error communicating with server.';
      message.error(errorMsg);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-gray-500 hover:text-gray-800 transition-colors shrink-0">
              <Button icon={<ArrowLeftOutlined />} shape="circle" />
            </Link>
            <PictureOutlined className="text-2xl text-blue-500 shrink-0" />
            <div className="min-w-0">
              <Title level={4} className="m-0! text-base sm:text-xl font-bold truncate">
                Discord Detached Images
              </Title>
              <Text type="secondary" className="text-xs sm:text-sm block truncate">
                Saved permanently to Supabase Storage & PostgreSQL via Prisma
              </Text>
            </div>
          </div>

          {/* Action buttons: Scan button on the left of Refresh button */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Tooltip title="Scan target Discord channel, detach images and upload to Supabase">
              <Button
                icon={<CloudDownloadOutlined />}
                loading={scanning}
                onClick={handleScanChannel}
                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 flex-1 md:flex-none"
              >
                <span className="inline sm:inline">Scan Discord Channel</span>
              </Button>
            </Tooltip>

            <Button
              type="primary"
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={fetchImages}
              className="flex-1 md:flex-none"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Gallery Content */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Spin size="large" />
          </div>
        ) : images.length === 0 ? (
          <Empty
            className="bg-white rounded-2xl py-16 px-4 shadow-sm"
            description={
              <div className="flex flex-col items-center gap-2 text-center">
                <span>No Discord images saved yet.</span>
                <Text type="secondary" className="text-xs max-w-md">
                  Click <b>&quot;Scan Discord Channel&quot;</b> above or send an image in your Discord channel!
                </Text>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {images.map((item) => (
              <Card
                key={item.id}
                hoverable
                className="overflow-hidden rounded-xl shadow-sm border border-gray-100 flex flex-col w-full"
                cover={
                  <div className="bg-gray-100 flex items-center justify-center h-48 sm:h-52 overflow-hidden w-full relative">
                    <AntImage
                      rootClassName="w-full h-full"
                      src={item.image}
                      alt={item.filename || 'Discord Image'}
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      fallback="/file.svg"
                    />
                  </div>
                }
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <Tag color="blue" className="truncate max-w-32.5 sm:max-w-37.5">
                      @{item.user || 'Unknown'}
                    </Tag>
                    <Text type="secondary" className="text-xs shrink-0">
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
