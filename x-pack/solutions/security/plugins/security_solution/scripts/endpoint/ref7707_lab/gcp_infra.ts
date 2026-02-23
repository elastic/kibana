/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import pRetry from 'p-retry';
import type { ToolingLog } from '@kbn/tooling-log';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { gcloud, gcloudInstanceExists, gcloudSsh } from '../gcp_fleet_vm/gcloud';

const REF7707_WEB_PORT = 8080;

const REF7707_LAB_DOMAINS: string[] = [
    'poster.checkponit.lab',
    'support.fortineat.lab',
    'update.hobiter.lab',
    'support.vmphere.lab',
    'cloud.autodiscovar.lab',
    'digert.ictnsc.lab',
];

const createUbuntuInstance = async ({
    log,
    project,
    zone,
    name,
    machineType,
    startupScript,
}: {
    log: ToolingLog;
    project: string;
    zone: string;
    name: string;
    machineType: string;
    startupScript: string;
}): Promise<void> => {
    // Use Ubuntu LTS public image; match the rest of the gcp_fleet_vm defaults.
    await gcloud(log, [
        'compute',
        'instances',
        'create',
        name,
        '--project',
        project,
        '--zone',
        zone,
        '--machine-type',
        machineType,
        '--image-family',
        'ubuntu-2204-lts',
        '--image-project',
        'ubuntu-os-cloud',
        '--boot-disk-size',
        '30GB',
        '--metadata',
        `startup-script=${startupScript}`,
        '--quiet',
    ]);
};

const runRemoteBashScript = async ({
    log,
    project,
    zone,
    instance,
    script,
}: {
    log: ToolingLog;
    project: string;
    zone: string;
    instance: string;
    script: string;
}): Promise<void> => {
    // gcloud/ssh remote command parsing can get fragile with complex one-liners.
    // Ship a real bash script over stdin to avoid quoting/loop/heredoc issues.
    const b64 = Buffer.from(script, 'utf8').toString('base64');
    const cmd = `printf '%s' '${b64}' | base64 -d | sudo bash`;
    await gcloudSsh({ log, project, zone, instance, command: cmd });
};

const waitForAptLocksToClearSnippet = () => `
sudo cloud-init status --wait >/dev/null 2>&1 || true
while sudo fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
  echo "waiting for apt locks to clear..."
  sleep 3
done
`;

const fetchTailscaleIpv4 = async ({
    log,
    project,
    zone,
    instance,
}: {
    log: ToolingLog;
    project: string;
    zone: string;
    instance: string;
}): Promise<string> => {
    const out = await pRetry(
        async () => {
            const stdout = await gcloudSsh({
                log,
                project,
                zone,
                instance,
                command: `sudo tailscale ip -4 | head -n 1`,
            });
            const ip = stdout.trim();
            if (!ip) {
                throw new Error(`tailscale ip returned empty output (tailscale not ready yet)`);
            }
            return ip;
        },
        { retries: 30, minTimeout: 5000, maxTimeout: 10000 }
    );
    return out.trim();
};

const configureRef7707WebServer = async ({
    log,
    project,
    zone,
    webVmName,
}: {
    log: ToolingLog;
    project: string;
    zone: string;
    webVmName: string;
}): Promise<void> => {
    const script = `#!/usr/bin/env bash
set -euo pipefail
${waitForAptLocksToClearSnippet()}

sudo apt-get update -y
sudo apt-get install -y --no-install-recommends python3 curl ca-certificates

sudo mkdir -p /home/ubuntu/ref7707-web
cat <<'EOF' | sudo tee /home/ubuntu/ref7707-web/fontdrvhost.exe >/dev/null
This is a benign demo artifact (NOT malware).
EOF
cat <<'EOF' | sudo tee /home/ubuntu/ref7707-web/config.ini >/dev/null
# benign config placeholder for REF7707-like lab
EOF
cat <<'EOF' | sudo tee /home/ubuntu/ref7707-web/wmsetup.log >/dev/null
[INFO] benign placeholder log
EOF

nohup python3 -m http.server ${REF7707_WEB_PORT} --directory /home/ubuntu/ref7707-web >/home/ubuntu/ref7707-web/server.log 2>&1 &
sleep 1
curl -fsS http://127.0.0.1:${REF7707_WEB_PORT}/wmsetup.log >/dev/null
echo "web:ok"
`;

    await runRemoteBashScript({ log, project, zone, instance: webVmName, script });
};

const configureRef7707Dnsmasq = async ({
    log,
    project,
    zone,
    dnsVmName,
    webTailscaleIp,
    dnsTailscaleIp,
}: {
    log: ToolingLog;
    project: string;
    zone: string;
    dnsVmName: string;
    webTailscaleIp: string;
    dnsTailscaleIp: string;
}): Promise<void> => {
    const confLines = [
        // Bind ONLY on tailscale interface/IP to avoid conflicts with systemd-resolved (127.0.0.53:53).
        'bind-interfaces',
        'interface=tailscale0',
        // Also listen on localhost for easy on-box debugging.
        `listen-address=${dnsTailscaleIp},127.0.0.1`,
        'except-interface=lo',
        // Forward non-lab domains upstream so the VM keeps working as a general resolver for agents.
        'no-resolv',
        'server=1.1.1.1',
        'server=8.8.8.8',
        'cache-size=0',
        ...REF7707_LAB_DOMAINS.map((d) => `address=/${d}/${webTailscaleIp}`),
    ].join('\n');

    const script = `#!/usr/bin/env bash
set -euo pipefail
${waitForAptLocksToClearSnippet()}

sudo apt-get update -y
sudo apt-get install -y --no-install-recommends dnsmasq

cat <<'EOF' | sudo tee /etc/dnsmasq.d/ref7707.conf >/dev/null
${confLines}
EOF

sudo systemctl restart dnsmasq
sudo systemctl --no-pager status dnsmasq | head -n 30 || true
echo "--- listeners ---"
sudo ss -lntup | grep -E ':53\\b' || true
echo "--- dig localhost ---"
dig +tries=1 +time=2 @127.0.0.1 ${REF7707_LAB_DOMAINS[0]} || true
echo "--- dig tailscale ip ---"
dig +tries=1 +time=2 @${dnsTailscaleIp} ${REF7707_LAB_DOMAINS[0]} || true
`;

    await runRemoteBashScript({ log, project, zone, instance: dnsVmName, script });
};

const restoreUbuntuVmDnsDefaults = async ({
    log,
    project,
    zone,
    vmName,
}: {
    log: ToolingLog;
    project: string;
    zone: string;
    vmName: string;
}): Promise<void> => {
    const script = `#!/usr/bin/env bash
set -euo pipefail

# Undo any prior lab DNS changes so Elastic Agent isn't impacted.
sudo rm -f /etc/systemd/resolved.conf.d/ref7707.conf || true
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf || true
sudo systemctl restart systemd-resolved || true
sudo resolvectl flush-caches || true

# Re-allow tailscale DNS (MagicDNS) if it was disabled.
sudo tailscale set --accept-dns=true >/dev/null 2>&1 || true

# Fix common sudo error: "unable to resolve host <hostname>".
# Ensure the instance hostname is present in /etc/hosts so sudo doesn't rely on DNS for it.
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || hostname)"
if ! grep -qE "(^|[[:space:]])$HOSTNAME_SHORT([[:space:]]|$)" /etc/hosts; then
  echo "127.0.1.1 $HOSTNAME_SHORT" | sudo tee -a /etc/hosts >/dev/null
fi

echo "--- resolvectl ---"
resolvectl status | sed -n '1,200p'
echo "--- /etc/resolv.conf ---"
cat /etc/resolv.conf || true
echo "--- /etc/hosts ---"
tail -n 20 /etc/hosts || true
`;

    await runRemoteBashScript({ log, project, zone, instance: vmName, script });
};

const tailscaleStartupScript = (authKey: string) => `#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends curl ca-certificates
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --auth-key="${authKey}" --hostname="$(hostname)" --accept-dns=true
echo "tailscale:up"
`;

export interface ProvisionRef7707GcpInfraOptions {
    log: ToolingLog;
    gcpProject: string;
    gcpZone: string;
    tailscaleAuthKey: string;
    namePrefix: string;
    /** Optional: only used to infer names if ubuntuVmNames is empty */
    ubuntuAgentCount?: number;
    /** Optional: comma-separated Ubuntu agent VM names; if provided, we'll best-effort restore DNS defaults */
    ubuntuVmNames?: string;
}

export interface ProvisionRef7707GcpInfraResult {
    dnsIp: string;
    webIp: string;
    domain: string;
    webPort: number;
    dnsVmName: string;
    webVmName: string;
}

export const provisionRef7707GcpInfra = async ({
    log,
    gcpProject,
    gcpZone,
    tailscaleAuthKey,
    namePrefix,
    ubuntuAgentCount = 0,
    ubuntuVmNames: ubuntuVmNamesRaw = '',
}: ProvisionRef7707GcpInfraOptions): Promise<ProvisionRef7707GcpInfraResult> => {
    if (!gcpProject) throw new Error(`gcpProject is required`);
    if (!tailscaleAuthKey) throw new Error(`tailscaleAuthKey is required`);
    if (!namePrefix) throw new Error(`namePrefix is required (must match the prefix used by run_gcp_fleet_vm)`);

    const webVmName = `${namePrefix}-ref7707-web`;
    const dnsVmName = `${namePrefix}-ref7707-dns`;

    const ubuntuVmNames =
        ubuntuVmNamesRaw.trim().length > 0
            ? ubuntuVmNamesRaw
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : ubuntuAgentCount > 0
                ? Array.from({ length: ubuntuAgentCount }, (_, i) => `${namePrefix}-ubuntu-${i + 1}`)
                : [];

    // Ubuntu agent VMs are optional here. On fresh VMs (and with our Caldera abilities using --dnsIp/--webIp),
    // we don't need to touch their resolvers at all. If provided, we'll best-effort restore DNS defaults.
    if (!ubuntuVmNames.length) {
        log.info(
            `[ref7707] no Ubuntu agent VMs provided (--ubuntuVmNames/--ubuntuAgentCount). Skipping agent DNS default restore.`
        );
    }

    // Create/ensure infra VMs exist
    const webExists = await gcloudInstanceExists({ log, project: gcpProject, zone: gcpZone, instance: webVmName });
    const dnsExists = await gcloudInstanceExists({ log, project: gcpProject, zone: gcpZone, instance: dnsVmName });

    if (!webExists) {
        log.info(`[ref7707] creating web VM [${webVmName}]`);
        await createUbuntuInstance({
            log,
            project: gcpProject,
            zone: gcpZone,
            name: webVmName,
            machineType: 'e2-small',
            startupScript: tailscaleStartupScript(tailscaleAuthKey),
        });
    } else {
        log.info(`[ref7707] web VM [${webVmName}] already exists; reusing`);
    }

    if (!dnsExists) {
        log.info(`[ref7707] creating dns VM [${dnsVmName}]`);
        await createUbuntuInstance({
            log,
            project: gcpProject,
            zone: gcpZone,
            name: dnsVmName,
            machineType: 'e2-small',
            startupScript: tailscaleStartupScript(tailscaleAuthKey),
        });
    } else {
        log.info(`[ref7707] dns VM [${dnsVmName}] already exists; reusing`);
    }

    const webTsIp = await fetchTailscaleIpv4({ log, project: gcpProject, zone: gcpZone, instance: webVmName });
    const dnsTsIp = await fetchTailscaleIpv4({ log, project: gcpProject, zone: gcpZone, instance: dnsVmName });

    log.info(`[ref7707] web tailscale ip: ${webTsIp}`);
    log.info(`[ref7707] dns tailscale ip: ${dnsTsIp}`);

    await configureRef7707WebServer({ log, project: gcpProject, zone: gcpZone, webVmName });
    await configureRef7707Dnsmasq({
        log,
        project: gcpProject,
        zone: gcpZone,
        dnsVmName,
        webTailscaleIp: webTsIp,
        dnsTailscaleIp: dnsTsIp,
    });

    for (const vmName of ubuntuVmNames) {
        const exists = await gcloudInstanceExists({ log, project: gcpProject, zone: gcpZone, instance: vmName });
        if (!exists) {
            log.warning(
                `[ref7707] Ubuntu VM [${vmName}] was not found in GCP project/zone; skipping DNS default restore.`
            );
            continue;
        }

        log.info(`[ref7707] restoring DNS defaults on [${vmName}] (avoid breaking Elastic Agent)`);
        await restoreUbuntuVmDnsDefaults({
            log,
            project: gcpProject,
            zone: gcpZone,
            vmName,
        });
    }

    // Print values for running the Caldera operation without modifying agent DNS.
    log.info(`[ref7707] GCP infra ready. Use these with run_ref7707_caldera_operation:`);
    log.info(`[ref7707]   --domain ${REF7707_LAB_DOMAINS[0]}`);
    log.info(`[ref7707]   --webPort ${REF7707_WEB_PORT}`);
    log.info(`[ref7707]   --dnsIp ${dnsTsIp}`);
    log.info(`[ref7707]   --webIp ${webTsIp}`);

    return {
        dnsIp: dnsTsIp,
        webIp: webTsIp,
        domain: REF7707_LAB_DOMAINS[0],
        webPort: REF7707_WEB_PORT,
        dnsVmName,
        webVmName,
    };
};

const runInfra: RunFn = async ({ log, flags }) => {
    createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

    const gcpProject = (flags.gcpProject as string) || '';
    const gcpZone = (flags.gcpZone as string) || 'us-central1-a';
    const tailscaleAuthKey = (flags.tailscaleAuthKey as string) || process.env.TS_AUTHKEY || '';
    const namePrefix = (flags.namePrefix as string) || '';
    const ubuntuAgentCount = flags.ubuntuAgentCount ? Number(flags.ubuntuAgentCount) : 0;
    const ubuntuVmNamesRaw = (flags.ubuntuVmNames as string) || '';

    if (!gcpProject) throw new Error(`--gcpProject is required`);
    if (!tailscaleAuthKey) throw new Error(`--tailscaleAuthKey is required (or set TS_AUTHKEY)`);
    if (!namePrefix) throw new Error(`--namePrefix is required (must match the prefix used by run_gcp_fleet_vm)`);

    await provisionRef7707GcpInfra({
        log,
        gcpProject,
        gcpZone,
        tailscaleAuthKey,
        namePrefix,
        ubuntuAgentCount,
        ubuntuVmNames: ubuntuVmNamesRaw,
    });
};

export const cli = () => {
    run(runInfra, {
        description: `
Provision REF7707 lab infra on GCP (dns-vm + web-vm) and point Ubuntu agent VMs at dns-vm.

This is intentionally separate from run_gcp_fleet_vm so GCP provisioning remains generic.
`,
        flags: {
            string: ['gcpProject', 'gcpZone', 'tailscaleAuthKey', 'namePrefix', 'ubuntuVmNames', 'logLevel'],
            number: ['ubuntuAgentCount'],
            default: {
                gcpZone: 'us-central1-a',
                tailscaleAuthKey: '',
                ubuntuVmNames: '',
                ubuntuAgentCount: 0,
            },
            help: `
  --gcpProject         GCP project id (required)
  --gcpZone            GCP zone (default: us-central1-a)
  --tailscaleAuthKey   Tailscale auth key (or set TS_AUTHKEY) (required if VMs need creating)
  --namePrefix         Prefix used by run_gcp_fleet_vm (required)
  --ubuntuVmNames      Comma-separated Ubuntu agent VM names to reconfigure DNS (optional if using --ubuntuAgentCount)
  --ubuntuAgentCount   If provided, assumes names: <namePrefix>-ubuntu-1..N
`,
        },
    });
};


