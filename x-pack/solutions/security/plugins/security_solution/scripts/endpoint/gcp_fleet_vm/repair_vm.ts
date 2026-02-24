/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { gcloudInstanceExists, gcloudSsh } from './gcloud';

const runSsh = async ({
  log,
  project,
  zone,
  instance,
  command,
}: {
  log: ToolingLog;
  project: string;
  zone: string;
  instance: string;
  command: string;
}) => {
  return gcloudSsh({ log, project, zone, instance, command });
};

const runRepair: RunFn = async ({ log, flags }) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  const gcpProject = (flags.gcpProject as string) || '';
  const gcpZone = (flags.gcpZone as string) || 'us-central1-a';
  const vmName = (flags.vmName as string) || '';
  const tailscaleAuthKey = (flags.tailscaleAuthKey as string) || process.env.TS_AUTHKEY || '';
  const fleetServerUrl = (flags.fleetServerUrl as string) || '';

  if (!gcpProject) throw new Error(`--gcpProject is required`);
  if (!gcpZone) throw new Error(`--gcpZone is required`);
  if (!vmName) throw new Error(`--vmName is required`);

  const exists = await gcloudInstanceExists({
    log,
    project: gcpProject,
    zone: gcpZone,
    instance: vmName,
  });
  if (!exists) {
    throw new Error(`GCP instance not found: ${vmName} (project=${gcpProject}, zone=${gcpZone})`);
  }

  log.info(`[gcp][repair] connecting to VM [${vmName}]`);

  const scriptLines: string[] = [
    'set -euo pipefail',
    'echo "--- hostname ---"',
    'hostname || true',
    'echo "--- uptime ---"',
    'uptime || true',
    '',
    'echo "--- tailscale (service) ---"',
    'sudo systemctl is-active --quiet tailscaled && echo "tailscaled:active" || echo "tailscaled:inactive"',
    'sudo systemctl restart tailscaled || true',
    'sleep 2',
    'sudo systemctl is-active --quiet tailscaled && echo "tailscaled:active" || echo "tailscaled:inactive"',
    '',
    'echo "--- tailscale (status) ---"',
    'sudo tailscale status || true',
    '',
    // Ensure Tailscale DNS is enabled (MagicDNS / internal name resolution)
    'echo "--- tailscale (accept-dns) ---"',
    'sudo tailscale set --accept-dns=true >/dev/null 2>&1 || true',
    '',
    // Best-effort re-auth if logged out (requires authkey)
    'if sudo tailscale status 2>/dev/null | grep -qiE "Logged out|NeedsLogin|not logged in|stopped"; then',
    '  echo "--- tailscale: attempting re-auth ---"',
    tailscaleAuthKey
      ? `  sudo tailscale up --auth-key="${tailscaleAuthKey}" --hostname="$(hostname)" --accept-dns=true || true`
      : '  echo "SKIP: no TS_AUTHKEY/--tailscaleAuthKey provided"',
    'fi',
    '',
    // Restore common DNS defaults (some previous experiments changed this and it breaks Fleet reachability)
    'echo "--- dns (resolv.conf + resolved) ---"',
    'sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf || true',
    'sudo systemctl restart systemd-resolved || true',
    'sudo resolvectl flush-caches || true',
    'resolvectl status | sed -n "1,120p" || true',
    'echo "--- /etc/resolv.conf ---"',
    'cat /etc/resolv.conf || true',
    '',
    'echo "--- elastic-agent ---"',
    'sudo systemctl is-active --quiet elastic-agent && echo "elastic-agent:active" || echo "elastic-agent:inactive"',
    'sudo systemctl restart elastic-agent || true',
    'sleep 2',
    'sudo systemctl is-active --quiet elastic-agent && echo "elastic-agent:active" || echo "elastic-agent:inactive"',
    'sudo systemctl status elastic-agent --no-pager | sed -n "1,80p" || true',
    'echo "--- elastic-agent logs (tail) ---"',
    'sudo journalctl -u elastic-agent --no-pager -n 200 || true',
    '',
    ...(fleetServerUrl
      ? [
          'echo "--- fleet-server reachability ---"',
          `FS="${fleetServerUrl.replace(/"/g, '\\"')}"`,
          'echo "fleetServerUrl=$FS"',
          // Accept any 2xx/3xx/401/403 as "reachable"
          `code="$(curl -ksS --max-time 8 -o /dev/null -w '%{http_code}' "$FS/api/status" || true)"`,
          'echo "fleet-server-http:$code"',
        ]
      : []),
    '',
    'echo "OK: repair attempt complete"',
  ];

  const b64 = Buffer.from(scriptLines.join('\n'), 'utf8').toString('base64');
  const cmd = `bash -lc "$(echo ${b64} | base64 -d)"`;

  await runSsh({ log, project: gcpProject, zone: gcpZone, instance: vmName, command: cmd });

  // Give Fleet a moment to show the agent back online
  log.info(`[gcp][repair] waiting briefly for Fleet to reflect VM online`);
  await pRetry(async () => undefined, { retries: 6, minTimeout: 2000, maxTimeout: 5000 }).catch(
    () => undefined
  );
};

export const cli = () => {
  run(runRepair, {
    description: `
Repair a GCP Ubuntu VM that went offline in Fleet by restoring Tailscale/DNS settings and restarting elastic-agent.
Prints diagnostics (tailscale + elastic-agent logs).
`,
    flags: {
      string: ['gcpProject', 'gcpZone', 'vmName', 'tailscaleAuthKey', 'fleetServerUrl', 'logLevel'],
      default: {
        gcpZone: 'us-central1-a',
        tailscaleAuthKey: '',
        fleetServerUrl: '',
      },
      help: `
  --gcpProject        GCP project id (required)
  --gcpZone           GCP zone (default: us-central1-a)
  --vmName            VM instance name (required)
  --tailscaleAuthKey  Optional: TS auth key (or set TS_AUTHKEY) for re-auth if the VM is logged out
  --fleetServerUrl    Optional: Fleet Server URL to probe (ex: https://<fleet-host>:8220)
`,
    },
  });
};
