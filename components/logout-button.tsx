"use client";

import { Button, message } from 'antd';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await axios.post('/api/auth/logout');
      message.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      message.error('Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button danger onClick={handleLogout} loading={loading}>
      Logout
    </Button>
  );
}
