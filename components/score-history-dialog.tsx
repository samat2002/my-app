"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Button,
    Card,
    Empty,
    Listy,
    Modal,
    Segmented,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
} from "antd"
import {
    CrownOutlined,
    HistoryOutlined,
    MailOutlined,
    TrophyOutlined,
} from "@ant-design/icons"
import { HistoryDialogProps, LeaderboardEntry, Players } from "@/types/types"

const { Text, Title } = Typography

export function ScoreHistoryDialog({
    games,
    leaderboard,
    open,
    loading = false,
    onClose,
}: HistoryDialogProps) {
    const [view, setView] = useState<"history" | "leaderboard">("history")
    const router = useRouter()
    const sortedLeaderboard = leaderboard.slice().sort((a, b) => b.winStack - a.winStack)
    const topWins = sortedLeaderboard[0]?.winStack ?? 0
    const champion = topWins > 0 ? sortedLeaderboard[0] : undefined

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="100%"
            style={{ maxWidth: 680, top: '5vh' }}
            title={
                <Space>
                    {view === "history" ? <TrophyOutlined /> : <CrownOutlined />}
                    {view === "history" ? "Game History" : "Leaderboard"}
                </Space>
            }
        >
            <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                <Segmented
                    block
                    value={view}
                    onChange={(value) => setView(value as "history" | "leaderboard")}
                    options={[
                        { label: "Game History", value: "history", icon: <HistoryOutlined /> },
                        { label: "Leaderboard", value: "leaderboard", icon: <CrownOutlined /> },
                    ]}
                />

                {loading ? (
                    <div style={{ padding: 48, textAlign: "center" }}>
                        <Spin size="large" />
                    </div>
                ) : view === "history" ? (
                    games.length === 0 ? (
                        <Empty description="No games saved yet. Finish a game to see it here." />
                    ) : (
                        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                            {games.slice().map((game) => {
                                const winner = game.players.find((player: Players) => player.isWinner)
                                    ?? game.players.reduce((best: any, player: Players) =>
                                        player.score > best.score ? player : best,
                                    )
                                const players = game.players
                                    .slice()
                                    .sort((a: any, b: any) => b.score - a.score)

                                return (
                                    <Card
                                        key={game.id}
                                        size="small"
                                        title={<Text type="secondary">{game.date}</Text>}
                                        extra={
                                            <Tag icon={<TrophyOutlined />} color="gold">
                                                {winner.name}
                                            </Tag>
                                        }
                                    >
                                        <Listy<Players> items={players} height={400} rowKey="id"
                                            itemRender={(player, index) => (
                                                <div
                                                    style={player.isWinner ? { background: "#fffbe6" } : undefined}
                                                >
                                                    <div className="flex flex-row justify-between gap-2.5 items-center">
                                                        <div className="gap-2.5">
                                                            <Tag>{index + 1}</Tag>
                                                            <Text strong={player.isWinner}>{player.name}</Text>
                                                        </div>
                                                        <Text strong>{player.score} pts</Text>
                                                    </div>
                                                </div>
                                            )}
                                        />
                                    </Card>
                                )
                            })}
                            <Text type="secondary" style={{ display: "block", textAlign: "center" }}>
                                {games.length} game{games.length !== 1 ? "s" : ""} played
                            </Text>
                        </Space>
                    )
                ) : sortedLeaderboard.length === 0 ? (
                    <Empty description="No players yet." />
                ) : (
                    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                        {champion && (
                            <Card style={{ textAlign: "center", background: "#fffbe6" }}>
                                <CrownOutlined style={{ color: "#faad14", fontSize: 28 }} />
                                <Text type="secondary" style={{ display: "block" }}>Top Winner</Text>
                                <Title level={4} style={{ margin: "4px 0" }}>{champion.name}</Title>
                                <Text strong style={{ color: "#d48806", fontSize: 24 }}>
                                    {champion.winStack} win{champion.winStack !== 1 ? "s" : ""}
                                </Text>
                            </Card>
                        )}
                        <Table
                            size="small"
                            pagination={false}
                            scroll={{ x: 'max-content' }}
                            rowKey={(entry) => entry.name}
                            dataSource={sortedLeaderboard}
                            columns={[
                                {
                                    title: "Rank",
                                    render: (_: unknown, entry: LeaderboardEntry, index: number) => (
                                        <Tag color={entry.winStack === topWins && topWins > 0 ? "gold" : undefined}>
                                            {index + 1}
                                        </Tag>
                                    ),
                                },
                                {
                                    title: "Player",
                                    dataIndex: "name",
                                    render: (name: string, entry: LeaderboardEntry) => (
                                        <Space>
                                            <Text strong={entry.winStack === topWins && topWins > 0}>{name}</Text>
                                            {entry.winStack === topWins && topWins > 0 && <MailOutlined style={{ color: "#faad14" }} />}
                                        </Space>
                                    ),
                                },
                                {
                                    title: "Wins",
                                    dataIndex: "winStack",
                                    align: "right",
                                    render: (wins: number) => `${wins} win${wins !== 1 ? "s" : ""}`,
                                },
                            ]}
                        />
                        <Text type="secondary" style={{ display: "block", textAlign: "center" }}>
                            Today's wins
                        </Text>
                    </Space>
                )}
            </Space>
            <div style={{ textAlign: "center", marginTop: 8 }}>
                <Button
                    type="link"
                    icon={<HistoryOutlined />}
                    onClick={() => { onClose(); router.push('/history') }}
                >
                    View Full History
                </Button>
            </div>
        </Modal>
    )
}
