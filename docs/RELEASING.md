# 发布到 GitHub

## 创建仓库

当前项目目录还没有初始化 Git 仓库。先在 GitHub 新建一个空仓库，不要勾选自动创建 README、`.gitignore` 或许可证，然后在项目根目录执行：

```powershell
git init
git add .
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

如需公开源代码，请在首次发布前决定并添加许可证。GitHub 仓库公开并不自动授予他人复制、修改或分发代码的权利。

## 创建发布包

确认 `manifest.json` 和 `package.json` 中的版本号一致，然后执行：

```powershell
npm test
npm run package
```

生成的文件位于：

```text
dist/zotero-library-check-v0.1.0.zip
```

该 ZIP 中的顶层直接包含 `manifest.json`，用户解压后即可按安装文档加载。

## 创建 GitHub Release

1. 将代码推送到 GitHub。
2. 打开仓库的 **Releases** 页面，选择 **Draft a new release**。
3. 创建与扩展版本一致的标签，例如 `v0.1.0`。
4. Release 标题可写为 `Zotero Library Check v0.1.0`。
5. 上传 `dist/zotero-library-check-v0.1.0.zip`。
6. 在发布说明中列出主要功能、已知限制和升级注意事项。
7. 发布前下载 ZIP 做一次最终解压和加载测试。

## 后续版本

每次发布前：

1. 同步修改 `manifest.json` 与 `package.json` 的版本号。
2. 更新功能说明和已知限制。
3. 运行测试并重新打包。
4. 使用新的 Git 标签和 Release，不要覆盖旧版本附件。
