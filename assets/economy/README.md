# 奶币素材来源

- `milkcoin-reference.png`：用户于 2026-11-07 在当前聊天提供的原图副本，保留金色厚边、奶蛙浮雕与奶滴特征，不直接作为带底背景的游戏图标。
- `milkcoin.png`：使用内置 `image_gen`，以原图为编辑目标制作透明去背版本。保留原有造型与比例，不重设计货币图案。RGBA 透明边缘供 HUD、角色卡、商店与地面掉落共用。
- `coin-data.js`：同一透明 PNG 的配套嵌入数据，供 `file://` 离线 WebGL 使用；素材变化后须同步。
- `growth-view.js` 在加载后生成共享 256×256 运行时纹理，图标的浮动、轻摆和地面接触阴影由原生渲染完成。

两个 PNG 均已写入来源/编辑提示元数据，未修改原始附件文件。透明去背使用的完整提示：

> Edit target: the supplied milkfrog gold coin. Make one faithful game-ready transparent cutout of this exact coin. Remove only the off-white background and the cast shadow beneath the coin. Preserve the existing rounded gold rim, thickness, frog relief with green eyes and pale belly, cream milk splash and drops, highlights, original proportions, original front three-quarter view and warm 3D cartoon material. Do not redesign the icon, do not add text, numbers, props or more coins. Keep the full coin including bottom thickness intact with a clean alpha edge; transparent outer background, no white rectangle, no shadow plate. Coin centered and nearly filling the square canvas with a small transparent margin.
