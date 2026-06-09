# 抽卡系统实机对照验证记录

> 验证日期：2026-06-09
> 验证环境：Chrome / Vite dev server (localhost:5176)
> 验证基线：`src/store/useGameStore.ts` + `src/pages/Shop.tsx` + `src/engine/constants.ts`

---

## 一、限定池过期前后按钮与仓库入口拦截

### 1.1 限定池过期 → 前端按钮禁用

| 验证路径 | 操作步骤 | 预期结果 | 实际结果 |
|----------|----------|----------|----------|
| 商店页限定池单抽按钮 | `limitedPool.endsAt = Date.now() - 86400000` → 刷新 → 点击「单抽 10💎」 | 按钮 `disabled`，无法点击 | ✅ 通过：按钮灰显且不可点击 |
| 商店页限定池十连按钮 | 同上 → 点击「十连 100💎」 | 按钮 `disabled`，无法点击 | ✅ 通过：按钮灰显且不可点击 |
| 结果弹窗「再来X连」按钮 | 过期池 → 已有结果弹窗 → 点击「再来1连」 | 按钮 `disabled` | ✅ 通过：`isPoolExpired` 纳入 disabled 判断 |

### 1.2 限定池过期 → 前端可视化提示

| 验证路径 | 操作步骤 | 预期结果 | 实际结果 |
|----------|----------|----------|----------|
| 倒计时组件 | 过期池 → 切换到限定Tab | 显示「限定池已结束」(红色) | ✅ 通过：红色倒计时 + 红色文字 |
| 过期警告区 | 同上 | 显示「⚠️ 限定池已过期，无法继续抽取」(红色边框) | ✅ 通过：红色警告区可见 |
| 未过期状态 | `endsAt = now + 7天` → 刷新 | 显示「限定池剩余时间: X天X时X分」(黄色) | ✅ 通过：黄色倒计时正常 |

### 1.3 限定池过期 → 后端拦截

| 验证路径 | 代码位置 | 拦截逻辑 | 验证结果 |
|----------|----------|----------|----------|
| `gachaLimited` | [useGameStore.ts#L792-L794](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L792-L794) | `throw new Error('Limited pool has ended')` | ✅ 代码审查通过：throw 阻止继续执行 |
| `gachaMulti(limited)` | [useGameStore.ts#L944-L946](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L944-L946) | `return { results: [], totalCost: 0 }` | ✅ 代码审查通过：空结果 + 零扣费 |
| `handleGacha` 前置守卫 | [Shop.tsx#L63](file:///d:/solo/6.6/xcf-175/src/pages/Shop.tsx#L63) | `if (type === 'limited' && expired) return` | ✅ 代码审查通过：最早拦截点 |

### 1.4 三层防御一致性

```
前端 handleGacha (最早) → 后端 gachaMulti (中间) → 后端 gachaLimited (最后)
        ↓                        ↓                         ↓
   直接 return           return 空 results             throw Error
```

三层均使用相同的判断条件：`poolType === 'limited' && endsAt && Date.now() > endsAt`

---

## 二、技能池保底触发后掉落稀有度与记录展示一致

### 2.1 保底触发验证

| 操作 | 前置条件 | 预期 | 实际 |
|------|----------|------|------|
| 技能单抽 | `pullsSinceR4=59, pullsSinceR5=89` (接近硬保底) | 触发5★保底，显示「保底」标签 | ✅ 通过：结果显示5★技能 + 「保底」标签 |
| 技能单抽 | 正常初始状态 | 不触发保底，无标签 | ✅ 通过：结果显示1★技能，无保底标签 |

### 2.2 掉落稀有度与记录展示一致性

**核心修复**：引入 `pickSkillTemplate` / `pickAnimalTemplate` / `pickPartTemplate` 三个函数，将抽卡分为两步：

1. `rolledRarity` = 由 `rollRarityWithPity` 决定的掷出稀有度
2. `actualRarity` = 模板真实稀有度（`template.rarity`）

**一致性保证**：

| 数据维度 | 使用的变量 | 代码位置 |
|----------|-----------|----------|
| 物品实际稀有度 (`item.rarity`) | `actualRarity` | [pickSkillTemplate#L199-L200](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L199-L200) |
| 抽卡记录稀有度 (`gachaRecord.rarity`) | `actualRarity` | [gachaSkill#L769](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L769) |
| 结果展示稀有度 (渲染星星/边框色) | 来自 `item.rarity` = `actualRarity` | [Shop.tsx renderResultItem](file:///d:/solo/6.6/xcf-175/src/pages/Shop.tsx#L112) |
| 保底计数器重置 | `rolledRarity` | [gachaSkill#L771-L773](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L771-L773) |
| 大保底消耗 | `rolledRarity` | [gachaLimited#L920](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L920) |
| `isPity` 标签 | `actualRarity >= 4` | [gachaSkill#L765](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L765) |

### 2.3 严格筛池验证

**旧逻辑**（按类型过滤）：
```typescript
SKILL_TEMPLATES.filter(s => {
  if (s.type === 'special') return rarity >= 3;
  if (s.type === 'buff' || s.type === 'debuff') return rarity >= 2;
  return true; // attack 类型不管稀有度
})
```
问题：掷出5★但`attack`类技能rarity=1也可入选，导致 `item.rarity=5` 但模板 `rarity=1` 的不一致。

**新逻辑**（严格稀有度匹配）：
```typescript
let pool = SKILL_TEMPLATES.filter(s => s.rarity === targetRarity); // 严格匹配
if (pool.length === 0) {
  pool = SKILL_TEMPLATES.filter(s => s.rarity <= targetRarity);   // 降级
}
if (pool.length === 0) {
  pool = SKILL_TEMPLATES;                                          // 全池兜底
}
return { template, actualRarity: template.rarity }; // 稀有度取模板值
```

| 验证项 | 操作 | 预期 | 实际 |
|--------|------|------|------|
| 技能池1★抽取 | 初始状态单抽 | 从 `rarity===1` 的技能中随机 | ✅ 通过 |
| 技能池5★保底 | `pullsSinceR5=89` → 单抽 | 从 `rarity===5` 的技能中随机(如有)，否则降级 | ✅ 通过：出现5★技能 |
| 抽卡记录一致性 | 查看技能Tab记录 | 记录稀有度 = 展示稀有度 = 物品稀有度 | ✅ 通过 |

### 2.4 四池统一验证

| 池类型 | 筛池函数 | 单抽函数 | gachaMulti分支 | 一致性 |
|--------|----------|----------|----------------|--------|
| 动物 | `pickAnimalTemplate` | `gachaAnimal` | `case 'animal'` | ✅ 均使用同一函数 |
| 部件 | `pickPartTemplate` | `gachaPart` | `case 'part'` | ✅ 均使用同一函数 |
| 技能 | `pickSkillTemplate` | `gachaSkill` | `case 'skill'` | ✅ 均使用同一函数 |
| 限定 | `pick*Template` (3种) | `gachaLimited` | `case 'limited'` | ✅ 均使用同一组函数 |

---

## 三、保底触发对照验证

### 3.1 保底计数器用 `rolledRarity` 而非 `actualRarity`

**原因**：保底机制保障掷出结果，无论池中是否有对应稀有度模板，保底都应被消耗。

| 场景 | rolledRarity | actualRarity | 计数器行为 |
|------|-------------|-------------|-----------|
| 正常5★出5★ | 5 | 5 | `pullsSinceR5 = 0` ✅ |
| 掷5★但池无5★模板 | 5 | 3 | `pullsSinceR5 = 0` ✅ (用rolledRarity) |
| 若误用actualRarity | 5 | 3 | `pullsSinceR5++` ❌ (永不重置) |

**验证方法**：全局搜索 `pullsSinceR[45]:` 共16处，全部使用 `rolledRarity`。

### 3.2 大保底 `guaranteedFeatured` 用 `rolledRarity`

**原因**：大保底是关于5★掷出结果的机制，应随5★掷出而消耗。

| 场景 | rolledRarity | isFeaturedR5 | 新 guaranteedFeatured |
|------|-------------|-------------|---------------------|
| 掷5★+UP | 5 | true | false (大保底消耗) |
| 掷5★+非UP | 5 | false | true (触发大保底) |
| 掷5★但池无5★ | 5 | false | true (触发大保底) |
| 未掷5★ | 4 | N/A | 不变 |

**代码位置**：
- 单抽: [useGameStore.ts#L920](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L920)
- 多抽: [useGameStore.ts#L1135](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L1135)

### 3.3 `isPity` 标签用 `actualRarity`（正确）

| 场景 | actualRarity | isPity 显示 | 原因 |
|------|-------------|------------|------|
| 保底出5★模板 | 5 | ✅ 显示 | 物品确实是高稀有度 |
| 保底出4★模板 | 4 | ✅ 显示 | 物品确实是高稀有度 |
| 保底掷5★但池只有3★ | 3 | ❌ 不显示 | 实际物品不是高稀有度，显示保底标签会误导用户 |

### 3.4 抽卡记录筛选修复

| 验证项 | 旧代码 | 新代码 | 验证结果 |
|--------|--------|--------|----------|
| 历史记录Tab筛选 | 使用 `activeTab` (页面主Tab) | 使用 `historyFilter` (独立状态) | ✅ 通过：4个筛选Tab可独立切换 |
| 记录统计 | 仅显示数量 | 显示数量+百分比 | ✅ 通过：如 "5★: 2 (4.0%)" |

---

## 四、前端按钮状态验证汇总

| 场景 | 动物池按钮 | 部件池按钮 | 技能池按钮 | 限定池按钮 |
|------|-----------|-----------|-----------|-----------|
| 金币/宝石充足 | ✅ 可点击 | ✅ 可点击 | ✅ 可点击 | ✅ 可点击 |
| 金币不足 | ❌ disabled | ❌ disabled | ❌ disabled | N/A (用宝石) |
| 宝石不足 | N/A | N/A | N/A | ❌ disabled |
| 池已过期 | N/A | N/A | N/A | ❌ disabled |
| 抽卡动画中 | ❌ disabled | ❌ disabled | ❌ disabled | ❌ disabled |

---

## 五、验证环境与复现方法

### 快速复现限定池过期

在浏览器控制台执行：
```javascript
const s = JSON.parse(localStorage.getItem('neon_colosseum_save_v1'));
s.limitedPool.endsAt = Date.now() - 86400000; // 设为1天前
localStorage.setItem('neon_colosseum_save_v1', JSON.stringify(s));
location.reload();
```

### 快速复现保底触发

```javascript
const s = JSON.parse(localStorage.getItem('neon_colosseum_save_v1'));
s.pityState.skill.pullsSinceR4 = 59;  // 接近4★硬保底(60)
s.pityState.skill.pullsSinceR5 = 89;  // 接近5★硬保底(90)
s.player.coins = 99999;               // 确保有足够金币
localStorage.setItem('neon_colosseum_save_v1', JSON.stringify(s));
location.reload();
```

### 恢复正常状态

```javascript
const s = JSON.parse(localStorage.getItem('neon_colosseum_save_v1'));
s.limitedPool.endsAt = Date.now() + 7 * 86400000; // 7天后
s.pityState.skill.pullsSinceR4 = 0;
s.pityState.skill.pullsSinceR5 = 0;
localStorage.setItem('neon_colosseum_save_v1', JSON.stringify(s));
location.reload();
```
