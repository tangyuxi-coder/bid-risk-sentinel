import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogOut, UserRound, KeyRound, Rss, CheckCircle2, AlertCircle, MailCheck } from 'lucide-react'
import { auth, logout, loadUserData, saveUserData, sendEmailCode, loginWithEmailCode, EMPTY_USERDATA, type UserData } from '@/lib/cloudbase'

const SERIF = "Georgia,'Songti SC','SimSun',serif"

export default function Account() {
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  // 登录表单（邮箱验证码，无需密码）
  const [formEmail, setFormEmail] = useState('')
  const [code, setCode] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [authMsg, setAuthMsg] = useState('')
  const [authMsgOk, setAuthMsgOk] = useState(false)

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

  const say = (msg: string, ok = false) => { setAuthMsg(msg); setAuthMsgOk(ok) }

  const afterLogin = async (mail: string) => {
    setEmail(mail)
    const cloud = await loadUserData().catch(() => null)
    if (cloud) {
      setDocId(cloud.id)
      setData(cloud.data)
    }
  }

  const sendCode = async () => {
    const mail = formEmail.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { say('请输入正确的邮箱地址。'); return }
    setBusy(true); say('')
    try {
      const vid = await sendEmailCode(mail)
      setVerificationId(vid)
      setCodeSent(true)
      say('验证码已发送，请到邮箱查收（含垃圾邮件），验证码有时效，请尽快输入。', true)
    } catch (e) {
      say('发送失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }

  const doLogin = async () => {
    if (!codeSent || !verificationId) { say('请先发送验证码。'); return }
    if (!code.trim()) { say('请输入邮箱中收到的验证码。'); return }
    setBusy(true); say('')
    try {
      await loginWithEmailCode(formEmail.trim(), verificationId, code.trim())
      await afterLogin(formEmail.trim())
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/invalid_argument|verification code/i.test(msg)) say('验证码不正确或已过期，请重新获取后再试。')
      else say('登录失败：' + msg)
    } finally {
      setBusy(false)
    }
  }

  const doLogout = async () => {
    await logout().catch(() => { /* 忽略 */ })
    setEmail(null)
    setDocId(null)
    setData(EMPTY_USERDATA)
    setCodeSent(false)
    setCode('')
    setVerificationId('')
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
      setDataMsg('已保存。每日推送将按此配置执行。')
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
          <p className="text-sm text-slate-500 mt-1">邮箱验证码登录，无需密码。登录后项目台账与推送配置保存在云端，换设备不丢失。</p>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#12263f] flex items-center gap-2">
              <MailCheck className="w-4 h-4" /> 邮箱验证码登录
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">邮箱</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={codeSent}
                />
                <Button variant="outline" onClick={sendCode} disabled={busy} className="shrink-0">
                  {codeSent ? '重新发送' : '发送验证码'}
                </Button>
              </div>
            </div>
            {codeSent && (
              <div>
                <label className="text-xs text-slate-500">验证码</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doLogin() }}
                  placeholder="邮件中的数字验证码"
                />
              </div>
            )}
            {authMsg && (
              <p className={`text-sm rounded px-3 py-2 flex items-start gap-1.5 border ${authMsgOk ? 'text-green-800 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {authMsg}
              </p>
            )}
            {codeSent && (
              <Button onClick={doLogin} disabled={busy} className="w-full bg-[#12263f] hover:bg-[#1d3a5f] text-white">
                {busy ? '请稍候……' : '登录'}
              </Button>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-slate-400 text-center leading-relaxed">
          首次使用的邮箱会自动创建账户。未登录也能使用全部检测功能，数据保存在浏览器本地。
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
