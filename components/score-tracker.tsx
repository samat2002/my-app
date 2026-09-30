"use client"

import React, { useState, useRef, useEffect } from 'react'
import {
    Button, Modal, Tag, message,
    Typography, Space, Divider, Empty,
    Switch, Tooltip
} from 'antd'
import {
    PlusOutlined, FlagOutlined, HistoryOutlined, TrophyOutlined,
    ArrowLeftOutlined, CrownOutlined
} from '@ant-design/icons'
import { Players, GameSummary, LeaderboardEntry, FinishedPlayer } from '@/types/types'
import PlayerCard, { PLAYER_COLORS } from './Players/playerCard'
import { ScoreHistoryDialog } from './score-history-dialog'
import { saveGame, fetchHistory, fetchLeaderboard } from '@lib/games'
import Link from 'next/link'
import dayjs from 'dayjs'

const { Title, Text } = Typography

let nextId = 1

function ScoreTracker() {
    const [players, setPlayers] = useState<Players[]>([
        { id: nextId++, name: 'Player 1', score: 0, log: [], gameLogs: [], winStack: 0 },
        { id: nextId++, name: 'Player 2', score: 0, log: [], gameLogs: [], winStack: 0 },
    ])

    const [keepScoreMode, setKeepScoreMode] = useState(false)
    const [selectedWinnerId, setSelectedWinnerId] = useState<number | null>(null)
    const [gameRound, setGameRound] = useState(1)
    const [gameStartDate, setGameStartDate] = useState(() => dayjs().format('MMM D, HH:mm'))

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
            { id: nextId++, name: `Player ${prev.length + 1}`, score: 0, log: [], gameLogs: [], winStack: 0 },
        ])
    }

    function removePlayer(id: number) {
        if (players.length <= 1) return
        setPlayers((prev) => prev.filter((p) => p.id !== id))
        if (selectedWinnerId === id) setSelectedWinnerId(null)
    }

    function updateName(id: number, name: string) {
        setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
    }

    function addScore(id: number, points: number) {
        setPlayers((prev) =>
            prev.map((p) => {
                if (p.id !== id) return p
                const currentLogs = p.gameLogs ? [...p.gameLogs] : []
                const roundIndex = currentLogs.findIndex((g) => g.gameNumber === gameRound)
                if (roundIndex >= 0) {
                    currentLogs[roundIndex] = {
                        ...currentLogs[roundIndex],
                        points: [...currentLogs[roundIndex].points, points],
                    }
                } else {
                    currentLogs.push({
                        gameNumber: gameRound,
                        date: gameStartDate,
                        points: [points],
                    })
                }
                return {
                    ...p,
                    score: p.score + points,
                    log: [...p.log, points],
                    gameLogs: currentLogs,
                }
            })
        )
    }

    function resetPlayer(id: number) {
        setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, score: 0, log: [], gameLogs: [] } : p)))
        if (selectedWinnerId === id) setSelectedWinnerId(null)
    }

    function toggleWinner(playerId: number) {
        if (!keepScoreMode) return
        setSelectedWinnerId((prev) => (prev === playerId ? null : playerId))
    }

    // ─── Finish Game → save to Supabase ───────────────────────────────────────
    async function finishGame() {
        const canFinish = hasScores || (keepScoreMode && selectedWinnerId !== null)
        if (!canFinish) return

        setSaving(true)
        try {
            const maxScore = Math.max(...players.map((p) => p.score))
            const finished: FinishedPlayer[] = players.map((p) => ({
                name: p.name,
                score: p.score,
                isWinner: keepScoreMode && selectedWinnerId !== null
                    ? p.id === selectedWinnerId
                    : p.score === maxScore,
            }))

            await saveGame(finished, gameId.current)
            messageApi.success('Game saved to Supabase! 🎉')

            // Reset ID for next game
            gameId.current = new Date().toISOString()

            if (keepScoreMode) {
                // Keep score mode: keep score & logs intact, advance game round
                const nextRound = gameRound + 1
                const nextDate = dayjs().format('MMM D, HH:mm')
                setGameRound(nextRound)
                setGameStartDate(nextDate)
                setSelectedWinnerId(null)
            } else {
                // Normal mode: reset scores and logs
                setPlayers((prev) => prev.map((p) => ({ ...p, score: 0, log: [], gameLogs: [] })))
                setGameRound(1)
                setGameStartDate(dayjs().format('MMM D, HH:mm'))
                setSelectedWinnerId(null)
            }
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
                <div className="flex items-center gap-2 sm:gap-3">
                    <Link href="/" className="text-gray-500 hover:text-gray-800 transition-colors shrink-0">
                        <Button icon={<ArrowLeftOutlined />} shape="circle" />
                    </Link>
                    <Space>
                        <TrophyOutlined className="text-[20px] text-[#faad14]" />
                        <Title level={5} className="m-0! hidden xs:inline sm:inline">Score Tracker</Title>
                    </Space>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Keep Score Mode Switch */}
                    <Tooltip title={keepScoreMode ? "Keep Score Mode: scores will NOT reset on finish, manual winner enabled" : "Normal Mode: scores reset on finish, winner based on highest score"}>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${keepScoreMode ? 'bg-amber-50 border border-amber-300' : 'bg-gray-100'}`}>
                            <span className="text-xs font-medium text-gray-700 select-none hidden sm:inline">
                                Keep Score
                            </span>
                            <Switch
                                size="small"
                                checked={keepScoreMode}
                                onChange={(checked) => {
                                    setKeepScoreMode(checked)
                                    if (!checked) {
                                        setSelectedWinnerId(null)
                                    }
                                }}
                            />
                        </div>
                    </Tooltip>

                    {(hasScores || (keepScoreMode && selectedWinnerId !== null)) && (
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
                </div>
            </div>

            {/* ── Player Grid (Mini Cards) ───────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2 w-full p-3 sm:p-5">
                {players.map((player, i) => {
                    const isWinnerSelected = selectedWinnerId === player.id
                    return (
                        <div
                            key={player.id}
                            onClick={() => setActivePlayerId(player.id)}
                            className={`border-t-4 rounded-xl py-4 px-3 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer flex flex-col items-center text-center gap-2 transition-all duration-200 ease-in-out hover:-translate-y-0.5 relative ${isWinnerSelected ? 'ring-2 ring-amber-400 bg-amber-50/30' : ''
                                }`}
                            style={{ borderTopColor: isWinnerSelected ? '#faad14' : PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                        >
                            {keepScoreMode && isWinnerSelected && (
                                <Tag color="gold" icon={<CrownOutlined />} className="absolute -top-3 px-2 py-0.5 shadow-sm text-xs font-semibold m-0!">
                                    Winner
                                </Tag>
                            )}

                            <Text strong editable={false} className="text-[14px]:" ellipsis>{player.name || "Unnamed"}</Text>
                            <Title level={2} editable={false} className="m-0!:" style={{ color: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>
                                {player.score}
                            </Title>

                            {/* Manual Winner Button when Keep Score Mode is ON */}
                            {keepScoreMode && (
                                <Button
                                    size="small"
                                    type={isWinnerSelected ? "primary" : "default"}
                                    icon={<CrownOutlined style={{ color: isWinnerSelected ? '#fff' : '#faad14' }} />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleWinner(player.id);
                                    }}
                                    className="w-full text-xs mt-1"
                                    style={isWinnerSelected ? { background: '#faad14', borderColor: '#d48806' } : undefined}
                                >
                                    {isWinnerSelected ? "Winner" : "Set Winner"}
                                </Button>
                            )}
                        </div>
                    )
                })}

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
                        isManualWinner={selectedWinnerId === activePlayer.id}
                        showWinnerButton={keepScoreMode}
                        onToggleWinner={() => toggleWinner(activePlayer.id)}
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
                {logPlayer && logPlayer.gameLogs && logPlayer.gameLogs.length > 0 ? (
                    <div className="flex flex-col gap-3 py-2 max-h-[60vh] overflow-y-auto">
                        {logPlayer.gameLogs.map((entry, idx) => {
                            const subtotal = entry.points.reduce((sum, p) => sum + p, 0)
                            return (
                                <div key={entry.gameNumber} className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-xs text-gray-800">
                                                Game {entry.gameNumber}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                ({entry.date})
                                            </span>
                                        </div>
                                        <span className="text-xs font-medium text-gray-500">
                                            Subtotal: <span className={subtotal >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>{subtotal >= 0 ? `+${subtotal}` : subtotal}</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {entry.points.map((pts, i) => (
                                            <Tag key={i} color={pts >= 0 ? 'green' : 'red'}>
                                                {pts >= 0 ? `+${pts}` : pts}
                                            </Tag>
                                        ))}
                                    </div>
                                    {idx < (logPlayer.gameLogs?.length ?? 0) - 1 && (
                                        <Divider className="my-2! border-dashed" />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : logPlayer && logPlayer.log.length > 0 ? (
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
                <Divider className="my-3!" />
                <div className="flex justify-between items-center px-1">
                    <Text strong>Total Score</Text>
                    <Title level={3} className="m-0! text-blue-600">
                        {logPlayer?.score ?? 0}
                    </Title>
                </div>
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
