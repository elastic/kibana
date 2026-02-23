/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CalderaExecutorTemplate {
    platform: 'linux' | 'windows';
    name: 'sh' | 'psh';
    command: string;
    /** Optional executor timeout (seconds). Defaults vary by Caldera deployment (often 60s). */
    timeout?: number;
}

export interface CalderaAbilityTemplate {
    name: string;
    description: string;
    tactic: string;
    technique: { name: string; attack_id: string };
    executors: CalderaExecutorTemplate[];
}

/**
 * Caldera ability templates for the REF7707 lab.
 *
 * Tokens:
 * - `#{domain}`, `#{web_port}`, `#{dns_ip}`, `#{web_ip}` are placeholders replaced by our bootstrap before uploading to Caldera.
 */
export const REF7707_CALDERA_ABILITIES: CalderaAbilityTemplate[] = [
    {
        name: 'REF7707 Lab - DNS lookup (campaign-like domain)',
        description: 'Generate DNS telemetry for an emulated domain (dns.question.name).',
        tactic: 'discovery',
        technique: { name: 'System Network Configuration Discovery', attack_id: 'T1016' },
        executors: [
            {
                platform: 'linux',
                name: 'sh',
                timeout: 300,
                command:
                    // Prefer `;` separators (not just newlines) because some Caldera deployments collapse newlines.
                    // Caldera `sh` executor can be `/bin/sh` (dash); avoid `pipefail`.
                    'set -eu; ' +
                    'DOMAIN=#{domain}; DNS_IP=#{dns_ip}; ' +
                    'sudo apt-get update -y >/dev/null 2>&1 || true; ' +
                    'sudo apt-get install -y dnsutils >/dev/null 2>&1 || true; ' +
                    'if [ -n \"$DNS_IP\" ]; then dig +tries=1 +time=2 @$DNS_IP $DOMAIN || true; else dig +tries=1 +time=2 $DOMAIN || true; fi; ',
            },
            {
                platform: 'windows',
                name: 'psh',
                command:
                    '$domain = "#{domain}"\n' +
                    'try { Resolve-DnsName -Name $domain -ErrorAction Stop | Out-Null } catch { nslookup $domain | Out-Null }\n',
            },
        ],
    },
    {
        name: 'REF7707 Lab - Browser visit (real browser process)',
        description:
            'Visit the domain in a real browser (headless) and persist the visit into browser history (so osquery elastic_browser_history can return it).',
        tactic: 'initial-access',
        technique: { name: 'Drive-by Compromise', attack_id: 'T1189' },
        executors: [
            {
                platform: 'linux',
                name: 'sh',
                timeout: 900,
                command:
                    'set -eu; ' +
                    'DOMAIN=#{domain}; PORT=#{web_port}; DNS_IP=#{dns_ip}; WEB_IP=#{web_ip}; ' +
                    'URL="http://$DOMAIN:$PORT/"; ' +
                    // Ensure DNS telemetry (explicit dig when provided)
                    'if [ -n "$DNS_IP" ]; then (command -v dig >/dev/null 2>&1 && dig +tries=1 +time=2 @$DNS_IP $DOMAIN || true); fi; ' +
                    // Ensure a browser exists and we can run it in a way that persists history.
                    'export DEBIAN_FRONTEND=noninteractive; ' +
                    'sudo apt-get update -y >/dev/null 2>&1 || true; ' +
                    'sudo apt-get install -y --no-install-recommends ca-certificates curl dnsutils sqlite3 coreutils >/dev/null 2>&1 || true; ' +
                    // Ubuntu 22.04 often uses snap for Chromium; try both apt + snap.
                    'command -v google-chrome >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1 || ' +
                    '(sudo apt-get install -y --no-install-recommends chromium-browser >/dev/null 2>&1 || sudo apt-get install -y --no-install-recommends chromium >/dev/null 2>&1 || true); ' +
                    'if ! command -v google-chrome >/dev/null 2>&1 && ! command -v chromium >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1; then ' +
                    '  if command -v snap >/dev/null 2>&1; then sudo snap install chromium >/dev/null 2>&1 || true; fi; ' +
                    'fi; ' +
                    // Snap Chromium is unreliable in these GCP images ("not a snap cgroup"). Prefer installing Google Chrome (deb) and using it.
                    'if ! command -v google-chrome >/dev/null 2>&1; then ' +
                    '  echo "[ref7707] installing google-chrome-stable (deb)"; ' +
                    '  sudo apt-get update -y >/dev/null 2>&1 || true; ' +
                    '  sudo apt-get install -y --no-install-recommends curl ca-certificates >/dev/null 2>&1 || true; ' +
                    '  curl -fsSL -o /tmp/google-chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb; ' +
                    '  sudo apt-get install -y /tmp/google-chrome.deb >/dev/null 2>&1 || (sudo dpkg -i /tmp/google-chrome.deb >/dev/null 2>&1 || true; sudo apt-get -f install -y >/dev/null 2>&1 || true); ' +
                    'fi; ' +
                    'RUN_AS="ubuntu"; if ! id ubuntu >/dev/null 2>&1; then RUN_AS="$(id -un)"; fi; ' +
                    // IMPORTANT: use single quotes for bash -lc payload so `$...` is expanded by bash (not by outer /bin/sh).
                    'sudo -u "$RUN_AS" -H DOMAIN="$DOMAIN" WEB_IP="$WEB_IP" URL="$URL" bash -lc ' +
                    "'set -euo pipefail; " +
                    'export XDG_RUNTIME_DIR="/tmp/xdg-runtime-$(id -u)"; mkdir -p "$XDG_RUNTIME_DIR"; chmod 700 "$XDG_RUNTIME_DIR"; ' +
                    // Use standard Chrome profile dir so osquery elastic_browser_history auto-discovery finds it (no custom_data_dir needed).
                    'PROFILE_BASE="$HOME/.config/google-chrome"; mkdir -p "$PROFILE_BASE"; LOGFILE="$PROFILE_BASE/ref7707-browser.log"; ' +
                    'HR=""; if [ -n "${WEB_IP:-}" ]; then HR="MAP ${DOMAIN} ${WEB_IP}"; fi; ' +
                    'if command -v timeout >/dev/null 2>&1; then ' +
                    '  timeout 25s google-chrome --headless=new --no-sandbox --disable-gpu --no-first-run --disable-default-apps --disable-extensions --disable-dev-shm-usage --user-data-dir="$PROFILE_BASE" --profile-directory=Default ${HR:+--host-resolver-rules="$HR"} "$URL" >"$LOGFILE" 2>&1 || true; ' +
                    'else ' +
                    '  google-chrome --headless=new --no-sandbox --disable-gpu --no-first-run --disable-default-apps --disable-extensions --disable-dev-shm-usage --user-data-dir="$PROFILE_BASE" --profile-directory=Default ${HR:+--host-resolver-rules="$HR"} "$URL" >"$LOGFILE" 2>&1 || true; ' +
                    'fi; ' +
                    'sleep 2; ' +
                    'HIST="$PROFILE_BASE/Default/History"; ' +
                    'if [ ! -f "$HIST" ]; then echo "[ref7707] ERROR: History DB not found at $HIST"; ls -la "$PROFILE_BASE/Default" 2>/dev/null || true; tail -n 200 "$LOGFILE" 2>/dev/null || true; exit 1; fi; ' +
                    'if command -v sqlite3 >/dev/null 2>&1; then ' +
                    '  if ! sqlite3 "$HIST" "select url from urls where url like \\"%${DOMAIN}%\\" limit 1;" | grep -q "${DOMAIN}"; then ' +
                    '    echo "[ref7707] ERROR: History DB exists but URL missing"; tail -n 200 "$LOGFILE" 2>/dev/null || true; exit 1; ' +
                    '  fi; ' +
                    'fi; ' +
                    'echo "[ref7707] OK: browser history written at $HIST"' +
                    "'; ",
            },
            {
                platform: 'windows',
                name: 'psh',
                timeout: 900,
                command:
                    '$domain = "#{domain}"\n' +
                    '$port = "#{web_port}"\n' +
                    '$dnsIp = "#{dns_ip}"\n' +
                    '$webIp = "#{web_ip}"\n' +
                    '$url = ("http://{0}:{1}/" -f $domain, $port)\n' +
                    // DNS telemetry (explicit resolver if provided)
                    'try { if ($dnsIp) { Resolve-DnsName -Name $domain -Server $dnsIp -ErrorAction Stop | Out-Null } else { Resolve-DnsName -Name $domain -ErrorAction Stop | Out-Null } } catch { nslookup $domain | Out-Null }\n' +
                    // Prefer Edge headless; fall back to Chrome if present.
                    '$edge = Join-Path $env:ProgramFiles \"Microsoft\\Edge\\Application\\msedge.exe\"\n' +
                    '$chrome = Join-Path $env:ProgramFiles \"Google\\Chrome\\Application\\chrome.exe\"\n' +
                    '$exe = if (Test-Path $edge) { $edge } elseif (Test-Path $chrome) { $chrome } else { $null }\n' +
                    // Use the standard browser profile base so osquery elastic_browser_history auto-discovery finds it.
                    '$userDataDir = if ($exe -eq $edge) { Join-Path $env:LOCALAPPDATA \"Microsoft\\Edge\\User Data\" } else { Join-Path $env:LOCALAPPDATA \"Google\\Chrome\\User Data\" }\n' +
                    'New-Item -ItemType Directory -Force -Path $userDataDir | Out-Null\n' +
                    'if ($exe) {\n' +
                    '  $args = @(\"--headless\", \"--disable-gpu\", \"--user-data-dir=$userDataDir\", \"--profile-directory=Default\", \"--virtual-time-budget=10000\", \"--dump-dom\", $url)\n' +
                    '  if ($webIp) { $args = @(\"--host-resolver-rules=MAP $domain $webIp\") + $args }\n' +
                    '  Start-Process -FilePath $exe -ArgumentList $args -Wait | Out-Null\n' +
                    '  $history = Join-Path $userDataDir \"Default\\History\"\n' +
                    '  if (!(Test-Path $history)) { throw \"[ref7707] ERROR: browser history DB not found at $history\" }\n' +
                    '} else {\n' +
                    '  # Last resort: try default handler (still creates a browser process if present)\n' +
                    '  Start-Process $url | Out-Null\n' +
                    '  Start-Sleep -Seconds 5\n' +
                    '}\n',
            },
        ],
    },
    {
        name: 'REF7707 Lab - Domain-based download (benign artifacts)',
        description: 'Download benign artifacts from web-vm using the domain name (so DNS is involved).',
        tactic: 'collection',
        technique: { name: 'Data from Local System', attack_id: 'T1005' },
        executors: [
            {
                platform: 'linux',
                name: 'sh',
                timeout: 300,
                command:
                    'set -eu; ' +
                    'DOMAIN=#{domain}; PORT=#{web_port}; DNS_IP=#{dns_ip}; WEB_IP=#{web_ip}; ' +
                    'PORT=#{web_port}; ' +
                    'sudo apt-get update -y >/dev/null 2>&1 || true; ' +
                    'sudo apt-get install -y curl >/dev/null 2>&1 || true; ' +
                    'sudo mkdir -p /var/tmp/ref7707; sudo chown -R $(whoami):$(id -gn) /var/tmp/ref7707; ' +
                    // Ensure DNS telemetry (explicit dig to dns-vm when provided), then download without depending on system resolver.
                    'if [ -n \"$DNS_IP\" ]; then (command -v dig >/dev/null 2>&1 && dig +tries=1 +time=2 @$DNS_IP $DOMAIN || true); fi; ' +
                    'if [ -n \"$WEB_IP\" ]; then ' +
                    '  curl -fsS --resolve \"$DOMAIN:$PORT:$WEB_IP\" -o /var/tmp/ref7707/fontdrvhost.exe \"http://$DOMAIN:$PORT/fontdrvhost.exe\"; ' +
                    '  curl -fsS --resolve \"$DOMAIN:$PORT:$WEB_IP\" -o /var/tmp/ref7707/config.ini \"http://$DOMAIN:$PORT/config.ini\"; ' +
                    '  curl -fsS --resolve \"$DOMAIN:$PORT:$WEB_IP\" -o /var/tmp/ref7707/wmsetup.log \"http://$DOMAIN:$PORT/wmsetup.log\"; ' +
                    'else ' +
                    '  curl -fsS -o /var/tmp/ref7707/fontdrvhost.exe \"http://$DOMAIN:$PORT/fontdrvhost.exe\"; ' +
                    '  curl -fsS -o /var/tmp/ref7707/config.ini \"http://$DOMAIN:$PORT/config.ini\"; ' +
                    '  curl -fsS -o /var/tmp/ref7707/wmsetup.log \"http://$DOMAIN:$PORT/wmsetup.log\"; ' +
                    'fi; ',
            },
            {
                platform: 'windows',
                name: 'psh',
                command:
                    '$domain = "#{domain}"\n' +
                    '$port = "#{web_port}"\n' +
                    '$dir = "$env:TEMP\\ref7707"\n' +
                    'New-Item -ItemType Directory -Force -Path $dir | Out-Null\n' +
                    'Invoke-WebRequest -Uri ("http://{0}:{1}/fontdrvhost.exe" -f $domain, $port) -OutFile (Join-Path $dir "fontdrvhost.exe")\n' +
                    'Invoke-WebRequest -Uri ("http://{0}:{1}/config.ini" -f $domain, $port) -OutFile (Join-Path $dir "config.ini")\n' +
                    'Invoke-WebRequest -Uri ("http://{0}:{1}/wmsetup.log" -f $domain, $port) -OutFile (Join-Path $dir "wmsetup.log")\n',
            },
        ],
    },
    {
        name: 'REF7707 Lab - Benign execution chain + outbound HTTPS',
        description: 'Spawn a short process tree and make benign outbound HTTPS requests (C2-like shape).',
        tactic: 'execution',
        technique: { name: 'Command and Scripting Interpreter', attack_id: 'T1059' },
        executors: [
            {
                platform: 'linux',
                name: 'sh',
                timeout: 300,
                command:
                    // Keep this fast and non-blocking: no apt installs. If curl is missing, skip the HTTPS call.
                    'set -eu; ' +
                    'echo [stage1]; ' +
                    'sleep 0.2; ' +
                    'if command -v curl >/dev/null 2>&1; then ' +
                    '  curl -sS --connect-timeout 3 --max-time 10 https://example.com >/dev/null || true; ' +
                    'fi; ',
            },
            {
                platform: 'windows',
                name: 'psh',
                command:
                    '$p1 = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","ping -n 2 127.0.0.1 >nul" -PassThru\n' +
                    'Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile","-Command","try { iwr https://example.com -UseBasicParsing | Out-Null } catch {}" | Out-Null\n' +
                    '$p1.WaitForExit()\n',
            },
        ],
    },
    {
        name: 'REF7707 Lab - Benign persistence (systemd/cron/schtasks)',
        description: 'Create a benign persistence mechanism that is removable during teardown.',
        tactic: 'persistence',
        technique: { name: 'Scheduled Task/Job', attack_id: 'T1053' },
        executors: [
            {
                platform: 'linux',
                name: 'sh',
                timeout: 300,
                command:
                    'set -eu; ' +
                    'UNIT_B64=W1VuaXRdCkRlc2NyaXB0aW9uPVJFRjc3MDctbGlrZSBiZW5pZ24gbGFiIHNlcnZpY2UKQWZ0ZXI9bmV0d29yay1vbmxpbmUudGFyZ2V0CgpbU2VydmljZV0KVHlwZT1vbmVzaG90CkV4ZWNTdGFydD0vYmluL2Jhc2ggLWxjICd0ZXN0IC1mIC92YXIvdG1wL3JlZjc3MDcvd21zZXR1cC5sb2cgJiYgZWNobyAicmVmNzcwNy1kZW1vIHJhbiIgPj4gL3Zhci90bXAvcmVmNzcwNy9wZXJzaXN0LmxvZycKCltJbnN0YWxsXQpXYW50ZWRCeT1tdWx0aS11c2VyLnRhcmdldAo=; ' +
                    'printf %s \"$UNIT_B64\" | base64 -d | sudo tee /etc/systemd/system/ref7707-demo.service >/dev/null; ' +
                    'sudo systemctl daemon-reload; ' +
                    'sudo systemctl enable --now ref7707-demo.service; ',
            },
            {
                platform: 'windows',
                name: 'psh',
                command:
                    '$taskName = "ref7707-demo"\n' +
                    '$script = "cmd.exe /c type %TEMP%\\ref7707\\wmsetup.log >nul 2>&1 && echo ref7707-demo ran >> %TEMP%\\ref7707\\persist.log"\n' +
                    'schtasks /Create /TN $taskName /SC ONLOGON /TR $script /RL LIMITED /F | Out-Null\n' +
                    'schtasks /Run /TN $taskName | Out-Null\n',
            },
        ],
    },
];


