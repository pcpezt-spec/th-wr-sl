'use client'

import { TrendingUp, TrendingDown, Wallet, Activity, Target, DollarSign, CircleDollarSign, BadgeDollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PortfolioSummary as PortfolioSummaryType } from '@/lib/types'
import { formatCurrency, formatPercentage } from '@/lib/calculations'
import { getColorClass } from '@/lib/utils'

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType
  currency: 'USD' | 'BRL'
  ledgerCashBalance: number
}

export function PortfolioSummary({
  summary,
  currency,
  ledgerCashBalance,
}: PortfolioSummaryProps) {

  // 💰 EQUITY REAL
  const equity = summary.currentValue

  // 📊 P&L REAL
  const totalProfit = equity - summary.totalInvested
  const totalProfitGlobal = equity

  // 📈 ROI REAL
  const totalROI =
    summary.totalInvested > 0
      ? (totalProfit / summary.totalInvested) * 100
      : 0

  const isPositive = totalProfit > 0
  const isNeutral = totalProfit === 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Investido
          </CardTitle>
          <DollarSign className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getColorClass(summary.totalInvested)}`}>
            {formatCurrency(summary.totalInvested, currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.activeTrades} trades ativos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Valor Atual
          </CardTitle>
          <DollarSign className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getColorClass(equity - summary.totalInvested)}`}>
            {formatCurrency(equity, currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            Posições abertas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            ROI Global
          </CardTitle>
          <Target className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getColorClass(totalROI)}`}>
            {formatPercentage(totalROI)}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Activity className="size-3" />
            <span>Performance geral</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Lucro / Prejuízo
          </CardTitle>
          {totalProfit > 0 ? (
            <TrendingUp className="size-4 text-chart-1" />
          ) : totalProfit < 0 ? (
            <TrendingDown className="size-4 text-destructive" />
          ) : (
            <TrendingUp className="size-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getColorClass(totalProfit)}`}>
            {formatCurrency(totalProfit, currency)}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Realizado:</span>
            <span className={`${getColorClass(summary.realizedProfit)}`}>
              {formatCurrency(summary.realizedProfit, currency)}
            </span>
          </div>
        </CardContent>
      </Card>



      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ledger
          </CardTitle>
          <Wallet className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getColorClass(ledgerCashBalance)}`}>
            {formatCurrency(ledgerCashBalance, currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            Liquidity
          </p>
        </CardContent>
      </Card>



    </div>
  )
}
