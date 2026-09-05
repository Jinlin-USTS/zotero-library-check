# 安装与故障排查

## 系统要求

- 桌面版 Zotero，且 Zotero 在使用扩展时保持运行。
- 支持 Manifest V3 的 Chrome 浏览器。
- 能正常访问 Web of Science 的账号或机构网络。

只有开发和运行测试时才需要 Node.js；普通用户安装扩展不需要 Node.js 或 `npm install`。

## 从发布包安装

1. 在 GitHub 仓库的 **Releases** 页面下载 `zotero-library-check-v*.zip`。
2. 把 ZIP 解压到固定目录。安装后不要删除或移动该目录，否则 Chrome 无法继续加载扩展。
3. 启动 Zotero。
4. 打开 Zotero“设置 → 高级”，启用“允许此计算机上的其他应用程序与 Zotero 通信”。不同 Zotero 版本中的文字可能略有差异。
5. 在 Chrome 地址栏输入 `chrome://extensions`。
6. 开启页面右上角的“开发者模式”。
7. 点击“加载已解压的扩展程序”，选择刚才解压的、直接包含 `manifest.json` 的目录。
8. 将扩展固定到工具栏，点击扩展图标，再点击“刷新 Zotero 索引”。
9. Chrome 弹出本地网络访问提示时，选择“允许”。
10. 打开或刷新 WOS 检索结果页。

首次建立索引所需时间取决于 Zotero 条目数量。弹窗显示“已连接本机 Zotero”后，扩展即可使用。

## 从源码安装

```powershell
git clone <你的 GitHub 仓库地址>
cd zotero-library-check
npm test
```

随后打开 `chrome://extensions`，加载仓库根目录。扩展没有运行时第三方依赖，因此不需要执行 `npm install`。

## 更新

### 发布包用户

1. 下载并解压新版本，覆盖原来的扩展目录。
2. 在 `chrome://extensions` 找到本扩展，点击“重新加载”。
3. 打开扩展弹窗并刷新 Zotero 索引。

### 源码用户

拉取最新代码后，在 `chrome://extensions` 点击“重新加载”。

## 常见问题

### 显示“Zotero 未连接”

- 确认桌面版 Zotero 已启动。
- 确认 Zotero 允许本机其他应用程序通信。
- 在扩展弹窗中再次点击“刷新 Zotero 索引”。
- 如果 Chrome 曾拒绝本地网络权限，请在浏览器的网站/扩展权限设置中重新允许。
- 使用 VPN、代理或 PAC 脚本时，确保 `127.0.0.1` 和 `localhost` 直连、不经过代理。

扩展优先访问 `http://127.0.0.1:23119/api/`，失败后尝试 `http://localhost:23119/api/`。

### WOS 页面没有显示标签

- 刷新 WOS 页面，并确认扩展在 `chrome://extensions` 中已启用且没有报错。
- 等待 WOS 检索结果加载完成。
- 如果 WOS 更新了页面结构，请提交 Issue，并附上浏览器版本、WOS 页面类型以及已删除个人信息的 HTML 样本或截图。

### 匹配结果不准确

- 优先检查 WOS 和 Zotero 中的 DOI 是否正确。
- 没有 DOI 时，扩展会使用标准化标题、年份和第一作者辅助判断。
- `≈ 可能已有` 是需要人工核对的提示，不代表确定匹配。
- 修改 Zotero 元数据后，点击“刷新 Zotero 索引”。

### 点击标签无法打开 Zotero 条目

确认操作系统已将 `zotero://` 协议关联到 Zotero。即使无法跳转，匹配状态本身仍然有效。

## 卸载

在 `chrome://extensions` 找到本扩展并点击“移除”。Chrome 会同时清除扩展保存在浏览器中的本地索引；Zotero 文库不会受到影响。
