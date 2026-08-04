import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Paperclip, SendHorizonal, Eraser } from 'lucide-react'
import { runRuleScan, type Severity } from '@/sections/RiskScan'
import { extractPackingItems } from '@/sections/PackageCheck'
import { parseFile } from '@/lib/fileparse'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

// ---------- 类型 ----------

type IntentId =
  | 'risk_scan' | 'packing_list' | 'deadline' | 'collusion'
  | 'contract' | 'law' | 'calc' | 'criminal' | 'board' | 'unknown'

interface ActionDesc {
  label: string
  tab?: string
  intent?: IntentId
}

interface ScanTopItem {
  name: string
  severity: Severity
  excerpt: string
}

interface ChatMsg {
  id: number
  role: 'user' | 'assistant'
  kind: 'text' | 'scan' | 'packing'
  text: string
  scan?: { red: number; orange: number; info: number; top: ScanTopItem[]; fileName?: string }
  packing?: { items: string[]; fileName?: string }
  actions?: ActionDesc[]
}

// ---------- 意图识别（确定性本地规则，不依赖大模型） ----------

const INTENT_RULES: { id: IntentId; keys: string[]; tab: string | null; label: string }[] = [
  { id: 'collusion', keys: ['围标', '串标', '串通', 'dna', 'DNA', '多份标书', '几家投标'], tab: 'collusion', label: '围标DNA检测' },
  { id: 'contract', keys: ['合同变脸', '实质性条款', '背离', '合同比对', '合同对比'], tab: 'contract', label: '合同变脸检测' },
  { id: 'criminal', keys: ['刑事', '犯罪', '串通投标罪', '坐牢', '自首', '立案标准'], tab: 'criminal', label: '刑事风险自测' },
  { id: 'packing_list', keys: ['封装', '清单', '签字', '盖章', '密封', '份数', '骑缝'], tab: 'package', label: '封装清单' },
  { id: 'deadline', keys: ['期限', '异议期', '质疑期', '投诉期', '还剩几天', '截止', '倒推'], tab: 'deadline', label: '期限计算器' },
  { id: 'calc', keys: ['数额', '直接经济损失', '违法所得', '赔偿', '金额'], tab: 'calc', label: '数额计算器' },
  { id: 'law', keys: ['法条', '检索', '法规', '条文', '法律库'], tab: 'lawsearch', label: '法律库检索' },
  { id: 'board', keys: ['看板', '台账', '倒计时', '推送'], tab: 'board', label: '项目看板' },
  { id: 'risk_scan', keys: ['排雷', '扫描', '排他', '倾向', '废标', '限制性', '门槛', '检查', '坑'], tab: 'riskscan', label: '排雷扫描' },
]

function detectIntent(input: string): IntentId {
  let best: IntentId = 'unknown'
  let bestScore = 0
  for (const rule of INTENT_RULES) {
    const score = rule.keys.reduce((acc, k) => acc + (input.includes(k) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = rule.id
    }
  }
  return best
}

const RULE_BY_ID = new Map(INTENT_RULES.map((r) => [r.id, r]))

// ---------- 持久化 ----------

const MSG_KEY = 'assistant_messages'
const DOC_KEY = 'assistant_doc'

function loadMessages(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(MSG_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.slice(-60) : []
  } catch {
    return []
  }
}

const WELCOME: ChatMsg = {
  id: 0,
  role: 'assistant',
  kind: 'text',
  text: '你好，我是哨兵助手。用一句话告诉我你要做什么，或直接上传招标文件——我会调用规则引擎完成扫描、提取和计算，并给出下一步建议。',
  actions: [
    { label: '扫描招标文件的风险点', intent: 'risk_scan' },
    { label: '生成封装清单', intent: 'packing_list' },
    { label: '计算异议期还剩几天', tab: 'deadline' },
    { label: '检测多份标书是否围标', tab: 'collusion' },
    { label: '比对招标文件与合同', tab: 'contract' },
    { label: '检索法律条文', tab: 'lawsearch' },
  ],
}

const SEV_LABEL: Record<Severity, string> = { red: '高风险', orange: '存疑', info: '提示' }
const SEV_BAR: Record<Severity, string> = { red: 'bg-red-600', orange: 'bg-orange-500', info: 'bg-slate-400' }
const SEV_TEXT: Record<Severity, string> = { red: 'text-red-700', orange: 'text-orange-700', info: 'text-slate-500' }

// ---------- 组件 ----------

export default function Assistant({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>(loadMessages)
  const [input, setInput] = useState('')
  const [doc, setDoc] = useState<{ name: string; text: string } | null>(() => {
    try {
      const t = localStorage.getItem(DOC_KEY)
      const n = localStorage.getItem(DOC_KEY + '_name')
      return t ? { name: n || '已保存的文档', text: t } : null
    } catch {
      return null
    }
  })
  const [pending, setPending] = useState<IntentId | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(Date.now())

  const shown = messages.length ? messages : [WELCOME]

  useEffect(() => {
    try {
      localStorage.setItem(MSG_KEY, JSON.stringify(messages.slice(-60)))
    } catch {
      /* 存储超限时静默失败 */
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const push = (m: Omit<ChatMsg, 'id'>) => {
    idRef.current += 1
    setMessages((prev) => [...prev.slice(-59), { ...m, id: idRef.current }])
  }

  const saveDoc = (name: string, text: string) => {
    const clipped = text.slice(0, 400000)
    setDoc({ name, text: clipped })
    try {
      localStorage.setItem(DOC_KEY, clipped)
      localStorage.setItem(DOC_KEY + '_name', name)
    } catch {
      /* 文档过大时仅存内存 */
    }
  }

  const goWithDoc = (tab: string) => {
    if (doc) {
      try {
        localStorage.setItem('assistant_handoff', doc.text)
      } catch {
        /* 忽略 */
      }
    }
    onNavigate(tab)
  }

  // ---------- 核心动作 ----------

  const runScan = (text: string, fileName?: string) => {
    const findings = runRuleScan(text)
    const red = findings.filter((f) => f.pattern.severity === 'red').length
    const orange = findings.filter((f) => f.pattern.severity === 'orange').length
    const info = findings.filter((f) => f.pattern.severity === 'info').length
    const top: ScanTopItem[] = findings.slice(0, 3).map((f) => ({
      name: f.pattern.name,
      severity: f.pattern.severity,
      excerpt: f.excerpt,
    }))
    const total = red + orange
    push({
      role: 'assistant',
      kind: 'scan',
      text: total > 0
        ? `扫描完成。共命中 ${total} 项需关注条款（高风险 ${red} 项、存疑 ${orange} 项），另有 ${info} 处实质性条款提示。以下是最值得优先处理的问题：`
        : '扫描完成。未发现明显的排他性或限制性条款。仍建议人工复核实质性条款与封装要求。',
      scan: { red, orange, info, top, fileName },
      actions: [
        { label: '查看完整排雷报告', tab: 'riskscan' },
        { label: '继续生成封装清单', intent: 'packing_list' },
        { label: '计算关键期限', tab: 'deadline' },
      ],
    })
    setPending(null)
  }

  const runPacking = (text: string, fileName?: string) => {
    const items = extractPackingItems(text)
    push({
      role: 'assistant',
      kind: 'packing',
      text: items.length > 0
        ? `已从文件中提取 ${items.length} 条封装相关要求。签字、盖章、密封、份数任何一项遗漏都可能导致否决投标，建议逐项核对：`
        : '未能在文件中定位到明确的封装要求条款。建议人工检索"签字/盖章/密封"等关键词复核。',
      packing: { items, fileName },
      actions: [
        { label: '打开封装清单逐项打勾', tab: 'package' },
        { label: '进行排雷扫描', intent: 'risk_scan' },
        { label: '计算关键期限', tab: 'deadline' },
      ],
    })
    setPending(null)
  }

  const needDoc = (intent: IntentId) => {
    const label = RULE_BY_ID.get(intent)?.label ?? ''
    setPending(intent)
    push({
      role: 'assistant',
      kind: 'text',
      text: `可以。请上传招标文件（支持 PDF / DOCX / TXT），或直接把文件全文粘贴给我，我会立即执行${label}。`,
    })
  }

  const runDocIntent = (intent: IntentId, text: string, fileName?: string) => {
    if (intent === 'packing_list') runPacking(text, fileName)
    else runScan(text, fileName)
  }

  const handleSend = () => {
    const value = input.trim()
    if (!value || busy) return
    setInput('')
    push({ role: 'user', kind: 'text', text: value.length > 300 ? value.slice(0, 300) + '……' : value })

    // 长文本视为文件全文
    if (value.length > 200) {
      saveDoc('粘贴的文本', value)
      const intent = pending && pending !== 'unknown' ? pending : 'risk_scan'
      runDocIntent(intent, value)
      return
    }

    const intent = detectIntent(value)

    if (intent === 'risk_scan' || intent === 'packing_list') {
      if (doc) runDocIntent(intent, doc.text, doc.name)
      else needDoc(intent)
      return
    }

    if (intent === 'unknown') {
      push({
        role: 'assistant',
        kind: 'text',
        text: '我没有理解这条指令。我目前可以执行：排雷扫描、封装清单、期限计算、围标检测、合同比对、法律检索、数额计算、刑事风险自测。你可以换一种说法，或点击下方快捷指令。',
        actions: [
          { label: '扫描招标文件的风险点', intent: 'risk_scan' },
          { label: '生成封装清单', intent: 'packing_list' },
          { label: '检索法律条文', tab: 'lawsearch' },
        ],
      })
      return
    }

    const rule = RULE_BY_ID.get(intent)
    if (rule?.tab) {
      push({
        role: 'assistant',
        kind: 'text',
        text: `已为你准备好「${rule.label}」。点击下方按钮进入，完成后可以随时回到这里继续。`,
        actions: [{ label: `打开${rule.label}`, tab: rule.tab }],
      })
    }
  }

  const handleFile = async (file: File) => {
    if (busy) return
    setBusy(true)
    push({ role: 'user', kind: 'text', text: `上传文件：${file.name}` })
    try {
      const parsed = await parseFile(file)
      if (parsed.error || !parsed.text.trim()) {
        push({ role: 'assistant', kind: 'text', text: `文件解析失败：${parsed.error || '未提取到文本'}。请确认文件未加密，或改用复制粘贴的方式提供文本。` })
      } else {
        saveDoc(parsed.name, parsed.text)
        const intent = pending && pending !== 'unknown' ? pending : 'risk_scan'
        runDocIntent(intent, parsed.text, parsed.name)
      }
    } catch {
      push({ role: 'assistant', kind: 'text', text: '文件解析出现异常。请尝试转换为 DOCX 或 TXT 后重新上传，或直接粘贴文本。' })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleAction = (a: ActionDesc) => {
    if (a.tab) {
      goWithDoc(a.tab)
      return
    }
    if (a.intent === 'risk_scan' || a.intent === 'packing_list') {
      push({ role: 'user', kind: 'text', text: a.label })
      if (doc) runDocIntent(a.intent, doc.text, doc.name)
      else needDoc(a.intent)
    }
  }

  const clearChat = () => {
    setMessages([])
    setPending(null)
    try {
      localStorage.removeItem(MSG_KEY)
    } catch {
      /* 忽略 */
    }
  }

  // ---------- 渲染 ----------

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>哨兵助手</h2>
          <p className="text-sm text-slate-500 mt-1">
            一句话下达指令，规则引擎自动执行。文件全程在浏览器本地解析，不出本机。
            {doc && <span className="ml-2 text-slate-400">当前文档：{doc.name}</span>}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} className="text-slate-400 hover:text-slate-600">
          <Eraser className="w-4 h-4 mr-1" />
          清空对话
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-5 max-h-[560px] overflow-y-auto pr-1">
            {shown.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                {m.role === 'user' ? (
                  <div className="max-w-[85%] bg-[#12263f] text-white text-sm leading-relaxed px-4 py-2.5 rounded-lg rounded-br-sm whitespace-pre-wrap">
                    {m.text}
                  </div>
                ) : (
                  <div className="max-w-[92%] border-l-2 border-amber-400/70 pl-4 space-y-3">
                    <p className="text-[11px] tracking-widest text-slate-400 font-medium">哨兵助手</p>
                    <p className="text-sm leading-relaxed text-slate-700">{m.text}</p>

                    {m.kind === 'scan' && m.scan && (
                      <div className="border border-slate-200 rounded-md divide-y divide-slate-100 bg-white">
                        <div className="flex gap-4 px-3 py-2 text-xs">
                          <span className={SEV_TEXT.red}>高风险 {m.scan.red}</span>
                          <span className={SEV_TEXT.orange}>存疑 {m.scan.orange}</span>
                          <span className={SEV_TEXT.info}>提示 {m.scan.info}</span>
                          {m.scan.fileName && <span className="ml-auto text-slate-400 truncate max-w-[40%]">{m.scan.fileName}</span>}
                        </div>
                        {m.scan.top.map((t, i) => (
                          <div key={i} className="flex gap-3 px-3 py-2.5">
                            <span className={`mt-1.5 h-8 w-1 rounded-full shrink-0 ${SEV_BAR[t.severity]}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">
                                <span className={`mr-2 text-xs font-normal ${SEV_TEXT[t.severity]}`}>{SEV_LABEL[t.severity]}</span>
                                {t.name}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">原文摘录：{t.excerpt}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.kind === 'packing' && m.packing && m.packing.items.length > 0 && (
                      <ol className="border border-slate-200 rounded-md divide-y divide-slate-100 bg-white list-none">
                        {m.packing.items.slice(0, 8).map((it, i) => (
                          <li key={i} className="flex gap-3 px-3 py-2 text-sm text-slate-700">
                            <span className="text-slate-400 text-xs mt-0.5 w-5 shrink-0 text-right">{i + 1}</span>
                            <span className="leading-relaxed">{it}</span>
                          </li>
                        ))}
                        {m.packing.items.length > 8 && (
                          <li className="px-3 py-2 text-xs text-slate-400">其余 {m.packing.items.length - 8} 条请在完整清单中查看</li>
                        )}
                      </ol>
                    )}

                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {m.actions.map((a, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(a)}
                            className="border-slate-300 text-[#12263f] hover:bg-[#12263f] hover:text-white text-xs"
                          >
                            {a.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 输入区 */}
          <div className="mt-5 border border-slate-300 rounded-lg bg-white focus-within:border-[#12263f] focus-within:ring-1 focus-within:ring-[#12263f]/20 transition-shadow">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={pending ? '请粘贴文件全文，或点击左侧回形针上传文件' : '输入指令，例如：帮我看看这份招标文件有没有排他性条款'}
              rows={2}
              className="w-full resize-none rounded-t-lg px-3 pt-3 pb-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="p-2 text-slate-400 hover:text-[#12263f] transition-colors disabled:opacity-40"
                title="上传文件（PDF / DOCX / TXT）"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={busy || !input.trim()}
                className="bg-[#12263f] hover:bg-[#1b3a5f] text-white"
              >
                {busy ? '解析中…' : '发送'}
                <SendHorizonal className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            意图识别与规则引擎均在本地运行；Enter 发送，Shift+Enter 换行。助手的定性结论由写死在代码里的法条规则得出，可追溯、可复核。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
