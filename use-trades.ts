'use client'

import {
  useState,
  useEffect,
  useCallback,
} from 'react'

import {
  Trade,
  Realization,
} from '@/lib/types'

import {
  getTrades,
  saveTrades,
} from '@/lib/storage'

import {
  saveLedgerEntry,
  ledgerCashBalance,
  deleteLedgerEntry,
  deleteLedgerEntriesByTradeId,
} from '@/lib/ledger'

type NewTradeInput = Omit<
  Trade,
  | 'id'
  | 'remainingQuantity'
  | 'status'
  | 'realizations'
  | 'targetsHit'
  | 'createdAt'
>

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // --------------------------------------------------
  // CARREGAR TRADES
  // --------------------------------------------------

  useEffect(() => {
    setTrades(getTrades())
    setIsLoading(false)
  }, [])

  // --------------------------------------------------
  // SALVAR E ATUALIZAR ESTADO
  // --------------------------------------------------

  const saveAndUpdate = useCallback(
    (newTrades: Trade[]) => {
      saveTrades(newTrades)
      setTrades(newTrades)
    },
    []
  )

  // --------------------------------------------------
  // ADICIONAR TRADE
  // --------------------------------------------------

  const addTrade = useCallback(
    (trade: NewTradeInput) => {
      const netQuantity =
        trade.quantity - (trade.fee || 0)

      const newTrade: Trade = {
        ...trade,

        id: crypto.randomUUID(),

        fee: trade.fee || 0,

        remainingQuantity: netQuantity,

        status: 'ATIVO',

        realizations: [],

        targetsHit: [],

        createdAt: new Date().toISOString(),
      }

      let ledgerId: string | null = null

      if (trade.fundingSource === 'CASH') {
        const investedAmount =
          trade.entryPrice * trade.quantity

        const cash = ledgerCashBalance()

        if (investedAmount > cash) {
          throw new Error('Saldo insuficiente')
        }

        ledgerId = crypto.randomUUID()
      }

      // Salva o trade primeiro
      const updatedTrades = [
        ...trades,
        newTrade,
      ]

      saveAndUpdate(updatedTrades)

      // Depois registra saída do caixa
      if (ledgerId) {
        saveLedgerEntry({
          id: ledgerId,
          type: 'TRADE_ENTRY',
          amount: -(
            trade.entryPrice *
            trade.quantity
          ),
          tradeId: newTrade.id,
          date: new Date().toISOString(),
        })
      }

      return newTrade
    },
    [trades, saveAndUpdate]
  )

  // --------------------------------------------------
  // ATUALIZAR TRADE
  // --------------------------------------------------

  const updateTrade = useCallback(
    (
      id: string,
      updates: Partial<Trade>
    ) => {
      const newTrades = trades.map((trade) =>
        trade.id === id
          ? {
            ...trade,
            ...updates,
          }
          : trade
      )

      saveAndUpdate(newTrades)
    },
    [trades, saveAndUpdate]
  )

  // --------------------------------------------------
  // EXCLUIR TRADE
  // --------------------------------------------------

  const deleteTrade = useCallback(
    (id: string) => {
      deleteLedgerEntriesByTradeId(id)

      saveAndUpdate(
        trades.filter(
          (trade) => trade.id !== id
        )
      )
    },
    [trades, saveAndUpdate]
  )

  // --------------------------------------------------
  // ADICIONAR REALIZAÇÃO
  // --------------------------------------------------

  const addRealization = useCallback(
    (
      tradeId: string,
      realization: Omit<
        Realization,
        | 'id'
        | 'tradeId'
        | 'usdValue'
        | 'ledgerId'
      >,
      maxTargetLevel: number = 3
    ) => {
      const trade = trades.find(
        (t) => t.id === tradeId
      )

      if (!trade) return

      if (
        realization.quantity >
        trade.remainingQuantity
      ) {
        throw new Error(
          'Quantidade maior que a disponível'
        )
      }

      const usdValue =
        realization.exitPrice *
        realization.quantity

      const ledgerId =
        crypto.randomUUID()

      const newTrades = trades.map(
        (currentTrade) => {
          if (
            currentTrade.id !== tradeId
          ) {
            return currentTrade
          }

          const newRealization = {
            ...realization,

            id: crypto.randomUUID(),

            tradeId,

            ledgerId,

            rebuyStatus:
              'PENDING' as const,
          }

          const newRemainingQuantity =
            currentTrade.remainingQuantity -
            realization.quantity

          const targetsHit =
            realization.targetLevel > 0
              ? [
                ...new Set([
                  ...currentTrade.targetsHit,
                  realization.targetLevel,
                ]),
              ]
              : currentTrade.targetsHit

          const stopLosses =
            realization.targetLevel > 0
              ? (currentTrade.stopLosses || []).map(
                (stop) =>
                  stop.targetLevel === realization.targetLevel
                    ? {
                      ...stop,
                      status: 'ENCERRADO' as const,
                    }
                    : stop
              )
              : currentTrade.stopLosses || []


          const isLastTargetHit =
            realization.targetLevel >=
            maxTargetLevel

          const shouldFinalize =
            newRemainingQuantity <= 0 ||
            isLastTargetHit

          return {
            ...currentTrade,

            realizations: [
              ...currentTrade.realizations,
              newRealization,
            ],

            remainingQuantity:
              newRemainingQuantity,

            targetsHit,

            stopLosses,

            status: shouldFinalize
              ? 'FINALIZADO'
              : 'ATIVO',
          }
        }
      )

      // Entrada de caixa
      saveLedgerEntry({
        id: ledgerId,

        type: 'REALIZATION',

        amount: usdValue,

        tradeId,

        date: new Date().toISOString(),
      })

      saveAndUpdate(newTrades)
    },
    [trades, saveAndUpdate]
  )

  // --------------------------------------------------
  // BUSCAR TRADE
  // --------------------------------------------------

  const getTradeById = useCallback(
    (id: string) => {
      return trades.find(
        (trade) => trade.id === id
      )
    },
    [trades]
  )

  // --------------------------------------------------
  // TRADES ATIVOS
  // --------------------------------------------------

  const getActiveTrades = useCallback(
    () => {
      return trades.filter(
        (trade) =>
          trade.status === 'ATIVO'
      )
    },
    [trades]
  )

  // --------------------------------------------------
  // TRADES FINALIZADOS
  // --------------------------------------------------

  const getFinishedTrades =
    useCallback(() => {
      return trades.filter(
        (trade) =>
          trade.status === 'FINALIZADO'
      )
    }, [trades])

  // --------------------------------------------------
  // IMPORTAR TRADES
  // --------------------------------------------------

  const importTrades = useCallback(
    (newTrades: Trade[]) => {
      saveAndUpdate(newTrades)
    },
    [saveAndUpdate]
  )

  // --------------------------------------------------
  // EXCLUIR REALIZAÇÃO
  // --------------------------------------------------

  const deleteRealization = useCallback(
    (
      tradeId: string,
      realizationId: string,
      maxTargetLevel: number = 3
    ) => {
      const trade = trades.find(
        (t) => t.id === tradeId
      )

      const realization =
        trade?.realizations.find(
          (r) => r.id === realizationId
        )

      if (realization?.ledgerId) {
        deleteLedgerEntry(
          realization.ledgerId
        )
      }

      const newTrades = trades.map(
        (currentTrade) => {
          if (
            currentTrade.id !== tradeId
          ) {
            return currentTrade
          }

          const remainingRealizations =
            currentTrade.realizations.filter(
              (r) =>
                r.id !== realizationId
            )

          let remainingQuantity =
            currentTrade.quantity -
            (currentTrade.fee || 0)

          const targetsHit: number[] = []

          remainingRealizations.forEach(
            (r) => {
              remainingQuantity -=
                r.quantity

              if (r.targetLevel > 0) {
                targetsHit.push(
                  r.targetLevel
                )
              }
            }
          )

          const isLastTargetHit =
            targetsHit.includes(
              maxTargetLevel
            )

          const shouldFinalize =
            remainingQuantity <= 0 ||
            isLastTargetHit

          return {
            ...currentTrade,

            realizations:
              remainingRealizations,

            remainingQuantity,

            targetsHit,

            status: shouldFinalize
              ? ('FINALIZADO' as const)
              : ('ATIVO' as const),
          }
        }
      )

      saveAndUpdate(newTrades)
    },
    [trades, saveAndUpdate]
  )

  // --------------------------------------------------
  // IGNORAR REBUY
  // --------------------------------------------------

  const dismissRebuyOpportunity =
    useCallback(
      (
        tradeId: string,
        realizationId: string
      ) => {
        const newTrades =
          trades.map((trade) => {
            if (
              trade.id !== tradeId
            ) {
              return trade
            }

            return {
              ...trade,

              realizations:
                trade.realizations.map(
                  (realization) => {
                    if (
                      realization.id !==
                      realizationId
                    ) {
                      return realization
                    }

                    return {
                      ...realization,
                      rebuyStatus:
                        'DISMISSED',
                    }
                  }
                ),
            }
          })

        saveAndUpdate(newTrades)
      },
      [trades, saveAndUpdate]
    )

  // --------------------------------------------------
  // IGNORAR TARGET
  // --------------------------------------------------

  const dismissTargetOpportunity =
    useCallback(
      (
        tradeId: string,
        targetLevel: number
      ) => {
        const newTrades =
          trades.map((trade) => {
            if (
              trade.id !== tradeId
            ) {
              return trade
            }

            return {
              ...trade,

              targetsIgnored: [
                ...(trade.targetsIgnored ||
                  []),
                targetLevel,
              ],
            }
          })

        saveAndUpdate(newTrades)
      },
      [trades, saveAndUpdate]
    )

  // --------------------------------------------------
  // RESTAURAR REBUY
  // --------------------------------------------------

  const restoreRebuyOpportunity =
    useCallback(
      (
        tradeId: string,
        realizationId: string
      ) => {
        const newTrades =
          trades.map((trade) => {
            if (
              trade.id !== tradeId
            ) {
              return trade
            }

            return {
              ...trade,

              realizations:
                trade.realizations.map(
                  (realization) => {
                    if (
                      realization.id !==
                      realizationId
                    ) {
                      return realization
                    }

                    return {
                      ...realization,
                      rebuyStatus:
                        'PENDING',
                    }
                  }
                ),
            }
          })

        saveAndUpdate(newTrades)
      },
      [trades, saveAndUpdate]
    )

  // --------------------------------------------------
  // RESTAURAR TARGET
  // --------------------------------------------------

  const restoreTargetOpportunity =
    useCallback(
      (
        tradeId: string,
        targetLevel: number
      ) => {
        const newTrades =
          trades.map((trade) => {
            if (
              trade.id !== tradeId
            ) {
              return trade
            }

            return {
              ...trade,

              targetsIgnored:
                (
                  trade.targetsIgnored ||
                  []
                ).filter(
                  (level) =>
                    level !== targetLevel
                ),
            }
          })

        saveAndUpdate(newTrades)
      },
      [trades, saveAndUpdate]
    )

  // --------------------------------------------------
  // DEFINIR STOP LOSS
  // --------------------------------------------------

  const setTargetStopLoss =
    useCallback(
      (
        tradeId: string,
        targetLevel: number,
        price: number,
        quantity: number
      ) => {
        // Garantias contra NaN / valores inválidos
        if (
          !Number.isFinite(price) ||
          price <= 0
        ) {
          throw new Error(
            'Preço do Stop Loss inválido'
          )
        }

        if (
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            'Quantidade do Stop Loss inválida'
          )
        }

        const newTrades =
          trades.map((trade) => {
            if (
              trade.id !== tradeId
            ) {
              return trade
            }

            const stopLosses = [
              ...(trade.stopLosses || []),
            ]

            const existingIndex =
              stopLosses.findIndex(
                (stop) =>
                  stop.targetLevel ===
                  targetLevel
              )

            const newStopLoss = {
              targetLevel,
              price,
              quantity,
            }

            if (existingIndex >= 0) {
              stopLosses[
                existingIndex
              ] = newStopLoss
            } else {
              stopLosses.push(
                newStopLoss
              )
            }

            return {
              ...trade,
              stopLosses,
            }
          })

        saveAndUpdate(newTrades)
      },
      [trades, saveAndUpdate]
    )

  // --------------------------------------------------
  // REMOVER STOP LOSS
  // --------------------------------------------------

  const removeTargetStopLoss =
    useCallback(
      (
        tradeId: string,
        targetLevel: number
      ) => {
        const newTrades =
          trades.map((trade) => {
            if (
              trade.id !== tradeId
            ) {
              return trade
            }

            return {
              ...trade,

              stopLosses: (
                trade.stopLosses || []
              ).filter(
                (stop) =>
                  stop.targetLevel !==
                  targetLevel
              ),
            }
          })

        saveAndUpdate(newTrades)
      },
      [trades, saveAndUpdate]
    )

  const updateStopLoss = useCallback(
    (
      tradeId: string,
      targetLevel: number,
      price: number,
      quantity: number
    ) => {
      const newTrades = trades.map((trade) => {
        if (trade.id !== tradeId) {
          return trade
        }

        return {
          ...trade,
          stopLosses: (trade.stopLosses || []).map(
            (stopLoss) =>
              stopLoss.targetLevel === targetLevel
                ? {
                  ...stopLoss,
                  price,
                  quantity,
                }
                : stopLoss
          ),
        }
      })

      saveAndUpdate(newTrades)
    },
    [trades, saveAndUpdate]
  )

  const deleteStopLoss = useCallback(
    (
      tradeId: string,
      targetLevel: number
    ) => {
      const newTrades = trades.map((trade) => {
        if (trade.id !== tradeId) {
          return trade
        }

        return {
          ...trade,
          stopLosses: (trade.stopLosses || []).filter(
            (stopLoss) =>
              stopLoss.targetLevel !== targetLevel
          ),
        }
      })

      saveAndUpdate(newTrades)
    },
    [trades, saveAndUpdate]
  )

  return {
    trades,
    isLoading,

    addTrade,
    updateTrade,
    deleteTrade,

    addRealization,

    getTradeById,
    getActiveTrades,
    getFinishedTrades,

    importTrades,

    deleteRealization,

    dismissRebuyOpportunity,
    restoreRebuyOpportunity,

    dismissTargetOpportunity,
    restoreTargetOpportunity,

    setTargetStopLoss,
    removeTargetStopLoss,
    updateStopLoss,
    deleteStopLoss,
  }
}
