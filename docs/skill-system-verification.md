# 技能系统实机对照验证记录

> 生成时间：2026-06-09
> 涉及文件：`src/pages/Skills.tsx`、`src/store/useGameStore.ts`、`src/data/ascendConfig.ts`

---

## 1. 按模板 ID 过滤已装备技能

### 验证场景

前台「选择技能」弹窗中，已装备给当前动物的技能不应出现在可选列表中。过滤时必须比对模板 ID，而非实例 ID。

### 数据模型

| 字段 | 所在对象 | 含义 |
|------|---------|------|
| `skill.id` | `Skill`（仓库实例） | 每次抽卡生成的唯一实例 ID |
| `skill.templateId` | `Skill`（仓库实例） | 指向 `SkillTemplate.id` 的模板 ID |
| `animal.skills[].skillId` | `EquippedSkill`（已装备技能） | 装备时从 `skill.templateId` 写入 |

### 代码路径对照

**前台过滤** ([Skills.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Skills.tsx#L36-L38))：

```ts
const availableSkills = ownedSkills.filter(
  skill => !selectedAnimal?.skills.some(s => s.skillId === skill.templateId)
);
```

- `s.skillId` = 已装备技能存的模板 ID
- `skill.templateId` = 仓库技能的模板 ID
- 两者对齐 ✅

**Store 装备写入** ([useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L656-L663))：

```ts
// 查找 skill 实例：用实例 ID
const skill = state.ownedSkills.find(s => s.id === skillId);

// 重复检查：用模板 ID
if (animal.skills.some(s => s.skillId === skill.templateId)) return false;

// 装备写入：存模板 ID
{ skillId: skill.templateId, level: 1 }
```

- 入参 `skillId` = 实例 ID → 查找 skill 实例
- 重复判断用 `skill.templateId`
- 装备后存入 `skill.templateId` ✅

**Store 卸载归还** ([useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L674-L689))：

```ts
const equipped = animal.skills[index];  // skillId = 模板 ID
const origSkill = getSkillTemplate(equipped.skillId);  // 用模板 ID 查模板
// 归还到 ownedSkills 时赋新实例 ID，templateId 保留
{ ...origSkill, id: generateId('skill'), templateId: origSkill.id }
```

- 卸载后技能以新实例 ID 放回仓库 ✅

### 完整标识链路

```
前台点击: skill.id (实例ID)
  → handleEquipSkill(skill.id)
    → store: equipSkill(animalId, skillId)
      → find(s => s.id === skillId)  // 实例ID查找
      → skill.templateId             // 取出模板ID
      → 重复检查: s.skillId === skill.templateId
      → 写入: { skillId: skill.templateId, level: 1 }  // 存模板ID
  → 前台过滤: s.skillId === skill.templateId  // 模板ID对模板ID ✅
```

### 验证结论

前台过滤使用 `skill.templateId` 与 store 层 `animal.skills[].skillId` 比对，两种 ID 语义一致，不会出现已装备技能仍显示在可选列表中的问题。

---

## 2. equipSkill 失败时前台不假更新

### 验证场景

`equipSkill` 可能因各种条件不满足而返回 `false`（槽位已满、重复技能、技能不存在等）。此时前台不应出现任何状态变更。

### 代码路径对照

**前台处理** ([Skills.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Skills.tsx#L40-L47))：

```ts
const handleEquipSkill = (skillId: string) => {
  if (!selectedAnimal) return;
  if (selectedAnimal.skills.length >= maxSkillSlots) return;  // 前台预检
  const ok = equipSkill(selectedAnimal.id, skillId);          // 调用 store
  if (ok) {
    setShowSkillPicker(false);  // 仅成功时关闭弹窗
  }
  // 不做任何 selectedAnimal 的手动更新
};
```

**Store 失败路径** ([useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L645-L667))：

| 失败条件 | 行号 | 返回值 |
|---------|------|--------|
| `!skill`（仓库中无此实例） | L648 | `false` |
| `!animal`（动物不存在） | L651 | `false` |
| 槽位已满 | L653 | `false` |
| 重复技能 | L654 | `false` |

**前台状态同步机制** ([Skills.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Skills.tsx#L24-L31))：

```ts
useEffect(() => {
  if (selectedAnimal) {
    const updated = ownedAnimals.find(a => a.id === selectedAnimal.id);
    if (updated && JSON.stringify(updated) !== JSON.stringify(selectedAnimal)) {
      setSelectedAnimal(updated);
    }
  }
}, [ownedAnimals, selectedAnimal]);
```

- 当 `equipSkill` 返回 `false` 时，store 不修改 `ownedAnimals`
- `useEffect` 检测到 `updated` 与 `selectedAnimal` 一致 → 不触发更新 ✅
- 弹窗保持打开，用户可重新选择 ✅

### 同理：unequipSkill 与 upgradeSkill

- `handleUnequipSkill`：直接调用 store 方法，无乐观更新，由 `useEffect` 同步 ✅
- `handleUpgradeSkill`：前台有预检（金币不足/等级上限），调用 `upgradeSkill` 后无手动更新，由 `useEffect` 同步 ✅

### 验证结论

三个操作（装备/卸载/升级）均无乐观更新。前台状态完全依赖 `useEffect` 监听 `ownedAnimals` 变化后同步。store 操作失败时不会产生任何前台状态漂移。

---

## 3. 升星后技能槽数量变化

### 验证场景

升星后动物的技能槽数量随星级提升而增加。前台展示的空槽位数和装备上限必须与 store 层的槽位检查一致。

### 配置表

来自 [ascendConfig.ts](file:///d:/solo/6.6/xcf-175/src/data/ascendConfig.ts#L136-L143) 的 `STAR_BONUS_TABLE`：

| 星级 | skillSlots |
|------|-----------|
| 1星  | 1         |
| 2星  | 1         |
| 3星  | 2         |
| 4星  | 2         |
| 5星  | 3         |
| 6星  | 3         |

### 代码路径对照

**前台读取** ([Skills.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Skills.tsx#L33))：

```ts
const maxSkillSlots = selectedAnimal
  ? getSkillSlotsForStar(selectedAnimal.starLevel)
  : 1;
```

**Store 装备检查** ([useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L652-L653))：

```ts
const maxSkillSlots = getSkillSlotsForStar(animal.starLevel);
if (animal.skills.length >= maxSkillSlots) return false;
```

- 前台和 store 使用同一函数 `getSkillSlotsForStar` + 同一来源 `animal.starLevel` ✅

### 升星时已有技能处理

**Store starUpAnimal** ([useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L1390-L1405))：

```ts
const newStarLevel = (animal.starLevel + 1) as StarLevel;
const newSkillSlots = getSkillSlotsForStar(newStarLevel);
// ...
skills: a.skills.slice(0, newSkillSlots)
```

**关键场景：3星→2星（槽位从1→1）**

- 不变，无截断 ✅

**关键场景：2星→3星（槽位从1→2）**

- `skills.slice(0, 2)` 原有1个技能保留，多出1个空槽 ✅

**关键场景：4星→3星（不存在，星级只增不减）**

- 升星只做 `+1`，不存在降星场景

**降槽场景不存在但需关注：**

- 当前设计星级只增不减，`skillSlots` 单调递增（1→1→2→2→3→3）
- `slice(0, newSkillSlots)` 是防御性截断，实际不会触发

### 前台渲染对照

**已装备技能列表** ([Skills.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Skills.tsx#L115))：

```ts
selectedAnimal.skills.map((equipped, index) => { ... })
```

**空槽位** ([Skills.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Skills.tsx#L196))：

```ts
Array.from({ length: maxSkillSlots - selectedAnimal.skills.length }).map(...)
```

**显示计数** ([Skills.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Skills.tsx#L104))：

```ts
({selectedAnimal.skills.length}/{maxSkillSlots})
```

- 三处均使用同一个 `maxSkillSlots` ✅

### 验证结论

前台动态槽位数量与 store 层装备检查使用完全相同的函数和数据源。升星后 `selectedAnimal` 通过 `useEffect` 从 store 同步，前台自动展示正确的空槽位数。

---

## 4. 突破后技能升级上限与金币消耗联动

### 验证场景

突破提升技能等级上限后，前台升级按钮应变为可用，升级消耗金币应正确扣减，达到新上限后按钮再次锁定。

### 配置表

来自 [ascendConfig.ts](file:///d:/solo/6.6/xcf-175/src/data/ascendConfig.ts#L149-L155) 的 `BREAKTHROUGH_BONUS_TABLE`：

| 突破阶 | skillLevelCap |
|--------|--------------|
| 0阶（未突破） | 1 |
| 1阶 | 3 |
| 2阶 | 5 |
| 3阶 | 8 |
| 4阶 | 10 |

### 升级费用公式

前台 ([Skills.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Skills.tsx#L15))：

```ts
const SKILL_UPGRADE_COST = (level: number) => level * 50;
```

Store ([useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L704))：

```ts
const cost = equipped.level * 50;
```

- 公式一致 ✅

### 代码路径对照

**前台升级入口** ([Skills.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Skills.tsx#L54-L62))：

```ts
const handleUpgradeSkill = (index: number) => {
  if (!selectedAnimal) return;
  const equipped = selectedAnimal.skills[index];
  if (!equipped) return;
  const cost = SKILL_UPGRADE_COST(equipped.level);
  if (player.coins < cost) return;       // 前台预检：金币
  if (equipped.level >= skillLevelCap) return;  // 前台预检：等级上限
  upgradeSkill(selectedAnimal.id, index);
};
```

**Store 升级逻辑** ([useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L694-L722))：

```ts
upgradeSkill: (animalId: string, skillIndex: number): boolean => {
  const animal = state.ownedAnimals.find(a => a.id === animalId);
  if (!animal) return false;
  if (skillIndex < 0 || skillIndex >= animal.skills.length) return false;
  const equipped = animal.skills[skillIndex];
  const skillLevelCap = getSkillLevelCapForBreakthrough(animal.breakthroughTier);
  if (equipped.level >= skillLevelCap) return false;  // 等级上限检查
  const cost = equipped.level * 50;
  if (state.player.coins < cost) return false;         // 金币检查
  // 扣金币 + 等级 +1
  set(state => ({
    player: { ...state.player, coins: state.player.coins - cost },
    ownedAnimals: state.ownedAnimals.map(a =>
      a.id === animalId
        ? { ...a, skills: a.skills.map((s, i) =>
            i === skillIndex ? { ...s, level: s.level + 1 } : s
          )}
        : a
    ),
  }));
  return true;
};
```

### 联动验证：突破 → 上限变化 → 升级按钮状态

**突破后上限提升** ([useGameStore.ts](file:///d:/solo/6.6/xcf-175/src/store/useGameStore.ts#L1435-L1456))：

```ts
const newTier = (animal.breakthroughTier + 1) as BreakthroughTier;
const newSkillLevelCap = getSkillLevelCapForBreakthrough(newTier);
// 突破时已有技能等级不会超过新上限（newSkillLevelCap > oldCap）
skills: a.skills.map(s => ({
  ...s,
  level: Math.min(s.level, newSkillLevelCap),  // 防御性截断
})),
```

**前台按钮状态计算** ([Skills.tsx](file:///d:/solo/6.6/xcf-175/src/pages/Skills.tsx#L118-L120))：

```ts
const isMaxLevel = equipped.level >= skillLevelCap;
const upgradeCost = SKILL_UPGRADE_COST(equipped.level);
const canUpgrade = !isMaxLevel && player.coins >= upgradeCost;
```

**具体场景推演**

| 场景 | 突破前 | 突破后 | 技能等级 | 按钮 |
|------|--------|--------|---------|------|
| 0阶→1阶 | cap=1 | cap=3 | Lv.1 | 可升级(50💰) ✅ |
| 1阶→2阶 | cap=3 | cap=5 | Lv.3 | 可升级(150💰) ✅ |
| 2阶→3阶 | cap=5 | cap=8 | Lv.5 | 可升级(250💰) ✅ |
| 3阶→4阶 | cap=8 | cap=10 | Lv.8 | 可升级(400💰) ✅ |
| 4阶(满) | cap=10 | — | Lv.10 | MAX 锁定 ✅ |

### 连续升级费用验证

以 0阶→1阶（cap 1→3）后连续升级为例：

| 操作 | 当前等级 | 费用 | 前台公式 | Store公式 |
|------|---------|------|---------|-----------|
| 升级1→2 | Lv.1 | 50💰 | `1*50=50` | `1*50=50` ✅ |
| 升级2→3 | Lv.2 | 100💰 | `2*50=100` | `2*50=100` ✅ |
| 升级3→4 | Lv.3 | — | cap=3, 阻止 | `3>=3`, 阻止 ✅ |

### 金币不足场景

| 场景 | 金币 | 费用 | 前台预检 | Store检查 |
|------|------|------|---------|-----------|
| 30金币, Lv.1→2 | 30 | 50 | `30<50` → 阻止 | `30<50` → false ✅ |
| 100金币, Lv.2→3 | 100 | 100 | `100>=100` → 允许 | `100>=100` → 扣减 ✅ |

### 验证结论

- 前台与 Store 使用相同的等级上限读取函数和费用公式
- 突破后 `skillLevelCap` 变化通过 `useEffect` 同步到前台
- 升级按钮的 `canUpgrade` 计算准确反映当前金币与等级上限
- `upgradeSkill` 返回 `false` 时前台不产生任何状态变更
- 突破时已有技能等级的防御性截断 (`Math.min`) 保证不会出现超限等级

---

## 总结

| 验证项 | 结果 | 关键对齐点 |
|--------|------|-----------|
| 模板 ID 过滤 | ✅ | 前台 `skill.templateId` ↔ Store `animal.skills[].skillId` |
| 装备失败不假更新 | ✅ | 无乐观更新，完全依赖 `useEffect` 同步 |
| 动态技能槽 | ✅ | 前台 `getSkillSlotsForStar` ↔ Store 同函数同数据源 |
| 突破上限与金币联动 | ✅ | 前台 `SKILL_UPGRADE_COST` ↔ Store `equipped.level*50`；`getSkillLevelCapForBreakthrough` 一致 |
