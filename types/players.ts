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
}

export interface Players {
    id: number
    name: string
    score: number
    log: number[]
    winStack?: number
    isWinner?: boolean
}