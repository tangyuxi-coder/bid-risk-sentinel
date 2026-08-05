// CloudBase 接入层：认证 + 每用户一份数据的读写
// 集合 userdata：每个登录用户仅有一条文档，安全规则为「仅创建者可读写」
import cloudbase from '@cloudbase/js-sdk'

export const ENV_ID = 'tangyuxicoder-d7g48ydhj78268083'

export const app = cloudbase.init({ env: ENV_ID })
export const auth = app.auth()
export const db = app.database()

const COLLECTION = 'userdata'

export interface UserData {
  projects: unknown[]
  keywords: string[]
  pushplusToken: string
}

export const EMPTY_USERDATA: UserData = { projects: [], keywords: [], pushplusToken: '' }

// ---------- 认证 ----------

export async function currentUserEmail(): Promise<string | null> {
  try {
    const state = await auth.getLoginState()
    const u = state?.user as { email?: string } | undefined
    return u?.email ?? null
  } catch {
    return null
  }
}

/** 发送邮箱验证码，返回 verification_id（登录时要用） */
export async function sendEmailCode(email: string): Promise<string> {
  const res = await auth.getVerification({ email })
  return (res as { verification_id: string }).verification_id
}

/** 用邮箱+验证码登录（新邮箱会自动创建账户） */
export async function loginWithEmailCode(email: string, verificationId: string, code: string): Promise<void> {
  await auth.signInWithEmail({
    email,
    verificationInfo: { verification_id: verificationId, is_user: false },
    verificationCode: code,
  })
}

export async function logout(): Promise<void> {
  await auth.signOut()
}

// ---------- 数据（每用户一份） ----------

interface CloudDoc {
  _id: string
  projects?: unknown[]
  keywords?: unknown
  pushplusToken?: unknown
}

/** 读取当前用户的数据文档；无文档或读取出错时返回 null */
export async function loadUserData(): Promise<{ id: string; data: UserData } | null> {
  const state = await auth.getLoginState()
  if (!state) return null
  const res = await db.collection(COLLECTION).limit(1).get()
  const doc = (res.data?.[0] ?? null) as CloudDoc | null
  if (!doc) return null
  return {
    id: doc._id,
    data: {
      projects: Array.isArray(doc.projects) ? doc.projects : [],
      keywords: Array.isArray(doc.keywords) ? (doc.keywords as string[]) : [],
      pushplusToken: typeof doc.pushplusToken === 'string' ? doc.pushplusToken : '',
    },
  }
}

/** 写入（或创建）当前用户的数据文档，返回文档 id */
export async function saveUserData(id: string | null, data: UserData): Promise<string> {
  const payload = { ...data, updatedAt: new Date().toISOString() }
  if (id) {
    await db.collection(COLLECTION).doc(id).update(payload)
    return id
  }
  const res = await db.collection(COLLECTION).add(payload)
  return res.id as string
}
