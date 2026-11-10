---
name: "裂境格斗 / RIFT STRIKE"
description: "Existing local side-view fighting-game prototype"
colors:
  ink: "#f4ebd9"
  dim: "#bdc7c5"
  teal: "#63e4d5"
  red: "#ef886b"
  ground: "#14262d"
  line: "rgba(230,235,218,.24)"
  panel: "#172d35"
  button-ink: "#102a30"
  teal-hover: "#a5f6e8"
  growth-panel: "#1b343e"
  growth-ink: "#f4edda"
  growth-muted: "#c7d3ce"
  growth-gold: "#edce8b"
  growth-purchase: "#e9ca83"
  growth-purchase-ink: "#283d3c"
  growth-purchase-hover: "#f9dda0"
  growth-next: "#afebca"
  growth-slot: "#243e46"
  growth-focus: "#f5d18b"
  info-ink: "#f5dfbd"
  info-frame: "#c6a276"
  info-title: "#ffe5bb"
  info-section-title: "#f4ddb3"
  info-section-bg: "#25242145"
  info-rank: "#f0ca70"
  result-ink: "#fff5df"
  result-muted: "#d7cde4"
  result-gold: "#ffdc7a"
  result-line: "#caa767"
  result-caramel: "#60391f"
typography:
  display:
    fontFamily: "'STKaiti','KaiTi','楷体',serif"
    fontSize: "clamp(70px,8vw,115px)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-.03em"
  headline:
    fontFamily: "'Microsoft YaHei UI','Microsoft YaHei',sans-serif"
    fontSize: "clamp(22px,2vw,29px)"
    fontWeight: 500
    letterSpacing: ".08em"
  intro:
    fontFamily: "'Microsoft YaHei UI','Microsoft YaHei',sans-serif"
    fontSize: "15px"
    lineHeight: 1.9
  label:
    fontFamily: "'Microsoft YaHei UI','Microsoft YaHei',sans-serif"
    fontSize: "12px"
  timer:
    fontFamily: "Georgia,serif"
    fontSize: "50px"
    fontWeight: 700
    lineHeight: 1.2
  growth-title:
    fontFamily: "'Microsoft YaHei UI','Microsoft YaHei',sans-serif"
    fontSize: "29px"
    fontWeight: 800
    lineHeight: 1.3
  growth-value:
    fontFamily: "'Microsoft YaHei UI','Microsoft YaHei',sans-serif"
    fontSize: "23px"
    fontWeight: 700
  info-title:
    fontFamily: "'STKaiti','KaiTi','楷体',serif"
    fontSize: "38px"
    fontWeight: 700
    lineHeight: 1.2
  info-section:
    fontFamily: "'STKaiti','KaiTi','楷体',serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.25
  info-attribute:
    fontFamily: "'STKaiti','KaiTi','楷体',serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.2
  info-value:
    fontFamily: "Georgia,serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.2
  info-level:
    fontFamily: "Georgia,serif"
    fontSize: "39px"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  key: "3px"
  touch: "6px"
  growth-dialog: "22px"
  growth-control: "11px"
  growth-art: "16px"
  growth-slot: "13px"
  info-sheet: "20px"
  info-subpanel: "16px"
  info-slot: "8px"
spacing:
  touch-gap: "6px"
  utility-gap: "8px"
  menu-actions-gap: "10px"
  standard: "16px"
  help-columns: "35px"
  growth-grid: "34px"
  growth-bag: "40px"
  info-grid: "24px"
  info-lower-grid: "18px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.button-ink}"
    padding: "15px 26px"
  button-primary-hover:
    backgroundColor: "{colors.teal-hover}"
  button-secondary:
    backgroundColor: "rgba(18,36,42,.55)"
    textColor: "{colors.ink}"
    padding: "15px 22px"
  button-utility:
    backgroundColor: "#182c35b8"
    textColor: "{colors.ink}"
    padding: "7px 11px"
  difficulty-select:
    backgroundColor: "#1b3037"
    textColor: "{colors.ink}"
    padding: "9px 12px"
  health-track:
    backgroundColor: "#203039"
    height: "18px"
  energy-track:
    backgroundColor: "#263d43"
    height: "9px"
  growth-dialog:
    backgroundColor: "{colors.growth-panel}"
    textColor: "{colors.growth-ink}"
    rounded: "{rounded.growth-dialog}"
    padding: "28px 30px 20px"
    width: "min(1040px,calc(100% - 48px))"
  growth-button-upgrade:
    backgroundColor: "{colors.growth-purchase}"
    textColor: "{colors.growth-purchase-ink}"
    rounded: "{rounded.growth-control}"
    padding: "5px 9px"
  growth-button-upgrade-hover:
    backgroundColor: "{colors.growth-purchase-hover}"
  growth-tab:
    textColor: "#bccbc6"
    rounded: "0"
    padding: "10px 2px 12px"
  growth-tab-selected:
    textColor: "#ffe4a4"
  growth-backpack-slot:
    backgroundColor: "{colors.growth-slot}"
    rounded: "{rounded.growth-slot}"
    padding: "8px"
  info-heading:
    textColor: "{colors.info-title}"
    typography: "{typography.info-title}"
  info-subpanel:
    backgroundColor: "{colors.info-section-bg}"
    textColor: "{colors.info-ink}"
    rounded: "{rounded.info-subpanel}"
    padding: "12px 14px"
  info-inventory-slot:
    backgroundColor: "#5d554c20"
    rounded: "{rounded.info-slot}"
    padding: "4px"
    height: "49px"
---

# Design System: 裂境格斗

## Overview

**Creative North Star: "风起之庭"**

This document records the existing local fighting-game prototype: articulated temporary 3D characters, side-view combat and a dusk courtyard. It captures implementation evidence rather than an approved final character style or image composition.

**Key Characteristics:**
- Battlefield remains the main surface; health, energy and controls occupy screen edges.
- Turquoise identifies the player; coral identifies the CPU.
- Warm low-poly scenery contrasts with dark blue-green controls and cream text.

### 灰雾古钟移动动画 — 2026-11-10

`bell-master` 延续原有阴森、厚重的钟体/兜帽/破袍形象，不替换 PNG。待机及移动保持单张清晰姿势，通过局部着色器微变形表现袍摆拖曳、不同步臂摆及巨钟延迟；整体仅作小幅悬浮、倾斜与阻尼回摆，不整体拉伸、不复制身体残影、不使用运动模糊。速度取真实地面位移，附加动作随攻击/受击降低权重，所有动画随游戏时钟冻结。灰白世界坐标拖尾最多 12 个小粒子，停止后 .78 秒内消散，换场清空；减少动态效果降低幅度并停止新拖尾。集中参数、实现边界与实际验收见 [Boss移动动画说明](Boss移动动画说明.md)。

### Growth UI extension — 2026-11-07

本次为既有界面的局部扩展。局外角色强化、背包和局内成长 HUD 延续蓝绿底色与奶金强调，并按用户明确方向采用圆润卡通游戏控件；头像打开的角色信息卡按用户提供的深棕金边参考建立独立材质。新增 `growth-*` 与 `info-*` token 只作用于相应组件，不替代旧菜单、战斗 HUD 和既有全局 token。

实现依据为 [growth.css](growth.css) 与 [growth-ui.js](growth-ui.js)；方向和验收范围见 [界面实施方向](../../work/progression-2026-11-07/界面实施方向.md) 与 [独立界面验收](../../work/progression-2026-11-07/ui-review.md)。角色卡展示当前角色已有透明 idle 首帧，保留完整比例和脚底，不重新绘制形象，也不以整张参考图充当界面。

## Colors

### Character showcase extension — 2026-11-08

主菜单底部角色顺序、坐标与原图不变，悬停平滑放大 6.5% 并使用柔和金色轮廓；点击先预览，确认登场后保留原选中光效。`character-showcase.css` 使用暖奶油白表面、`#60391f` 深棕文字、`#7c6044` 次级文字与 `#c9a365` 细金边，确认按钮沿用主菜单奶油金黄渐变和连续曲率圆角。模态背景暗化并模糊 6px，打开 240ms、关闭 170ms，尊重减少动态效果设置。

桌面采用左完整原比例角色图、右可滚动档案；手机改为单列滚动内容，关闭与登场按钮始终留在可视区。原图来自当前主菜单 `MENU_CHARACTER_ART`，只增加轻微呼吸与接触阴影，不制作新角色。标题用本地鸿雷行书，属性数字用 Georgia 等宽数字，正文 11–13px。属性、冷却与成长进度来自真实配置，独立故事和进化阶段缺失时如实显示。验收见 [展示系统记录](../../work/showcase-2026-11-08/README.md)。

### Result UI extension — 2026-11-08

失败结算和非模态通关卡使用 `result.css` 的深蓝紫半透明渐变、细金边和奶油白读数。标题与操作按钮沿用本地鸿雷行书；数字统一为 Georgia、700 字重、1.15 行高及 tabular-nums。按钮采用主菜单同款奶油金黄渐变、焦糖棕文字与连续曲率圆角，焦点为少量青蓝色。原暂停、帮助和其他页面不使用此组件域样式。

统计采用两列 `minmax(0,1fr)` Grid，卡片等大，读数/标签分别共线。`ResultUI` 格式化界面副本，伤害以原值 1000 为切换阈值，除以 10000 后附加小写 w，最多一位小数；计数无小数。ResizeObserver 将同组数字按相同倍率缩小以适应长值。通关卡仅自身响应点击，保持场景操作；失败结算仍沿用原结束状态。桌面、手机横竖屏和矮窗口验证见 [结算界面验收记录](../../work/result-ui-2026-11-08/README.md)。

Primary turquoise carries player identity, energy, focus and the main action. Secondary coral carries CPU identity and health. Cream foreground, muted secondary text and blue-green panels provide the interface structure. The line token is a quiet translucent divider. Warm scenery colors belong to the rendered courtyard.

### Growth UI: scoped roles

- **Primary — 奶金操作与进度：** `growth-purchase` 用于局外升级按钮，`growth-gold` 用于已获得的强化刻度，`growth-focus` 用于成长弹窗焦点。HUD 经验另沿用奶金强调；这些组件补充既有玩家青绿识别色。
- **Secondary — 数值变化与状态：** `growth-next` 标记升级后数值。角色卡内部经验为紫色、生命为粉红色的高光条；状态色仅用于相应读数，完整渐变留在 sidecar。
- **Neutral — 两域底色与文字：** `growth-panel / growth-ink / growth-muted / growth-slot` 负责局外面板、正文、说明及背包格。`info-ink / info-title / info-section-title / info-section-bg` 负责深棕角色卡文字与分区；`info-frame` 是外框金边，`info-rank` 是角色卡已强化刻度。深棕面板的透明渐变属于角色卡材质，在 sidecar 记录。

**The Two-Surface Rule.** 蓝绿奶金用于局外账户界面；深棕金边只用于用户指定的角色信息卡。后续扩展按所在组件选域，不把其中一域扩散为全站替换色板。

## Typography

### Global numeric typography — 2026-11-08

`numeric-typography.css` 统一启用 `lining-nums tabular-nums`，沿用现有 Georgia 数值、中文正文与标题字体，不替换美术字体或改变字号层级。该单一全局特性规则覆盖组件 `font` 简写造成的重置；不在每个组件重复定义。相同行的数值、中文、单位、百分号和倍率采用基线对齐；图标、进度条等图形保持几何居中。既有字号、颜色、圆角与整体布局保持不变。

共享 `NumericTypography` 观察数值内容和可用宽度，仅在超宽时按组件组统一减小显示字号；短值恢复各组件的原始响应式字号，不修改数值。三段伤害、数值/单位等原子片段使用 `ui-number-run` 防止内部异常断行。结算移除独立缩放器，复用此规则。强化行与角色卡使用既有行高定义的布局槽，基线变化不会增大组件。实际基线、前后尺寸和完整性检查见 [数字排版验收](../../work/numeric-ui-2026-11-08/README.md)。

The current wordmark uses the installed KaiTi family stack; interface copy uses Microsoft YaHei. Georgia supplies the timer, combo and result numerals. These are the actual prototype fonts, not a newly commissioned identity. Labels and guide copy use the label role; keyboard keycaps retain their existing 11px type. The wordmark becomes 75px below 800px width; a separate short-height rule uses 65px before the narrow-width override.

### Growth UI hierarchy

局外标题与升级前后值使用 `growth-title / growth-value` 的既有中文无衬线字体栈。角色卡沿用参考的中文游戏字形关系：标题、分区名、属性标签分别用 `info-title / info-section / info-attribute` 楷体栈；等级与右对齐读数用 `info-level / info-value` 的 Georgia。角色卡名称也使用楷体；数字按实际运行值展示，生命、属性等读数保留对应的小数精度。

局外标题在 800px 及以下为 25px，600px 及以下为 22px；手机升级值为 22px。角色卡在 700px 及以下将标题与等级缩至 27px、分区名与属性值缩至 18px、属性标签缩至 14px。上述字体均从现有实现提取，记录其当前用途，不新增全局展示字体选择。

## Layout

The canvas fills the viewport. Desktop health HUD sits 25px from the top with 4vw side margins; timer occupies the center. Energy sits bottom-left, keyboard hints bottom-right. The menu uses 7vh / 6vw padding and a 460px content column.

At widths up to 800px, the menu column is 360px, the guide becomes one column and keyboard hints give way to touch controls. Final narrow-screen offsets are 215px for the utility row, 125px for the energy footer and 18px for touch controls. These independent rows are visible without overlap in the checked 390×844 gameplay capture. Desktop captures were checked at 1440×900. The guide caps at 90vh and scrolls internally. Short-height adjustments begin at 650px.

### Growth UI layout and responsiveness

局外弹窗采用 `growth-dialog`，最大高度 90vh 并内部滚动。强化页是左角色选择、右四项升级的双列；背包是左四列物品格、右详情的双列，空态保留 12 格并解释奶币已入账户。600px 及以下改为纵向阅读，角色图与名称并排、选择列表横向滚动，升级行继续并列显示前值、后值和费用。

角色卡桌面上区为角色 / 即时状态 / 增益与收获三列，下区为永久强化 / 背包两列。外框最大宽 1500px，左右各留 40px，最大高度 92dvh。701–1100px 上区改为两列、增益与收获下移，下区单列。700px 及以下外框左右各留 11px、最大高度 94dvh；先读角色与即时状态，再读增益、收获、强化与背包。标题与关闭入口在内部滚动时保持可达，返回战斗在内容末尾。角色卡背包保留六列、至少三行，不将所有内容缩小塞入手机一屏。

本次保存截图检查尺寸为桌面 1440×900 与手机视口 390×844；手机底部截图明确展示内部滚动后的状态。截图证据不代表实体手机触屏或其他尺寸已完成验收。

## Elevation & Depth

Scene lighting and contact shadows establish depth. UI uses opaque dark panels and dimmed backdrops; result/pause panels have a soft downward shadow. Combo and announcement shadows separate text from scenery. Menu shading keeps copy readable without replacing the rendered arena.

### Growth UI materials

局外面板以蓝绿实体底、柔和下投影和按钮内侧高光形成圆润游戏控件。角色卡采用透光深棕横向渐变、细金边、轻微内照明和下投影；背景遮罩附加轻度模糊。左侧角色使用圆形细光圈与接触椭圆，分区用低透明棕底和细金线。经验、生命和强化刻度的局部高光服务于对应状态。精确渐变、阴影、遮罩与反馈动画位于 `.impeccable/design.json`，均为组件域材料，不是全局发光或阴影要求。

## Shapes

Most interface controls and panels have square corners and thin borders. Keycaps use the key radius; touch buttons use the touch radius. Health bars lean by −12 degrees. The courtyard and temporary fighters intentionally use simple faceted geometry.

### Growth UI shape extension

原方角说明继续适用于旧控件。新增局外弹窗采用 `growth-dialog` 圆角，内部操作采用 `growth-control`，角色图采用 `growth-art`，背包格采用 `growth-slot`；标签仍为方角下划线导航。角色卡外框、分区与物品格分别采用 `info-sheet / info-subpanel / info-slot`，局内只读升级胶囊为 22px 圆角。手机局外弹窗为 18px 圆角；角色卡外框为 16px、分区为 12px。此圆润语言限于本次用户明确批准的成长组件，不重设旧界面形状。

## Components

Primary buttons start, resume or replay play; secondary buttons offer practice and restart paths. Utilities control sound, fullscreen and pause. Hover brightens buttons; active moves them down 1px. Keyboard focus uses a 3px turquoise outline with a 4px offset. Reduced-motion preference removes button and meter transitions.

Health, guard and energy meters expose current state; combo feedback reports hit count and damage. The guide lists movement, attacks and three example sequences. Help and pause suspend combat. The result panel provides replay/next-stage and menu actions. Documentation does not add unsupported loading, error or disabled variants.

### Growth UI components

- **角色强化：** 奶金实心升级按钮、当前值 → 后值、当前等级 / 10、十段刻度及真实费用。每个角色独立选择；账户奶币共享。余额不足禁用、满级显示 MAX，成功提示与对应行短暂反馈。成长弹窗按钮焦点为 3px 奶金描边、外移 3px；禁用样式不伪装可购买状态。
- **背包：** 局外四列格与详情区支持空态、数量、选中描边及真实物品说明。角色卡六列格显示本局获得 / 永久持有，点选更新说明。当前正式游戏未预设特殊物品及掉率；合成验收条目不成为内容或掉落承诺。
- **头像与角色卡：** 头像位于玩家血条左侧；点击立即暂停并打开真实角色资料。左侧透明站立图跟随当前角色，中央即时等级、经验、生命与属性，右侧临时增益倒计时及本局收获；永久账户余额与本局奶币分开。局内强化显示等级、刻度与下一次价格，购买按钮禁用并注明到主界面购买。关闭、Esc 和返回战斗恢复此前阶段与焦点。
- **成长反馈：** HUD 经验条位于玩家状态下方，账户奶币旁单列本局收入。升级行、奶币钱包和经验分别有短暂反馈；减少动态效果偏好关闭三类动画和经验条过渡。角色卡内计时遵循游戏暂停，文案明确冻结状态。

**The Read-Then-Buy Rule.** 角色卡提供局内查看；永久强化的消费动作只在主界面角色强化执行。两处保持同一份角色数值与账户事实。

## Do's and Don'ts

- Do preserve player/CPU color identity across models and meters.
- Do keep utility, energy and touch controls in separate rows on narrow screens.
- Do keep the temporary-character status visible until supplied final models replace them.
- Don't present the temporary character meshes as final likeness models.
- Don't let an overlay continue live combat behind instructions or pause controls.
- Don't infer untested device support from these documented breakpoints.

### Growth UI guardrails

- Do 保留当前角色透明站立图的比例、脚底与名称，切换角色时跟随真实素材。
- Do 保持本局收获、永久账户余额与永久物品数量的语义区分。
- Do 在手机角色卡内部滚动时保持标题与关闭入口可达，并保留局外购买说明。
- Don't 将深棕金边、局部光圈或圆润成长控件推广为旧菜单与战斗 UI 的全局替换规则。
- Don't 把参考图烘焙成静态整页，或把合成验收数据、背包条目当作正式游戏内容。

**Character update — 2026-10-30.** Following the user's direction to use the supplied character image instead of code-built modeling, the player now uses an ImageGen transparent standing cutout and reference-based nine-pose atlas on a 2D plane in the existing Three.js arena. Its yellow body, pale belly and green eyes follow the supplied standing reference; turquoise remains the player HUD accent. The CPU retains the temporary articulated rig. This supersedes earlier descriptions of both fighters as faceted 3D models and is not an exact 3D reconstruction. The checked idle, guard and gameplay combo captures show correct facing, clean transparency and no visible atlas bleed or clipped limbs.

**Arena update — 2026-11-04.** Both fighters now move across the floor in x and z; y remains jump height. The higher camera angle and two floor boundary lines expose depth. W/S move back/front, A/D move left/right, Space jumps, F guards, and Shift dashes along the held direction. Arrow keys also move. Melee and projectiles require depth alignment; CPU movement tracks depth. The reference-image fighter stays camera-aligned and anchored at its feet. Mobile controls now include a four-direction pad and a separate jump button. Desktop and 390 × 844 browser checks passed; physical-device acceptance remains untested.

**Movement update — 2026-11-04.** Preserve the standing cutout and combat artwork. New reference-based artwork supplies eight-frame side/front/back walk cycles; right-facing movement mirrors the side cycle. Feet and torso anchors align frames at constant height, with brief premultiplied frame blends and a distance-driven gait. Walking follows travel direction and retains facing at rest; guard and attack turn toward the opponent. Short acceleration/deceleration eases starts, stops and reversals. The three-direction preview is in 角色预览.html. This remains raster animation rather than a reconstructed 3D body; generated views can differ in detail from the source.

**Ground indicators — 2026-11-07.** All playable appearances, the existing CPU, ordinary enemies, elites, summons and Bosses share a soft contact shadow with one fine ellipse. Muted turquoise identifies the player, coral ordinary enemies, gold elites and lavender Bosses. Indicators use the unit's world-space foot anchor in x/z and stay on the floor during jumps or knock-ups. They render beneath characters and skill effects, never write depth, and do not change existing character occlusion, collision or damage. Sizes and colors live in `ground-indicator.js`; the ellipse is a visual footprint, not a combat boundary.

**Utility surfaces — 2026-11-08.** 用户要求操作指南、主菜单设置、局外背包与角色强化沿用现有主菜单角色详情的美术。`utility-panels.css` 限定上述四处，覆盖这些组件原有的深青/深蓝材料：奶油白半透明渐变、细暖金边、柔和下投影、连续曲率圆角和深焦糖棕文字；标题使用项目已有鸿雷行书，正文及数值保持既有字体层级。升级按钮采用与登场按钮一致的奶金渐变，选中、禁用、焦点、空背包、强化反馈及滚动条同域着色。文字深棕 `#60391f`、次级棕 `#7c6044`、强调棕金 `#8a5719`；相对较深面板底 `#fbf0df` 的对比度分别约 8.86、5.16、5.39。设置保留原非模态浮层，其他面板沿用原交互；局内深棕金边 `.growth-info`、HUD 和结算不变。样式在 `numeric-typography.css` 之前加载，数字基线/等宽规则保持有效。浏览器核对桌面 1440×900、窄视口 390×844，另查背包 844×390；均无横向溢出，窄屏长指南保留内部滚动。

