'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'

import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ✅ USO DIRETO DO STORAGE
import { saveLedgerEntry } from '@/lib/ledger'

export function WithdrawForm() {
  const router = useRouter()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'BANK' | 'EXCHANGE' | 'WALLET'>('BANK')
  const [date, setDate] = useState<Date>(new Date())
  const [note, setNote] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)

    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Informe um valor valido')
      return
    }

    setIsSubmitting(true)

    try {
      saveLedgerEntry({
        id: crypto.randomUUID(),
        type: 'WITHDRAW',
        amount: -Math.abs(parsedAmount), // 🔴 saída sempre negativa
        tradeId: null, // 🔴 importante para consistência do modelo
        date: date.toISOString(),
        metadata: {
          method,
          note: note || undefined,
        },
      })

      toast.success('Withdraw registrado com sucesso!')
      router.push('/')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao registrar withdraw')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Withdraw</CardTitle>
        </CardHeader>

        <CardContent>
          <FieldGroup className="gap-6">
            <Field>
              <FieldLabel>Valor</FieldLabel>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Metodo</FieldLabel>
                <Select
                  value={method}
                  onValueChange={(v) => setMethod(v as any)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK">PIX</SelectItem>
                    <SelectItem value="EXCHANGE">Exchange</SelectItem>
                    <SelectItem value="WALLET">Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Data</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !date && 'text-muted-foreground'
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {date
                        ? format(date, 'PPP', { locale: ptBR })
                        : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </Field>
            </div>

            <Field>
              <FieldLabel>Observacao (opcional)</FieldLabel>
              <Textarea
                placeholder="Ex: retirada de lucro parcial"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
            </Field>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor</span>
                <span className="text-lg font-semibold">
                  -${amount ? parseFloat(amount).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="cursor-pointer"
        >
          Cancelar
        </Button>

        <Button type="submit" disabled={isSubmitting} className='cursor-pointer'>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Registrar Withdraw
        </Button>
      </div>
    </form>
  )
}