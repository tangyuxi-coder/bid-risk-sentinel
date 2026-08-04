// 浏览器端文件解析：DOCX 取证（元数据）+ DOCX/PDF/TXT 文本提取
// 全程本地运行，文件不离开用户浏览器
import JSZip from 'jszip'
import * as mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export interface FileMeta {
  author: string
  lastModifiedBy: string
  company: string
  created: string
  modified: string
  totalEditMinutes: string
  application: string
}

export interface ParsedFile {
  name: string
  text: string
  meta: FileMeta | null
  error?: string
}

const EMPTY_META: FileMeta = {
  author: '', lastModifiedBy: '', company: '',
  created: '', modified: '', totalEditMinutes: '', application: '',
}

function xmlVal(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([^<]*)</[^>]*${tag}>`))
  return m ? m[1].trim() : ''
}

async function parseDocx(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)

  const meta: FileMeta = { ...EMPTY_META }
  const core = zip.file('docProps/core.xml')
  if (core) {
    const xml = await core.async('text')
    meta.author = xmlVal(xml, 'creator')
    meta.lastModifiedBy = xmlVal(xml, 'lastModifiedBy')
    meta.created = xmlVal(xml, 'created')
    meta.modified = xmlVal(xml, 'modified')
  }
  const app = zip.file('docProps/app.xml')
  if (app) {
    const xml = await app.async('text')
    meta.company = xmlVal(xml, 'Company')
    meta.totalEditMinutes = xmlVal(xml, 'TotalTime')
    meta.application = xmlVal(xml, 'Application')
  }

  // 文本提取用 mammoth（更稳）
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return { name: file.name, text: result.value || '', meta }
}

async function parsePdf(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const parts: string[] = []
  const maxPages = Math.min(pdf.numPages, 200)
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    parts.push(content.items.map((it: any) => ('str' in it ? it.str : '')).join(''))
  }
  return { name: file.name, text: parts.join('\n'), meta: null }
}

async function parseTxt(file: File): Promise<ParsedFile> {
  return { name: file.name, text: await file.text(), meta: null }
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.toLowerCase().split('.').pop() || ''
  try {
    if (ext === 'docx') return await parseDocx(file)
    if (ext === 'pdf') return await parsePdf(file)
    if (ext === 'txt' || ext === 'md') return await parseTxt(file)
    return { name: file.name, text: '', meta: null, error: `不支持的格式 .${ext}（支持 docx/pdf/txt）` }
  } catch (e: any) {
    return { name: file.name, text: '', meta: null, error: `解析失败：${e.message || e}` }
  }
}

// ---------- 文本指纹：n-gram shingle + Jaccard 相似度 ----------

export function shingleSet(text: string, n = 10): Set<string> {
  // 归一化：去空白、标点、统一全半角
  const clean = text
    .replace(/[\s　]+/g, '')
    .replace(/[，。；：、？！""''（）《》〈〉【】《》—…·,.;:?!\[\]()<>"'‘’“”-]/g, '')
    .toLowerCase()
  const cap = clean.slice(0, 120000)
  const set = new Set<string>()
  for (let i = 0; i + n <= cap.length; i += 2) {
    set.add(cap.slice(i, i + n))
  }
  return set
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  const small = a.size <= b.size ? a : b
  const big = a.size <= b.size ? b : a
  small.forEach((x) => { if (big.has(x)) inter++ })
  return inter / (a.size + b.size - inter)
}
