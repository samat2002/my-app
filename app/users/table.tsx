"use client";

import {
    Table,
    Button,
    Tag,
    Popconfirm,
    Space,
    Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    EditOutlined,
    DeleteOutlined,
    UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { UserRow } from '@/types/types';

export interface UserTableProps {
    users: UserRow[];
    loading: boolean;
    onEdit: (user: UserRow) => void;
    onDelete: (id: number) => void;
}

export default function UserTable({ users, loading, onEdit, onDelete }: UserTableProps) {
    const columns: ColumnsType<UserRow> = [
        {
            title: '#',
            dataIndex: 'id',
            width: 60,
            render: (id: number) => <Tag>{id}</Tag>,
        },
        {
            title: 'Name',
            dataIndex: 'name',
            render: (name: string | null) => (
                <Space>
                    <UserOutlined className="text-gray-400" />
                    <span className="font-medium">
                        {name || <span className="text-gray-400 italic">—</span>}
                    </span>
                </Space>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            render: (email: string) => (
                <span className="text-blue-600">{email}</span>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            width: 100,
            filters: [
                { text: 'Admin', value: 'admin' },
                { text: 'User', value: 'user' },
            ],
            onFilter: (value, record) => record.role === value,
            render: (role: string) =>
                role === 'Admin' ? (
                    <Tag color="gold" className="font-medium">Admin</Tag>
                ) : (
                    <Tag color="blue">User</Tag>
                ),
        },
        {
            title: 'Created At',
            dataIndex: 'createdAt',
            sorter: (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            render: (ts: string) => (
                <span className="text-gray-500 text-xs">
                    {dayjs(ts).format('MMM D, YYYY HH:mm')}
                </span>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_: any, record: UserRow) => (
                <Space size="small">
                    <Tooltip title="Edit user">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => onEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete this user?"
                        description={`Are you sure you want to permanently delete "${record.email}"?`}
                        onConfirm={() => onDelete(record.id)}
                        okText="Yes, delete"
                        okType="danger"
                        cancelText="Cancel"
                    >
                        <Tooltip title="Delete user">
                            <Button icon={<DeleteOutlined />} size="small" danger />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                size="middle"
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} users`,
                }}
                scroll={{ x: 'max-content' }}
            />
        </div>
    );
}
