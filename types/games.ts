import { Players } from "@/types/types"

export interface GameRow {
    id: string
    date: string
    players: Players[]
}

export interface FinishedPlayer {
    name: string
    score: number
    isWinner: boolean
}