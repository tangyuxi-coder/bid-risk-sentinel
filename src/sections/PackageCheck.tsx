import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PackageCheck as PkgIcon, Plus, RotateCcw, ScanSearch } from 'lucide-react'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

interface CheckItem {
  id: string
  text: string
  source: 'auto' | 'manual'
  done: boolean
}

// 封装要求关键词：从招标文件中定位相关句子
const EXTRACT_RE = /[^。；\n]{0,60}(签字|签名|盖章|公章|骑缝章|密封|正本|副本|份数|壹份|两份|保证金|截止时间|递交|送达|电子投标文件|U盘|光盘|法定代表人|授权委托)[^。；\n]{0,60}[。；]?/g

const DEFAULT_ITEMS = [
  '法定代表人或授权代表已在所有要求位置签字',
  '公章已加盖在所有要求位置（含骑缝章）',
  '正本、副本份数符合招标文件要求',
  '密封方式与封皮格式符合招标文件要求',
  '投标保证金已按要求递交并附凭证',
  '投标文件在截止时间前送达/上传',
]

export default function PackageCheck() {
  const [text, setText] = useState('')
  const [items, setItems] = useState<CheckItem[]>([])
  const [manual, setManual] = useState('')
  const [generated, setGenerated] = useState(false)

  const generate = () => {
    const found: CheckItem[] = []
    const re = new RegExp(EXTRACT_RE.source, EXTRACT_RE.flags)
    let m: RegExpExecArray | null
    const seen = new Set<string>()
    while ((m = re.exec(text)) !== null && found.length < 20) {
      const s = m[0].trim()
      const key = s.slice(0, 25)
      if (!seen.has(key) && s.length > 8) {
        seen.add(key)
        found.push({ id: `a${found.length}`, text: s, source: 'auto', done: false })
      }
    }
    const defaults: CheckItem[] = DEFAULT_ITEMS.map((t, i) => ({ id: `d${i}`, text: t, source: 'manual', done: false }))
    setItems([...found, ...defaults])
    setGenerated(true)
  }

  const toggle = (id: string) =>
    setItems((p) => p.map((it) => (it.id === id ? { ...it, done: !it.done } : it)))

  const addManual = () => {
    if (!manual.trim()) return
    setItems((p) => [...p, { id: `m${Date.now()}`, text: manual.trim(), source: 'manual', done: false }])
    setManual('')
  }

  const doneCount = items.filter((i) => i.done).length
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0

  const autoItems = useMemo(() => items.filter((i) => i.source === 'auto'), [items])
  const stdItems = useMemo(() => items.filter((i) => i.source !== 'auto' || false), [items])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>封装前"最后一公里"清单</h2>
        <p className="text-sm text-slate-500 mt-1">
          一个漏盖的骑缝章 = 几周心血白费。粘贴招标文件，规则引擎自动提取签字/盖章/密封/份数/保证金等封装要求，
          加上通用核对项，生成可逐项打勾的清单。
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="粘贴招标文件中关于投标文件编制/封装/递交的章节（或全文）……文本仅在本地处理。"
            className="w-full h-40 border border-slate-300 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#12263f]/30"
          />
          <div className="flex gap-3">
            <Button onClick={generate} disabled={!text.trim()} className="bg-[#12263f] hover:bg-[#1d3a5f] text-white">
              <ScanSearch className="w-4 h-4 mr-1.5" /> 生成封装清单
            </Button>
            {generated && (
              <Button variant="outline" onClick={() => { setItems([]); setGenerated(false) }}>
                <RotateCcw className="w-4 h-4 mr-1" /> 重来
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {generated && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: SERIF }} className="flex items-center gap-2">
              <PkgIcon className="w-5 h-5" /> 封装核对清单
            </CardTitle>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>完成进度</span><span>{doneCount}/{items.length}（{pct}%）</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-600' : 'bg-[#12263f]'}`} style={{ width: `${pct}%` }} />
              </div>
              {pct === 100 && <p className="text-emerald-700 text-sm font-semibold mt-2">全部核对完毕，可以封装。</p>}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {autoItems.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-[#12263f] mb-2">从招标文件提取的要求（请逐条核对原文）</p>
                <div className="space-y-1.5">
                  {autoItems.map((it) => (
                    <label key={it.id} className={`flex items-start gap-2 text-sm cursor-pointer rounded p-1.5 ${it.done ? 'bg-emerald-50 text-slate-400 line-through' : 'bg-amber-50/60 text-slate-700'}`}>
                      <input type="checkbox" checked={it.done} onChange={() => toggle(it.id)} className="mt-1 accent-[#12263f]" />
                      <span>{it.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-[#12263f] mb-2">通用核对项</p>
              <div className="space-y-1.5">
                {stdItems.map((it) => (
                  <label key={it.id} className={`flex items-start gap-2 text-sm cursor-pointer rounded p-1.5 ${it.done ? 'bg-emerald-50 text-slate-400 line-through' : 'text-slate-700'}`}>
                    <input type="checkbox" checked={it.done} onChange={() => toggle(it.id)} className="mt-1 accent-[#12263f]" />
                    <span>{it.text}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="手动添加核对项……" className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addManual()} />
              <Button variant="outline" onClick={addManual}><Plus className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
