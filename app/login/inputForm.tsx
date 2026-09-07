"use client"
import { Button, Form, FormProps, Input, message } from 'antd'
import axios from 'axios';
import React, { useState } from 'react'
import { useRouter, useSearchParams } from "next/navigation"

type FieldType = {
    email?: string;
    password?: string;
};

export default function InputForm() {
    const router = useRouter()
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);

    const onFinish: FormProps<FieldType>['onFinish'] = (values) => {
        Login(values)
    };

    const Login = (body: FieldType) => {
        setLoading(true);
        axios.post('/api/auth/login', body)
            .then((res) => {
                if (res.status === 200) {
                    message.success('Login successful');
                    const rawRedirect = searchParams.get('redirect') ?? '/';
                    const redirectTo = decodeURIComponent(rawRedirect);
                    router.push(redirectTo);
                    router.refresh();
                }
            })
            .catch((err) => {
                console.error(err);
                const errorMsg = err.response?.data?.error || 'Login failed. Please check your credentials.';
                message.error(errorMsg);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = (errorInfo) => {
        console.log('Failed:', errorInfo);
    };

    return (
        <div>
            <Form
                name="basic"
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                style={{ maxWidth: 600 }}
                initialValues={{ remember: true }}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
            >
                <Form.Item<FieldType>
                    label="email"
                    name="email"
                    rules={[{ required: true, message: 'Please input your email!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item<FieldType>
                    label="Password"
                    name="password"
                    rules={[{ required: true, message: 'Please input your password!' }]}
                >
                    <Input.Password />
                </Form.Item>

                <Form.Item label={null}>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                        Login
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
}
