# GitHub Pages 配置指南

## 🚨 重要提示

当前 GitHub Actions 部署失败是因为 GitHub Pages 未正确配置。请按照以下步骤配置：

## 📋 配置步骤

### 1. 启用 GitHub Pages

1. 进入您的 GitHub 仓库页面
2. 点击 **Settings** 标签
3. 在左侧菜单中找到 **Pages**
4. 在 "Build and deployment" 部分中：
   - **Source**: 选择 **GitHub Actions**
   - 点击 **Save**

### 2. 验证权限设置

确保仓库具有必要的权限：

1. 进入 **Settings** → **Actions** → **General**
2. 在 "Workflow permissions" 部分：
   - 选择 **Read and write permissions**
   - ✅ 勾选 **Allow GitHub Actions to create and approve pull requests**
   - ✅ 勾选 **Allow GitHub Actions to run approve pull requests**
   - 点击 **Save**

### 3. 检查分支保护规则（如果适用）

如果您的 main 分支有保护规则：

1. 进入 **Settings** → **Branches**
2. 检查 main 分支的保护规则
3. 确保 GitHub Actions 可以推送到分支

## 🛠️ 自动化脚本配置

修改后的工作流现在包含：

### ✅ 错误处理
- 自动检测 GitHub Pages 配置状态
- 提供清晰的错误信息和解决方案
- 失败时不会阻止 PR 预览构建

### ✅ 双作业模式
- **build-and-deploy**: 仅在 main 分支推送时执行，包含完整部署
- **build-preview**: 为 PR 创建构建预览，不部署到 Pages

### ✅ 构建状态报告
- PR 构建完成后在 Summary 中显示详细信息
- 包含构建时间、版本等元信息

## 🔄 重新触发部署

配置完成后：

1. 提交任意更改到 main 分支，或
2. 手动触发工作流：
   - 进入 **Actions** 标签
   - 选择 "Build and Deploy to GitHub Pages"
   - 点击 "Run workflow"

## 📊 部署状态检查

部署成功后：

1. 在仓库的 **Actions** 标签中查看工作流状态
2. 成功的部署会显示绿色 ✅ 标记
3. 部署完成后，可以在 **Settings** → **Pages** 中看到站点 URL

## 🌐 访问部署的站点

部署成功后，您的站点将可以通过以下 URL 访问：

```
https://[您的用户名].github.io/vue3-mars3d-template/
```

## ❓ 常见问题

### Q: 仍然收到 "Not Found" 错误
A: 请检查：
- 仓库是否为公开仓库
- Settings → Pages 中的 Source 是否设置为 "GitHub Actions"
- Workflow permissions 是否正确配置

### Q: 构建成功但页面 404
A: 可能需要等待几分钟让 GitHub 完成部署配置

### Q: 如何自定义域名？
A: 在 Settings → Pages 中可以配置自定义域名

---

## 🎯 下一步

配置完成后，提交任意更改到 main 分支即可触发自动部署。

如果仍有问题，请检查 GitHub Actions 的详细错误日志。