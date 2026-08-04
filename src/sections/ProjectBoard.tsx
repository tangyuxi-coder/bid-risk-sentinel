import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LayoutDashboard, Plus, Trash2, Printer, AlertTriangle } from 'lucide-react'

const SERIF = "Georgia,'Songti SC','SimSun',serif"
const STORAGE_KEY = 'brs_projects'

interface Project {
  id: string
  name: string
  system: '招标投标' | '政府采购'
  bidDeadline: string        // 投标截止
  depositDeadline: string    // 保证金截止（可空）
  challengeDeadline: string  // 质疑/异议期届满（可空）
  status: '待投' | '已投' | '待答复' | '已完成'
  note: string
}

const EMPTY: Omit<Project, 'id'> = {
  name: '', system: '招标投标', bidDeadline: '', depositDeadline: '', challengeDeadline: '', status: '待投', note: '',
}

function daysLeft(dateStr: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T23:59:59')
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

interface Alert { project: string; item: string; days: number }

export default function ProjectBoard() {
  const [projects, setProjects] = useState<Project[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  const add = () => {
    if (!form.name.trim() || !form.bidDeadline) return
    setProjects((p) => [...p, { ...form, id: Date.now().toString() }])
    setForm(EMPTY)
    setShowForm(false)
  }

  const remove = (id: string) => setProjects((p) => p.filter((x) => x.id !== id))
  const setStatus = (id: string, status: Project['status']) =>
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, status } : x)))

  const alerts: Alert[] = useMemo(() => {
    const out: Alert[] = []
    for (const p of projects) {
      if (p.status === '已完成') continue
      const items: [string, string][] = [
        ['投标截止', p.bidDeadline],
        ['保证金截止', p.depositDeadline],
        ['质疑/异议期届满', p.challengeDeadline],
      ]
      for (const [item, ds] of items) {
        const d = daysLeft(ds)
        if (d !== null) out.push({ project: p.name, item, days: d })
      }
    }
    return out.sort((a, b) => a.days - b.days)
  }, [projects])

  const urgent = alerts.filter((a) => a.days <= 3)
  const soon = alerts.filter((a) => a.days > 3 && a.days <= 7)

  const dayBadge = (d: number) => {
    if (d < 0) return <span className="text-xs font-bold text-white bg-slate-500 px-2 py-0.5 rounded">已过期 {-d} 天</span>
    if (d === 0) return <span className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded">今天截止</span>
    if (d <= 3) return <span className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded">还剩 {d} 天</span>
    if (d <= 7) return <span className="text-xs font-bold text-white bg-orange-500 px-2 py-0.5 rounded">还剩 {d} 天</span>
    return <span className="text-xs font-bold text-[#12263f] bg-slate-100 px-2 py-0.5 rounded">还剩 {d} 天</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>我的项目看板</h2>
          <p className="text-sm text-slate-500 mt-1">
            登记在手项目的截止期，每天第一件事打开这里。数据只存在你自己的浏览器里，清浏览器数据会丢失。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1.5" /> 打印一页纸</Button>
          <Button onClick={() => setShowForm((s) => !s)} className="bg-[#12263f] hover:bg-[#1d3a5f] text-white">
            <Plus className="w-4 h-4 mr-1.5" /> 登记项目
          </Button>
        </div>
      </div>

      {/* 警报区 */}
      {(urgent.length > 0 || soon.length > 0) && (
        <div className="space-y-2">
          {urgent.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded p-3">
              <p className="text-sm font-bold text-red-800 flex items-center gap-1.5 mb-1.5"><AlertTriangle className="w-4 h-4" /> 红色警报（3 天内）</p>
              <ul className="text-sm text-red-700 space-y-1">
                {urgent.map((a, i) => <li key={i}>· {a.project} —— {a.item} {a.days < 0 ? `已过期 ${-a.days} 天` : a.days === 0 ? '今天截止' : `还剩 ${a.days} 天`}</li>)}
              </ul>
            </div>
          )}
          {soon.length > 0 && (
            <div className="bg-orange-50 border border-orange-300 rounded p-3">
              <p className="text-sm font-bold text-orange-800 mb-1.5">黄色提醒（7 天内）</p>
              <ul className="text-sm text-orange-700 space-y-1">
                {soon.map((a, i) => <li key={i}>· {a.project} —— {a.item} 还剩 {a.days} 天</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 登记表单 */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle style={{ fontFamily: SERIF }}>登记新项目</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">项目名称 *</label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例如：XX市政务云采购项目" />
              </div>
              <div>
                <label className="text-sm text-slate-600">体系</label>
                <select value={form.system} onChange={(e) => setForm((f) => ({ ...f, system: e.target.value as any }))}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
                  <option>招标投标</option><option>政府采购</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600">投标截止日 *</label>
                <Input type="date" value={form.bidDeadline} onChange={(e) => setForm((f) => ({ ...f, bidDeadline: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-slate-600">保证金截止日</label>
                <Input type="date" value={form.depositDeadline} onChange={(e) => setForm((f) => ({ ...f, depositDeadline: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-slate-600">质疑/异议期届满日</label>
                <Input type="date" value={form.challengeDeadline} onChange={(e) => setForm((f) => ({ ...f, challengeDeadline: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-slate-600">备注</label>
                <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="预算、竞争对手、注意事项……" />
              </div>
            </div>
            <Button onClick={add} disabled={!form.name.trim() || !form.bidDeadline} className="bg-[#12263f] hover:bg-[#1d3a5f] text-white">保存</Button>
          </CardContent>
        </Card>
      )}

      {/* 项目表 */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400 text-sm">
            <LayoutDashboard className="w-10 h-10 mx-auto mb-3 opacity-40" />
            还没有项目。点右上"登记项目"，把在手的标都管起来。
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-[#12263f] text-white">
                  {['项目名称', '体系', '投标截止', '保证金截止', '质疑/异议期', '状态', '备注', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2.5 border-t border-slate-200 font-medium text-slate-800">{p.name}</td>
                    <td className="px-3 py-2.5 border-t border-slate-200">{p.system}</td>
                    <td className="px-3 py-2.5 border-t border-slate-200">{p.bidDeadline} {dayBadge(daysLeft(p.bidDeadline)!)}</td>
                    <td className="px-3 py-2.5 border-t border-slate-200">{p.depositDeadline ? <>{p.depositDeadline} {dayBadge(daysLeft(p.depositDeadline)!)}</> : '—'}</td>
                    <td className="px-3 py-2.5 border-t border-slate-200">{p.challengeDeadline ? <>{p.challengeDeadline} {dayBadge(daysLeft(p.challengeDeadline)!)}</> : '—'}</td>
                    <td className="px-3 py-2.5 border-t border-slate-200">
                      <select value={p.status} onChange={(e) => setStatus(p.id, e.target.value as any)}
                        className="border border-slate-300 rounded px-2 py-1 text-xs bg-white">
                        {['待投', '已投', '待答复', '已完成'].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 border-t border-slate-200 text-xs text-slate-500 max-w-[160px] truncate">{p.note || '—'}</td>
                    <td className="px-3 py-2.5 border-t border-slate-200">
                      <button onClick={() => remove(p.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 官方平台直达 */}
      <Card>
        <CardHeader><CardTitle className="text-base" style={{ fontFamily: SERIF }}>找标直达（官方免费渠道）</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {[
            ['中国政府采购网', 'http://www.ccgp.gov.cn/'],
            ['全国公共资源交易平台', 'https://www.ggzy.gov.cn/'],
            ['中国招标投标公共服务平台', 'https://www.cebpubservice.com/'],
            ['信用中国（查对手信用）', 'https://www.creditchina.gov.cn/'],
            ['执行信息公开网（查对手被执行）', 'https://zxgk.court.gov.cn/'],
          ].map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noreferrer"
              className="px-3 py-1.5 border border-slate-300 rounded hover:border-[#12263f] hover:text-[#12263f] text-slate-600">
              {name} ↗
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
