import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, BookOpen } from 'lucide-react'
import lawsData from '@/data/laws.json'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

interface Article {
  law: string
  article: string
  text: string
  level: string
  source: string
}

const LAWS = lawsData as Article[]
const LEVELS = ['全部', '法律', '行政法规', '司法解释性质文件', '部门规章', '最高法答疑意见（供学习研究参考）']

function highlight(text: string, keywords: string[]) {
  if (keywords.length === 0) return text
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = text.split(re)
  return parts.map((p, i) =>
    keywords.includes(p) ? (
      <mark key={i} className="bg-amber-200 text-inherit px-0.5 rounded-sm">{p}</mark>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}

export default function LawSearch() {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('全部')

  const keywords = useMemo(() => query.trim().split(/\s+/).filter(Boolean), [query])

  const results = useMemo(() => {
    if (keywords.length === 0) return []
    return LAWS.filter((a) => {
      if (level !== '全部' && a.level !== level) return false
      const hay = `${a.law}${a.article}${a.text}`
      return keywords.every((k) => hay.includes(k))
    }).slice(0, 50)
  }, [keywords, level])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>法律库检索</h2>
        <p className="text-sm text-slate-500 mt-1">
          收录 {LAWS.length} 条：招标投标法及实施条例全文、刑法相关条文、《立案追诉标准（二）》、政府采购法体系、法答网串通投标罪专题六问。
          支持多关键词组合（空格分隔，同时命中），法言法语直搜，零延迟。
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：串通投标　或　异议 10日　或　违法所得 扣除"
            className="pl-9"
          />
        </div>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm bg-white"
        >
          {LEVELS.map((l) => <option key={l} value={l}>{l === '全部' ? '全部效力层级' : l}</option>)}
        </select>
      </div>

      {keywords.length > 0 && (
        <p className="text-sm text-slate-600">
          命中 <strong className="text-[#12263f]">{results.length}</strong> 条{results.length >= 50 && '（仅显示前 50 条，请加关键词缩小范围）'}
        </p>
      )}

      <div className="space-y-3">
        {results.map((a, i) => (
          <Card key={i} className="border-l-4 border-l-[#12263f]">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <BookOpen className="w-4 h-4 text-[#12263f] shrink-0" />
                <span className="text-sm font-bold text-[#12263f]">{a.law}</span>
                <span className="text-sm font-semibold text-slate-700">{a.article}</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{a.level}</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {highlight(a.text, keywords)}
              </p>
              <p className="text-xs text-slate-400 mt-2">来源：{a.source}</p>
            </CardContent>
          </Card>
        ))}
        {keywords.length > 0 && results.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">未命中。试试换用法言法语（如"立案追诉""废标""履约保证金"）。</p>
        )}
      </div>
    </div>
  )
}
