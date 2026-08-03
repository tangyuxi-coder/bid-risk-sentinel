import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, RotateCcw, FileText } from 'lucide-react'
import {
  COLLUSION_BEHAVIORS,
  PROSECUTION_THRESHOLDS,
  CITATIONS,
  MULTI_CRIME_NOTE,
  SUBJECT_NOTE,
  ADMIN_LIABILITY_NOTE,
} from '@/data/legal'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

type Level = 'green' | 'yellow' | 'orange' | 'red'

interface Result {
  level: Level
  title: string
  points: string[]
  citations: string[]
}

const LEVEL_STYLE: Record<Level, { bg: string; border: string; text: string; label: string }> = {
  green: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-800', label: '绿色 · 未见刑事风险特征' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-800', label: '黄色 · 行政责任风险' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-800', label: '橙色 · 接近立案标准' },
  red: { bg: 'bg-red-50', border: 'border-red-600', text: 'text-red-800', label: '红色 · 达到立案追诉标准' },
}

function parseNum(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) || n < 0 ? 0 : n
}

export default function CriminalCheck() {
  const [behaviors, setBehaviors] = useState<string[]>([])
  const [illegalMeans, setIllegalMeans] = useState<'unknown' | 'yes' | 'no'>('unknown')
  const [directLoss, setDirectLoss] = useState('')
  const [illegalIncome, setIllegalIncome] = useState('')
  const [winningAmount, setWinningAmount] = useState('')
  const [repeatOffense, setRepeatOffense] = useState<'unknown' | 'yes' | 'no'>('unknown')
  const [subject, setSubject] = useState<'unknown' | 'unit' | 'individual'>('unknown')
  const [multiCrime, setMultiCrime] = useState<'unknown' | 'yes' | 'no'>('unknown')
  const [result, setResult] = useState<Result | null>(null)

  const toggleBehavior = (id: string) =>
    setBehaviors((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))

  const categories = useMemo(() => {
    const map = new Map<string, typeof COLLUSION_BEHAVIORS>()
    COLLUSION_BEHAVIORS.forEach((b) => {
      if (!map.has(b.category)) map.set(b.category, [])
      map.get(b.category)!.push(b)
    })
    return Array.from(map.entries())
  }, [])

  const evaluate = () => {
    const points: string[] = []
    const citations: string[] = ['xingfa223', 'biaozhun68']

    // 情形一：未勾选任何行为
    if (behaviors.length === 0) {
      setResult({
        level: 'green',
        title: '未发现串通投标行为特征',
        points: [
          '您未勾选任何串通投标行为情形。按法答网答疑口径，认定串通投标罪首先要求行为属于"串通投标行为"。',
          '本结论仅基于您勾选的事实。如实际情况有遗漏，结论不成立。',
        ],
        citations: ['fada1'],
      })
      return
    }

    const dl = parseNum(directLoss)
    const ii = parseNum(illegalIncome)
    const wa = parseNum(winningAmount)
    const T = PROSECUTION_THRESHOLDS

    points.push(`已勾选 ${behaviors.length} 项行为，属于法答网答疑口径下的"串通投标行为"情形。`)

    const hits: string[] = []
    if (illegalMeans === 'yes') hits.push('采取威胁、欺骗或者贿赂等非法手段（无需数额即可立案）')
    if (dl >= T.directLoss.amount) hits.push(`直接经济损失 ${dl.toLocaleString()} 元 ≥ 50万元标准`)
    if (ii >= T.illegalIncome.amount) hits.push(`违法所得 ${ii.toLocaleString()} 元 ≥ 20万元标准`)
    if (wa >= T.winningAmount.amount) hits.push(`中标项目金额 ${wa.toLocaleString()} 元 ≥ 400万元标准`)
    if (repeatOffense === 'yes') hits.push('二年内因串通投标受过二次以上行政处罚，又串通投标')

    let level: Level
    let title: string

    if (hits.length > 0) {
      level = 'red'
      title = '达到立案追诉标准，存在刑事风险'
      points.push(...hits.map((h) => `命中立案情形：${h}`))
      points.push('依据《标准二》第六十八条，上述情形应予立案追诉。串通投标罪法定刑为三年以下有期徒刑或者拘役，并处或者单处罚金（刑法第二百二十三条）。')
    } else {
      const near: string[] = []
      if (dl > 0 && dl >= T.directLoss.amount * 0.5) near.push(`直接经济损失已达立案标准的 ${Math.round((dl / T.directLoss.amount) * 100)}%`)
      if (ii > 0 && ii >= T.illegalIncome.amount * 0.5) near.push(`违法所得已达立案标准的 ${Math.round((ii / T.illegalIncome.amount) * 100)}%`)
      if (wa > 0 && wa >= T.winningAmount.amount * 0.5) near.push(`中标项目金额已达立案标准的 ${Math.round((wa / T.winningAmount.amount) * 100)}%`)

      if (near.length > 0) {
        level = 'orange'
        title = '未达立案标准，但数额接近，应高度警惕'
        points.push(...near)
        points.push('注意：二次以上串通投标的，数额依法累计计算；累计后可能越线。')
      } else {
        level = 'yellow'
        title = '未达刑事立案标准，但行政责任已经成立'
        points.push(ADMIN_LIABILITY_NOTE)
      }
      citations.push('zhaobiaofa53')
    }

    // 主体
    if (subject === 'unit') {
      points.push(`主体认定：${SUBJECT_NOTE.unit}`)
      citations.push('xingfa231')
    } else if (subject === 'individual') {
      points.push(`主体认定：${SUBJECT_NOTE.individual}`)
    }
    points.push(SUBJECT_NOTE.commonSubjects)

    // 数罪并罚
    if (multiCrime === 'yes') {
      points.push(`数罪并罚提示：${MULTI_CRIME_NOTE}`)
    }

    points.push(PROSECUTION_THRESHOLDS.discretionaryNote)

    setResult({ level, title, points, citations: Array.from(new Set(citations)) })
  }

  const reset = () => {
    setBehaviors([]); setIllegalMeans('unknown'); setDirectLoss(''); setIllegalIncome('')
    setWinningAmount(''); setRepeatOffense('unknown'); setSubject('unknown'); setMultiCrime('unknown'); setResult(null)
  }

  const YesNo = ({ value, onChange }: { value: string; onChange: (v: any) => void }) => (
    <div className="flex gap-2">
      {([['yes', '是'], ['no', '否'], ['unknown', '不确定']] as const).map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 text-sm rounded border ${value === v ? 'bg-[#12263f] text-white border-[#12263f]' : 'bg-white border-slate-300 hover:border-slate-400'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>串通投标刑事风险自测</h2>
        <p className="text-sm text-slate-500 mt-1">
          规则依据：法答网第二十四批串通投标罪专题六问 · 刑法第二百二十三/二百三十一条 · 《立案追诉标准（二）》第六十八条。
          全程在您的浏览器本地运行，数据不上传。
        </p>
      </div>

      {/* 第1步 行为 */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: SERIF }}>第 1 步 · 是否存在以下行为情形？（可多选）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map(([cat, items]) => (
            <div key={cat}>
              <p className="text-sm font-semibold text-[#12263f] mb-2">{cat}</p>
              <div className="space-y-1.5">
                {items.map((b) => (
                  <label key={b.id} className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={behaviors.includes(b.id)}
                      onChange={() => toggleBehavior(b.id)}
                      className="mt-1 accent-[#12263f]"
                    />
                    {b.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 第2步 非法手段 */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: SERIF }}>第 2 步 · 是否采取了威胁、欺骗或者贿赂等非法手段？</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <YesNo value={illegalMeans} onChange={setIllegalMeans} />
          <p className="text-xs text-slate-500">采取此类非法手段的，无需达到数额标准即应予立案追诉（《标准二》第六十八条第（四）项）。</p>
        </CardContent>
      </Card>

      {/* 第3步 数额 */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: SERIF }}>第 3 步 · 数额估算（单位：元，可填 0；二次以上串通投标的请累计计算）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-600">造成直接经济损失（立案线 50 万）</label>
              <Input type="number" min={0} value={directLoss} onChange={(e) => setDirectLoss(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-slate-600">违法所得数额（立案线 20 万）</label>
              <Input type="number" min={0} value={illegalIncome} onChange={(e) => setIllegalIncome(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-slate-600">中标项目金额（立案线 400 万）</label>
              <Input type="number" min={0} value={winningAmount} onChange={(e) => setWinningAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <p className="text-xs text-slate-500">不会算？先用"数额计算器"模块算清直接经济损失和违法所得，再回来填。</p>
          <div>
            <p className="text-sm text-slate-600 mb-1.5">虽未达到上述数额，但二年内因串通投标受过二次以上行政处罚，又串通投标的？</p>
            <YesNo value={repeatOffense} onChange={setRepeatOffense} />
          </div>
        </CardContent>
      </Card>

      {/* 第4步 主体与伴随犯罪 */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: SERIF }}>第 4 步 · 主体与伴随行为</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-1.5">行为是以单位名义、为单位利益实施的吗？</p>
            <div className="flex gap-2">
              {([['unit', '是（单位）'], ['individual', '系个人实施'], ['unknown', '不确定']] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setSubject(v)}
                  className={`px-3 py-1 text-sm rounded border ${subject === v ? 'bg-[#12263f] text-white border-[#12263f]' : 'bg-white border-slate-300 hover:border-slate-400'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1.5">过程中是否另有行贿、受贿或者侵犯公民个人信息等行为？</p>
            <YesNo value={multiCrime} onChange={setMultiCrime} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={evaluate} className="bg-[#12263f] hover:bg-[#1d3a5f] text-white px-8">生成风险评估</Button>
        <Button variant="outline" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" /> 重置</Button>
      </div>

      {/* 结果 */}
      {result && (
        <Card className={`border-2 ${LEVEL_STYLE[result.level].border} ${LEVEL_STYLE[result.level].bg}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${LEVEL_STYLE[result.level].text}`} />
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${LEVEL_STYLE[result.level].text}`}>
                {LEVEL_STYLE[result.level].label}
              </span>
            </div>
            <CardTitle className={LEVEL_STYLE[result.level].text} style={{ fontFamily: SERIF }}>{result.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-slate-700">
              {result.points.map((p, i) => (
                <li key={i} className="flex gap-2"><span className="text-slate-400 shrink-0">·</span><span>{p}</span></li>
              ))}
            </ul>
            <div className="border-t border-slate-200 pt-3">
              <p className="text-sm font-semibold text-[#12263f] flex items-center gap-1 mb-2">
                <FileText className="w-4 h-4" /> 依据原文
              </p>
              <div className="space-y-2">
                {result.citations.map((cid) => {
                  const c = CITATIONS[cid]
                  if (!c) return null
                  return (
                    <blockquote key={cid} className="text-xs bg-white/70 border-l-2 border-[#12263f] p-3 rounded-r">
                      <p className="font-semibold text-slate-700">{c.law} {c.article}（{c.level}）</p>
                      <p className="text-slate-600 mt-1 leading-relaxed">{c.text}</p>
                    </blockquote>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
