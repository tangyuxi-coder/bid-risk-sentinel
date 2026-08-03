import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DEADLINE_RULES, DEADLINE_DISCLAIMER } from '@/data/legal'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

function addDays(date: Date, days: number, workday: boolean): Date {
  const d = new Date(date)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    if (!workday || (d.getDay() !== 0 && d.getDay() !== 6)) added++
  }
  return d
}

function subDays(date: Date, days: number, workday: boolean): Date {
  const d = new Date(date)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() - 1)
    if (!workday || (d.getDay() !== 0 && d.getDay() !== 6)) added++
  }
  return d
}

function fmt(d: Date): string {
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日（星期${week}）`
}

export default function Deadlines() {
  const [ruleId, setRuleId] = useState(DEADLINE_RULES[0].id)
  const [dateStr, setDateStr] = useState('')

  const rule = DEADLINE_RULES.find((r) => r.id === ruleId)!
  const isReverse = rule.id.startsWith('zb-yiyi')

  const result = useMemo(() => {
    if (!dateStr) return null
    const base = new Date(dateStr + 'T00:00:00')
    if (isNaN(base.getTime())) return null
    const workday = rule.dayType === '工作日'
    return isReverse ? subDays(base, rule.days, workday) : addDays(base, rule.days, workday)
  }, [dateStr, rule, isReverse])

  const systems = ['招标投标法体系', '政府采购法体系'] as const

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>期限计算器</h2>
        <p className="text-sm text-slate-500 mt-1">
          异议期、质疑期、投诉期——错过一天，权利清零。请选择期限类型并输入起算日期。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: SERIF }}>选择期限类型</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {systems.map((sys) => (
            <div key={sys}>
              <p className="text-sm font-semibold text-[#12263f] mb-2">{sys}</p>
              <div className="space-y-1.5">
                {DEADLINE_RULES.filter((r) => r.system === sys).map((r) => (
                  <label key={r.id} className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="deadline-rule"
                      checked={ruleId === r.id}
                      onChange={() => { setRuleId(r.id) }}
                      className="mt-1 accent-[#12263f]"
                    />
                    <span>{r.name}<span className="text-xs text-slate-400 ml-1">（{r.days} 个{r.dayType}）</span></span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-2">
            <label className="text-sm font-medium text-slate-700 block mb-1">
              {isReverse ? '截止/到期日期（用于倒推最迟提出日）' : '起算日期（知道或应当知道之日 / 收到文书之日）'}
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="border border-slate-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#12263f]/30"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600">
            依据：{rule.basis}
            {rule.note && <span className="block mt-1 text-slate-500">{rule.note}</span>}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-2 border-[#12263f]">
          <CardHeader>
            <CardTitle className="text-[#12263f]" style={{ fontFamily: SERIF }}>计算结果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xl font-bold text-red-700" style={{ fontFamily: SERIF }}>
              {isReverse ? '最迟应于 ' : '期限届满日为 '}{fmt(result)}
            </p>
            <p className="text-sm text-slate-600">
              {rule.name}：{rule.days} 个{rule.dayType}。
            </p>
            <p className="text-xs text-slate-500">{DEADLINE_DISCLAIMER}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
