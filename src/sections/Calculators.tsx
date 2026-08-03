import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'
import {
  DIRECT_LOSS_ITEMS,
  DIRECT_LOSS_RULE,
  ILLEGAL_INCOME_RULE,
  PROSECUTION_THRESHOLDS,
} from '@/data/legal'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

function n(s: string): number {
  const v = parseFloat(s)
  return isNaN(v) || v < 0 ? 0 : v
}

function wan(v: number): string {
  return `${(v / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 万元`
}

function ThresholdBar({ value, threshold, label }: { value: number; threshold: number; label: string }) {
  const pct = Math.min(100, threshold > 0 ? (value / threshold) * 100 : 0)
  const over = value >= threshold && threshold > 0
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className={over ? 'text-red-700 font-bold' : ''}>{over ? '已达到立案标准' : `占立案标准 ${pct.toFixed(0)}%`}</span>
      </div>
      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-600' : pct >= 50 ? 'bg-orange-500' : 'bg-emerald-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function Calculators() {
  // 直接经济损失
  const [loss, setLoss] = useState<Record<string, string>>({})
  const lossTotal = DIRECT_LOSS_ITEMS.reduce((sum, item) => sum + n(loss[item.id] || ''), 0)

  // 违法所得
  const [income, setIncome] = useState('')
  const [expense, setExpense] = useState('')
  const illegalResult = Math.max(0, n(income) - n(expense))

  const T = PROSECUTION_THRESHOLDS

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>数额计算器</h2>
        <p className="text-sm text-slate-500 mt-1">
          打官司的核心是钱。以下计算口径逐字来自法答网第二十四批串通投标罪专题问题4、问题5的答疑意见与《标准二》第六十八条。
        </p>
      </div>

      {/* 直接经济损失 */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: SERIF }}>① 直接经济损失计算器（立案标准：50 万元）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {DIRECT_LOSS_ITEMS.map((item) => (
              <div key={item.id}>
                <label className="text-sm font-medium text-slate-700">{item.label}</label>
                <p className="text-xs text-slate-500 mb-1">{item.hint}</p>
                <Input
                  type="number" min={0} placeholder="0"
                  value={loss[item.id] || ''}
                  onChange={(e) => setLoss((p) => ({ ...p, [item.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="bg-[#f7f5f0] border border-slate-200 rounded p-4">
            <p className="text-lg font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>
              合计：{lossTotal.toLocaleString()} 元（{wan(lossTotal)}）
            </p>
            <ThresholdBar value={lossTotal} threshold={T.directLoss.amount} label="对照 50 万元立案标准" />
            <p className="text-xs text-slate-500 mt-2">{DIRECT_LOSS_RULE}</p>
          </div>
        </CardContent>
      </Card>

      {/* 违法所得 */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: SERIF }}>② 违法所得计算器（立案标准：20 万元）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm text-slate-700">
            计算公式：{ILLEGAL_INCOME_RULE.formula}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">串通投标所获得的全部收入（元）</label>
              <Input type="number" min={0} value={income} onChange={(e) => setIncome(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">直接用于实施中标项目的合理支出（元）</label>
              <Input type="number" min={0} value={expense} onChange={(e) => setExpense(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded p-3">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-4 h-4" /> 以下支出不得扣除（应作为犯罪成本或违法所得予以追缴、没收）：
            </p>
            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
              {ILLEGAL_INCOME_RULE.nonDeductible.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
          <div className="bg-[#f7f5f0] border border-slate-200 rounded p-4">
            <p className="text-lg font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>
              违法所得估算：{illegalResult.toLocaleString()} 元（{wan(illegalResult)}）
            </p>
            <ThresholdBar value={illegalResult} threshold={T.illegalIncome.amount} label="对照 20 万元立案标准" />
            <p className="text-xs text-slate-500 mt-2">{ILLEGAL_INCOME_RULE.note}</p>
          </div>
        </CardContent>
      </Card>

      {/* 速查表 */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: SERIF }}>③ 立案数额对照速查</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#12263f] text-white">
                <th className="text-left px-4 py-2.5 font-medium">情形</th>
                <th className="text-left px-4 py-2.5 font-medium">立案标准</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['造成直接经济损失', '50 万元以上'],
                ['违法所得数额', '20 万元以上'],
                ['中标项目金额', '400 万元以上'],
                ['采取威胁、欺骗或者贿赂等非法手段', '无数额要求，直接立案'],
                ['二年内因串通投标受过二次以上行政处罚，又串通投标', '虽未达到数额标准亦立案'],
              ].map(([a, b], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-4 py-2.5 border-t border-slate-200">{a}</td>
                  <td className="px-4 py-2.5 border-t border-slate-200 font-semibold text-[#12263f]">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-3">{T.note}</p>
          <p className="text-xs text-slate-500 mt-1">{T.discretionaryNote}</p>
        </CardContent>
      </Card>
    </div>
  )
}
