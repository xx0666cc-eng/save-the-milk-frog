# 森林迅电兽连续动作资源

更新日期：2026-11-07。仅更新第二关 Boss 的视觉表现；仍是参考图驱动的二维精灵，不是新建三维骨骼模型。

## 输入与输出

用户的五张参考图依次对应：

| 原图文件名 | 动作图集 | 帧数 | 内容 |
| --- | --- | --- | --- |
| `83c01afc2e4b81c95d9d1fe371dc458e.jpg` | `walk.png` | 8 | 待机、前倾、蹬地、伸爪、腾空、触地、压缩、回归步态 |
| `23a01112e960e7d8641079d0ec7cec39.jpg` | `rake.png` | 6 | 疾电爪袭的蓄力、突进、两爪交替及收势 |
| `9d58a48db7bb0bae27e9012cd918b1d0.jpg` | `vine.png` | 6 | 起跳、抓藤、悬停、转身及俯冲 |
| `231eca4ca957507c2b3cfe82c778f74d.jpg` | `zigzag.png` | 6 | 高速推进、急转、短停蓄力及侧翼突袭 |
| `103c912e6900d62ff8412e491e8d7cc9.jpg` | `storm.png` | 6 | 雷尾抬起、旋转蓄能、爆发及回收 |

原图位于用户指定的微信附件目录，未覆盖。使用内置 image_gen 以这些图为参考适配为透明动作图集；未重新设计角色。保留银白尖毛、粉色耳内、蓝眼、青蓝雷纹和闪电形尾巴。`walk.png` 为 1774×887，其余为 1536×1024，保留原始 RGBA 像素，不缩放或横纵拉伸。

`motion-data.js` 是五张 PNG 的原始字节嵌入和逐帧配置，支持 `file://`。导出脚本为项目 `work/thunder-motion-2026-11-07/export-motion.py`；仅打包原图，不进行图像重绘或滤镜处理。每帧保存单元格、脚底锚点、素材朝向、前爪与尾部锚点。`referenceHeight` 只用于等比换算显示尺寸。

## 实际接入

- `thunder-beast-motion.js`：按真实移动距离循环六个奔跑姿势，另外两个用于待机/蓄力；双帧过渡与短状态衔接避免直接跳帧。预乘透明度混合避免黑边，低透明度底色不参与绘制。
- 所有技能动作跟随既有游戏时间。爪击分别对齐原两次命中，俯冲在原命中时刻转入落地姿势，折返沿原路线取姿势，雷尾在原前摇结束时爆发。
- `thunder-beast-view.js`：前爪电弧、抓握点藤蔓、实际历史姿势残影、雷尾充能与落地反馈。雷暴保留原身前半椭圆伤害区，视觉预警没有扩成新的身后伤害区。
- 物理站位、腾空高度、碰撞、攻击范围、伤害、CD、AI、关卡推进和存档均沿用原逻辑。原待机素材完整保留。
- 大图数据只在准备森林迅电兽时加载；其他关卡不额外解码本动作包。重复进场复用贴图和有界特效池。

## 生成提示词

执行方式：内置 image_gen；透明背景；每张动作参考分别生成一个图集，随后只对爪袭图集的留白和完整爪尖做一次定向修正。下列为交付图集的提示规格，保留在项目供后续续做使用。

通用提示：

```text
Create a production game sprite atlas extracted/adapted faithfully from the supplied Forest Thunder Beast storyboard. Character identity: exactly the same silver-white spiky-fur quadruped, dark gray lower legs, pink inner ears, ice-blue eyes, cyan cheek and back lightning markings and one large thick blue lightning-bolt tail. Preserve its cartoon 3D shading, proportions and facial expression. Every pose must be the same individual and the same physical scale. All sprites face LEFT, including mirrored adaptations of the vine reference. True transparent background in every cell. No text, no numbers, no arrows, no panel frames, no floor, no scenery, no ground shadows, no border. No detached electricity, streaks, dust, rocks or floating particles: those are rendered separately by the game. Keep only the creature itself, including its complete fur, ears, paws and tail. Do not crop extremities. Arrange on a perfectly regular grid, equal cell sizes, no overlap, generous transparent gutters. Keep the creature's body/shoulder pivot at the same horizontal point in every cell; planted paw baseline is 85 percent down each cell. Use consistent character size rather than enlarging each pose to fill its cell. This is an animation asset, not an illustrated instructional sheet.
```

移动补充：

```text
WIDE LANDSCAPE atlas, exactly eight sprites in four columns by two rows, chronological row-major order matching the eight reference poses. 1 alert low idle with all four feet planted; 2 shoulder leans forward and back legs coil; 3 back legs push off, elbows bend; 4 front legs extend forward as body stretches; 5 airborne gallop, forelegs extended, hindlegs tucked; 6 front paws touch down, elbows bend to absorb contact; 7 hindlegs swing underneath into compressed push; 8 return to extended run matching frame3 for a seamless cyclic gait. All four limbs must articulate naturally across frames; tail follows with slightly delayed motion. The ground reference line stays fixed. No baked-in position translation across cells.
```

爪袭补充：

```text
LANDSCAPE atlas, exactly six sprites in three columns by two rows, chronological row-major order matching the claw sequence. 1 low ready stance; 2 deep shoulder crouch, toes spread and back legs compressed; 3 explosive lunge, back paws pushing and forelegs beginning to lift; 4 first claw slash with one leading front leg bent then extending forward and downward, shoulders twisting; 5 second slash with the opposite foreleg and counter-rotation of the shoulders, hips trailing; 6 sliding recovery with bent front elbows, hindfeet catching up and tail settling. Do not include the detached claw lightning arcs. Poses4 and5 must be visibly distinct actual limb positions, not identical art with a glow.
```

爪袭最终修正：

```text
Edit only the sprite framing of this six-pose 3-column by 2-row game animation atlas. Keep exactly the same six LEFT-facing silver-white Forest Thunder Beast character poses, colors and anatomy, with the complete blue lightning-bolt tail. Make every individual sprite 15 percent smaller around its own cell center so every claw, paw, fur tip, ear and tail has a generous transparent gutter within its cell. In particular restore complete claw tips in the lower middle sprite and complete rear paw in the lower left sprite. Never let any sprite cross a cell boundary. Remove all background halos, external glows, shadows and speckles; output true clean transparency and crisp natural alpha edges with only the six creatures. No new effects or text. No repositioning across cells or new design. Preserve the character and order.
```

攀藤补充：

```text
LANDSCAPE atlas, exactly six sprites in three columns by two rows, chronological row-major order. Adapt the vine storyboard but omit the vine itself: the engine supplies a dynamic vine. 1 crouch looking upward and left; 2 leap upward, body elongated, back legs pushing off and front paws reaching up-left; 3 both front paws curled gripping an invisible vine up-left, hindlegs drawing inward; 4 hang with elbows slightly bent, compact tucked hindlegs, tail curved behind; 5 coil into a forward diving turn, head angled down-left, front paws close to chest and hips rotate; 6 diving down-left, both front paws outstretched, hindlegs tucked and tail trailing upward-right. Preserve all anatomy. These are local body poses only; actual jump height comes from game physics. No actual branch, vine, leaves, effects or background.
```

折返补充：

```text
LANDSCAPE atlas, exactly six sprites in three columns by two rows, chronological row-major order. 1 extremely low stalking crouch; 2 acceleration with hindlegs pushing, front elbows bending; 3 stretched high-speed gallop, forepaws reaching and hindlegs tucked; 4 hard bank/turn with shoulders leaning, planted inside forepaw and bent opposite limbs, tail swinging as a counterweight; 5 brief coiled pause with head alert and feet spread to prepare the final flank burst; 6 final side lunge with one leading claw extended, other foreleg bent, hips pushing and tail trailing. Keep real fur and anatomy intact, no motion-blurred copy, no ghosts or external speed lines; game engine adds trails. All six should share one camera view and a clear LEFT-facing head.
```

雷暴补充：

```text
LANDSCAPE atlas, exactly six sprites in three columns by two rows, chronological row-major order. 1 low four-foot stance; 2 tail lifts and coils upright as shoulders lower; 3 body twists with hips turning and the lightning tail sweeping around behind the torso, feet braced; 4 stronger counter-twist, front legs flexing to brace against the discharge, tail swings in a wide arc; 5 peak release, compressed shoulders and planted paws, tail fully extended to the opposite side with slight perspective turn; 6 exhausted recovery into the same low stance as frame1, tail settling. There must be real body and tail articulation, not six identical standing sprites. Do not draw storm rings or lightning around the creature, those are engine effects.
```

生成结果中个别姿势的原图朝向和提示规格不同，因此用逐帧 `face` 正确翻转；实际地面基线也按图片逐帧标定，不盲用提示中的百分比。
