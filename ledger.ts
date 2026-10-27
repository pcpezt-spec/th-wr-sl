
import { LedgerEntry } from './types'

const LEDGER_KEY = 'ledger'

// ---------- SSR SAFETY ----------

function isBrowser() {
  return typeof window !== 'undefined'
}

// ---------- STORAGE ----------

export function getLedger(): LedgerEntry[] {
  if (!isBrowser()) return []

  const data = localStorage.getItem(LEDGER_KEY)
  return data ? JSON.parse(data) : []
}

export function saveLedger(ledger: LedgerEntry[]) {
  if (!isBrowser()) return

  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger))
}

// ---------- ACTIONS ----------

export function saveLedgerEntry(entry: LedgerEntry) {
  const current = getLedger()
  saveLedger([...current, entry])
}

export function deleteLedgerEntry(id: string) {
  const current = getLedger()
  saveLedger(current.filter(e => e.id !== id))
}

export function deleteLedgerEntriesByTradeId(tradeId: string) {
  const current = getLedger()
  saveLedger(current.filter(e => e.tradeId !== tradeId))
}

// ---------- CALC ----------

export function ledgerCashBalance(): number {
  if (typeof window === 'undefined') return 0

  const ledger = getLedger()
  return ledger.reduce((sum, e) => sum + Number(e.amount || 0), 0)
}
