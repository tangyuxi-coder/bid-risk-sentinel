import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogIn, LogOut, UserRound, KeyRound, Rss, CheckCircle2, AlertCircle } from 'lucide-react'
import { auth, login, logout, register, loadUserData, saveUserData, EMPTY_USERDATA, type UserData } from '@/lib/cloudbase'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

export default function Account() {
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  // 登录表单
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [formEmail, setFormEmail] = useState('')
  const [formPwd, setFormPwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [authMsg, setAuthMsg] = useState('')

  // 用户数据
  const [docId, setDocId] = useState<string | null>(null)
  const [data, setData] = useState<UserData>(EMPTY_USERDATA)
  const [dataMsg, setDataMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // 初始化：检查登录态
  useEffect(() => {
    let cancelled = false
    auth.getLoginState()
      .then(async (state) => {
        if (cancelled) return
        const u = state?.user as { email?: string } | undefined
        if (u?.email) {
          setEmail(u.email)
          const cloud = await loadUserData().catch(() => null)
          if (cancelled) return
          if (cloud) {
            setDocId(cloud.id)
            setData(cloud.data)
          }
        }
      })
      .catch(() => { /* 未登录 */ })
      .finally(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [])

  const afterLogin = async (mail: string) => {
    setEmail(mail)
    const cloud = await loadUserData().catch(() => null)
    if (cloud) {
      setDocId(cloud.id)
      setData(cloud.data)
    }
  }

  const submitAuth = async () => {
    if (!formEmail.trim() || !formPwd) { setAuthMsg('请填写邮箱和密码。'); return }
    if (mode === 'register' && formPwd.length < 8) { setAuthMsg('密码至少 8 位，且需包含字母和数字。'); return }
    setBusy(true); setAuthMsg('')
    try {
      if (mode === 'register') {
        await register(formEmail.trim(), formPwd)
        // 邮箱注册后需先点击验证邮件中的激活链接，激活后才能登录
        setMode('login')
        setFormPwd('')
        setAuthMsg('注册成功。激活邮件已发送到你的邮箱，请先点击邮件中的链接完成激活，再回到此页登录。（如收不到请检查垃圾邮件）')
        return
      }
      await login(formEmail.trim(), formPwd)
      await afterLogin(formEmail.trim())
      setFormPwd('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/exist/i.test(msg)) setAuthMsg('该邮箱已注册，请直接登录。')
      else if (/invalid_username_or_password|4043/.test(msg)) setAuthMsg('登录被拒绝：若刚注册，请先到邮箱点击激活链接；若已激活，请检查密码是否正确。')
      else if (/password|credential|wrong/i.test(msg)) setAuthMsg('邮箱或密码不正确。')
      else if (/email/i.test(msg)) setAuthMsg('邮箱格式不正确。')
      else setAuthMsg('操作失败：' + msg)
    } finally {
      setBusy(false)
    }
  }

  const doLogout = async () => {
    await logout().catch(() => { /* 忽略 */ })
    setEmail(null)
    setDocId(null)
    setData(EMPTY_USERDATA)
  }

  const saveConfig = async () => {
    setSaving(true); setDataMsg('')
    try {
      const cloud = await loadUserData()
      const merged: UserData = {
        projects: cloud?.data.projects ?? [],
        keywords: data.keywords,
        pushplusToken: data.pushplusToken,
      }
      const id = await saveUserData(cloud?.id ?? docId, merged)
      setDocId(id)
      setDataMsg('已保存。明日 07:50 的推送将按此配置执行。')
    } catch (e) {
      setDataMsg('保存失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  if (!ready) {
    return <p className="text-sm text-slate-500 py-8 text-center">正在检查登录状态……</p>
  }

  // ---------- 未登录 ----------
  if (!email) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>账户中心</h2>
          <p className="text-sm text-slate-500 mt-1">登录后，项目台账与推送配置保存在云端，换设备不丢失。</p>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#12263f] flex items-center gap-2">
              <LogIn className="w-4 h-4" /> {mode === 'login' ? '邮箱登录' : '邮箱注册'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">邮箱</label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs text-slate-500">密码{mode === 'register' && '（至少 8 位，含字母和数字）'}</label>
              <Input
                type="password"
                value={formPwd}
                onChange={(e) => setFormPwd(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitAuth() }}
              />
            </div>
            {authMsg && (
              <p className={`text-sm rounded px-3 py-2 flex items-start gap-1.5 border ${authMsg.startsWith('注册成功') ? 'text-green-800 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {authMsg}
              </p>
            )}
            <Button onClick={submitAuth} disabled={busy} className="w-full bg-[#12263f] hover:bg-[#1d3a5f] text-white">
              {busy ? '请稍候……' : mode === 'login' ? '登录' : '注册并登录'}
            </Button>
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setAuthMsg('') }}
              className="w-full text-center text-xs text-slate-500 hover:text-[#12263f]"
            >
              {mode === 'login' ? '没有账户？点此注册' : '已有账户？点此登录'}
            </button>
          </CardContent>
        </Card>
        <p className="text-xs text-slate-400 text-center leading-relaxed">
          未登录也能使用全部检测功能，数据保存在浏览器本地；登录仅用于云端同步与每日推送。
        </p>
      </div>
    )
  }

  // ---------- 已登录 ----------
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#12263f]" style={{ fontFamily: SERIF }}>账户中心</h2>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <UserRound className="w-4 h-4" /> {email}
          </p>
        </div>
        <Button variant="outline" onClick={doLogout}>
          <LogOut className="w-4 h-4 mr-1.5" /> 退出登录
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#12263f] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> 云端同步状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 leading-relaxed">
            已开启。项目看板中的台账会自动同步到云端，换设备登录同一邮箱即可看到相同数据。
            当前云端项目数：<strong>{Array.isArray(data.projects) ? data.projects.length : 0}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#12263f] flex items-center gap-2">
            <Rss className="w-4 h-4" /> 每日推送配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-slate-500">公告监控关键词（逗号分隔）</label>
            <Input
              value={data.keywords.join(', ')}
              onChange={(e) => setData((d) => ({ ...d, keywords: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) }))}
              placeholder="例如：信息化, 软件开发, 运维服务"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> Pushplus Token（用于微信接收每日一页纸）
            </label>
            <Input
              value={data.pushplusToken}
              onChange={(e) => setData((d) => ({ ...d, pushplusToken: e.target.value.trim() }))}
              placeholder="微信搜索公众号 pushplus推送加，登录官网复制 token"
            />
            <p className="text-xs text-slate-400 mt-1">留空则暂停推送。Token 仅存于你账户的云端数据中，规则已限制仅本人可读。</p>
          </div>
          {dataMsg && <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded px-3 py-2">{dataMsg}</p>}
          <Button onClick={saveConfig} disabled={saving} className="bg-[#12263f] hover:bg-[#1d3a5f] text-white">
            {saving ? '保存中……' : '保存配置'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
