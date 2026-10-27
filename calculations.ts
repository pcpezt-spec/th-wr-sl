import { Trade, Settings, PortfolioSummary, TargetConfig } from './types'
import { getLedger } from '@/lib/ledger'

export function calculateROI(entryPrice: number, currentPrice: number): number {
  if (entryPrice === 0) return 0
  return ((currentPrice - entryPrice) / entryPrice) * 100
}

export function calculateProfit(entryPrice: number, exitPrice: number, quantity: number): number {
  return (exitPrice - entryPrice) * quantity
}

export function calculateTotalRealized(trade) {
  return trade.realizations.reduce(
    (sum, r) => sum + calculateRealizationProfit(r, trade),
    0
  )
}

export function calculateRealizationProfit(r, trade) {
  return (r.exitPrice - trade.entryPrice) * r.quantity
}

export function getTargetStatus(
  entryPrice: number,
  currentPrice: number,
  targets: TargetConfig[],
  targetsHit: number[]
): { nextTarget: TargetConfig | null; currentROI: number; targetsReached: number[] } {
  const currentROI = calculateROI(entryPrice, currentPrice)

  const targetsReached = targets.filter(
    (target) => currentROI >= target.percentage && !targetsHit.includes(target.level)
  )

  const nextTarget = targets.find(
    (target) => currentROI < target.percentage && !targetsHit.includes(target.level)
  ) || null

  return {
    nextTarget,
    currentROI,
    targetsReached: targetsReached.map((t) => t.level),
  }
}

export function calculateSellQuantity(
  remainingQuantity: number,
  sellPercentage: number,
  isLastTarget: boolean
): number {
  if (isLastTarget) return remainingQuantity
  return (remainingQuantity * sellPercentage) / 100
}

export function calculatePortfolioSummary(
  trades: Trade[],
  prices: Record<string, { usd: number; brl: number }>,
  currency: 'USD' | 'BRL'
): PortfolioSummary {
  const currencyKey = currency.toLowerCase() as 'usd' | 'brl'

  let totalInvested = 0
  let currentValue = 0
  let realizedProfit = 0

  const activeTrades = trades.filter((t) => t.status === 'ATIVO')

  for (const trade of trades) {
    const invested = trade.entryPrice * trade.quantity

    // ✅ SOMENTE capital externo entra no invested
    if (trade.fundingSource !== 'CASH') {
      totalInvested += invested
    }

    // ✅ lucro realizado continua vindo dos trades
    for (const realization of trade.realizations) {
      const profit = realization.exitPrice * realization.quantity
      const returned = trade.entryPrice * realization.quantity
      realizedProfit += profit - returned || 0
    }

    // ✅ valor atual das posições abertas
    if (trade.status === 'ATIVO') {
      const currentPrice =
        prices[trade.coinId]?.[currencyKey] || trade.entryPrice

      currentValue += currentPrice * trade.remainingQuantity
    }
  }

  // 💰 ledger = caixa real
  const ledger = getLedger()
  const cash = ledger.reduce((sum, e) => sum + Number(e.amount || 0), 0)

  // 💎 equity total
  const equity = currentValue + cash

  // 📈 lucro total real
  const totalProfit = equity - totalInvested

  // 📊 ROI correto
  const totalROI =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0

  // 📉 lucro não realizado
  const unrealizedProfit = totalProfit - realizedProfit

  return {
    totalInvested,
    currentValue: equity, // ⚠️ agora representa equity total
    realizedProfit,
    unrealizedProfit,
    totalROI,
    activeTrades: activeTrades.length,
  }
}

export function calculateAdjustedEntryPrice(trade: Trade): number {
  if (!trade) return 0

  const entryPrice = Number(trade.entryPrice) || 0
  const initialQuantity = Number(trade.quantity) || 0
  const remainingQuantity = Number(trade.remainingQuantity) || 0

  if (entryPrice <= 0 || initialQuantity <= 0 || remainingQuantity <= 0) {
    return 0
  }

  // 💰 custo inicial da posição
  const totalInvested = entryPrice * initialQuantity

  // 💰 valor recebido nas vendas (BRUTO)
  const totalSoldUSD = (trade.realizations || []).reduce((acc, r) => {
    const exitPrice = Number(r.exitPrice) || 0
    const qty = Number(r.quantity) || 0
    return acc + exitPrice * qty
  }, 0)

  const remainingCost = totalInvested - totalSoldUSD

  return remainingCost / remainingQuantity
}

export function formatCurrency(value: number, currency: 'USD' | 'BRL'): string {
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatQuantity(value: number): string {
  if (value >= 1) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
  }
  return value.toFixed(8)
}

export function calculateConsolidatedPositions(
  trades: Trade[],
  prices: Record<
    string,
    {
      usd: number
      brl: number
    }
  >,
  currency: 'USD' | 'BRL'
) {
  const currencyKey = currency.toLowerCase() as 'usd' | 'brl'

  const activeTrades = trades.filter((t) => t.status === 'ATIVO')
  const uniqueCoins = [...new Set(activeTrades.map((t) => t.coinId))]

  const positions = uniqueCoins.map((coinId) => {
    const coinTrades = trades.filter((t) => t.coinId === coinId)

    let totalQuantity = 0
    let totalCost = 0

    for (const trade of coinTrades) {
      const entryCost = trade.entryPrice * trade.quantity

      const totalSold = (trade.realizations || []).reduce(
        (acc, r) => acc + r.exitPrice * r.quantity,
        0
      )

      const remainingCost = entryCost - totalSold

      totalQuantity += trade.remainingQuantity
      totalCost += remainingCost
    }

    const avgEntryPrice =
      totalQuantity > 0 ? totalCost / totalQuantity : 0

    const currentPrice =
      prices[coinId]?.[currencyKey] || avgEntryPrice


    const currentValue = currentPrice * totalQuantity

    const roi =
      avgEntryPrice > 0
        ? ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100
        : 0

    const tradeRef = trades.find((t) => t.coinId === coinId)

    const count = coinTrades.length


    return {
      coinId,
      coinSymbol: tradeRef?.coinSymbol || coinId.toUpperCase(),
      coinName: tradeRef?.coinName,
      coinImage: tradeRef?.coinImage,
      quantity: totalQuantity,
      avgEntryPrice,
      currentPrice,
      currentValue,
      roi,
      count,
    }
  })

  // ✅ NOVO: cálculo do total
  const totalValue = positions.reduce(
    (sum, p) => sum + (p.currentValue || 0),
    0
  )

  // ✅ NOVO: adiciona %
  return positions.map((p) => ({
    ...p,
    portfolioPercentage:
      totalValue > 0
        ? (p.currentValue / totalValue) * 100
        : 0,
  }))
    .sort((a, b) => b.currentValue - a.currentValue)

}


