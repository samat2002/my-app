"use client";

import {
    Modal,
    Form,
    Input,
    Select,
    Space,
    Button,
} from 'antd';
import { EditOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import type { UserRow } from '@/types/types';

export interface UserFormProps {
    open: boolean;
    editingUser: UserRow | null;
    submitting: boolean;
    onSubmit: (values: any) => void;
    onClose: () => void;
}

export default function UserFormModal({
    open,
    editingUser,
    submitting,
    onSubmit,
    onClose,
}: UserFormProps) {
    const [form] = Form.useForm();

    // Pre-fill fields when editingUser changes
    useEffect(() => {
        if (open) {
            if (editingUser) {
                form.setFieldsValue({
                    email: editingUser.email,
                    name: editingUser.name ?? '',
                    role: editingUser.role,
                    password: '',
                });
            } else {
                form.resetFields();
            }
        }
    }, [open, editingUser, form]);

    const handleClose = () => {
        form.resetFields();
        onClose();
    };

    return (
        <Modal
            title={
                <Space>
                    {editingUser ? <EditOutlined /> : <PlusOutlined />}
                    {editingUser ? `Edit User: ${editingUser.email}` : 'Add New User'}
                </Space>
            }
            open={open}
            onCancel={handleClose}
            footer={null}
            width={480}
            destroyOnHidden
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={onSubmit}
                className="mt-4"
            >
                <Form.Item label="Name" name="name">
                    <Input
                        prefix={<UserOutlined className="text-gray-400" />}
                        placeholder="Display name (optional)"
                    />
                </Form.Item>

                <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                        { required: true, message: 'Email is required' },
                        { type: 'email', message: 'Please enter a valid email address' },
                    ]}
                >
                    <Input placeholder="user@example.com" />
                </Form.Item>

                <Form.Item
                    label="Role"
                    name="role"
                    initialValue="user"
                    rules={[{ required: true, message: 'Role is required' }]}
                >
                    <Select
                        options={[
                            { label: 'User', value: 'user' },
                            { label: 'Admin', value: 'admin' },
                        ]}
                    />
                </Form.Item>

                <Form.Item
                    label={editingUser ? 'New Password (optional)' : 'Password'}
                    name="password"
                    rules={editingUser ? [] : [{ required: true, message: 'Password is required' }]}
                >
                    <Input.Password
                        placeholder={
                            editingUser
                                ? 'Leave blank to keep existing password'
                                : 'Enter a strong password'
                        }
                    />
                </Form.Item>

                <div className="flex justify-end gap-2 pt-2">
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                        {editingUser ? 'Update User' : 'Create User'}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
