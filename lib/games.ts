import { FinishedPlayer, GameSummary, LeaderboardEntry } from "@/types/types"
import axios from "axios"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const api = axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  }
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Persist a finished game using a stable gameId generated at game-start.
 */
export async function saveGame(
  players: FinishedPlayer[],
  gameId: string,
): Promise<string> {
  // Upsert game row — ignore if it already exists
  await api.post('/games', { finished_at: gameId }, {
    headers: { Prefer: 'resolution=ignore-duplicates' }
  })

  // Upsert player rows — update score + is_winner if same game + name already saved
  await api.post('/game_players', players.map((p) => ({
    game_finished_at: gameId,
    name: p.name,
    score: p.score,
    is_winner: p.isWinner ? 1 : 0,
  })), {
    headers: { Prefer: 'resolution=merge-duplicates' },
    params: { on_conflict: 'game_finished_at,name' }
  })

  return gameId
}

/** Fetch full game history (newest first), joined with each game's players. */
export async function fetchHistory(): Promise<GameSummary[]> {
  const { data } = await api.get('/games?select=finished_at,game_players(name,score,is_winner)&order=finished_at.desc')

  return (data ?? []).map((game: any) => ({
    id: game.finished_at,
    date: formatDate(game.finished_at),
    players: (game.game_players ?? []).map((p: any) => ({
      name: p.name,
      score: p.score,
      isWinner: p.is_winner > 0,
      winStack: 0,
    })),
  }))
}

export interface HistoryTableRow {
  key: string
  runNumber: number
  name: string
  score: number
  wins: number
}

/**
 * Fetch game history for a specific date, grouped by player name.
 * Players with the same name are merged: scores summed, wins counted.
 */
export async function fetchHistoryByDate(date: string): Promise<HistoryTableRow[]> {
  // Use local date boundaries to match the stored ISO timestamps
  const start = new Date(`${date}T00:00:00`)
  const end = new Date(`${date}T23:59:59.999`)

  const { data } = await api.get(
    `/game_players?select=name,score,is_winner,game_finished_at` +
    `&game_finished_at=gte.${start.toISOString()}` +
    `&game_finished_at=lte.${end.toISOString()}`
  )

  // Group by player name — sum score, count wins
  const grouped = new Map<string, { score: number; wins: number }>()
  for (const row of data ?? []) {
    const existing = grouped.get(row.name) ?? { score: 0, wins: 0 }
    grouped.set(row.name, {
      score: existing.score + (row.score ?? 0),
      wins: existing.wins + (row.is_winner > 0 ? 1 : 0),
    })
  }

  return Array.from(grouped.entries())
    .sort((a, b) => b[1].wins - a[1].wins || b[1].score - a[1].score)
    .map(([name, { score, wins }], i) => ({
      key: name,
      runNumber: i + 1,
      name,
      score,
      wins,
    }))
}

/** Build the leaderboard by counting wins (is_winner) per player name — TODAY only. */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const todayStr = new Date().toISOString().slice(0, 10)
  const start = new Date(`${todayStr}T00:00:00`)
  const end = new Date(`${todayStr}T23:59:59.999`)

  const { data } = await api.get(
    `/game_players?select=name,is_winner` +
    `&game_finished_at=gte.${start.toISOString()}` +
    `&game_finished_at=lte.${end.toISOString()}`
  )

  const wins = new Map<string, number>()
  for (const row of data ?? []) {
    if (!wins.has(row.name)) wins.set(row.name, 0)
    if (row.is_winner > 0) wins.set(row.name, (wins.get(row.name) ?? 0) + 1)
  }

  return Array.from(wins.entries())
    .map(([name, winStack]) => ({ name, winStack }))
    .sort((a, b) => b.winStack - a.winStack)
}
