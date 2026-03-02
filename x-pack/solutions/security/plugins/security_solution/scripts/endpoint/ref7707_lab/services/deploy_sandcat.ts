/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { createMultipassHostVmClient } from '../../common/vm_services';

/**
 * Best-effort sandcat deployment for Linux VMs (Multipass).
 *
 * This mirrors the approach used by the GCP VM provisioner:
 * - download sandcat payload from Caldera
 * - treat it as either an ELF binary or Go source
 * - run it under systemd as a long-lived service with a stable paw (= hostname)
 */
export const deploySandcatToMultipassUbuntuVm = async ({
  vmName,
  calderaUrl,
  log,
}: {
  vmName: string;
  calderaUrl: string;
  log: ToolingLog;
}): Promise<void> => {
  const vm = createMultipassHostVmClient(vmName, log);
  const url = calderaUrl.replace(/\/$/, '');

  log.info(`[caldera] deploying sandcat to Ubuntu VM [${vmName}] (Caldera: ${url})`);

  const script = [
    'set -euo pipefail',
    `CALDERA_URL="${url}"`,
    'sudo apt-get update -y >/dev/null 2>&1 || true',
    'sudo apt-get install -y curl golang-go file >/dev/null 2>&1 || true',
    'sudo mkdir -p /opt/sandcat',
    'sudo chown -R root:root /opt/sandcat',
    'echo "[caldera] checking reachability..."',
    // Accept any 2xx/3xx as "reachable"
    'code="$(curl -sS --max-time 10 -o /dev/null -w \'%{http_code}\' "$CALDERA_URL" || true)"',
    'if [[ "$code" != 2* && "$code" != 3* ]]; then echo "[caldera] Caldera not reachable (HTTP $code)"; exit 1; fi',
    'echo "[caldera] downloading sandcat payload..."',
    'downloaded="false"',
    'for u in "$CALDERA_URL/file/download" "$CALDERA_URL/api/v2/file/download"; do',
    '  if curl -fsS -X POST -H "file: sandcat.go" "$u" -o /opt/sandcat/sandcat.go; then downloaded="true"; break; fi',
    'done',
    'if [[ "$downloaded" != "true" ]]; then echo "[caldera] ERROR: failed to download sandcat.go (tried /file/download and /api/v2/file/download)"; exit 1; fi',
    'kind="$(file -b /opt/sandcat/sandcat.go || true)"',
    'bytes="$(wc -c </opt/sandcat/sandcat.go || true)"',
    'echo "[caldera] downloaded (${bytes} bytes): ${kind}"',
    'if echo "$kind" | grep -qiE "ELF|executable"; then',
    '  sudo install -m 0755 /opt/sandcat/sandcat.go /opt/sandcat/sandcat',
    'else',
    '  if ! sudo grep -qE "^package[[:space:]]+" /opt/sandcat/sandcat.go; then echo "[caldera] ERROR: payload is neither ELF nor Go source"; sudo head -n 20 /opt/sandcat/sandcat.go || true; exit 1; fi',
    '  echo "[caldera] compiling sandcat..."',
    '  sudo env -i PATH="$PATH" HOME=/root go build -o /opt/sandcat/sandcat /opt/sandcat/sandcat.go',
    '  sudo chmod 0755 /opt/sandcat/sandcat',
    'fi',
    'echo "[caldera] writing systemd unit..."',
    'sudo tee /etc/systemd/system/sandcat.service >/dev/null <<EOF',
    '[Unit]',
    'Description=Caldera Sandcat Agent',
    'After=network-online.target',
    '',
    '[Service]',
    'Type=simple',
    `ExecStart=/opt/sandcat/sandcat -server ${url} -group ref7707 -paw %H`,
    'Restart=always',
    'RestartSec=3',
    '',
    '[Install]',
    'WantedBy=multi-user.target',
    'EOF',
    'sudo systemctl daemon-reload',
    'sudo systemctl enable --now sandcat.service',
    'sudo systemctl --no-pager status sandcat.service | head -n 20 || true',
    'echo "[caldera] done"',
  ].join('\n');

  await vm.exec(script, { shell: true });
};
