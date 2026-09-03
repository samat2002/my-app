"use client"

import React, { useState, useRef, useEffect } from 'react'
import {
    Button, Modal, Tag, message,
    Typography, Space, Divider, Empty
} from 'antd'
import {
    PlusOutlined, FlagOutlined, HistoryOutlined, TrophyOutlined
} from '@ant-design/icons'
import { Players, GameSummary, LeaderboardEntry, FinishedPlayer } from '@/types/types'
import PlayerCard, { PLAYER_COLORS } from './Players/playerCard'
import { ScoreHistoryDialog } from './score-history-dialog'
import { saveGame, fetchHistory, fetchLeaderboard } from '@lib/games'

const { Title, Text } = Typography

let nextId = 1

function ScoreTracker() {
    const [players, setPlayers] = useState<Players[]>([
        { id: nextId++, name: 'Player 1', score: 0, log: [], winStack: 0 },
        { id: nextId++, name: 'Player 2', score: 0, log: [], winStack: 0 },
    ])

    const [logPlayerId, setLogPlayerId] = useState<number | null>(null)
    const [historyOpen, setHistoryOpen] = useState(false)
    const [history, setHistory] = useState<GameSummary[]>([])
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Stable game ID generated once per session
    const gameId = useRef(new Date().toISOString())
    const [messageApi, contextHolder] = message.useMessage()

    const hasScores = players.some((p) => p.score !== 0)

    // ─── Player actions ────────────────────────────────────────────────────────
    function addPlayer() {
        if (players.length >= 6) return
        setPlayers((prev) => [
            ...prev,
            { id: nextId++, name: `Player ${prev.length + 1}`, score: 0, log: [], winStack: 0 },
        ])
    }

    function removePlayer(id: number) {
        if (players.length <= 1) return
        setPlayers((prev) => prev.filter((p) => p.id !== id))
    }

    function updateName(id: number, name: string) {
        setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
    }

    function addScore(id: number, points: number) {
        setPlayers((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, score: p.score + points, log: [...p.log, points] } : p
            )
        )
    }

    function resetPlayer(id: number) {
        setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, score: 0, log: [] } : p)))
    }

    // ─── Finish Game → save to Supabase ───────────────────────────────────────
    async function finishGame() {
        if (!hasScores) return
        setSaving(true)
        try {
            const maxScore = Math.max(...players.map((p) => p.score))
            const finished: FinishedPlayer[] = players.map((p) => ({
                name: p.name,
                score: p.score,
                isWinner: p.score === maxScore,
            }))
            await saveGame(finished, gameId.current)
            messageApi.success('Game saved to Supabase! 🎉')
            // Reset for next game
            gameId.current = new Date().toISOString()
            setPlayers((prev) => prev.map((p) => ({ ...p, score: 0, log: [] })))
        } catch (err: any) {
            messageApi.error(`Failed to save: ${err.message}`)
        } finally {
            setSaving(false)
        }
    }

    // ─── History modal ─────────────────────────────────────────────────────────
    async function openHistory() {
        setHistoryOpen(true)
        setHistoryLoading(true)
        try {
            const [historyData, leaderboardData] = await Promise.all([
                fetchHistory(),
                fetchLeaderboard(),
            ])
            setHistory(historyData)
            setLeaderboard(leaderboardData)
        } catch (err: any) {
            messageApi.error(`Failed to load history: ${err.message}`)
        } finally {
            setHistoryLoading(false)
        }
    }

    // Score log modal content
    const logPlayer = players.find((p) => p.id === logPlayerId)

    // ─── Desktop vs Mobile View ───────────────────────────────────────────────
    const [activePlayerId, setActivePlayerId] = useState<number | null>(null)
    const activePlayer = players.find(p => p.id === activePlayerId)
    const activePlayerIndex = players.findIndex(p => p.id === activePlayerId)

    return (
        <>
            {contextHolder}

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="sticky top-0 z-10 bg-(--background,#fff) border-b border-[#f0f0f0] py-3 px-4 flex items-center justify-between">
                <Space>
                    <TrophyOutlined className="text-[20px] text-[#faad14]" />
                    <Title level={5} className="m-0!">Score Tracker</Title>
                </Space>

                <Space size="small">
                    {hasScores && (
                        <Button
                            type="primary"
                            icon={<FlagOutlined />}
                            loading={saving}
                            onClick={finishGame}
                            size="small"
                        >
                            <span className="hidden sm:inline">Finish</span>
                        </Button>
                    )}
                    <Button icon={<HistoryOutlined />} onClick={openHistory} size="small">
                        <span className="hidden sm:inline">History</span>
                    </Button>
                </Space>
            </div>

            {/* ── Player Grid (Mini Cards) ───────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2 w-full p-5">
                {players.map((player, i) => (
                    <div
                        key={player.id}
                        onClick={() => setActivePlayerId(player.id)}
                        className="border-t-4 rounded-xl py-4 px-3 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer flex flex-col items-center text-center gap-2 transition-transform duration-200 ease-in-out hover:-translate-y-0.5"
                        style={{ borderTopColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                    >
                        <Text strong className="text-[14px]" ellipsis>{player.name || "Unnamed"}</Text>
                        <Title level={2} className="m-0!" style={{ color: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>
                            {player.score}
                        </Title>
                    </div>
                ))}

                {/* Add Player button */}
                {players.length < 6 && (
                    <button
                        onClick={addPlayer}
                        className="min-h-25 border-2 border-dashed border-[#d9d9d9] hover:border-[#1677ff] rounded-xl bg-transparent cursor-pointer flex flex-col items-center justify-center gap-1 text-[#bfbfbf] hover:text-[#1677ff] transition-colors duration-200"
                    >
                        <PlusOutlined className="text-[20px]" />
                        <span className="text-[12px] font-medium">Add Player</span>
                    </button>
                )}
            </div>

            {/* ── Active Player Modal (Full Card) ────────────────────── */}
            <Modal
                open={activePlayerId !== null && activePlayer !== undefined}
                footer={null}
                onCancel={() => setActivePlayerId(null)}
                destroyOnHidden
                styles={{ body: { padding: 0 } }}
                closeIcon={false}
                width="100%"
                style={{ maxWidth: 400 }}
                centered
            >
                {activePlayer !== undefined && (
                    <PlayerCard
                        name={activePlayer.name}
                        score={activePlayer.score}
                        scoreLog={activePlayer.log}
                        index={activePlayerIndex}
                        onAddScore={(pts) => addScore(activePlayer.id, pts)}
                        onReset={() => resetPlayer(activePlayer.id)}
                        onRemove={() => { removePlayer(activePlayer.id); setActivePlayerId(null) }}
                        onNameChange={(n) => updateName(activePlayer.id, n)}
                        onShowLog={() => { setActivePlayerId(null); setLogPlayerId(activePlayer.id) }}
                    />
                )}
            </Modal>

            {/* ── Score Log Modal ────────────────────────────────────────── */}
            <Modal
                open={logPlayerId !== null}
                title={`Score Log — ${logPlayer?.name ?? ''}`}
                footer={null}
                onCancel={() => setLogPlayerId(null)}
            >
                {logPlayer && logPlayer.log.length > 0 ? (
                    <div className="flex flex-wrap gap-2 py-2">
                        {logPlayer.log.map((pts, i) => (
                            <Tag key={i} color={pts >= 0 ? 'green' : 'red'}>
                                {pts >= 0 ? `+${pts}` : pts}
                            </Tag>
                        ))}
                    </div>
                ) : (
                    <Empty description="No scores yet" />
                )}
                <Divider />
                <Text strong>Total: {logPlayer?.score ?? 0}</Text>
            </Modal>

            <ScoreHistoryDialog
                open={historyOpen}
                games={history}
                leaderboard={leaderboard}
                loading={historyLoading}
                onClose={() => setHistoryOpen(false)}
            />
        </>
    )
}

export default ScoreTracker
