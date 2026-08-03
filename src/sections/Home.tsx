import { ShieldCheck, Calculator, CalendarClock, ArrowRight, AlertTriangle, ScanSearch, BookOpen, PackageCheck, GitCompareArrows } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  onNavigate: (tab: 'criminal' | 'calc' | 'deadline' | 'riskscan' | 'lawsearch' | 'package' | 'contract') => void
}

const SERIF = "Georgia,'Songti SC','SimSun',serif"

export default function Home({ onNavigate }: Props) {
  return (
    <div className="space-y-8">
      {/* 主视觉 */}
      <section className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h2 className="text-3xl font-bold text-[#12263f] mb-3" style={{ fontFamily: SERIF }}>
          不替你写标书，专替你排雷。
        </h2>
        <p className="text-slate-600 leading-relaxed max-w-3xl">
          全网招投标 AI 都在卷"写标书"，没有人做风险端。投标风险哨兵把最高人民法院法答网权威答疑、
          刑法与立案追诉标准、招标投标法与政府采购法体系做成<strong>写死在代码里的规则引擎</strong>——
          结论可追溯、可复核，不依赖大模型自由发挥。
        </p>
        <div className="mt-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            串通投标罪的立案标准是明确的数字：直接经济损失 50 万 / 违法所得 20 万 / 中标项目金额 400 万。
            很多当事人直到被立案，都不知道自己早就越线了。
          </span>
        </div>
      </section>

      {/* 三个功能入口 */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#b8860b]" onClick={() => onNavigate('riskscan')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#12263f]" style={{ fontFamily: SERIF }}>
              <ScanSearch className="w-5 h-5 text-[#b8860b]" /> 标前排雷扫描
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>粘贴招标文件，规则引擎本地扫描排他性条款、限制性门槛、废标条款定位；可选 DeepSeek 深度解析。对投标人是质疑弹药，对招标人是投诉预警。</p>
            <p className="flex items-center gap-1 text-[#12263f] font-medium">开始扫描 <ArrowRight className="w-4 h-4" /></p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-emerald-700" onClick={() => onNavigate('package')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#12263f]" style={{ fontFamily: SERIF }}>
              <PackageCheck className="w-5 h-5 text-emerald-700" /> 封装清单
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>自动提取招标文件中的签字/盖章/密封/份数/保证金要求，生成逐项打勾的"最后一公里"清单——一个漏盖的骑缝章就是全盘皆废。</p>
            <p className="flex items-center gap-1 text-[#12263f] font-medium">去核对 <ArrowRight className="w-4 h-4" /></p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-800" onClick={() => onNavigate('contract')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#12263f]" style={{ fontFamily: SERIF }}>
              <GitCompareArrows className="w-5 h-5 text-purple-800" /> 合同变脸检测
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>中标后甲方合同草案 vs 招标文件实质性条款逐类比对，付款、质保、违约金变脸即标红，附《招标投标法》第四十六条依据。</p>
            <p className="flex items-center gap-1 text-[#12263f] font-medium">去比对 <ArrowRight className="w-4 h-4" /></p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-red-700" onClick={() => onNavigate('criminal')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#12263f]" style={{ fontFamily: SERIF }}>
              <ShieldCheck className="w-5 h-5 text-red-700" /> 刑事风险自测
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>基于法答网串通投标罪专题六问与《立案追诉标准（二）》第六十八条的决策树：行为定性 → 立案标准 → 主体认定 → 数罪并罚。</p>
            <p className="flex items-center gap-1 text-[#12263f] font-medium">开始自测 <ArrowRight className="w-4 h-4" /></p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-amber-600" onClick={() => onNavigate('calc')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#12263f]" style={{ fontFamily: SERIF }}>
              <Calculator className="w-5 h-5 text-amber-600" /> 数额计算器
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>直接经济损失、违法所得怎么算？哪些费用不得扣除？离立案线还有多远？打官司的核心是钱，钱的账必须算得明明白白。</p>
            <p className="flex items-center gap-1 text-[#12263f] font-medium">去算账 <ArrowRight className="w-4 h-4" /></p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#12263f]" onClick={() => onNavigate('deadline')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#12263f]" style={{ fontFamily: SERIF }}>
              <CalendarClock className="w-5 h-5 text-[#12263f]" /> 期限计算器
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>异议期、质疑期、投诉期，错过一天权利清零。招标投标法与政府采购法双体系的法定期限一键计算。</p>
            <p className="flex items-center gap-1 text-[#12263f] font-medium">算期限 <ArrowRight className="w-4 h-4" /></p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-slate-500" onClick={() => onNavigate('lawsearch')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#12263f]" style={{ fontFamily: SERIF }}>
              <BookOpen className="w-5 h-5 text-slate-500" /> 法律库检索
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>招标投标法及实施条例全文、刑法、立案追诉标准、政府采购法体系、法答网六问，法言法语关键词直搜，逐条标注效力层级与来源。</p>
            <p className="flex items-center gap-1 text-[#12263f] font-medium">去检索 <ArrowRight className="w-4 h-4" /></p>
          </CardContent>
        </Card>
      </div>

      {/* 规则来源 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#12263f] mb-3" style={{ fontFamily: SERIF }}>规则与数据来源</h3>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
          <li>《中华人民共和国刑法》第二百二十三条、第二百三十一条</li>
          <li>《最高人民检察院、公安部关于公安机关管辖的刑事案件立案追诉标准的规定（二）》（2022年修订）第六十八条</li>
          <li>《中华人民共和国招标投标法》（2017修正）及其实施条例</li>
          <li>《中华人民共和国政府采购法》（2014修正）及其实施条例、《政府采购质疑和投诉办法》（财政部令第94号）</li>
          <li>最高人民法院法答网精选答问（第二十四批）串通投标罪专题（人民法院报，2025-07-03）</li>
          <li>法发〔2010〕22号《最高人民法院关于在经济犯罪审判中参照适用〈标准二〉的通知》</li>
        </ul>
      </section>
    </div>
  )
}
