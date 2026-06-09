# 重复模板部件精炼对照验证记录

> 验证日期：2026-06-09
> 验证基线：`src/types/index.ts`（EquippedPart.instanceId）、`src/store/useGameStore.ts`（refinePart / equipPart / loadSave）
> 修复提交：存档版本 7 → 8

---

## 一、问题背景

### 1.1 旧版 Bug

`refinePart` 原先通过**模板 ID + 品质**匹配已装备部件：

```ts
// 旧代码（已删除）
const animalUsing = state.ownedAnimals.find(a =>
  a.parts.some(ep => ep.partId === part.templateId && ep.quality === currentQuality)
);
```

当同一模板、同品质的部件被多只动物分别装备时，精炼仓库中的实例会**误改所有匹配的已装备部件**。

### 1.2 修复方案

`EquippedPart` 新增 `instanceId` 字段，装备时写入部件实例 ID，精炼时按 `instanceId` 精确匹配。

---

## 二、数据模型对照

### 2.1 字段映射

| 字段 | 所在对象 | 含义 | 生成时机 |
|------|---------|------|---------|
| `Part.id` | `Part`（仓库部件实例） | 抽卡时 `generateId('part')` 生成，全局唯一 | `gachaPart` / `gachaMulti` / `gachaLimited` |
| `Part.templateId` | `Part`（仓库部件实例） | 指向 `PartTemplate.id`，同一模板可重复 | 同上 |
| `Part.quality` | `Part`（仓库部件实例） | 抽卡时 `rollPartQuality` 生成，可被精炼提升 | 同上 |
| `EquippedPart.partId` | `EquippedPart`（已装备部件） | = 部件的 `templateId`，用于查找模板属性 | `equipPart` |
| `EquippedPart.instanceId` | `EquippedPart`（已装备部件） | = 部件的 `Part.id`，唯一标识实例 | `equipPart` |
| `EquippedPart.quality` | `EquippedPart`（已装备部件） | 从 `Part.quality` 拷贝，精炼时同步更新 | `equipPart` / `refinePart` |

### 2.2 生命周期

```
抽卡 → Part 实例诞生（id=X, templateId=T, quality=Q）
  ↓
装备 → ownedParts 移除 X；animal.parts 新增 {partId:T, instanceId:X, quality:Q}
  ↓
卸载 → animal.parts 移除；ownedParts 新增 {id:generateId(), templateId:T, quality:Q}
         ⚠️ 卸载时 Part.id 重新生成，与原 instanceId 不再相同
  ↓
精炼（仓库中）→ ownedParts 中 part.id=X 的 quality+1
                 同时检查所有 animal.parts，instanceId=X 的 quality+1
```

---

## 三、代码路径对照

### 3.1 装备写入 instanceId

**[useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L609-L615)**：

```ts
const equippedData: EquippedPart = {
  partId: part.templateId,   // 模板 ID
  instanceId: part.id,       // 实例 ID ← 关键修复点
  slot,
  quality: part.quality,
  setId: part.setId,
};
```

- `part.id` = 仓库中部件实例的唯一 ID
- 装备后该实例从 `ownedParts` 中移除

**[Lineup.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Lineup.tsx#L86-L95)** 前台乐观更新：

```ts
const partInstance = ownedParts.find(p => p.id === partId);
// ...
{ partId: partInstance.templateId, instanceId: partId, slot, quality: partInstance.quality, setId: partInstance.setId }
```

- 前台构造 `EquippedPart` 时 `partId` = 模板 ID，`instanceId` = 实例 ID ✅ 与 Store 一致

### 3.2 精炼精确匹配

**[useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L687-L702)**：

```ts
// 步骤1：更新仓库中指定实例
set(state => ({
  player: { ...state.player, coins: state.player.coins - cost },
  ownedParts: state.ownedParts.map(p =>
    p.id === partId ? { ...p, quality: nextQuality } : p   // ← 按实例 ID
  ),
}));

// 步骤2：更新已装备引用
set(state => ({
  ownedAnimals: state.ownedAnimals.map(a => ({
    ...a,
    parts: a.parts.map(ep =>
      ep.instanceId === partId                              // ← 按实例 ID
        ? { ...ep, quality: nextQuality }
        : ep
    ),
  })),
}));
```

- 仓库匹配：`p.id === partId`（实例 ID 精确匹配）✅
- 已装备匹配：`ep.instanceId === partId`（实例 ID 精确匹配）✅
- 不会误改同模板同品质的其他实例 ✅

### 3.3 卸载重建实例

**[useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L645-L671)**：

```ts
const equipped = animal.parts.find(p => p.slot === slot);
// ...
set(state => ({
  ownedParts: [...state.ownedParts, {
    ...origPart,
    id: generateId('part'),            // ← 新实例 ID
    templateId: origPart.id,
    quality: equippedQuality,          // ← 保留卸载时的品质
    setId: equippedSetId,
  }],
}));
```

- 卸载后 `Part.id` 与原 `EquippedPart.instanceId` 不再相同
- 重新装备会产生新的 `instanceId` 绑定 ✅

### 3.4 存档迁移

**[useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L361-L370)**：

```ts
// 模板未找到分支
return { ...ep, partId: match.id, instanceId: ep.instanceId || generateId('part') };

// 正常分支
return {
  ...ep,
  instanceId: ep.instanceId || generateId('part'),   // ← 旧存档补生成
  quality: ep.quality || 1 as PartQuality,
  setId: ep.setId || template?.setId,
};
```

- 旧存档无 `instanceId` → 自动生成随机 ID
- 生成后同一动物的每个已装备部件 `instanceId` 各不相同 ✅
- 迁移后精炼按 `instanceId` 匹配，不会误改（虽然旧数据的 `instanceId` 无法对应到任何仓库部件，但旧部件已装备、不在仓库中，不会被精炼到）✅

---

## 四、场景验证

### 场景 A：同模板同品质，一在仓库一已装备，精炼仓库实例

**前置条件**：
- 仓库有部件 A：`id=A, templateId=T, quality=1`
- 动物装备部件 B：`{partId:T, instanceId:B, quality=1}`
- A 和 B 同模板同品质，但实例 ID 不同

**操作**：`refinePart('A')`

**代码追踪**：

| 步骤 | 代码 | 匹配条件 | 结果 |
|------|------|---------|------|
| 1. 查找仓库部件 | `ownedParts.find(p => p.id === 'A')` | `p.id === 'A'` | 找到 A ✅ |
| 2. 更新仓库 | `ownedParts.map(p => p.id === 'A' ? ...p, quality: 2 : p)` | `p.id === 'A'` | 仅 A 的 quality 变为 2 ✅ |
| 3. 更新已装备 | `ep.instanceId === 'A' ? ...ep, quality: 2 : ep` | `ep.instanceId === 'A'` | B 的 instanceId 是 'B' ≠ 'A'，不匹配，B 的 quality 保持 1 ✅ |

**结果**：A 的 quality 从 1 → 2，B 的 quality 不变 ✅

### 场景 B：同模板同品质，两个都在仓库，精炼其中一个

**前置条件**：
- 仓库有部件 A：`id=A, templateId=T, quality=1`
- 仓库有部件 B：`id=B, templateId=T, quality=1`

**操作**：`refinePart('A')`

**代码追踪**：

| 步骤 | 代码 | 匹配条件 | 结果 |
|------|------|---------|------|
| 1. 查找仓库部件 | `ownedParts.find(p => p.id === 'A')` | `p.id === 'A'` | 找到 A ✅ |
| 2. 更新仓库 | `ownedParts.map(p => p.id === 'A' ? ...p, quality: 2 : p)` | `p.id === 'A'` | B 的 id 是 'B' ≠ 'A'，不匹配，仅 A 变为 2 ✅ |
| 3. 更新已装备 | `ep.instanceId === 'A'` | 无已装备部件 | 跳过 ✅ |

**结果**：A 的 quality 从 1 → 2，B 的 quality 不变 ✅

### 场景 C：同模板同品质，两个分别装备在不同动物，仓库中精炼对应的那个

> 注意：已装备部件不在 `ownedParts` 中，`refinePart` 第一步 `ownedParts.find(p => p.id === partId)` 会返回 `false`。
> 因此已装备部件无法直接通过 `refinePart` 精炼——这是设计限制而非 Bug。

**前置条件**：
- 动物 X 装备部件 A：`{partId:T, instanceId:A, quality=1}`
- 动物 Y 装备部件 B：`{partId:T, instanceId:B, quality=1}`

**操作**：`refinePart('A')`

**代码追踪**：

| 步骤 | 代码 | 匹配条件 | 结果 |
|------|------|---------|------|
| 1. 查找仓库部件 | `ownedParts.find(p => p.id === 'A')` | `p.id === 'A'` | A 已不在仓库，返回 `undefined` |
| 2. 提前返回 | `if (!part) return false` | — | 函数返回 `false`，不做任何修改 ✅ |

**结果**：两只动物的部件 quality 均不变 ✅（符合预期：已装备部件需先卸载才能精炼）

### 场景 D：部件已装备，仓库中无同模板部件，精炼其他不相关部件

**前置条件**：
- 动物装备部件 A：`{partId:T1, instanceId:A, quality=1}`
- 仓库有部件 C：`id=C, templateId=T2, quality=1`（不同模板）

**操作**：`refinePart('C')`

**代码追踪**：

| 步骤 | 代码 | 匹配条件 | 结果 |
|------|------|---------|------|
| 1. 查找仓库部件 | `ownedParts.find(p => p.id === 'C')` | `p.id === 'C'` | 找到 C ✅ |
| 2. 更新仓库 | `ownedParts.map(p => p.id === 'C' ? ...p, quality: 2 : p)` | `p.id === 'C'` | 仅 C 变为 2 ✅ |
| 3. 更新已装备 | `ep.instanceId === 'C'` | A 的 instanceId 是 'A' ≠ 'C' | A 不受影响 ✅ |

**结果**：仅 C 的 quality 变为 2，A 不受影响 ✅

### 场景 E：旧存档迁移后精炼

**前置条件**：
- 旧存档动物有两个已装备部件，均无 `instanceId` 字段

**代码追踪**：

| 步骤 | 代码 | 结果 |
|------|------|------|
| 1. loadSave 迁移 | `instanceId: ep.instanceId \|\| generateId('part')` | 两个部件分别获得不同的随机 instanceId ✅ |
| 2. 部件在仓库中 | 旧存档中部件已装备，不在仓库 | `refinePart` 无法找到，返回 `false` ✅ |
| 3. 卸载后重新装备 | 卸载时生成新 `Part.id`，装备时写入新 `instanceId` | 新 instanceId 正确绑定 ✅ |

**结果**：旧存档迁移后 instanceId 互不相同，精炼逻辑安全 ✅

---

## 五、对照验证总结

| 场景 | 精炼目标 | 同模板同品质的其他实例是否被误改 | 验证结果 |
|------|---------|-------------------------------|---------|
| A. 仓库 + 已装备 | 仓库实例 | 否（instanceId 不同，精确匹配） | ✅ 通过 |
| B. 仓库 + 仓库 | 仓库实例1 | 否（Part.id 不同，精确匹配） | ✅ 通过 |
| C. 已装备 + 已装备 | 已装备实例 | 不可操作（不在仓库，refinePart 返回 false） | ✅ 通过 |
| D. 不同模板 | 仓库实例 | 否（instanceId 完全不同） | ✅ 通过 |
| E. 旧存档迁移 | — | 否（迁移后 instanceId 各不相同） | ✅ 通过 |

---

## 六、关键修复点清单

| # | 文件 | 行号 | 修复内容 |
|---|------|------|---------|
| 1 | [types/index.ts](file:///d:/solo/6.6/xcf-175/src/types/index.ts#L219-L225) | L221 | `EquippedPart` 新增 `instanceId: string` 必填字段 |
| 2 | [useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L609-L615) | L611 | `equipPart` 写入 `instanceId: part.id` |
| 3 | [useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L687-L702) | L698 | `refinePart` 改用 `ep.instanceId === partId` 精确匹配 |
| 4 | [useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L361) | L361 | `loadSave` 模板未找到分支补 `instanceId` |
| 5 | [useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L365-L370) | L367 | `loadSave` 正常分支补 `instanceId` |
| 6 | [useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L438) | L438 | 存档版本 7 → 8 |
| 7 | [Lineup.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Lineup.tsx#L86-L95) | L93 | 前台乐观更新正确构造 `EquippedPart`（`partId` = 模板 ID，`instanceId` = 实例 ID） |
