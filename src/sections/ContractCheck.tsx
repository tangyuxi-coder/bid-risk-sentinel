import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GitCompareArrows, AlertTriangle, KeyRound, Sparkles } from 'lucide-react'
import { CITATIONS } from '@/data/legal'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

// 实质性条款字段提取：从两段文本中分别提取关键条款，再比对
const FIELDS: { id: string; name: string; regex: RegExp }[] = [
  { id: 'price', name: '合同价款/金额', regex: /[^。；\n]{0,40}(价款|总价|金额|合同额)[^。；\n]{0,10}\d[\d,\.\s]*(万|元)/g },
  { id: 'payment', name: '付款方式与期限', regex: /[^。；\n]{0,30}(货到付款|预付款|进度款|验收后[^。；\n]{0,10}付款|付款期限|付款方式|分期付款)[^。；\n]{0,30}[。；]?/g },
  { id: 'duration', name: '履行期限/工期/交付期', regex: /[^。；\n]{0,30}(工期|履行期限|交付期限|交货期|服务期限|合同期限)[^。；\n]{0,30}[。；]?/g },
  { id: 'warranty', name: '质保/保修', regex: /[^。；\n]{0,30}(质保期|保修期|质量保证|免费保修)[^。；\n]{0,25}[。；]?/g },
  { id: 'breach', name: '违约责任', regex: /[^。；\n]{0,30}(违约金|违约责任|赔偿责任)[^。；\n]{0,30}[。；]?/g },
  { id: 'deposit', name: '履约保证金', regex: /[^。；\n]{0,30}(履约保证金)[^。；\n]{0,25}[。；]?/g },
]

interface FieldDiff {
  name: string
  inBid: string[]
  inContract: string[]
  diverged: boolean
  reason: string
}

function extract(text: string, regex: RegExp): string[] {
  const re = new RegExp(regex.source, regex.flags)
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null && out.length < 4) {
    const s = m[0].trim()
    if (!out.includes(s)) out.push(s)
  }
  return out
}

// 提取数字做粗比对
function nums(texts: string[]): string[] {
  const set = new Set<string>()
  texts.forEach((t) => {
    const m = t.match(/\d[\d,\.\s]*(万|元|天|个月|年|%)/g)
    m?.forEach((x) => set.add(x.replace(/\s/g, '')))
  })
  return Array.from(set)
}

function compare(bid: string, contract: string): FieldDiff[] {
  return FIELDS.map((f) => {
    const inBid = extract(bid, f.regex)
    const inContract = extract(contract, f.regex)
    let diverged = false
    let reason = ''
    if (inContract.length > 0 && inBid.length === 0) {
      diverged = true
      reason = '合同中出现了招标文件中未载明的该类条款，需人工确认是否新增义务。'
    } else if (inBid.length > 0 && inContract.length > 0) {
      const bn = nums(inBid)
      const cn = nums(inContract)
      const missing = cn.filter((x) => !bn.includes(x))
      const gone = bn.filter((x) => !cn.includes(x))
      if (missing.length > 0 || gone.length > 0) {
        diverged = true
        reason = `关键数值不一致：${missing.length ? `合同新增数值 ${missing.join('、')}` : ''}${missing.length && gone.length ? '；' : ''}${gone.length ? `招标文件数值 ${gone.join('、')} 在合同中未找到` : ''}。`
      }
    }
    return { name: f.name, inBid, inContract, diverged, reason }
  })
}

interface AiDivergence { clause: string; bid: string; contract: string; risk: string }

async function callDeepSeekCompare(apiKey: string, bid: string, contract: string): Promise<AiDivergence[]> {
  const prompt = `你是招投标法律合规助手。请比对【招标文件/投标文件实质性条款】与【合同草案】，找出背离实质性内容之处（标的、数量、价款、付款方式、履行期限、质保、违约责任等）。
严格返回 JSON（不要返回其他文字）：{"divergences":[{"clause":"条款类型","bid":"招标文件表述","contract":"合同草案表述","risk":"风险说明"}]}
没有背离则返回 {"divergences":[]}。
【招标文件节选】${bid.slice(0, 7000)}
【合同草案节选】${contract.slice(0, 7000)}`
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.1 }),
  })
  if (!res.ok) throw new Error(`API 返回 ${res.status}`)
  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content ?? ''
  const jm = content.match(/\{[\s\S]*\}/)
  if (!jm) throw new Error('AI 返回内容无法解析')
  return (JSON.parse(jm[0]).divergences || []) as AiDivergence[]
}

export default function ContractCheck() {
  const [bid, setBid] = useState('')
  const [contract, setContract] = useState('')
  const [diffs, setDiffs] = useState<FieldDiff[] | null>(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ds_api_key') || '')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDiffs, setAiDiffs] = useState<AiDivergence[] | null>(null)
  const [aiError, setAiError] = useState('')

  const divergedCount = diffs?.filter((d) => d.diverged).length ?? 0
  const c46 = CITATIONS['zhaobiaofa46']

  const runAi = async () => {
    setAiLoading(true); setAiError(''); setAiDiffs(null)
    try { setAiDiffs(await callDeepSeekCompare(apiKey, bid, contract)) }
    catch (e: any) { setAiError(e.message || '调用失败') }
    finally { setAiLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>中标合同"变脸"检测</h2>
        <p className="text-sm text-slate-500 mt-1">
          中标后甲方发来的合同，付款方式、质保期、违约金还是原来谈的那个吗？将招标文件与合同草案分别粘贴，
          逐类比对实质性条款。《招标投标法》第四十六条：不得订立背离合同实质性内容的协议。
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base" style={{ fontFamily: SERIF }}>① 招标文件（或投标文件）关键条款</CardTitle></CardHeader>
          <CardContent>
            <textarea value={bid} onChange={(e) => setBid(e.target.value)}
              placeholder="粘贴招标文件中关于价款、付款、工期、质保、违约责任的章节……"
              className="w-full h-44 border border-slate-300 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#12263f]/30" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base" style={{ fontFamily: SERIF }}>② 合同草案</CardTitle></CardHeader>
          <CardContent>
            <textarea value={contract} onChange={(e) => setContract(e.target.value)}
              placeholder="粘贴甲方发来的合同草案对应条款……"
              className="w-full h-44 border border-slate-300 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#12263f]/30" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={() => setDiffs(compare(bid, contract))} disabled={!bid.trim() || !contract.trim()}
          className="bg-[#12263f] hover:bg-[#1d3a5f] text-white">
          <GitCompareArrows className="w-4 h-4 mr-1.5" /> 规则引擎比对
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
          <Input type="password" value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); localStorage.setItem('ds_api_key', e.target.value) }}
            placeholder="DeepSeek API Key（可选，语义级比对）" className="text-sm" />
          <Button variant="outline" onClick={runAi} disabled={!bid.trim() || !contract.trim() || !apiKey.trim() || aiLoading}>
            <Sparkles className="w-4 h-4 mr-1.5" /> {aiLoading ? '比对中…' : 'AI 语义比对'}
          </Button>
        </div>
      </div>

      {diffs && (
        <Card className={divergedCount > 0 ? 'border-2 border-red-500' : 'border-2 border-emerald-500'}>
          <CardHeader>
            <CardTitle style={{ fontFamily: SERIF }} className={divergedCount > 0 ? 'text-red-700' : 'text-emerald-700'}>
              {divergedCount > 0 ? `发现 ${divergedCount} 类条款疑似背离，请逐条人工核实` : '未发现关键数值背离'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diffs.map((d, i) => (
              <div key={i} className={`border rounded p-3 ${d.diverged ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${d.diverged ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    {d.diverged ? '疑似背离' : '未见背离'}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{d.name}</span>
                </div>
                {d.inBid.length > 0 && <p className="text-xs text-slate-600 mt-1"><strong>招标文件：</strong>{d.inBid.join(' ｜ ')}</p>}
                {d.inContract.length > 0 && <p className="text-xs text-slate-600 mt-0.5"><strong>合同草案：</strong>{d.inContract.join(' ｜ ')}</p>}
                {d.inBid.length === 0 && d.inContract.length === 0 && <p className="text-xs text-slate-400 mt-1">两段文本中均未定位到该类条款，建议人工补充核对。</p>}
                {d.diverged && <p className="text-xs text-red-700 mt-1.5 flex items-start gap-1"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{d.reason}</p>}
              </div>
            ))}
            {divergedCount > 0 && (
              <blockquote className="text-xs bg-white border-l-2 border-[#12263f] p-3 rounded-r">
                <p className="font-semibold text-slate-700">{c46.law} {c46.article}</p>
                <p className="text-slate-600 mt-1 leading-relaxed">{c46.text}</p>
                <p className="text-slate-500 mt-1">若确认存在实质性背离，签约双方均可能被责令改正并处中标项目金额千分之五以上千分之十以下罚款（第五十九条）。建议拒绝签署背离条款并书面提出。</p>
              </blockquote>
            )}
          </CardContent>
        </Card>
      )}

      {aiError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> AI 比对失败：{aiError}
        </div>
      )}
      {aiDiffs && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader><CardTitle style={{ fontFamily: SERIF }}>AI 语义比对结果（供参考，以人工与规则判断为准）</CardTitle></CardHeader>
          <CardContent>
            {aiDiffs.length === 0 ? <p className="text-sm text-emerald-700">AI 未发现实质性背离。</p> : (
              <div className="space-y-3">
                {aiDiffs.map((d, i) => (
                  <div key={i} className="border border-red-200 bg-red-50 rounded p-3 text-sm">
                    <p className="font-semibold text-red-800">{d.clause}</p>
                    <p className="text-xs text-slate-600 mt-1"><strong>招标文件：</strong>{d.bid}</p>
                    <p className="text-xs text-slate-600 mt-0.5"><strong>合同草案：</strong>{d.contract}</p>
                    <p className="text-xs text-red-700 mt-1">{d.risk}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
