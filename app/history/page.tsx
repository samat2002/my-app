"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
    Table, DatePicker, Drawer, Button, Spin, Empty,
    Typography, Space, Tag
} from 'antd'
import {
    FilterOutlined, HistoryOutlined, TrophyOutlined
} from '@ant-design/icons'
import type { ColumnsType, TableProps } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import { fetchHistoryByDate, HistoryTableRow } from '@lib/games'
import Link from 'next/link'

const { Title, Text } = Typography

export default function HistoryPage() {
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [pendingDate, setPendingDate] = useState<Dayjs>(dayjs())
    const [data, setData] = useState<HistoryTableRow[]>([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async (date: Dayjs) => {
        setLoading(true)
        try {
            const rows = await fetchHistoryByDate(date.format('YYYY-MM-DD'))
            setData(rows)
        } catch {
            setData([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load(selectedDate)
    }, [selectedDate, load])

    function applyFilter() {
        setSelectedDate(pendingDate)
        setDrawerOpen(false)
    }

    const columns: ColumnsType<HistoryTableRow> = [
        {
            title: '#',
            dataIndex: 'runNumber',
            width: 48,
            render: (n: number) => <Tag>{n}</Tag>,
        },
        {
            title: 'Name',
            dataIndex: 'name',
            render: (name: string, row) => (
                <Space>
                    {row.wins > 0 && <TrophyOutlined className="text-[#faad14]" />}
                    <Text strong={row.wins > 0}>{name}</Text>
                </Space>
            ),
        },
        {
            title: 'Score',
            dataIndex: 'score',
            align: 'right' as const,
            sorter: (a, b) => a.score - b.score,
            render: (score: number) => <Text strong>{score}</Text>,
        },
        {
            title: 'Wins',
            dataIndex: 'wins',
            align: 'right' as const,
            sorter: (a, b) => a.wins - b.wins,
            render: (wins: number) => (
                <Tag color={wins > 0 ? 'gold' : undefined}>
                    {wins}
                </Tag>
            ),
        },
    ]

    const tableProps: TableProps<HistoryTableRow> = {
        columns,
        dataSource: data,
        pagination: false,
        size: 'middle',
        rowKey: 'key',
        scroll: { x: 'max-content' },
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 py-3 px-4 flex items-center justify-between">
                <Space>
                    <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                        ← Back
                    </Link>
                    <HistoryOutlined className="text-[20px] text-[#faad14]" />
                    <Title level={5} className="m-0!">History</Title>
                </Space>
                <Button
                    icon={<FilterOutlined />}
                    onClick={() => { setPendingDate(selectedDate); setDrawerOpen(true) }}
                    size="small"
                >
                    {selectedDate.format('MMM D, YYYY')}
                </Button>
            </div>

            {/* Content */}
            <div className="p-4 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Spin size="large" />
                    </div>
                ) : data.length === 0 ? (
                    <Empty
                        className="py-16"
                        description={`No games found for ${selectedDate.format('MMM D, YYYY')}`}
                    />
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-50">
                            <Text type="secondary" className="text-sm">
                                {data.length} player{data.length !== 1 ? 's' : ''} · {selectedDate.format('MMM D, YYYY')}
                            </Text>
                        </div>
                        <Table {...tableProps} />
                    </div>
                )}
            </div>

            {/* Date Picker Drawer */}
            <Drawer
                title="Filter by Date"
                size={typeof window !== 'undefined' && window.innerWidth < 420 ? '100%' : 400}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
                        <Button type="primary" onClick={applyFilter}>Apply</Button>
                    </div>
                }
            >
                <div className="flex flex-col gap-3">
                    <Text type="secondary">Select a date to view game history</Text>
                    <DatePicker
                        value={pendingDate}
                        onChange={(date) => date && setPendingDate(date)}
                        disabledDate={(d) => d.isAfter(dayjs(), 'day')}
                        className="w-full"
                        size="large"
                    />
                </div>
            </Drawer>
        </div>
    )
}
