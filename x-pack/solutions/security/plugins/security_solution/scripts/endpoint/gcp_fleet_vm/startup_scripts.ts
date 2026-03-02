/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

// NOTE: we intentionally embed secrets as base64 and decode at runtime to reduce quoting hazards.
// These scripts are generated into a temp directory and NOT committed into the repo.

export const ubuntuFleetServerStartupScript = (opts: {
  tailscaleAuthKey: string;
  elasticsearchUrl: string;
  fleetServerPolicyId: string;
  fleetServiceToken: string;
  agentDownloadUrl: string;
  insecure?: boolean;
}) => {
  const TS_AUTHKEY_B64 = b64(opts.tailscaleAuthKey);
  const ES_URL_B64 = b64(opts.elasticsearchUrl);
  const POLICY_B64 = b64(opts.fleetServerPolicyId);
  const SERVICE_TOKEN_B64 = b64(opts.fleetServiceToken);
  const AGENT_URL_B64 = b64(opts.agentDownloadUrl);
  const insecureFlag = opts.insecure !== false ? '\n  --insecure \\' : '';

  return `#!/usr/bin/env bash
set -euo pipefail

log() { echo "[gcp_fleet_vm] $*"; }

TS_AUTHKEY="$(echo "${TS_AUTHKEY_B64}" | base64 -d)"
ES_URL="$(echo "${ES_URL_B64}" | base64 -d)"
FLEET_SERVER_POLICY="$(echo "${POLICY_B64}" | base64 -d)"
FLEET_SERVER_SERVICE_TOKEN="$(echo "${SERVICE_TOKEN_B64}" | base64 -d)"
AGENT_URL="$(echo "${AGENT_URL_B64}" | base64 -d)"

log "Installing prerequisites"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends curl ca-certificates jq tar

log "Installing Tailscale"
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --auth-key="\${TS_AUTHKEY}" --hostname="$(hostname)" --accept-dns=true

FLEET_SERVER_IP="$(tailscale ip -4 | head -n 1)"
FLEET_URL="https://\${FLEET_SERVER_IP}:8220"

log "Downloading Elastic Agent from \${AGENT_URL}"
cd /tmp
ARCHIVE="$(basename "\${AGENT_URL}")"
curl -fL --retry 5 --retry-delay 2 -O "\${AGENT_URL}"
test -s "\${ARCHIVE}"
tar xzvf "\${ARCHIVE}"
DIR="\${ARCHIVE%.tar.gz}"
test -d "\${DIR}"
cd "\${DIR}"

log "Installing Elastic Agent as Fleet Server"
./elastic-agent install \
  --url="\${FLEET_URL}" \
  --fleet-server-es="\${ES_URL}" \
  --fleet-server-service-token="\${FLEET_SERVER_SERVICE_TOKEN}" \
  --fleet-server-policy="\${FLEET_SERVER_POLICY}" \
  --fleet-server-port=8220 \
  --install-servers \\${insecureFlag}
  --force

log "Fleet Server install complete"
`;
};

export const ubuntuElasticAgentStartupScript = (opts: {
  tailscaleAuthKey: string;
  fleetServerUrl: string;
  enrollmentToken: string;
  agentDownloadUrl: string;
  enableCaldera: boolean;
  calderaUrl?: string;
  enableInvokeAtomic?: boolean;
  insecure?: boolean;
}) => {
  const TS_AUTHKEY_B64 = b64(opts.tailscaleAuthKey);
  const FLEET_URL_B64 = b64(opts.fleetServerUrl);
  const ENROLLMENT_B64 = b64(opts.enrollmentToken);
  const AGENT_URL_B64 = b64(opts.agentDownloadUrl);
  const CALDERA_URL_B64 = b64(opts.calderaUrl ?? '');
  const insecureFlag = opts.insecure !== false ? '\n  --insecure \\' : '';

  return `#!/usr/bin/env bash
set -euo pipefail

log() { echo "[gcp_fleet_vm] $*"; }

TS_AUTHKEY="$(echo "${TS_AUTHKEY_B64}" | base64 -d)"
FLEET_URL="$(echo "${FLEET_URL_B64}" | base64 -d)"
ENROLLMENT_TOKEN="$(echo "${ENROLLMENT_B64}" | base64 -d)"
AGENT_URL="$(echo "${AGENT_URL_B64}" | base64 -d)"
CALDERA_URL="$(echo "${CALDERA_URL_B64}" | base64 -d)"
CALDERA_URL="\${CALDERA_URL%/}"

log "Installing prerequisites"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends curl ca-certificates jq

log "Installing Tailscale"
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --auth-key="\${TS_AUTHKEY}" --hostname="$(hostname)" --accept-dns=true

log "Downloading Elastic Agent from \${AGENT_URL}"
cd /tmp
ARCHIVE="$(basename "\${AGENT_URL}")"
curl -fL --retry 5 --retry-delay 2 -O "\${AGENT_URL}"
test -s "\${ARCHIVE}"
tar xzvf "\${ARCHIVE}"
DIR="\${ARCHIVE%.tar.gz}"
test -d "\${DIR}"
cd "\${DIR}"

log "Installing Elastic Agent"
./elastic-agent install \
  --url="\${FLEET_URL}" \
  --enrollment-token="\${ENROLLMENT_TOKEN}" \\${insecureFlag}
  --force

if [[ "${opts.enableCaldera ? 'true' : 'false'}" == "true" ]]; then
  if [[ -z "\${CALDERA_URL}" ]]; then
    log "Caldera enabled but no CALDERA_URL provided; skipping Caldera agent"
  else
    log "Deploying Caldera sandcat agent (binary-or-source + systemd)"
    cd /tmp
    apt-get install -y --no-install-recommends golang-go file
    log "Downloading sandcat.go from Caldera"
    downloaded="false"
    rm -f sandcat.dl
    for url in "\${CALDERA_URL}/file/download" "\${CALDERA_URL}/api/v2/file/download"; do
      log "Trying: $url"
      if curl -kfsSL --retry 5 --retry-delay 2 -X POST -H "file:sandcat.go" -H "platform:linux" "$url" -o sandcat.dl; then
        downloaded="true"
        break
      fi
    done
    if [[ "$downloaded" != "true" ]]; then
      log "ERROR: failed to download sandcat.go from Caldera (tried /file/download and /api/v2/file/download)"
      exit 1
    fi

    bytes="$(wc -c < sandcat.dl | tr -d ' ')"
    kind="$(file -b sandcat.dl || true)"
    log "Downloaded sandcat payload (\${bytes} bytes): \${kind}"

    sudo mkdir -p /opt/sandcat
    if echo "$kind" | grep -qi 'ELF'; then
      log "Payload looks like a Linux binary; installing directly"
      sudo mv sandcat.dl /opt/sandcat/sandcat
      sudo chmod +x /opt/sandcat/sandcat
      sudo file /opt/sandcat/sandcat || true
    else
      log "Payload does not look like an ELF binary; treating as Go source"
      sudo mv sandcat.dl /opt/sandcat/sandcat.go
      if ! sudo grep -qE '^package[[:space:]]+' /opt/sandcat/sandcat.go; then
        log "ERROR: sandcat payload is neither ELF nor Go source. First lines:"
        sudo head -n 20 /opt/sandcat/sandcat.go || true
        exit 1
      fi
      sudo go build -o /opt/sandcat/sandcat /opt/sandcat/sandcat.go
      sudo chmod +x /opt/sandcat/sandcat
      sudo file /opt/sandcat/sandcat || true
    fi

    sudo tee /etc/systemd/system/sandcat.service >/dev/null <<EOF
[Unit]
Description=Caldera Sandcat Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/opt/sandcat/sandcat -server \${CALDERA_URL} -group ref7707 -paw %H
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable --now sandcat
    sudo systemctl status sandcat --no-pager || true
  fi
fi

if [[ "${opts.enableInvokeAtomic ? 'true' : 'false'}" == "true" ]]; then
  log "Installing Atomic Red Team + Invoke-Atomic (best-effort)"
  apt-get update -y
  apt-get install -y --no-install-recommends git unzip

  ATOMIC_DIR="/opt/atomic-red-team"
  if [[ ! -d "$ATOMIC_DIR/.git" ]]; then
    rm -rf "$ATOMIC_DIR" || true
    git clone --depth 1 https://github.com/redcanaryco/atomic-red-team.git "$ATOMIC_DIR" || true
  fi

  echo "export ATOMIC_RED_TEAM_PATH=$ATOMIC_DIR" | tee /etc/profile.d/atomic-red-team.sh >/dev/null || true

  if ! command -v pwsh >/dev/null 2>&1; then
    if command -v snap >/dev/null 2>&1; then
      log "PowerShell not found; attempting snap install"
      snap install powershell --classic || true
    fi
  fi

  if command -v pwsh >/dev/null 2>&1; then
    log "Installing Invoke-AtomicRedTeam PowerShell module"
    pwsh -NoProfile -NonInteractive -Command "Set-PSRepository -Name PSGallery -InstallationPolicy Trusted; Install-Module Invoke-AtomicRedTeam -Force -Scope AllUsers" || true
    pwsh -NoProfile -NonInteractive -Command "[Environment]::SetEnvironmentVariable('PathToAtomicsFolder','$ATOMIC_DIR/atomics','Machine')" || true
  else
    log "PowerShell (pwsh) not available; Invoke-Atomic not installed (repo at $ATOMIC_DIR may still be present)"
  fi
fi

log "Agent VM setup complete"
`;
};

export const windowsElasticAgentStartupScriptPs1 = (opts: {
  tailscaleAuthKey: string;
  fleetServerUrl: string;
  enrollmentToken: string;
  agentDownloadUrl: string;
  enableCaldera: boolean;
  calderaUrl?: string;
  enableInvokeAtomic?: boolean;
  insecure?: boolean;
}) => {
  const TS_AUTHKEY_B64 = b64(opts.tailscaleAuthKey);
  const FLEET_URL_B64 = b64(opts.fleetServerUrl);
  const ENROLLMENT_B64 = b64(opts.enrollmentToken);
  const AGENT_URL_B64 = b64(opts.agentDownloadUrl);
  const CALDERA_URL_B64 = b64(opts.calderaUrl ?? '');
  const insecureArg = opts.insecure !== false ? ',\n  "--insecure"' : '';

  return `
$ErrorActionPreference = "Stop"
function Log($msg) { Write-Output "[gcp_fleet_vm] $msg" }

$TS_AUTHKEY = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${TS_AUTHKEY_B64}"))
$FLEET_URL = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${FLEET_URL_B64}"))
$ENROLLMENT_TOKEN = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${ENROLLMENT_B64}"))
$AGENT_URL = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${AGENT_URL_B64}"))
$CALDERA_URL = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${CALDERA_URL_B64}"))

Log "Installing Tailscale"
$msi = "$env:TEMP\\tailscale.msi"
Invoke-WebRequest -Uri "https://pkgs.tailscale.com/stable/tailscale-setup-latest-amd64.msi" -OutFile $msi
Start-Process msiexec.exe -Wait -ArgumentList @("/i", $msi, "/qn", "/norestart")
& "C:\\Program Files\\Tailscale\\tailscale.exe" up --auth-key=$TS_AUTHKEY --hostname=$env:COMPUTERNAME --accept-dns=true

Log "Downloading Elastic Agent from $AGENT_URL"
$zip = "$env:TEMP\\elastic-agent.zip"
Invoke-WebRequest -Uri $AGENT_URL -OutFile $zip
Expand-Archive -Path $zip -DestinationPath "$env:TEMP\\elastic-agent" -Force
$dir = Get-ChildItem "$env:TEMP\\elastic-agent" | Select-Object -First 1
Set-Location $dir.FullName

Log "Installing Elastic Agent"
Start-Process -FilePath ".\\elastic-agent.exe" -Wait -ArgumentList @(
  "install",
  "--url=$FLEET_URL",
  "--enrollment-token=$ENROLLMENT_TOKEN"${insecureArg},
  "--force"
)

if ("${opts.enableCaldera ? 'true' : 'false'}" -eq "true") {
  if ([string]::IsNullOrWhiteSpace($CALDERA_URL)) {
    Log "Caldera enabled but no CALDERA_URL provided; skipping Caldera agent"
  } else {
    Log "Deploying Caldera sandcat agent"
    $sandcat = "$env:TEMP\\sandcat.exe"
    try {
      Invoke-WebRequest -Uri ($CALDERA_URL + "/file/download") -Headers @{ "file" = "sandcat.go" } -Method Post -OutFile $sandcat
      Start-Process -FilePath $sandcat -ArgumentList @("-server", $CALDERA_URL, "-group", "ref7707", "-paw", $env:COMPUTERNAME) -WindowStyle Hidden
    } catch {
      Log ("Failed to deploy Caldera agent: " + $_.Exception.Message)
    }
  }
}

if ("${opts.enableInvokeAtomic ? 'true' : 'false'}" -eq "true") {
  try {
    Log "Installing Atomic Red Team + Invoke-AtomicRedTeam (best-effort)"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    $atomicDir = "C:\\AtomicRedTeam"
    New-Item -ItemType Directory -Force -Path $atomicDir | Out-Null

    $zip = "$env:TEMP\\atomic-red-team.zip"
    $url = "https://github.com/redcanaryco/atomic-red-team/archive/refs/heads/master.zip"
    Invoke-WebRequest -Uri $url -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath "$env:TEMP\\atomic-red-team" -Force

    $root = Get-ChildItem "$env:TEMP\\atomic-red-team" | Where-Object { $_.PSIsContainer } | Select-Object -First 1
    if ($null -ne $root) {
      Copy-Item -Path (Join-Path $root.FullName "*") -Destination $atomicDir -Recurse -Force
    }

    Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force | Out-Null
    Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
    Install-Module Invoke-AtomicRedTeam -Force -Scope AllUsers

    [Environment]::SetEnvironmentVariable("PathToAtomicsFolder", (Join-Path $atomicDir "atomics"), "Machine")
    Log ("Invoke-Atomic install complete. PathToAtomicsFolder=" + (Join-Path $atomicDir "atomics"))
  } catch {
    Log ("Invoke-Atomic install failed (continuing): " + $_.Exception.Message)
  }
}

Log "Windows agent VM setup complete"
`.trim();
};
