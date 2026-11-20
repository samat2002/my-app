"use client";

import React, { useState } from 'react';
import { Button, Tabs, Space, Typography, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  PlaySquareOutlined,
  DesktopOutlined,
  AppstoreOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import MediaCreator from '@/components/video-display/media-creator';
import JobsQueue from '@/components/video-display/jobs-queue';

const { Title, Text } = Typography;

export default function VideoDisplayAdminPage() {
  const [activeTab, setActiveTab] = useState<string>('create');

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-4">
        {/* Top Header */}
        <div className="bg-white rounded-2xl px-4 sm:px-6 py-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
              <Button icon={<ArrowLeftOutlined />} shape="circle" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl shadow-xs shrink-0">
              <PlaySquareOutlined />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 m-0 leading-tight">
                Video Display Manager
              </h2>
              <p className="text-xs text-gray-400 m-0">
                Trim video (&lt;60s), edit images with stickers, and broadcast live via WebSocket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/display" target="_blank" rel="noopener noreferrer">
              <Button
                type="default"
                icon={<DesktopOutlined />}
                className="font-medium text-blue-600 border-blue-200 hover:border-blue-500 bg-blue-50/50"
              >
                Open Public Screen ↗
              </Button>
            </Link>
          </div>
        </div>

        {/* 2-Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 sm:p-4">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            items={[
              {
                key: 'create',
                label: (
                  <span className="flex items-center gap-2 font-semibold px-2">
                    <PlusCircleOutlined className="text-base text-blue-600" />
                    1. Create &amp; Cut Media
                  </span>
                ),
                children: <MediaCreator onCreated={() => setActiveTab('queue')} />,
              },
              {
                key: 'queue',
                label: (
                  <span className="flex items-center gap-2 font-semibold px-2">
                    <UnorderedListOutlined className="text-base text-emerald-600" />
                    2. Media Jobs Queue &amp; Broadcast
                  </span>
                ),
                children: <JobsQueue />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
