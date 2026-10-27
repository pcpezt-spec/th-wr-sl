'use client'

import { ArrowUpRight, ArrowDownRight, Wallet, LayoutDashboard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Trade, CoinGeckoPrice } from '@/lib/types'
import {
  formatCurrency,
  formatPercentage,
  formatQuantity,
  calculateConsolidatedPositions
} from '@/lib/calculations'
import { useMemo } from 'react'

interface Props {
  trades: Trade[]
  prices: CoinGeckoPrice
  currency: 'USD' | 'BRL'
}

export function ConsolidatedPositions({ trades, prices, currency }: Props) {

  const positions = useMemo(() => {
    return calculateConsolidatedPositions(trades, prices, currency)
  }, [trades, prices, currency])

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Posições Consolidadas</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Wallet className="mx-auto mb-4 size-10 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma posição</p>
        </CardContent>
      </Card>
    )
  }

  const gridColsMap = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',

  }

  const colsClass = gridColsMap[Math.min(positions.length, Object.keys(gridColsMap).length)]

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="size-5" />

          <CardTitle>
            Posicoes Consolidadas
          </CardTitle>
        </div>
        <Badge variant="secondary">{positions.length}</Badge>
      </CardHeader>

      <CardContent>
        <div className={`grid gap-4 md:grid-cols-2 ${colsClass}`}>

          {positions.map((pos) => {
            const isPositive = pos.roi >= 0

            return (

              <div
                key={pos.coinId}
                className="rounded-lg border p-4 bg-card hover:bg-accent transition"
              >
                {/* HEADER */}
                <div className="flex justify-between items-center">

                  <div className="flex items-center gap-2">
                    {pos.coinImage ? (
                      <div className="flex size-10 items-center justify-center rounded-full border border-secondary/50 bg-secondary/10">
                        <img
                          src={pos.coinImage}
                          alt={pos.coinSymbol}
                          className="size-7 rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-full border border-secondary/50 bg-secondary text-xs font-bold">
                        {pos.coinSymbol.slice(0, 2)}
                      </div>
                    )}

                    <div>
                      <div className="font-semibold">
                        {pos.coinName}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {pos.coinSymbol}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end text-1xl">
                      {isPositive ? (
                        <ArrowUpRight className="size-4 text-chart-1" />
                      ) : (
                        <ArrowDownRight className="size-4 text-destructive" />
                      )}
                      <span className={`text-xl font-bold ${isPositive ? 'text-chart-1' : 'text-destructive'}`}>
                        {formatPercentage(pos.roi)}
                      </span><Badge variant={isPositive ? 'default' : 'destructive'} className="ml-[0.75em] text-sm">{pos.count}</Badge>
                    </div>

                  </div>
                </div>

                {/* BODY */}
                <div className="mt-3 text-sm space-y-1">

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col">
                        <span>{formatCurrency(pos.currentPrice, currency)}</span>
                        <span className="text-muted-foreground">Preço atual</span>
                      </div>

                      <div className="flex flex-col">
                        <span>{formatCurrency(pos.avgEntryPrice, currency)}</span>
                        <span className="text-muted-foreground">Preço médio</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 text-right">
                      <div className="flex flex-col">
                        <span>
                          {formatQuantity(pos.quantity)} {pos.coinSymbol}
                        </span>
                        <span className="text-muted-foreground">Amount</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="font-medium">
                          {formatCurrency(pos.currentValue, currency)}
                        </span>
                        <span className="text-muted-foreground">Valor</span>
                      </div>
                    </div>
                  </div>

                  {/* PORTFOLIO % */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Portfólio</span>
                      <span className="text-sm">
                        {formatPercentage(pos.portfolioPercentage)}
                      </span>
                    </div>

                    <Progress
                      value={pos.portfolioPercentage}
                      className="h-1.5 mt-1"
                    />
                  </div>

                </div>
              </div>
            )
          })}

        </div>
      </CardContent>
    </Card>
  )
}