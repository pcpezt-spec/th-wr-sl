import { Trade, Settings, DEFAULT_SETTINGS, LedgerEntry } from './types'
import { getLedger, saveLedger } from './ledger'

const TRADES_KEY = 'crypto-trades'
const SETTINGS_KEY = 'crypto-settings'

export function getTrades(): Trade[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(TRADES_KEY)
  return data ? JSON.parse(data) : []
}

export function saveTrades(trades: Trade[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TRADES_KEY, JSON.stringify(trades))
}

export function getSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  const data = localStorage.getItem(SETTINGS_KEY)
  if (!data) return DEFAULT_SETTINGS

  const parsed = JSON.parse(data) as Settings

  // Migração: garante sempre exatamente 3 targets
  if (!parsed.targets || parsed.targets.length !== 3) {
    const migrated = { ...parsed, targets: DEFAULT_SETTINGS.targets }
    saveSettings(migrated)
    return migrated
  }

  return parsed
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return
  // Garante sempre exatamente 3 targets
  const safeSettings = {
    ...settings,
    targets: settings.targets?.length === 3 ? settings.targets : DEFAULT_SETTINGS.targets
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeSettings))
}

export function exportData(): string {
  const trades = getTrades()
  const settings = getSettings()
  return JSON.stringify({ trades, settings, ledger: getLedger(), exportedAt: new Date().toISOString() }, null, 2)
}

export function importData(jsonString: string): { trades: Trade[]; settings: Settings } {
  const data = JSON.parse(jsonString)
  if (data.trades) saveTrades(data.trades)
  if (data.settings) saveSettings(data.settings)
  if (data.ledger) saveLedger(data.ledger)
  return { trades: data.trades || [], settings: data.settings || [], ledger: data.ledger || DEFAULT_SETTINGS }
}

export function downloadJSON(filename: string, data: string): void {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
