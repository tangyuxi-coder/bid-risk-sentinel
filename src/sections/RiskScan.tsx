import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScanSearch, Sparkles, AlertTriangle, KeyRound } from 'lucide-react'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

export type Severity = 'red' | 'orange' | 'info'

export interface PatternDef {
  id: string
  name: string
  regex: RegExp
  severity: Severity
  law: string
  bidderView: string
  tendererView: string
}

// 规则引擎：排他性/限制性条款模式库（依据招标投标法实施条例第32条、政府采购法实施条例第20条）
const PATTERNS: PatternDef[] = [
  {
    id: 'p1', name: '限定或指定特定品牌/专利/商标/供应商',
    regex: /(指定|标明|限定|推荐|优选|参照|参考)[^。；\n]{0,15}(品牌|商标|专利|供应商|厂家|生产供应者)/g,
    severity: 'red',
    law: '《招标投标法实施条例》第三十二条第（五）项：限定或者指定特定的专利、商标、品牌、原产地或者供应商，属于以不合理条件限制、排斥潜在投标人；《政府采购法实施条例》第二十条第（六）项同旨。',
    bidderView: '投标人视角：可依据《招标投标法》第六十五条提出异议或投诉，主张该条款违法。',
    tendererView: '招标人视角：该条款投诉风险极高，建议改为功能性、性能性描述，不得指向特定产品。',
  },
  {
    id: 'p2', name: '以特定行政区域/行业的业绩、奖项作为加分或中标条件',
    regex: /(本省|本市|本地区|本区|当地|行政区域内|特定行政区域|特定行业)[^。；\n]{0,25}(业绩|奖项|加分|中标)/g,
    severity: 'red',
    law: '《招标投标法实施条例》第三十二条第（三）项：依法必须进行招标的项目以特定行政区域或者特定行业的业绩、奖项作为加分条件或者中标条件，属于以不合理条件限制、排斥潜在投标人；《政府采购法实施条例》第二十条第（四）项同旨。',
    bidderView: '投标人视角：外地企业被此条款排除的，可提异议/投诉，实践中此类投诉成立率高。',
    tendererView: '招标人视角：地方保护型条款是监管查处重点，建议删除地域限定。',
  },
  {
    id: 'p3', name: '限定所有制形式或组织形式',
    regex: /(国有企业|国有控股|事业单位|集体企业|股份制)[^。；\n]{0,15}(优先|仅限|限制|方可)/g,
    severity: 'red',
    law: '《招标投标法实施条例》第三十二条第（六）项：非法限定潜在投标人或者投标人的所有制形式或者组织形式；《政府采购法实施条例》第二十条第（七）项同旨。',
    bidderView: '投标人视角：民营/外资企业被排除的可提异议投诉。',
    tendererView: '招标人视角：所有制限定属于红线条款，建议立即删除。',
  },
  {
    id: 'p4', name: '注册资本/资金门槛可能与项目需要不相适应',
    regex: /(注册资本|注册资金|实缴资本)[^。；\n]{0,15}\d+[\s]*万/g,
    severity: 'orange',
    law: '《招标投标法实施条例》第三十二条第（二）项：设定的资格、技术、商务条件与招标项目的具体特点和实际需要不相适应或者与合同履行无关的，属于以不合理条件限制、排斥潜在投标人。注册资本门槛是否必要需结合项目规模判断。',
    bidderView: '投标人视角：若门槛明显超出项目实际需要，可主张其构成排斥性条件。',
    tendererView: '招标人视角：建议论证门槛与项目规模的匹配性，或改用履约能力指标。',
  },
  {
    id: 'p5', name: '以特定认证/资质作为加分或资格条件',
    regex: /(ISO\d+|体系认证|行业资质|协会资质)[^。；\n]{0,15}(加分|资格|必备|须具备)/g,
    severity: 'orange',
    law: '同上（实施条例第三十二条第（二）项）。认证/资质要求须与合同履行相关，否则构成排斥性条件。',
    bidderView: '投标人视角：与履约无关的认证加分可质疑。',
    tendererView: '招标人视角：保留与履约直接相关的资质，删除装饰性加分。',
  },
  {
    id: 'p6', name: '废标/否决投标/实质性条款定位（提示，非违规）',
    regex: /(无效投标|废标|否决投标|实质性条款|实质性要求|★)/g,
    severity: 'info',
    law: '此类条款决定投标文件的生死，本身合法，但需逐条核对响应。',
    bidderView: '投标人视角：逐条对照，任何一条未响应即可能被否决投标。',
    tendererView: '招标人视角：实质性条款应清晰标注，避免争议。',
  },
]

export interface Finding {
  pattern: PatternDef
  excerpt: string
  index: number
}

const SEV_STYLE: Record<Severity, { label: string; cls: string; bar: string }> = {
  red: { label: '高风险', cls: 'text-red-700 bg-red-50 border-red-300', bar: 'bg-red-600' },
  orange: { label: '存疑', cls: 'text-orange-700 bg-orange-50 border-orange-300', bar: 'bg-orange-500' },
  info: { label: '提示', cls: 'text-slate-600 bg-slate-50 border-slate-300', bar: 'bg-slate-400' },
}

export function runRuleScan(text: string): Finding[] {
  const findings: Finding[] = []
  for (const p of PATTERNS) {
    const re = new RegExp(p.regex.source, p.regex.flags)
    let m: RegExpExecArray | null
    let count = 0
    while ((m = re.exec(text)) !== null && count < 5) {
      const start = Math.max(0, m.index - 30)
      const end = Math.min(text.length, m.index + m[0].length + 30)
      findings.push({ pattern: p, excerpt: text.slice(start, end).replace(/\s+/g, ' '), index: m.index })
      count++
    }
  }
  return findings.sort((a, b) => a.index - b.index)
}

// ---------- DeepSeek 深度解析 ----------

interface AiResult {
  feibiao: string[]
  paixing: string[]
  zizhi: string[]
  baozhengjin: string
  qianzhang: string[]
}

async function callDeepSeek(apiKey: string, text: string): Promise<AiResult> {
  const prompt = `你是招投标合规分析助手。请阅读以下招标文件节选，提取关键信息，严格返回 JSON（不要返回任何其他文字）：
{
  "feibiao": ["废标条款/否决投标条款清单，逐条摘录原文要点"],
  "paixing": ["疑似排他性/倾向性条款，逐条摘录"],
  "zizhi": ["投标人资格条件清单"],
  "baozhengjin": "投标保证金金额、形式、递交截止时间（无则填'未提及'）",
  "qianzhang": ["签字、盖章、密封、份数等封装要求清单"]
}
招标文件节选：
${text.slice(0, 15000)}`
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  })
  if (!res.ok) throw new Error(`API 返回 ${res.status}：${await res.text().then((t) => t.slice(0, 200))}`)
  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content ?? ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回内容无法解析为 JSON')
  return JSON.parse(jsonMatch[0]) as AiResult
}

// 从哨兵助手接力过来的文件文本（一次性读取）
function takeHandoff(): string {
  try {
    const t = localStorage.getItem('assistant_handoff')
    if (t) localStorage.removeItem('assistant_handoff')
    return t || ''
  } catch {
    return ''
  }
}

export default function RiskScan() {
  const [handoff] = useState(takeHandoff)
  const [text, setText] = useState(handoff)
  const [scanned, setScanned] = useState(!!handoff)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ds_api_key') || '')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [aiError, setAiError] = useState('')

  const findings = useMemo(() => (scanned && text.trim() ? runRuleScan(text) : []), [scanned, text])
  const counts = useMemo(() => ({
    red: findings.filter((f) => f.pattern.severity === 'red').length,
    orange: findings.filter((f) => f.pattern.severity === 'orange').length,
    info: findings.filter((f) => f.pattern.severity === 'info').length,
  }), [findings])

  const saveKey = (k: string) => {
    setApiKey(k)
    localStorage.setItem('ds_api_key', k)
  }

  const runAi = async () => {
    setAiLoading(true); setAiError(''); setAiResult(null)
    try {
      setAiResult(await callDeepSeek(apiKey, text))
    } catch (e: any) {
      setAiError(e.message || '调用失败')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>标前排雷扫描</h2>
        <p className="text-sm text-slate-500 mt-1">
          粘贴招标文件全文或关键章节。第一层：规则引擎本地扫描排他性/限制性条款（零成本、数据不出浏览器）；
          第二层（可选）：填入你自己的 DeepSeek API Key 做深度解析。判断由规则引擎完成，AI 只负责提取信息。
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setScanned(false); setAiResult(null) }}
            placeholder="在此粘贴招标文件文本……（文本仅在你本地浏览器中处理；未填 API Key 时不会发送给任何服务器）"
            className="w-full h-48 border border-slate-300 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#12263f]/30"
          />
          <div className="flex flex-wrap gap-3 items-center">
            <Button
              onClick={() => setScanned(true)}
              disabled={!text.trim()}
              className="bg-[#12263f] hover:bg-[#1d3a5f] text-white"
            >
              <ScanSearch className="w-4 h-4 mr-1.5" /> 规则引擎快速扫描
            </Button>
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => saveKey(e.target.value)}
                placeholder="DeepSeek API Key（仅存于本地浏览器）"
                className="text-sm"
              />
              <Button variant="outline" onClick={runAi} disabled={!text.trim() || !apiKey.trim() || aiLoading}>
                <Sparkles className="w-4 h-4 mr-1.5" /> {aiLoading ? '解析中…' : 'AI 深度解析'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 规则扫描结果 */}
      {scanned && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: SERIF }}>规则引擎扫描结果</CardTitle>
            <div className="flex gap-3 text-sm">
              <span className="text-red-700 font-semibold">高风险 {counts.red}</span>
              <span className="text-orange-600 font-semibold">存疑 {counts.orange}</span>
              <span className="text-slate-500">提示 {counts.info}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {findings.length === 0 && (
              <p className="text-sm text-slate-500">未命中内置模式库。注意：规则引擎只能发现已知模式，不能排除所有风险。</p>
            )}
            {findings.map((f, i) => {
              const s = SEV_STYLE[f.pattern.severity]
              return (
                <div key={i} className={`border rounded p-3 ${s.cls}`}>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-xs font-bold text-white px-2 py-0.5 rounded ${s.bar}`}>{s.label}</span>
                    <span className="text-sm font-semibold">{f.pattern.name}</span>
                  </div>
                  <p className="text-xs bg-white/70 rounded px-2 py-1.5 mb-2 text-slate-600">……{f.excerpt}……</p>
                  <p className="text-xs leading-relaxed">{f.pattern.law}</p>
                  <p className="text-xs mt-1">{f.pattern.bidderView}</p>
                  <p className="text-xs">{f.pattern.tendererView}</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* AI 解析结果 */}
      {aiError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> AI 解析失败：{aiError}
        </div>
      )}
      {aiResult && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle style={{ fontFamily: SERIF }}>AI 深度解析结果（提取信息由 AI 完成，合规判断请以上方规则引擎为准）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {([
              ['废标/否决投标条款', aiResult.feibiao],
              ['疑似排他性条款', aiResult.paixing],
              ['投标人资格条件', aiResult.zizhi],
              ['签字盖章密封封装要求', aiResult.qianzhang],
            ] as const).map(([title, arr]) => (
              <div key={title}>
                <p className="font-semibold text-[#12263f] mb-1">{title}</p>
                {arr && arr.length > 0 ? (
                  <ul className="list-disc list-inside text-slate-700 space-y-1">
                    {arr.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                ) : <p className="text-slate-400 text-xs">未提取到</p>}
              </div>
            ))}
            <div>
              <p className="font-semibold text-[#12263f] mb-1">投标保证金</p>
              <p className="text-slate-700">{aiResult.baozhengjin || '未提及'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
