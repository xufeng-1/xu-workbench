# -*- coding: utf-8 -*-
<#
.SYNOPSIS
  xu的工作台 一键部署脚本：安装 Git -> 推送 GitHub -> 开启 Pages -> 触发首次每日更新
  运行前提：能联网；准备一个 GitHub 访问令牌（PAT）
  PAT 获取：GitHub 网站 -> 头像 -> Settings -> Developer settings -> Personal access tokens
            -> Tokens (classic) -> Generate new token -> 勾选 repo 和 workflow -> 生成后复制
.PARAMETER User
  GitHub 登录名（不是邮箱）。留空则交互输入。
.PARAMETER Token
  GitHub 访问令牌（PAT）。留空则交互输入。
#>
param(
    [string]$User,
    [string]$Token
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  xu的工作台 · 一键部署" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# ---------- 1. 确保 Git 可用 ----------
# 兜底：Git 装在非默认路径时也把它加进本次会话的 PATH
$gitCandidates = @("$env:ProgramFiles\Git\cmd", "${env:ProgramFiles(x86)}\Git\cmd", "F:\Program Files\Git\cmd")
foreach ($g in $gitCandidates) {
    if ((Test-Path "$g\git.exe") -and -not (Get-Command git -ErrorAction SilentlyContinue)) {
        $env:Path = "$g;$env:Path"
        break
    }
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[1/6] 未检测到 Git，正在安装..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements --silent | Out-Null
    }
    elseif (Get-Command curl.exe -ErrorAction SilentlyContinue) {
        $url = "https://github.com/git-for-windows/git/releases/download/v2.55.0.windows.3/Git-2.55.0.3-64-bit.exe"
        Write-Host "      正在下载 Git 安装包（约 65MB）..." -ForegroundColor Yellow
        curl.exe -L -o "$env:TEMP\git-install.exe" $url
        & "$env:TEMP\git-install.exe" /VERYSILENT /NORESTART /SP-
        Start-Sleep -Seconds 5
    }
    else {
        Write-Host "      无法自动安装 Git，请到 https://git-scm.com/download/win 手动安装后重试" -ForegroundColor Red
        exit 1
    }
    $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host "      请关闭并重新打开 PowerShell，再运行本脚本" -ForegroundColor Red
        exit 1
    }
}
Write-Host "[1/6] Git 就绪：" -ForegroundColor Green -NoNewline; git --version

# ---------- 2. 初始化仓库 ----------
Write-Host "`n[2/6] 初始化 Git 仓库..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    git init -b main 2>$null
    if ($LASTEXITCODE -ne 0) { git init; git checkout -b main 2>$null }
}
git config user.name "xu"
git config user.email "252878339@qq.com"
git add -A
git -c user.name="xu" -c user.email="252878339@qq.com" commit -m "🚀 xu的工作台 初始版本" 2>$null
if ($LASTEXITCODE -ne 0) {
    git -c user.name="xu" -c user.email="252878339@qq.com" commit -m "🚀 xu的工作台 初始版本"
}
Write-Host "[2/6] 仓库初始化完成" -ForegroundColor Green

# ---------- 3. 输入账号与令牌 ----------
Write-Host "`n[3/6] GitHub 认证" -ForegroundColor Yellow
Write-Host "  你的登录邮箱是 252878339@qq.com，现在需要 GitHub 登录名（不是邮箱）和访问令牌"
Write-Host "  如果没有令牌：GitHub 网站 -> Settings -> Developer settings -> Personal access tokens"
Write-Host "  -> Tokens (classic) -> Generate new token -> 勾选 repo 和 workflow -> 生成并复制`n"
if ([string]::IsNullOrWhiteSpace($User)) { $User = Read-Host "  GitHub 用户名（登录名）" }
if ([string]::IsNullOrWhiteSpace($Token)) { $Token = Read-Host "  GitHub 访问令牌（PAT，粘贴后回车）" }
$user = $User
$token = $Token

$apiHeaders = @{ Authorization = "token $token"; "User-Agent" = "xu-workbench" }
$me = $null
try {
    $me = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $apiHeaders -Method Get -TimeoutSec 30
} catch {
    Write-Host "  令牌验证失败，请检查是否复制完整：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
$login = $me.login
Write-Host "  认证成功：@$login" -ForegroundColor Green
if ($user.Trim() -ne $login) { $user = $login }

# ---------- 4. 创建仓库（如不存在） ----------
$repo = "xu-workbench"
Write-Host "`n[4/6] 准备仓库 $user/$repo ..." -ForegroundColor Yellow
$exists = $false
try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$user/$repo" -Headers $apiHeaders -Method Get -TimeoutSec 30 | Out-Null
    $exists = $true
} catch { $exists = $false }
if (-not $exists) {
    $body = @{ name = $repo; description = "xu的个人专属工作台：任务/健身/创作/英语/阅读/数据/记账/菜谱，每日自动更新"; private = $false } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $apiHeaders -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30 | Out-Null
        Write-Host "  仓库已创建" -ForegroundColor Green
    } catch {
        Write-Host "  创建仓库失败：$($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  仓库已存在，将直接推送覆盖（历史会自动保留）" -ForegroundColor Yellow
}

# ---------- 5. 推送代码 ----------
Write-Host "`n[5/6] 推送代码到 GitHub..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin "https://$user`:$token@github.com/$user/$repo.git"
try {
    git push -u origin main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "push 失败" }
} catch {
    Write-Host "  推送失败：$($_.Exception.Message)（如提示认证失败，请检查令牌是否有 repo 权限）" -ForegroundColor Red
    exit 1
}
# 推送成功后移除 URL 中的令牌，避免泄露
git remote set-url origin "https://github.com/$user/$repo.git"
Write-Host "  推送完成" -ForegroundColor Green

# ---------- 6. 开启 Pages + 触发首次更新 ----------
Write-Host "`n[6/6] 开启 GitHub Pages 并触发首次每日更新..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$user/$repo/pages" -Headers $apiHeaders -Method Post -Body '{"source":{"branch":"main","path":"/docs"}}' -ContentType "application/json" -TimeoutSec 30 | Out-Null
    Write-Host "  Pages 已开启" -ForegroundColor Green
} catch {
    Write-Host "  Pages 开启提示（可能已开启，忽略即可）：$($_.Exception.Message)" -ForegroundColor DarkYellow
}
# 触发首次每日更新：workflow 刚推送可能未被识别，重试最多 5 次
$dispatchOk = $false
for ($i = 1; $i -le 5 -and -not $dispatchOk; $i++) {
    try {
        Invoke-RestMethod -Uri "https://api.github.com/repos/$user/$repo/actions/workflows/daily.yml/dispatches" -Headers $apiHeaders -Method Post -Body '{"ref":"main"}' -ContentType "application/json" -TimeoutSec 30 | Out-Null
        $dispatchOk = $true
        Write-Host "  已触发首次每日更新（含书籍全文抓取）" -ForegroundColor Green
    } catch {
        if ($i -lt 5) { Start-Sleep -Seconds 10 }
        else { Write-Host "  触发每日更新失败（每日 07:20 会自动运行，无影响）：$($_.Exception.Message)" -ForegroundColor DarkYellow }
    }
}

$url = "https://$user.github.io/$repo/"
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  🎉 部署完成！你的工作台地址：" -ForegroundColor Green
Write-Host "  $url" -ForegroundColor White
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  手机端安装：用手机浏览器打开上面地址 -> 添加到主屏幕即可"
Write-Host "  （安卓/鸿蒙：菜单-添加到主屏幕；苹果：分享-添加到主屏幕）"
Write-Host "  首次 Pages 构建约需 1-3 分钟，稍等即可访问"
Write-Host "  🔒 建议部署完成后，到 GitHub 删除刚才的令牌（Settings->Developer settings），如需更新可重新生成"
Write-Host ""
Read-Host "按回车键退出"
