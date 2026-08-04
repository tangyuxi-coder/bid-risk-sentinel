#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
投标风险哨兵 · 每日一页纸推送脚本
由 GitHub Actions 定时触发（北京时间每天 07:50）。
功能：
  1. 读取 data/watchlist.json 中的项目截止期，计算倒计时警报
  2. 抓取中国政府采购网公开公告，按关键词匹配（今日新增）
  3. 生成一页纸 Markdown，推送到企业微信机器人 / Pushplus（未配置则只输出到日志）
仅使用 Python 标准库，无需 pip install。
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

BJT = timezone(timedelta(hours=8))
TODAY = datetime.now(BJT).date()
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) bid-risk-sentinel/1.0'}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_watchlist():
    with open(os.path.join(ROOT, 'data', 'watchlist.json'), encoding='utf-8') as f:
        return json.load(f)


def days_left(date_str):
    if not date_str:
        return None
    try:
        d = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return None
    return (d - TODAY).days


def build_alerts(watch):
    alert_days = set(watch.get('alert_days', [7, 3, 1, 0]))
    lines = []
    for p in watch.get('projects', []):
        for label, key in [('投标截止', 'bid_deadline'), ('保证金截止', 'deposit_deadline'), ('质疑/异议期届满', 'challenge_deadline')]:
            d = days_left(p.get(key, ''))
            if d is None:
                continue
            if d < 0:
                lines.append(f"⚪ {p['name']} —— {label}已过期 {-d} 天")
            elif d in alert_days:
                mark = '🔴' if d <= 3 else '🟡'
                txt = '今天截止' if d == 0 else f'还剩 {d} 天'
                lines.append(f"{mark} {p['name']} —— {label}{txt}")
    return lines


def fetch_ccgp(keyword, rows=8):
    """抓中国政府采购网搜索页，返回 [{title, url, date}]，失败返回 []。"""
    try:
        params = {
            'searchtype': '1',
            'page_index': '1',
            'bidSort': '0',
            'dbselect': 'bidx',
            'kw': keyword,
            'start_time': TODAY.strftime('%Y:%m:%d'),
            'end_time': TODAY.strftime('%Y:%m:%d'),
            'timeType': '6',
            'displayZone': '',
            'zoneId': '',
            'pppStatus': '0',
            'agentName': '',
        }
        url = 'http://search.ccgp.gov.cn/bxsearch?' + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            html = r.read().decode('utf-8', errors='ignore')
        items = []
        for m in re.finditer(r'<li>\s*<a href="([^"]+)"[^>]*>(.*?)</a>.*?<span>(.*?)</span>', html, re.S):
            link, title, meta = m.groups()
            title = re.sub(r'<[^>]+>|\s+', '', title)
            date_m = re.search(r'(\d{4}\.\d{2}\.\d{2})', meta)
            if title:
                items.append({'title': title, 'url': link.strip(), 'date': date_m.group(1) if date_m else ''})
            if len(items) >= rows:
                break
        return items
    except Exception as e:
        print(f'[warn] 公告抓取失败（{keyword}）：{e}', file=sys.stderr)
        return []


def build_digest(watch):
    lines = [f"# 投标风险哨兵 · 每日一页纸（{TODAY.strftime('%Y年%m月%d日')}）", '']
    alerts = build_alerts(watch)
    lines.append('## 一、截止期警报')
    lines += alerts if alerts else ['今日无临近截止事项 ✅']
    lines.append('')
    lines.append('## 二、今日新增公告（关键词匹配）')
    seen = set()
    found = []
    for kw in watch.get('keywords', []):
        for it in fetch_ccgp(kw):
            if it['url'] not in seen:
                seen.add(it['url'])
                found.append(f"- [{it['title']}]({it['url']})（{it['date']}｜关键词：{kw}）")
    if found:
        lines += found[:20]
    else:
        lines.append('公告源暂不可达（中国政府采购网有反爬限制），请点下方直达链接人工查看：')
    # 兜底：无论抓取成功与否，都附上搜索直达链接，保证一页纸不空
    lines.append('')
    lines.append('## 三、找标直达')
    for kw in watch.get('keywords', []):
        q = urllib.parse.quote(kw)
        lines.append(f"- [{kw} · 中国政府采购网搜索](http://search.ccgp.gov.cn/bxsearch?searchtype=1&bidSort=0&dbselect=bidx&kw={q})")
    lines.append('- [全国公共资源交易平台](https://www.ggzy.gov.cn/)')
    lines.append('')
    lines.append('—— 本消息由 GitHub Actions 自动生成 · 投标风险哨兵')
    return '\n'.join(lines)


def push_wecom(markdown_text, webhook):
    body = json.dumps({'msgtype': 'markdown', 'markdown': {'content': markdown_text[:4000]}}).encode()
    req = urllib.request.Request(webhook, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as r:
        print('企业微信推送结果：', r.read().decode()[:200])


def push_pushplus(title, markdown_text, token):
    params = urllib.parse.urlencode({'token': token, 'title': title, 'content': markdown_text, 'template': 'markdown'})
    req = urllib.request.Request('http://www.pushplus.plus/send', data=params.encode())
    with urllib.request.urlopen(req, timeout=15) as r:
        print('Pushplus 推送结果：', r.read().decode()[:200])


def main():
    watch = load_watchlist()
    digest = build_digest(watch)
    print(digest)
    title = f"投标风险哨兵每日一页纸 {TODAY.strftime('%m-%d')}"
    wecom = os.environ.get('WECOM_WEBHOOK', '').strip()
    pushplus = os.environ.get('PUSHPLUS_TOKEN', '').strip()
    if wecom:
        push_wecom(digest, wecom)
    if pushplus:
        push_pushplus(title, digest, pushplus)
    if not wecom and not pushplus:
        print('\n[提示] 未配置推送通道（WECOM_WEBHOOK / PUSHPLUS_TOKEN），仅输出到 Actions 日志。')


if __name__ == '__main__':
    main()
