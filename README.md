投标风险哨兵
招投标合规自查工具：废标雷、投诉雷、刑事雷，提前排掉。
在线地址：https://tangyuxi-coder.github.io/bid-risk-sentinel/
功能
检测工具（纯前端，文件不出本机）
• 哨兵助手：一句话下达指令，本地意图识别 + 规则引擎自动执行扫描、提取、计算
• 项目看板：登记在手项目的投标截止 / 保证金截止 / 质疑异议期，自动倒计时、红黄牌预警
• 标前排雷扫描：招标文件的排他性条款等风险点扫描（依据《招标投标法实施条例》第 32 条等）
• 封装清单：从招标文件提取签字、盖章、密封、份数、保证金等要求，生成装订核对清单
• 合同变脸检测：比对招标文件与合同文本的实质性偏离
• 围标 DNA 检测：多份标书雷同点分析
• 刑事风险自测：串通投标等刑事风险自查
• 数额计算器 / 期限计算器：诉讼费、利息、期间计算
• 法律库检索：招投标相关法律法规条文检索
账户与云端（CloudBase）
• 邮箱验证码登录，无需密码，首次使用自动创建账户
• 项目台账、监控关键词、推送配置保存在云端，换设备不丢失
• 未登录也能使用全部检测功能（数据保存在浏览器本地）
每日推送（云函数）
• 云函数 dailyPush 每天北京时间 07:50 定时运行
• 自动检查所有用户台账中 7 / 3 / 1 / 0 天内到期的节点
• 按用户配置的关键词抓取当日新标讯
• 通过 Pushplus 推送到各用户自己的微信
技术栈
• 前端：React 19 + TypeScript + Vite 7 + Tailwind CSS + shadcn/ui
• 文件解析：jszip / mammoth / pdfjs-dist（全程浏览器本地完成）
• 后端：腾讯云开发 CloudBase（邮箱验证码认证 + 云数据库 + 云函数）
• 推送：Pushplus 微信推送
• 部署：GitHub Actions 自动构建并发布到 GitHub Pages
本地开发
bash
￼
复制
npm
 ci
npm run dev
构建：
bash
￼
复制
npm run build   # 输出到 dist/
部署
推送到 main 分支后，GitHub Actions（.github/workflows/deploy.yml）自动执行 npm ci → npm run build → 部署 dist 到 GitHub Pages。
仓库 Settings → Pages → Source 必须保持为 GitHub Actions（不要选 Deploy from a branch，否则源码会被直接发布覆盖成品站点）。
云函数
dailyPush（Node.js）部署于 CloudBase，定时触发器 0 50 7 * * * *（每天 07:50 北京时间）。读取云数据库 userdata 集合（安全规则：仅创建者可读写），逐用户计算到期提醒并调用 Pushplus 推送。
免责声明
本工具全部内容基于公开法律法规、司法解释性质文件及最高人民法院法答网公开答疑意见整理，仅供学习、研究和风险自查参考，不构成法律意见。具体案件请咨询执业律师。
