# 小站前端部分
页面在同一文档中依次排列：全屏 WebP 开场、正文第一屏、正文第二屏。每屏高度为一个视口，滚动条隐藏。开场右下角的「跳过动画」按钮可停止图片与曝光进度，直接转场到正文第一屏；返回开场后可再次使用。首页上方循环播放纯文字伪随机弹幕，左下角 48px 圆形「留言」入口支持悬停横向展开、点击固定，展开时高度不变。

留言默认使用前端预览数据。后端对接配置和请求格式见 [留言接口约定](docs/message-api.md)。

所有页面复用 `src/components/PageSurface.vue` 的半透明底面和导航，底面位于背景之上、标题与其他组件之下；不含模糊、反光或纹理。顶部近黑色渐变在 64px 内淡出，正文区域仅覆盖 2% 的轻微底色。导航总宽最多 260px，仅保留原有浅色文字。五个导航 HOME、BLOG、WORKS、IDEA、ME 可在任意一屏定位到正文第一屏的对应分类卡片。正文顶部为导航预留间距，弹幕从导航下方开始播放。

## 运行

```powershell
npm.cmd install
npm.cmd run serve
```

构建：`npm.cmd run build`。状态测试：`npm.cmd test`（Node.js 20 或更新版本）。
macOS / Linux 使用 `npm` 替代 `npm.cmd`。

## 文件位置

| 文件 | 内容 |
| --- | --- |
| `src/App.vue` | 三屏结构、图片视觉层、输入路由、焦点管理和样式 |
| `src/paging/gesture.mjs` | 累计幅度、方向判定、每个手势最多翻一屏 |
| `src/paging/slide-pager.mjs` | 淡出、遮罩、唯一跳转、带方向的滑入和动画清理 |
| `src/intro/sequence.mjs` | 0～1 开场进度、相邻帧透明度和最终帧退出条件 |
| `src/intro/image-cache.mjs` | 加载、解码、预加载和错误重试 |
| `src/intro/liquid-title.mjs` | 「Suki」艺术字遮罩、善逸羽织三角纹填充和随进度推进的分叉闪电 |
| `src/assets/fonts/` | 本地 Shojumaru 艺术字体、原 Kaushan Script 字体及 SIL Open Font License |
| `public/intro/01.webp`～`10.webp` | 当前这组新画面，按 `Desktop/11/1.png`～`10.png` 编号转换为 1920×1080 WebP，质量 92 |
| `public/index.html` | 第一张图片的高优先级预加载 |
| `src/main.js` | Vue 挂载入口 |
| `tests/sequence.test.mjs`、`tests/gesture.test.mjs` | 开场与滚轮手势测试 |

正文替换 `src/App.vue` 中 `content-one` 和 `content-two` 区块内部的标题内容即可。动画内容放在各自的 `.slide__visual` 中，区块本身用于计算停靠位置。
开场使用 `object-fit: cover` 居中裁切铺满视口。转场动画合计约 700ms，向下从下方 32px 滑入，向上从上方 32px 滑入。

## 哪一段判定翻页

`src/App.vue` 的 `feed()` 区分开场和正文。`playIntro()` 先推进图片，到最后一张后进入曝光阶段。满屏白光完成绘制后，下一次向下输入才进入正文。

正文把滚轮输入交给 `src/paging/gesture.mjs` 的 `push()`：

```js
if (Math.sign(delta) !== Math.sign(total)) total = 0
total += delta
if (Math.abs(total) < threshold) return 0
consumed = true
total = 0
return Math.sign(delta)
```

`threshold` 默认 90 像素；两次输入相隔超过 `idleMs = 220` 毫秒才视为新手势。
手势消费后，剩余输入不会再次翻页。转场期间 `block()` 持续记录输入时间，因此转场后的同一串惯性尾流也被忽略。
方向反转会清空尚未触发翻页的累计值。每次只能请求 `当前屏 + 1` 或 `当前屏 - 1`，第一页和最后一页的边界不会继续跳转。

## 哪一行执行跳转

`src/paging/slide-pager.mjs` 的 `goTo()` 中标有「唯一的翻页跳转」：

```js
const top = sections[target].getBoundingClientRect().top + window.scrollY
window.scrollTo({ top, left: 0, behavior: 'instant' })
```

执行顺序：

1. 旧视觉层淡出，全屏遮罩淡入至 `opacity: 1`。开场曝光后使用白色遮罩，正文区块之间使用黑色遮罩。
2. 遮罩不透明时准备目标视觉层。返回开场会在这里将图片进度和曝光进度都重置为 0，并恢复第一张图片。
3. 执行上述唯一一次 `scrollTo()`。滚动位置直接到达目标区块，不做真实平滑滚动。
4. 目标视觉层从 `translateY(32px)`（向下翻页）或 `translateY(-32px)`（向上翻页）恢复到 0 并淡入，同时淡去遮罩。

动画只改变视觉层和遮罩的 `opacity` / `transform`。初始化与窗口尺寸变化的 `align()` 单独用于对齐当前屏，不属于翻页转场。
转场使用浏览器 Web Animations API，并等待 `Animation.finished`；卸载时取消动画和 RAF、移除输入和媒体查询监听、恢复文档滚动锁和历史滚动设置。

## 开场进度

滚轮输入统一为像素后，每次限制在 ±160，并按 `target += delta / 1400` 累积目标。RAF 以 21ms 的缓动时间常数平滑推进显示进度 `p`。
`position = p * 9`，`lower = min(floor(position), 8)`，`mix = position - lower`，相邻两张透明度分别为 `1 - mix` 和 `mix`。
画面采用 `plus-lighter` 混合，防止交叉淡入淡出时额外变暗；图片未解码时不改变当前画面和显示进度，输入目标仍可累积。

中央标题沿用「Suki」，字号为 `clamp(2.9rem, 11.25vw, 10.35rem)`，使用本地 Shojumaru 刀锋笔触艺术字体；标题与填充画布均在半透明底面之上。HTML 保留可访问的 h1 和细金色描边，Canvas 用同字体遮罩裁切善逸羽织风格的黄橙渐变、白色三角纹、细斜墨痕与电光。字心随图片进度从下向上点亮，向上滚时退回；两侧亮白电芯、金色光晕的分叉闪电和电火花仅在进度变化时重绘。字体加载完成后重新测量，确保字形与填充对齐。

最后一张正常显示后，额外滚动 600 像素累计距离完成曝光。曝光复用同一个进度控制器，逐渐提高亮度、扩散暖白光晕，最后以不透明白色铺满视口。向上滚动先减弱曝光，再倒退图片。白光全部显示后，下一次向下输入才触发正文切屏。

方向键及 PageUp / PageDown 支持前进或后退。正文长按产生的重复按键不会继续翻页。触屏使用单指纵向滑动。
系统减少动态效果模式关闭缓动、淡入淡出、位移、电光游移与填充边缘波动及扩散光晕，保留静态闪电和羽织纹样，曝光使用直接更新的白色覆盖层，并响应系统偏好的实时变化。

参考：[Animation.finished](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finished)、[window.scrollTo](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo)、[Image.decode](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode)。
