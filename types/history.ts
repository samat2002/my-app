import { Players } from "./types"

export interface GameSummary {
    id: string
    date: string
    players: Players[]
}

export interface LeaderboardEntry {
    name: string
    winStack: number
}

export interface HistoryDialogProps {
    games: GameSummary[]
    leaderboard: LeaderboardEntry[]
    open: boolean
    loading?: boolean
    onClose: () => void
}

export interface LeaderboardEntry {
    name: string
    winStack: number
}
