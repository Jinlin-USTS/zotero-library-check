# Zotero Library Check

一个本地优先的 Chrome 扩展：在 Web of Science（WOS）检索结果旁，标记论文是否已经存在于本机 Zotero 个人文库中。

## 功能

- 通过 Zotero Local API 只读访问个人文库，不需要 Zotero API Key。
- 在浏览器本地建立 DOI 和标题索引。
- 支持 DOI 精确匹配、标题精确匹配和高阈值相似标题提示。
- 适配 WOS 动态加载、翻页和结果更新。
- 排除“沉浸式翻译”插入的译文节点，并保留原始标题快照。
- 汇总当前页面的识别和匹配数量。
- 点击匹配标签，可尝试在 Zotero 中定位对应条目。
- 每五分钟检查文库版本；文库变化后自动重建索引。
  

## 安装

本项目目前通过 Chrome 的“加载已解压的扩展程序”方式安装。

1. 从 GitHub Releases 下载 `zotero-library-check-v*.zip` 并解压；也可以直接下载或克隆本仓库。
2. 启动 Zotero，并在“设置 → 高级”中启用“允许此计算机上的其他应用程序与 Zotero 通信”。
3. 在 Chrome 打开 `chrome://extensions`，开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择包含 `manifest.json` 的目录。
5. 点击工具栏中的扩展图标，再点击“刷新 Zotero 索引”。Chrome 请求本地网络权限时请选择“允许”。
6. 打开或刷新 Web of Science 检索结果页。

更详细的安装步骤和常见问题见 [安装与故障排查](docs/INSTALLATION.md)。

## 

## 状态含义

- `✓ Zotero 已有`：DOI 一致，或标准化标题一致且有年份/作者佐证。
- `≈ 可能已有`：标题相同或高度相似，但佐证信息不足以确定。
- `＋ 未收录`：当前索引中未发现可信匹配。
- `! Zotero 未连接`：Zotero 未运行、本地 API 未启用或索引尚未完成。

<img width="1905" height="1491" alt="image" src="https://github.com/user-attachments/assets/91bc4ded-d1b8-4525-9cb2-a53ae36a9c45" />
在文献附近显示输入状态，在右下角显示统计情况。

- 已适配其他插件：沉浸式翻译;easyScholar。

## 隐私与权限

扩展只连接本机 Zotero，并只在配置的 WOS 页面上读取论文元数据。文库索引保存在浏览器本地，不会上传到远程服务器。完整说明见 [隐私说明](PRIVACY.md)。

所需权限：

- `storage`：保存本地索引状态。
- `alarms`：定期检查 Zotero 文库是否更新。
- `http://127.0.0.1/*` 和 `http://localhost/*`：访问本机 Zotero Local API。

## 开发与测试

运行时没有第三方依赖。开发测试需要 Node.js 18 或更高版本：

```powershell
npm test
```

生成 GitHub Release 使用的 ZIP：

```powershell
npm run package
```

产物位于 `dist/zotero-library-check-v<版本号>.zip`。版本号读取自 `manifest.json`。

首次创建仓库和 GitHub Release 的完整步骤见 [发布到 GitHub](docs/RELEASING.md)。

## 项目结构

```text
manifest.json                 Chrome Manifest V3 配置
src/background/               Zotero 通信、本地索引与后台任务
src/content/                  WOS 页面识别和匹配结果展示
src/popup/                    扩展弹窗
src/shared/                   匹配算法
tests/                        Node.js 单元测试
docs/INSTALLATION.md          安装与故障排查
docs/RELEASING.md             GitHub 仓库与 Release 发布说明
scripts/package.ps1           发布包生成脚本
```
## 使用与注意事项
- 需要在后台持续运行Zotero。
- 当前只同步 Zotero 个人文库，不同步群组文库。
- WOS 页面结构可能随账号、地区和版本变化；页面未显示标签时，需要提供相应页面的脱敏 HTML 样本以更新适配器。
- 扩展只检查条目是否存在，不会向 Zotero 写入或自动导入论文。
- “在 Zotero 中定位”依赖系统已注册 `zotero://` 协议。
- 当前没有 Chrome Web Store 安装包，浏览器关闭开发者模式后可能提示开发者扩展。

## 许可证

本仓库暂未附加开源许可证。公开发布前，请由项目所有者选择合适的许可证；在许可证明确前，默认保留全部权利。

If you find it useful, buy me a coffee :) 
<img width="618" height="607" alt="image" src="https://github.com/user-attachments/assets/cd85f375-a8b6-451b-86b1-0678eb37eb96" />






