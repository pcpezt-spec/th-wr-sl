'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  CalendarIcon,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { Realization, TargetConfig, Trade } from '@/lib/types'
import {
  calculateProfit,
  calculateSellQuantity,
  formatCurrency,
  formatPercentage,
  formatQuantity,
} from '@/lib/calculations'
import { cn } from '@/lib/utils'

export interface TargetStopLoss {
  targetLevel: number
  price: number
  createdAt: string
}

interface RealizationFormProps {
  trade: Trade
  targets: TargetConfig[]
  currentPrice: number
  suggestedTargetLevel?: number
  open: boolean
  stopLossPrice?: number
  onOpenChange: (open: boolean) => void
  currency: 'USD' | 'BRL'
  addRealization: (
    tradeId: string,
    realization: Omit<
      Realization,
      'id' | 'tradeId' | 'usdValue' | 'ledgerId'
    >,
    maxTargetLevel?: number
  ) => void
}

const quantityPercentages = [25, 50, 75, 100]

export function RealizationForm({
  trade,
  targets,
  currentPrice,
  suggestedTargetLevel,
  open,
  onOpenChange,
  currency,
  addRealization,
}: RealizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [exitPrice, setExitPrice] = useState(
    currentPrice.toString()
  )

  const [quantity, setQuantity] = useState('')

  const [date, setDate] = useState<Date>(new Date())

  /*
   * targetLevel:
   *
   * 0 = Manual
   * 1 = T1
   * 2 = T2
   * 3 = T3
   */
  const [targetLevel, setTargetLevel] = useState(
    suggestedTargetLevel || 0
  )

  const selectedTarget = targets.find(
    (target) => target.level === targetLevel
  )

  const isTargetRealization = targetLevel > 0

  const isLastTarget =
    targetLevel === targets.length

  const suggestedQuantity = selectedTarget
    ? calculateSellQuantity(
      trade.remainingQuantity,
      selectedTarget.sellPercentage,
      isLastTarget
    )
    : trade.remainingQuantity

  const exitPriceNum =
    parseFloat(exitPrice) || 0

  const quantityNum =
    parseFloat(quantity) || 0

  const profit =
    exitPriceNum > 0 && quantityNum > 0
      ? calculateProfit(
        trade.entryPrice,
        exitPriceNum,
        quantityNum
      )
      : 0

  const roi =
    exitPriceNum > 0
      ? (
        (exitPriceNum - trade.entryPrice) /
        trade.entryPrice
      ) * 100
      : 0

  /*
   * Atualiza o preço sempre que o formulário é aberto.
   */
  useEffect(() => {
    if (open && currentPrice > 0) {
      setExitPrice(currentPrice.toString())
    }
  }, [open, currentPrice])

  /*
   * Ao abrir:
   *
   * - Se veio de um target, seleciona o target.
   * - Se veio do botão "Realizar Lucro", fica Manual.
   *
   * Também limpa a quantidade para evitar carregar
   * uma sugestão de uma abertura anterior.
   */
  useEffect(() => {
    if (!open) return

    const initialTargetLevel =
      suggestedTargetLevel || 0

    setTargetLevel(initialTargetLevel)

    if (initialTargetLevel > 0) {
      const target = targets.find(
        (item) => item.level === initialTargetLevel
      )

      if (target) {
        const isLast =
          initialTargetLevel === targets.length

        const suggested = calculateSellQuantity(
          trade.remainingQuantity,
          target.sellPercentage,
          isLast
        )

        setQuantity(suggested.toString())
        return
      }
    }

    setQuantity('')
  }, [
    open,
    suggestedTargetLevel,
    targets,
    trade.remainingQuantity,
  ])

  /*
   * Seleciona Manual.
   */
  const handleSelectManual = () => {
    setTargetLevel(0)
    setQuantity('')
  }

  /*
   * Seleciona um target.
   *
   * Não depende do preço atual.
   *
   * Isso permite registrar, por exemplo:
   *
   * T2 atingido
   * ↓
   * preço caiu
   * ↓
   * Stop Loss executado
   * ↓
   * registrar realização como T2
   */
  const handleSelectTarget = (level: number) => {
    setTargetLevel(level)

    const target = targets.find(
      (item) => item.level === level
    )

    if (!target) return

    const isLast =
      level === targets.length

    const suggested = calculateSellQuantity(
      trade.remainingQuantity,
      target.sellPercentage,
      isLast
    )

    setQuantity(suggested.toString())
  }

  /*
   * Usa novamente a quantidade sugerida para o target selecionado.
   */
  const handleSetSuggestedQuantity = () => {
    if (!selectedTarget) return

    setQuantity(
      suggestedQuantity.toString()
    )
  }

  const handleQuantityPercentage = (
    percentage: number
  ) => {
    setQuantity(
      (
        trade.remainingQuantity *
        (percentage / 100)
      ).toString()
    )
  }

  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false)
    }
  }

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    if (exitPriceNum <= 0) {
      toast.error(
        'Informe um preco de saida valido'
      )
      return
    }

    if (quantityNum <= 0) {
      toast.error(
        'Informe uma quantidade valida'
      )
      return
    }

    if (
      quantityNum >
      trade.remainingQuantity
    ) {
      toast.error(
        'Quantidade maior que o saldo disponivel'
      )
      return
    }

    setIsSubmitting(true)

    try {
      addRealization(
        trade.id,
        {
          /*
           * 0 = Manual
           * 1 = T1
           * 2 = T2
           * 3 = T3
           */
          targetLevel,

          exitPrice: exitPriceNum,

          quantity: quantityNum,

          date: date.toISOString(),
        },

        targets.length
      )

      toast.success(
        'Realizacao registrada com sucesso!'
      )

      onOpenChange(false)
    } catch {
      toast.error(
        'Erro ao registrar realizacao'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-chart-1" />
            Realizar Lucro
          </DialogTitle>

          <DialogDescription>
            Registre a venda parcial ou total de {trade.coinSymbol}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4 py-4">

            {/* ================================================== */}
            {/* TARGET / SUGESTÃO */}
            {/* ================================================== */}

            {isTargetRealization && selectedTarget && (
              <Alert className="border-chart-3/50 bg-chart-3/10">
                <AlertTriangle className="size-4 text-chart-3" />

                <AlertDescription className="text-chart-3">
                  <div className="grid grid-cols-[auto_1fr] items-center gap-x-4">
                    <strong>
                      T{targetLevel}
                    </strong>

                    <div className="flex items-center">
                      <span>
                        Sugestão: Vender {selectedTarget.sellPercentage}% (
                        {formatQuantity(suggestedQuantity)} {trade.coinSymbol})
                      </span>

                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="ml-2 h-auto cursor-pointer p-0 text-chart-3"
                        onClick={handleSetSuggestedQuantity}
                        disabled={isSubmitting}
                      >
                        Usar sugestão
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* ================================================== */}
            {/* RESUMO */}
            {/* ================================================== */}

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/50 p-3 sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">
                  Saldo disponível
                </div>

                <div className="font-medium">
                  {formatQuantity(trade.remainingQuantity)}{' '}
                  {trade.coinSymbol}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Preço de entrada
                </div>

                <div className="font-medium">
                  {formatCurrency(trade.entryPrice, currency)}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Preço de saída
                </div>

                <div className="font-medium">
                  {formatCurrency(exitPriceNum, currency)}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Quantidade
                </div>

                <div className="font-medium">
                  {formatQuantity(quantityNum)} {trade.coinSymbol}
                </div>
              </div>
            </div>

            {/* ================================================== */}
            {/* PREÇO + QUANTIDADE */}
            {/* ================================================== */}

            <div className="grid gap-4 sm:grid-cols-2">

              {/* PREÇO */}
              <Field>
                <FieldLabel>
                  Preço de Saída ({currency})
                </FieldLabel>

                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  disabled={isSubmitting}
                />
              </Field>

              {/* QUANTIDADE */}
              <Field>
                <FieldLabel>
                  Quantidade a Vender
                </FieldLabel>

                <Input
                  type="number"
                  step="any"
                  min="0"
                  max={trade.remainingQuantity}
                  placeholder="0.00000000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={isSubmitting}
                />

                <div className="mt-1 flex gap-2">
                  {quantityPercentages.map((percentage) => (
                    <Button
                      key={percentage}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() =>
                        handleQuantityPercentage(percentage)
                      }
                      disabled={isSubmitting}
                    >
                      {percentage}%
                    </Button>
                  ))}
                </div>
              </Field>
            </div>

            {/* ================================================== */}
            {/* TIPO + DATA */}
            {/* ================================================== */}

            <div className="grid gap-4 sm:grid-cols-2">

              {/* TIPO DE REALIZAÇÃO */}
              <Field>
                <FieldLabel>
                  Tipo de Realização
                </FieldLabel>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={
                      !isTargetRealization
                        ? 'default'
                        : 'outline'
                    }
                    className="flex-1 cursor-pointer"
                    onClick={() => setTargetLevel(0)}
                    disabled={isSubmitting}
                  >
                    Manual
                  </Button>

                  <Button
                    type="button"
                    variant={
                      isTargetRealization
                        ? 'default'
                        : 'outline'
                    }
                    className="flex-1 cursor-pointer"
                    onClick={() =>
                      setTargetLevel(
                        suggestedTargetLevel ||
                        targets[0]?.level ||
                        1
                      )
                    }
                    disabled={isSubmitting}
                  >
                    Target
                  </Button>
                </div>

                {/* SELEÇÃO T1 / T2 / T3 */}
                {isTargetRealization && (
                  <div className="mt-2 flex gap-2">
                    {targets.map((target) => (
                      <Button
                        key={target.level}
                        type="button"
                        size="sm"
                        variant={
                          targetLevel === target.level
                            ? 'default'
                            : 'outline'
                        }
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setTargetLevel(target.level)

                          const targetConfig =
                            targets.find(
                              (t) =>
                                t.level === target.level
                            )

                          if (targetConfig) {
                            const lastTarget =
                              target.level ===
                              targets.length

                            setQuantity(
                              calculateSellQuantity(
                                trade.remainingQuantity,
                                targetConfig.sellPercentage,
                                lastTarget
                              ).toString()
                            )
                          }
                        }}
                        disabled={isSubmitting}
                      >
                        T{target.level}
                      </Button>
                    ))}
                  </div>
                )}
              </Field>

              {/* DATA */}
              <Field>
                <FieldLabel>
                  Data da Realização
                </FieldLabel>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !date && 'text-muted-foreground'
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 size-4" />

                      {date
                        ? format(date, 'PPP', {
                          locale: ptBR,
                        })
                        : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="w-auto p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(selectedDate) =>
                        selectedDate &&
                        setDate(selectedDate)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </Field>
            </div>

            {/* ================================================== */}
            {/* RESULTADO */}
            {/* ================================================== */}

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-4">

                <div>
                  <div className="text-xs text-muted-foreground">
                    Resultado da realização
                  </div>

                  <div className="text-sm">
                    {formatQuantity(quantityNum)}{' '}
                    {trade.coinSymbol}
                    {' × '}
                    {formatCurrency(
                      exitPriceNum,
                      currency
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={cn(
                      'text-xl font-bold',
                      profit >= 0
                        ? 'text-chart-1'
                        : 'text-destructive'
                    )}
                  >
                    {formatCurrency(profit, currency)}
                  </div>

                  <div
                    className={cn(
                      'text-sm',
                      roi >= 0
                        ? 'text-chart-1'
                        : 'text-destructive'
                    )}
                  >
                    {formatPercentage(roi)}
                  </div>
                </div>

              </div>
            </div>

          </FieldGroup>

          {/* ================================================== */}
          {/* FOOTER */}
          {/* ================================================== */}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              className="cursor-pointer disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}

              Confirmar Realização
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

}