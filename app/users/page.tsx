"use client";

import React, { useEffect, useState } from 'react';
import { Button, Input, Badge, Tooltip, message } from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import axios from 'axios';

import UserFormModal, { type UserRow } from './form';
import UserTable from './table';

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
      }
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ─── Modal helpers ───────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  // ─── Submit (create or update) ───────────────────────────────────────────────
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingUser) {
        const payload: any = {
          id: editingUser.id,
          email: values.email,
          name: values.name,
          role: values.role,
        };
        if (values.password) payload.password = values.password;
        await axios.put('/api/users', payload);
        message.success('User updated successfully!');
      } else {
        await axios.post('/api/users', values);
        message.success('User created successfully!');
      }
      closeModal();
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await axios.delete('/api/users', { data: { id } });
      message.success('User deleted');
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to delete user');
    }
  };

  // ─── Filtered rows ───────────────────────────────────────────────────────────
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name ?? '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto w-full">

        {/* Header */}
        <div className="bg-white rounded-2xl px-4 sm:px-6 py-4 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
              <Button icon={<ArrowLeftOutlined />} shape="circle" />
            </Link>
            <TeamOutlined className="text-xl text-blue-500 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 m-0 leading-tight">
                User Management
              </h2>
              <p className="text-xs text-gray-400 m-0">
                Manage app users — create, edit and delete accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input.Search
              placeholder="Search by name, email or role..."
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 sm:w-56"
              size="middle"
            />
            <Tooltip title="Refresh">
              <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading} />
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              <span className="hidden sm:inline">Add User</span>
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 mb-4">
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-2">
            <Badge count={users.length} color="blue" />
            <span className="text-sm text-gray-600">Total Users</span>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-2">
            <Badge count={users.filter((u) => u.role === 'admin').length} color="gold" />
            <span className="text-sm text-gray-600">Admins</span>
          </div>
        </div>

        {/* Table component */}
        <UserTable
          users={filteredUsers}
          loading={loading}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Form / Modal component */}
      <UserFormModal
        open={modalOpen}
        editingUser={editingUser}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </div>
  );
}
