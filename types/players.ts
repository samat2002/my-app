export interface ScoreLogEntry {
    gameNumber: number
    date: string
    points: number[]
}

export interface PlayerCardProps {
    name: string
    score: number
    scoreLog: number[]
    onAddScore: (points: number) => void
    onReset: () => void
    onRemove: () => void
    onNameChange: (name: string) => void
    onShowLog: () => void
    index: number
    isManualWinner?: boolean
    showWinnerButton?: boolean
    onToggleWinner?: () => void
}

export interface Players {
    id: number
    name: string
    score: number
    log: number[]
    gameLogs?: ScoreLogEntry[]
    winStack?: number
    isWinner?: boolean
}