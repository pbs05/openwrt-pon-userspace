# pon-userspace 补丁与优化记录

起始：2026-11-15
范围：只记录 `DenzelVincent/openwrt-pon-userspace` 的 `main`/`bugfix` 分支携带的补丁与优化。固件侧见 PonWrt `docs/2026-11-15-bugfix分支补丁与优化记录.md`，驱动侧见 `openwrt-pon-drivers` 同名文档。

维护口径：

- 状态只写已核实的事实：`已合入`（main）或`仅 bugfix`；`已推送`或`未推送`；`已验收`或`待验收`。
- 同步判据：`main` 的全部提交必须已在 `bugfix`。合并冲突若只落在版本号，取 bugfix 侧更高值再 +1。
- 新增一条优化只追加表格一行，写清提交、状态、验收要点。

## 一、仅 bugfix（未验证，不向上合并）

| 项 | 提交 | 状态 | 说明 |
|---|---|---|---|
| LOID 补零方向 / 链路层原始报文 / pon-reopen | bugfix `e5f85de` | 仅 bugfix（main 无）、已推送；待验收 | LOID 左/右补零可选，兼容要求特定方向的 OLT；展示链路层原始报文；提供 EPON LLID 卡死时线路重开的用户态入口（驱动侧 worker 见 drivers `d574aed`） |

## 二、待办

- 实机验收 `e5f85de`：需要特定 LOID 补零方向的 EPON OLT 上验注册；LLID 卡死场景验 pon-reopen 入口。