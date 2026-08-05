import { useState, lazy, Suspense } from 'react'
import { ShieldCheck, Calculator, CalendarClock, Home, Scale, ScanSearch, BookOpen, PackageCheck, GitCompareArrows, Dna, LayoutDashboard, MessageSquareText, UserRound } from 'lucide-react'
import Account from '@/sections/Account'
import Assistant from '@/sections/Assistant'
import HomeSection from '@/sections/Home'
import CriminalCheck from '@/sections/CriminalCheck'
import Calculators from '@/sections/Calculators'
import Deadlines from '@/sections/Deadlines'
import RiskScan from '@/sections/RiskScan'
import LawSearch from '@/sections/LawSearch'
import PackageCheckSection from '@/sections/PackageCheck'
import ContractCheck from '@/sections/ContractCheck'
const CollusionCheck = lazy(() => import('@/sections/CollusionCheck'))
import ProjectBoard from '@/sections/ProjectBoard'
import { GLOBAL_DISCLAIMER } from '@/data/legal'

type Tab = 'assistant' | 'account' | 'home' | 'criminal' | 'calc' | 'deadline' | 'riskscan' | 'lawsearch' | 'package' | 'contract' | 'collusion' | 'board'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'assistant', label: '哨兵助手', icon: <MessageSquareText className="w-4 h-4" /> },
  { id: 'account', label: '账户中心', icon: <UserRound className="w-4 h-4" /> },
  { id: 'home', label: '首页', icon: <Home className="w-4 h-4" /> },
  { id: 'board', label: '项目看板', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'riskscan', label: '标前排雷扫描', icon: <ScanSearch className="w-4 h-4" /> },
  { id: 'package', label: '封装清单', icon: <PackageCheck className="w-4 h-4" /> },
  { id: 'contract', label: '合同变脸检测', icon: <GitCompareArrows className="w-4 h-4" /> },
  { id: 'collusion', label: '围标DNA检测', icon: <Dna className="w-4 h-4" /> },
  { id: 'criminal', label: '刑事风险自测', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'calc', label: '数额计算器', icon: <Calculator className="w-4 h-4" /> },
  { id: 'deadline', label: '期限计算器', icon: <CalendarClock className="w-4 h-4" /> },
  { id: 'lawsearch', label: '法律库检索', icon: <BookOpen className="w-4 h-4" /> },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('assistant')

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-slate-800">
      {/* 顶部 */}
      <header className="bg-[#12263f] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center gap-3">
          <Scale className="w-8 h-8 text-amber-300" />
          <div>
            <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "Georgia,'Songti SC','SimSun',serif" }}>
              投标风险哨兵
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">招投标合规自查工具 · 废标雷 / 投诉雷 / 刑事雷，提前排掉</p>
          </div>
        </div>
        <nav className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm transition-colors border-b-2 ${
                  tab === t.id
                    ? 'border-amber-300 text-amber-200 bg-white/5'
                    : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* 主体 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {tab === 'assistant' && <Assistant onNavigate={(t) => setTab(t as Tab)} />}
        {tab === 'account' && <Account />}
        {tab === 'home' && <HomeSection onNavigate={(t) => setTab(t)} />}
        {tab === 'board' && <ProjectBoard />}
        {tab === 'criminal' && <CriminalCheck />}
        {tab === 'calc' && <Calculators />}
        {tab === 'deadline' && <Deadlines />}
        {tab === 'riskscan' && <RiskScan />}
        {tab === 'lawsearch' && <LawSearch />}
        {tab === 'package' && <PackageCheckSection />}
        {tab === 'contract' && <ContractCheck />}
        {tab === 'collusion' && (
          <Suspense fallback={<p className="text-sm text-slate-500 py-8 text-center">检测引擎加载中……</p>}>
            <CollusionCheck />
          </Suspense>
        )}
      </main>

      {/* 底部免责声明 */}
      <footer className="border-t border-slate-200 bg-[#f1ede4]">
        <div className="max-w-6xl mx-auto px-4 py-5 text-xs text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-600 mb-1">免责声明</p>
          <p>{GLOBAL_DISCLAIMER}</p>
        </div>
      </footer>
    </div>
  )
}
