"use client"

import React, { useState, useRef } from 'react'
import { Card, Button, Space, Typography, Tag, Input } from 'antd'
import { PlusOutlined, MinusOutlined, ReloadOutlined, CloseOutlined, CrownOutlined } from '@ant-design/icons'
import { PlayerCardProps } from '@/types/types'

const { Text, Title } = Typography

const QUICK_POINTS = [5, 10, 15, 50]

export const PLAYER_COLORS = [
    "oklch(0.55 0.2 255)",   // primary blue
    "oklch(0.7 0.18 160)",   // accent green
    "oklch(0.646 0.222 41)", // warm orange
    "oklch(0.6 0.118 185)",  // teal
    "oklch(0.398 0.07 227)", // steel blue
    "oklch(0.828 0.189 84)", // gold
    "oklch(0.769 0.188 70)", // amber
    "oklch(0.55 0.15 300)",  // plum
    "oklch(0.65 0.2 20)",    // coral
    "oklch(0.6 0.15 140)",   // emerald
]

export default function PlayerCard({
    name,
    score,
    scoreLog,
    onAddScore,
    onReset,
    onRemove,
    onNameChange,
    onShowLog,
    index,
    isManualWinner,
    showWinnerButton,
    onToggleWinner,
}: PlayerCardProps) {
    const [inputValue, setInputValue] = useState("")
    const [isEditing, setIsEditing] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const accentColor = PLAYER_COLORS[index % PLAYER_COLORS.length]

    function handleAdd() {
        const val = Number(inputValue)
        if (!Number.isNaN(val) && val !== 0) {
            onAddScore(val)
            setInputValue("")
        }
    }

    const cardTitle = (
        <Space size="small">
            {isEditing ? (
                <Input
                    size="small"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    onBlur={() => setIsEditing(false)}
                    onPressEnter={() => setIsEditing(false)}
                    autoFocus
                    style={{ maxWidth: 160, fontWeight: 600 }}
                />
            ) : (
                <Text
                    strong
                    style={{ fontSize: 16, cursor: 'pointer', color: accentColor }}
                    onClick={() => setIsEditing(true)}
                >
                    {name || "Unnamed"}
                </Text>
            )}
            {isManualWinner && (
                <Tag color="gold" icon={<CrownOutlined />} className="m-0!">
                    Winner
                </Tag>
            )}
        </Space>
    )

    const extra = (
        <Space>
            {showWinnerButton && (
                <Button
                    size="small"
                    type={isManualWinner ? "primary" : "default"}
                    icon={<CrownOutlined style={{ color: isManualWinner ? '#fff' : '#faad14' }} />}
                    onClick={onToggleWinner}
                    title={isManualWinner ? "Player is set as winner (click to toggle)" : "Set as winner"}
                    style={isManualWinner ? { background: '#faad14', borderColor: '#d48806' } : undefined}
                >
                    {isManualWinner ? "Winner" : "Set Winner"}
                </Button>
            )}
            <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={onReset}
                title="Reset score"
            />
            <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={onRemove}
                title={`Remove ${name}`}
            />
        </Space>
    )

    return (
        <Card
            title={cardTitle}
            extra={extra}
            style={{
                borderTop: `4px solid ${accentColor}`,
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            styles={{ body: { paddingTop: 12 } }}
        >
            {/* Score Display */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Space>
                    <Text type="secondary">Score</Text>
                    {scoreLog.length > 0 && (
                        <Tag
                            style={{ cursor: 'pointer' }}
                            onClick={onShowLog}
                        >
                            Log ({scoreLog.length})
                        </Tag>
                    )}
                </Space>
                <Title level={2} style={{ margin: 0, color: accentColor }}>
                    {score}
                </Title>
            </div>

            {/* Quick Add Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 w-full">
                {QUICK_POINTS.map((pts) => (
                    <Button
                        key={`add-${pts}`}
                        type="default"
                        icon={<PlusOutlined />}
                        onClick={() => onAddScore(pts)}
                        style={{ width: '100%' }}
                    >
                        {pts}
                    </Button>
                ))}
            </div>

            {/* Quick Subtract Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 w-full">
                {QUICK_POINTS.map((pts) => (
                    <Button
                        key={`sub-${pts}`}
                        danger
                        icon={<MinusOutlined />}
                        onClick={() => onAddScore(-pts)}
                        style={{ width: '100%' }}
                    >
                        {pts}
                    </Button>
                ))}
            </div>

            {/* Custom Score Input */}
            {/* <Space.Compact style={{ width: '100%' }}>
                <Input
                    ref={inputRef as any}
                    type="number"
                    placeholder="Custom points..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onPressEnter={handleAdd}
                    style={{ flex: 1 }}
                />
                <Button type="primary" onClick={handleAdd}>
                    Add
                </Button>
            </Space.Compact> */}
        </Card>
    )
}
