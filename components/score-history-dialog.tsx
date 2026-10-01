"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Button,
    Card,
    Empty,
    Modal,
    Segmented,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
    Tooltip,
} from "antd"
import {
    CrownOutlined,
    HistoryOutlined,
    MailOutlined,
    TrophyOutlined,
    RightOutlined,
    DownOutlined,
} from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import { HistoryDialogProps, LeaderboardEntry, Players } from "@/types/types"

const { Text, Title } = Typography

interface GameHistoryRow {
    key: string;
    runNumber: number;
    id: string;
    date: string;
    totalPlayer: number;
    winner: {
        name: string;
        score: number;
    };
    players: Players[];
}

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

    // Prepare table data for games history
    const historyTableData: GameHistoryRow[] = games.map((game, index) => {
        const winner = game.players.find((player: Players) => player.isWinner)
            ?? game.players.reduce((best: any, player: Players) =>
                player.score > best.score ? player : best,
                game.players[0] || { name: 'None', score: 0 }
            );

        return {
            key: game.id || `game-${index}`,
            runNumber: games.length - index,
            id: game.id,
            date: game.date,
            totalPlayer: game.players.length,
            winner: {
                name: winner?.name ?? 'Unknown',
                score: winner?.score ?? 0,
            },
            players: game.players.slice().sort((a: any, b: any) => b.score - a.score),
        };
    });

    const historyColumns: ColumnsType<GameHistoryRow> = [
        {
            title: "#",
            dataIndex: "runNumber",
            width: 105,
            align: "center",
            sorter: (a, b) => a.runNumber - b.runNumber,
            render: (n: number) => <Tag color="default" className="font-mono font-medium">#{n}</Tag>,
        },
        {
            title: "Date",
            dataIndex: "date",
            render: (date: string) => <Text className="text-gray-700 text-xs sm:text-sm">{date}</Text>,
        },
        {
            title: "Total Player",
            dataIndex: "totalPlayer",
            align: "center",
            sorter: (a, b) => a.totalPlayer - b.totalPlayer,
            render: (total: number) => <Tag color="blue">{total} {total === 1 ? 'player' : 'players'}</Tag>,
        },
        {
            title: "Winner",
            dataIndex: ["winner", "name"],
            render: (_: any, record: GameHistoryRow) => (
                <Space size="small">
                    <TrophyOutlined className="text-[#faad14]" />
                    <Text strong>{record.winner.name}</Text>
                </Space>
            ),
        },
        {
            title: "Score",
            dataIndex: ["winner", "score"],
            align: "right",
            sorter: (a, b) => a.winner.score - b.winner.score,
            render: (score: number) => <Text strong className="text-blue-600">{score} pts</Text>,
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="100%"
            style={{ maxWidth: 760, top: '5vh' }}
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
                        <Table<GameHistoryRow>
                            columns={historyColumns}
                            dataSource={historyTableData}
                            size="small"
                            scroll={{ x: 'max-content' }}
                            pagination={{
                                pageSize: 5,
                                showSizeChanger: true,
                                pageSizeOptions: ['5', '10', '20'],
                                showTotal: (total) => `${total} games`,
                            }}
                            expandable={{
                                expandIcon: ({ expanded, onExpand, record }) => (
                                    <Tooltip title={expanded ? "Hide detail" : "See detail"}>
                                        <Button
                                            type="text"
                                            size="small"
                                            className="text-gray-400 hover:text-blue-600 px-1 font-mono text-xs flex items-center justify-center gap-0.5"
                                            onClick={(e) => onExpand(record, e)}
                                        >
                                            {expanded ? <DownOutlined className="text-xs text-blue-500" /> : <RightOutlined className="text-xs" />}
                                            <span className="text-[11px] text-gray-500 font-mono font-semibold">
                                                {expanded ? "</>" : "<>"}
                                            </span>
                                        </Button>
                                    </Tooltip>
                                ),
                                expandedRowRender: (record) => (
                                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 my-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <Text type="secondary" className="text-xs font-semibold uppercase tracking-wider">
                                                Game Detail ({record.players.length} Players)
                                            </Text>
                                            <Text type="secondary" className="text-xs">
                                                {record.date}
                                            </Text>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            {record.players.map((player, idx) => (
                                                <div
                                                    key={player.name || idx}
                                                    className={`flex items-center justify-between p-2 rounded-lg text-xs sm:text-sm ${player.isWinner ? 'bg-amber-50/90 border border-amber-200' : 'bg-white border border-gray-100'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Tag color={player.isWinner ? "gold" : undefined}>
                                                            #{idx + 1}
                                                        </Tag>
                                                        <Text strong={player.isWinner}>
                                                            {player.name}
                                                        </Text>
                                                        {player.isWinner && (
                                                            <Tag color="gold" icon={<CrownOutlined />} className="text-[10px] m-0!">
                                                                Winner
                                                            </Tag>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {player.log && player.log.length > 0 && (
                                                            <div className="hidden sm:flex items-center gap-1">
                                                                {player.log.map((pts, i) => (
                                                                    <Tag key={i} color={pts >= 0 ? 'green' : 'red'} className="text-[10px] m-0!">
                                                                        {pts >= 0 ? `+${pts}` : pts}
                                                                    </Tag>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <Text strong className={player.isWinner ? "text-amber-600" : "text-gray-700"}>
                                                            {player.score} pts
                                                        </Text>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ),
                            }}
                        />
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
