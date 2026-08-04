import { useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadCloud, FileText, Trash2, AlertTriangle, Dna } from 'lucide-react'
import { parseFile, shingleSet, jaccard, type ParsedFile } from '@/lib/fileparse'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

interface PairResult {
  a: number
  b: number
  sim: number
  flags: string[]
  level: 'red' | 'orange' | 'green'
}

function parseDate(s: string): number | null {
  const t = Date.parse(s)
  return isNaN(t) ? null : t
}

export default function CollusionCheck() {
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [loading, setLoading] = useState<string[]>([])
  const [quotes, setQuotes] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = async (list: FileList | null) => {
    if (!list) return
    for (const f of Array.from(list)) {
      setLoading((p) => [...p, f.name])
      const parsed = await parseFile(f)
      setFiles((p) => [...p.filter((x) => x.name !== f.name), parsed])
      setLoading((p) => p.filter((x) => x !== f.name))
    }
  }

  const removeFile = (name: string) => setFiles((p) => p.filter((f) => f.name !== name))

  // ---------- 两两比对 ----------
  const pairs: PairResult[] = useMemo(() => {
    const valid = files.filter((f) => !f.error && f.text.length > 50)
    const sets = valid.map((f) => shingleSet(f.text))
    const out: PairResult[] = []
    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const sim = jaccard(sets[i], sets[j])
        const flags: string[] = []
        const ma = valid[i].meta, mb = valid[j].meta
        if (ma && mb) {
          if (ma.author && ma.author === mb.author) flags.push(`创建者相同（${ma.author}）`)
          if (ma.lastModifiedBy && ma.lastModifiedBy === mb.lastModifiedBy) flags.push(`最后修改人相同（${ma.lastModifiedBy}）`)
          if (ma.company && ma.company === mb.company) flags.push(`公司署名相同（${ma.company}）`)
          const ca = parseDate(ma.created), cb = parseDate(mb.created)
          if (ca && cb && Math.abs(ca - cb) < 10 * 60 * 1000) flags.push('文件创建时间相差不足 10 分钟')
        }
        const pct = sim * 100
        let level: PairResult['level'] = 'green'
        if (pct >= 30 || (pct >= 10 && flags.length >= 2)) level = 'red'
        else if (pct >= 10 || flags.length > 0) level = 'orange'
        out.push({ a: i, b: j, sim: pct, flags, level })
      }
    }
    return out.sort((x, y) => y.sim - x.sim)
  }, [files])

  // ---------- 报价规律分析 ----------
  const quoteAnalysis = useMemo(() => {
    const rows = quotes.split('\n')
      .map((l) => {
        const m = l.match(/^\s*(.+?)[\s,，]+([\d.]+)\s*(万|万元|元)?\s*$/)
        return m ? { name: m[1], value: parseFloat(m[2]) * (m[3] === '元' ? 0.0001 : 1) } : null
      })
      .filter((x): x is { name: string; value: number } => !!x && x.value > 0)
      .sort((x, y) => x.value - y.value)
    if (rows.length < 3) return null
    const diffs = rows.slice(1).map((r, i) => r.value - rows[i].value)
    const ratios = rows.slice(1).map((r, i) => r.value / rows[i].value)
    const avgD = diffs.reduce((a, b) => a + b, 0) / diffs.length
    const isArithmetic = avgD > 0 && diffs.every((d) => Math.abs(d - avgD) / avgD < 0.05)
    const avgR = ratios.reduce((a, b) => a + b, 0) / ratios.length
    const isGeometric = ratios.every((r) => Math.abs(r - avgR) / avgR < 0.01)
    return { rows, isArithmetic, isGeometric, avgD, avgR }
  }, [quotes])

  const validFiles = files.filter((f) => !f.error && f.text.length > 50)
  const redPairs = pairs.filter((p) => p.level === 'red')
  const LEVEL_CLS = {
    red: 'bg-red-50 border-red-300 text-red-800',
    orange: 'bg-orange-50 border-orange-300 text-orange-800',
    green: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>围标串标 DNA 检测</h2>
        <p className="text-sm text-slate-500 mt-1">
          上传多份投标文件（docx / pdf / txt），从三个维度找"同一双手"的痕迹：<strong>文档元数据取证</strong>（创建者、修改人、公司、创建时间）、
          <strong>文本指纹比对</strong>（内容异常一致度）、<strong>报价规律性差异</strong>。
          全程本地运行，文件不上传任何服务器。法律依据：《招标投标法实施条例》第四十条"视为投标人相互串通投标"。
        </p>
      </div>

      {/* 上传区 */}
      <Card>
        <CardContent className="pt-4">
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#12263f] hover:bg-slate-50 transition-colors"
          >
            <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600">点击选择或批量拖入多份投标文件</p>
            <p className="text-xs text-slate-400 mt-1">docx 可读元数据（取证信息最全）；pdf / txt 仅文本比对</p>
            <input ref={inputRef} type="file" multiple accept=".docx,.pdf,.txt,.md" className="hidden"
              onChange={(e) => addFiles(e.target.files)} />
          </div>
          {loading.length > 0 && <p className="text-sm text-slate-500 mt-2">解析中：{loading.join('、')}……</p>}
        </CardContent>
      </Card>

      {/* 文件取证卡 */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: SERIF }}>已解析 {files.length} 份文件 · 元数据取证</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((f) => (
              <div key={f.name} className="border border-slate-200 rounded p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#12263f]" /> {f.name}
                  </p>
                  <button onClick={() => removeFile(f.name)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
                {f.error ? (
                  <p className="text-xs text-red-600 mt-1">{f.error}</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                    <span>创建者：<strong>{f.meta?.author || '—'}</strong></span>
                    <span>最后修改人：<strong>{f.meta?.lastModifiedBy || '—'}</strong></span>
                    <span>公司署名：<strong>{f.meta?.company || '—'}</strong></span>
                    <span>总编辑时长：<strong>{f.meta?.totalEditMinutes ? `${f.meta.totalEditMinutes} 分钟` : '—'}</strong></span>
                    <span>创建时间：<strong>{f.meta?.created ? new Date(f.meta.created).toLocaleString('zh-CN') : '—'}</strong></span>
                    <span>修改时间：<strong>{f.meta?.modified ? new Date(f.meta.modified).toLocaleString('zh-CN') : '—'}</strong></span>
                    <span>编辑器：<strong>{f.meta?.application || '—'}</strong></span>
                    <span>文本量：<strong>{f.text.length.toLocaleString()} 字</strong></span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 两两比对矩阵 */}
      {pairs.length > 0 && (
        <Card className={redPairs.length > 0 ? 'border-2 border-red-500' : ''}>
          <CardHeader>
            <CardTitle style={{ fontFamily: SERIF }} className={redPairs.length > 0 ? 'text-red-700' : ''}>
              两两比对结果{redPairs.length > 0 ? ` · ${redPairs.length} 对高度疑似` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pairs.map((p, i) => (
              <div key={i} className={`border rounded p-3 ${LEVEL_CLS[p.level]}`}>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <p className="text-sm font-semibold">{validFiles[p.a].name} × {validFiles[p.b].name}</p>
                  <p className="text-sm font-bold">文本相似度 {p.sim.toFixed(1)}%</p>
                </div>
                {p.flags.length > 0 && (
                  <ul className="text-xs mt-1.5 space-y-0.5">
                    {p.flags.map((fl, k) => <li key={k} className="flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{fl}</li>)}
                  </ul>
                )}
                {p.level === 'red' && <p className="text-xs mt-1.5 font-semibold">符合《招标投标法实施条例》第四十条第（一）（四）项"视为串通投标"的线索特征，建议重点排查。</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 报价规律 */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: SERIF }} className="flex items-center gap-2"><Dna className="w-5 h-5" /> 报价规律性差异分析</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">每行输入一家公司及其报价（万元），如：甲公司 980。围标报价常呈等差或等比规律梯次（实施条例第四十条第（四）项）。至少 3 行。</p>
          <textarea value={quotes} onChange={(e) => setQuotes(e.target.value)} rows={4}
            placeholder={'甲公司 980\n乙公司 1000\n丙公司 1020'}
            className="w-full border border-slate-300 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#12263f]/30" />
          {quoteAnalysis && (
            <div className={`border rounded p-3 text-sm ${quoteAnalysis.isArithmetic || quoteAnalysis.isGeometric ? 'bg-red-50 border-red-300 text-red-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'}`}>
              <p className="font-semibold">
                {quoteAnalysis.isArithmetic && `⚠ 报价呈显著等差规律（平均差 ${quoteAnalysis.avgD.toFixed(2)} 万元）——符合"投标报价呈规律性差异"特征`}
                {quoteAnalysis.isGeometric && `⚠ 报价呈显著等比规律（平均比率 ${(quoteAnalysis.avgR * 100 - 100).toFixed(2)}%）——符合"投标报价呈规律性差异"特征`}
                {!quoteAnalysis.isArithmetic && !quoteAnalysis.isGeometric && '未发现报价呈规律性梯次分布'}
              </p>
              <p className="text-xs mt-1">排序：{quoteAnalysis.rows.map((r) => `${r.name} ${r.value}`).join(' → ')} 万元</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
        注意：本工具输出为<strong>初步筛查线索</strong>，相似度与元数据相同本身不等于串通投标（如同一代理机构代编文件亦会造成元数据一致），
        需结合其他证据由有权机关认定。若自查发现真实风险，请移步"刑事风险自测"模块评估法律后果。
      </div>
    </div>
  )
}
