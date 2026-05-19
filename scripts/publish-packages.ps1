[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$Configuration = "Release",
    [string]$NuGetApiKey = $env:NUGET_API_KEY,
    [string]$NuGetSource = "https://api.nuget.org/v3/index.json",
    [string]$NpmTag = "latest",
    [switch]$SkipTests,
    [switch]$SkipNpm,
    [switch]$SkipNuGet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($SkipNpm -and $SkipNuGet) {
    throw "Nothing to publish. Remove -SkipNpm or -SkipNuGet."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $repoRoot "package.json"
$csprojPath = Join-Path $repoRoot "src\EdNotes.RichText\EdNotes.RichText.csproj"

function Get-RequiredCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $command = Get-Command -Name $Name -ErrorAction Stop
    return $command.Source
}

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Description,

        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$Arguments = @()
    )

    $commandLine = $FilePath
    if ($Arguments.Count -gt 0) {
        $renderedArgs = $Arguments | ForEach-Object {
            if ($_ -match "\s") {
                '"{0}"' -f $_
            }
            else {
                $_
            }
        }
        $commandLine = "{0} {1}" -f $FilePath, ($renderedArgs -join " ")
    }

    if (-not $PSCmdlet.ShouldProcess($commandLine, $Description)) {
        return
    }

    Write-Host "==> $Description"
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw ("Command failed with exit code {0}: {1}" -f $LASTEXITCODE, $commandLine)
    }
}

if (-not (Test-Path -Path $packageJsonPath)) {
    throw "package.json was not found at $packageJsonPath"
}

if (-not (Test-Path -Path $csprojPath)) {
    throw "EdNotes.RichText.csproj was not found at $csprojPath"
}

$npmCommand = Get-RequiredCommand -Name "npm"
$dotnetCommand = Get-RequiredCommand -Name "dotnet"

$packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
[xml]$csproj = Get-Content -Path $csprojPath -Raw

$npmPackageName = [string]$packageJson.name
$npmVersion = [string]$packageJson.version

$packageIdNode = $csproj.SelectSingleNode("/Project/PropertyGroup/PackageId")
$versionNode = $csproj.SelectSingleNode("/Project/PropertyGroup/Version")

if ($null -eq $packageIdNode -or [string]::IsNullOrWhiteSpace($packageIdNode.InnerText)) {
    throw "Could not find <PackageId> in $csprojPath"
}

if ($null -eq $versionNode -or [string]::IsNullOrWhiteSpace($versionNode.InnerText)) {
    throw "Could not find <Version> in $csprojPath"
}

$nuGetPackageId = $packageIdNode.InnerText.Trim()
$nuGetVersion = $versionNode.InnerText.Trim()

if ([string]::IsNullOrWhiteSpace($npmPackageName)) {
    throw "Could not find the npm package name in $packageJsonPath"
}

if ([string]::IsNullOrWhiteSpace($npmVersion)) {
    throw "Could not find the npm package version in $packageJsonPath"
}

if ($npmVersion -ne $nuGetVersion) {
    throw "Version mismatch: package.json is $npmVersion, but $csprojPath is $nuGetVersion"
}

if (-not $SkipNuGet -and [string]::IsNullOrWhiteSpace($NuGetApiKey) -and -not $WhatIfPreference) {
    throw "NuGet API key not provided. Pass -NuGetApiKey or set NUGET_API_KEY."
}

$publishArtifactsPath = Join-Path $repoRoot (Join-Path "artifacts\publish" $npmVersion)
New-Item -ItemType Directory -Path $publishArtifactsPath -Force | Out-Null

Write-Host ("Publishing version {0}" -f $npmVersion)
Write-Host ("npm package: {0}" -f $npmPackageName)
Write-Host ("NuGet package: {0}" -f $nuGetPackageId)

Push-Location $repoRoot
try {
    if (-not $SkipTests) {
        Invoke-ExternalCommand -Description "Run .NET tests" -FilePath $dotnetCommand -Arguments @(
            "test",
            "EdNotes.sln",
            "-c",
            $Configuration,
            "--nologo"
        )
    }

    if (-not $SkipNuGet) {
        Invoke-ExternalCommand -Description "Pack NuGet package" -FilePath $dotnetCommand -Arguments @(
            "pack",
            $csprojPath,
            "-c",
            $Configuration,
            "-p:PackageVersion=$npmVersion",
            "-o",
            $publishArtifactsPath,
            "--nologo"
        )
    }

    if (-not $SkipNpm) {
        Invoke-ExternalCommand -Description "Build npm package" -FilePath $npmCommand -Arguments @(
            "run",
            "build:js"
        )

        if (-not $SkipTests) {
            Invoke-ExternalCommand -Description "Run npm tests" -FilePath $npmCommand -Arguments @(
                "test"
            )
        }

        $npmPublishArgs = @("publish", ".", "--ignore-scripts")
        if ($npmPackageName.StartsWith("@")) {
            $npmPublishArgs += @("--access", "public")
        }
        if (-not [string]::IsNullOrWhiteSpace($NpmTag)) {
            $npmPublishArgs += @("--tag", $NpmTag)
        }

        Invoke-ExternalCommand -Description "Publish npm package" -FilePath $npmCommand -Arguments $npmPublishArgs
    }

    if (-not $SkipNuGet) {
        $nuGetPackagePath = Join-Path $publishArtifactsPath ("{0}.{1}.nupkg" -f $nuGetPackageId, $npmVersion)

        if (-not $WhatIfPreference -and -not (Test-Path -Path $nuGetPackagePath)) {
            throw "NuGet package was not produced at $nuGetPackagePath"
        }

        Invoke-ExternalCommand -Description "Push NuGet package" -FilePath $dotnetCommand -Arguments @(
            "nuget",
            "push",
            $nuGetPackagePath,
            "--api-key",
            $NuGetApiKey,
            "--source",
            $NuGetSource,
            "--skip-duplicate"
        )
    }
}
finally {
    Pop-Location
}