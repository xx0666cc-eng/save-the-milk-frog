# 第六关失声者素材

外形来自用户第一张 `c3cfb58c0246f9f0e4c41394486aa7fd.jpg`，技能职责参考第二张 `e18a5298c9114ea0e0c48766cd8f736d.png`。原图副本位于 [references](../../../../../work/silenced-minions-2026-11-09/references/)。外形按第一张的灰紫兜帽、利爪、长矛重甲及无脚祭司适配，未采用第二张的矮身大头外观。

采用 **内置 image_gen** 生成透明 PNG，原始输出复制到本目录；未重采样、放大或用程序重绘像素。具体提示词和参考角色约束完整保存于 [素材提示词.md](../../../../../work/silenced-minions-2026-11-09/素材提示词.md)。沿用项目二维动作图集和 Three.js 投影，不是三维骨骼模型。

| 当前资产 | 原生像素 | 内容 |
| --- | --- | --- |
| shade-base.png | 1238×1271 | 残影标准形象，朝右 |
| guard-base.png | 1024×1536 | 守卫标准形象，含完整长矛，朝右 |
| cantor-base.png | 1024×1536 | 无脚祭司标准形象，朝左 |
| shade-motion.png | 1122×1402 | 20 姿势，朝右 |
| guard-motion.png | 1122×1402 | 20 姿势，朝右 |
| cantor-motion-v2.png | 1122×1402 | 20 姿势，统一朝左 |
| vfx.png | 1536×1024 | 四格：爪光、地裂、幽能弹、仪式波 |

三个动作图集均为 4 列×5 行：索引 0–3 待机、4–11 移动、12–15 普攻、16–19 技能。`silenced-view.js` 以单一清晰姿势播放本体，保持脚底锚点与固定缩放，移动步频跟随实际位移；取消相邻身体图的长时间混合及突进身体残影，独立速度线保留。手部特效锚点也使用当前实际显示帧。祭司悬浮来自战斗配置 `.8`，另有 .035 的轻微视觉浮动；其地面圈不随浮动或击飞升高。当前渲染修复见 [清晰度记录](../../../../../work/silenced-clarity-2026-11-09/验收记录.md)，原 PNG 与 data.js 字节未改变。

图集矩形、透明边界和逐帧锚点由 `work/silenced-minions-2026-11-09/measure.py` 只读测量，保存于 `atlas-metadata.json`；脚部/烟尾锚点与左右朝向写入 data.js。`pack.cjs` 将以上七张 PNG 的原始字节嵌入 `window.SILENCED_DATA`，由第六关资源准备流程懒加载，兼容 file://。

重新打包命令（从项目根目录运行，使用已有 Python/Node）：

```powershell
& 'C:/Users/22351/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' work/silenced-minions-2026-11-09/measure.py
& 'C:/Users/22351/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' work/silenced-minions-2026-11-09/pack.cjs
```

祭司首版动作存在跨帧朝向不一致，未引用；草稿保留在 work/silenced-minions-2026-11-09/drafts/。所有旧关卡的原始小怪图片仍保留。
