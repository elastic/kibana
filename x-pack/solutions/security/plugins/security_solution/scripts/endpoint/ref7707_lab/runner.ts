/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { ToolingLog } from '@kbn/tooling-log';
import { dump } from '../common/utils';
import { ensureSpaceIdExists, fetchActiveSpace } from '../common/spaces';
import {
  addEndpointIntegrationToAgentPolicy,
  enableFleetSpaceAwareness,
  getOrCreateDefaultAgentPolicy,
  waitForHostToEnroll,
} from '../common/fleet_services';
import { createVm, createMultipassHostVmClient, generateVmName } from '../common/vm_services';
import { createAndEnrollEndpointHost } from '../common/endpoint_host_services';
import { startFleetServerIfNecessary } from '../common/fleet_server/fleet_server_services';
import { addOsqueryIntegrationToAgentPolicy } from '../osquery_host/services/add_osquery_integration';
import { checkDependencies } from '../endpoint_agent_runner/pre_check';
import {
  getRuntimeServices,
  startRuntimeServices,
  stopRuntimeServices,
} from '../endpoint_agent_runner/runtime';
import { addPacketbeatDnsIntegrationToAgentPolicy } from './services/add_packetbeat_dns_integration';
import { addNetworkPacketCaptureDnsIntegrationToAgentPolicy } from './services/add_network_packet_capture_dns_integration';
import { DEFAULT_WEB_PORT, REF7707_DOMAINS } from './constants';
import { ensureRef7707CalderaPack } from './caldera/bootstrap';
import { CalderaClient } from './caldera/client';
import { deploySandcatToMultipassUbuntuVm } from './services/deploy_sandcat';

export interface RunRef7707LabOptions {
  kibanaUrl: string;
  elasticUrl: string;
  fleetServerUrl?: string;
  username: string;
  password: string;
  apiKey?: string;
  spaceId?: string;
  version?: string;
  policy?: string;
  cleanup?: boolean;
  multipassImage?: string;
  teardownVm?: string;
  vmPrefix?: string;
  orchestrator?: 'local' | 'caldera';
  calderaUrl?: string;
  calderaApiKey?: string;
  /** When using Caldera orchestrator, wait up to this many ms for links to appear (default: 10m). */
  calderaWaitMs?: number;
  /**
   * DNS telemetry source selection.
   * - packetbeat: install Packetbeat integration (DNS-only) into the agent policy (default)
   * - defend: do not install Packetbeat (operator must ensure DNS telemetry exists another way)
   * - none: skip DNS telemetry setup entirely (lab can still run but dns.question.name may be missing)
   */
  dnsTelemetrySource?: 'network_packet_capture' | 'packetbeat' | 'defend' | 'none';
  /** If true, continue the lab even if Packetbeat is not available in the package registry. */
  allowMissingPacketbeat?: boolean;
  /** If true, continue the lab even if network packet capture integration can't be installed/configured. */
  allowMissingNetworkPacketCapture?: boolean;
  log?: ToolingLog;
}

const getVmIpv4 = async (vmName: string): Promise<string> => {
  const vm = createMultipassHostVmClient(vmName);
  const { stdout } = await vm.exec(`hostname -I | awk '{print $1}'`, { shell: true });
  return stdout.trim();
};

const configureDnsmasq = async ({
  dnsVmName,
  webVmIp,
  domains,
}: {
  dnsVmName: string;
  webVmIp: string;
  domains: string[];
}): Promise<void> => {
  const dnsVm = createMultipassHostVmClient(dnsVmName);

  const confLines = [
    'bind-interfaces',
    'listen-address=0.0.0.0',
    // Keep it deterministic and avoid host/system upstream influence in demos.
    // Also forward non-lab domains upstream so we don't break the VM's general DNS usage.
    'no-resolv',
    'server=1.1.1.1',
    'server=8.8.8.8',
    'cache-size=0',
    ...domains.map((d) => `address=/${d}/${webVmIp}`),
  ].join('\n');

  await dnsVm.exec(`sudo apt-get update -y && sudo apt-get install -y dnsmasq`, { shell: true });
  await dnsVm.exec(`sudo tee /etc/dnsmasq.d/ref7707.conf >/dev/null <<'EOF'\n${confLines}\nEOF`, {
    shell: true,
  });
  await dnsVm.exec(`sudo systemctl restart dnsmasq`, { shell: true });
};

const configureVictimDnsResolver = async ({
  victimVmName,
  dnsServerIp,
}: {
  victimVmName: string;
  dnsServerIp: string;
}): Promise<void> => {
  const victimVm = createMultipassHostVmClient(victimVmName);
  // Determine interface used for default route.
  //
  // Important: do NOT route *all* DNS via the lab DNS VM (i.e. avoid "~.") as it can break
  // Elastic Agent/Fleet connectivity (especially when Fleet/ES are referenced via MagicDNS).
  // Instead, route only the lab TLD (~lab) and keep any existing DNS servers on the link.
  await victimVm.exec(
    `IFACE="$(ip route show default | awk '{print $5}' | head -n1)"; ` +
      `EXISTING_DNS="$(resolvectl dns "$IFACE" 2>/dev/null | awk '/DNS Servers:/ {for (i=3;i<=NF;i++) print $i}' | tr '\\n' ' ' | xargs || true)"; ` +
      `sudo resolvectl dns "$IFACE" ${dnsServerIp} $EXISTING_DNS; ` +
      `sudo resolvectl domain "$IFACE" '~lab'; ` +
      `resolvectl status "$IFACE"`,
    { shell: true }
  );
};

const setupWebServer = async ({
  webVmName,
  port,
}: {
  webVmName: string;
  port: number;
}): Promise<void> => {
  const webVm = createMultipassHostVmClient(webVmName);
  await webVm.exec(`sudo apt-get update -y && sudo apt-get install -y python3`, { shell: true });
  await webVm.exec(`mkdir -p /home/ubuntu/ref7707-web && cd /home/ubuntu/ref7707-web`, {
    shell: true,
  });

  // Create benign payload artifacts with campaign-like names
  await webVm.exec(
    `cat >/home/ubuntu/ref7707-web/fontdrvhost.exe <<'EOF'\nThis is a benign demo artifact (NOT malware).\\nEOF`,
    { shell: true }
  );
  await webVm.exec(
    `cat >/home/ubuntu/ref7707-web/config.ini <<'EOF'\n# benign config placeholder for REF7707-like lab\\nEOF`,
    { shell: true }
  );
  await webVm.exec(
    `cat >/home/ubuntu/ref7707-web/wmsetup.log <<'EOF'\n[INFO] benign placeholder log\\nEOF`,
    { shell: true }
  );

  // Start a simple HTTP server in the background
  await webVm.exec(
    `nohup python3 -m http.server ${port} --directory /home/ubuntu/ref7707-web >/home/ubuntu/ref7707-web/server.log 2>&1 &`,
    { shell: true }
  );
};

const runBenignChainOnHost = async ({
  vmName,
  domain,
  webPort,
}: {
  vmName: string;
  domain: string;
  webPort: number;
}): Promise<void> => {
  const vm = createMultipassHostVmClient(vmName);

  // DNS stage: produces dns.question.name when DNS telemetry is enabled (e.g. Packetbeat DNS)
  await vm.exec(`sudo apt-get update -y && sudo apt-get install -y dnsutils curl`, { shell: true });
  await vm.exec(`dig +tries=1 +time=2 ${domain} || true`, { shell: true });

  // Download/staging stage: domain-based HTTP fetch so DNS is involved
  await vm.exec(`sudo mkdir -p /var/tmp/ref7707 && sudo chown -R ubuntu:ubuntu /var/tmp/ref7707`, {
    shell: true,
  });
  await vm.exec(
    `curl -fsS -o /var/tmp/ref7707/fontdrvhost.exe http://${domain}:${webPort}/fontdrvhost.exe`,
    { shell: true }
  );
  await vm.exec(`curl -fsS -o /var/tmp/ref7707/config.ini http://${domain}:${webPort}/config.ini`, {
    shell: true,
  });
  await vm.exec(
    `curl -fsS -o /var/tmp/ref7707/wmsetup.log http://${domain}:${webPort}/wmsetup.log`,
    { shell: true }
  );

  // Execution stage: benign process tree + outbound HTTPS (C2-like)
  await vm.exec(
    `cat >/var/tmp/ref7707/stage1.sh <<'EOF'\n#!/usr/bin/env bash\nset -euo pipefail\n(\n  bash -lc 'echo \"[stage1] start\"; bash -lc \"sleep 0.2\"; bash -lc \"curl -sS https://example.com >/dev/null || true\"'\n) &\nwait\nEOF\nchmod +x /var/tmp/ref7707/stage1.sh\n/var/tmp/ref7707/stage1.sh`,
    { shell: true }
  );

  // Persistence-ish stage (benign)
  await vm.exec(
    `sudo tee /etc/systemd/system/ref7707-demo.service >/dev/null <<'EOF'\n[Unit]\nDescription=REF7707-like benign lab service\nAfter=network-online.target\n\n[Service]\nType=oneshot\nExecStart=/bin/bash -lc 'test -f /var/tmp/ref7707/wmsetup.log && echo \"ref7707-demo ran\" >> /var/tmp/ref7707/persist.log'\n\n[Install]\nWantedBy=multi-user.target\nEOF\nsudo systemctl daemon-reload\nsudo systemctl enable --now ref7707-demo.service`,
    { shell: true }
  );
};

const setupSshLateral = async ({
  initiatorVmName,
  targetVmName,
}: {
  initiatorVmName: string;
  targetVmName: string;
}): Promise<void> => {
  const initiator = createMultipassHostVmClient(initiatorVmName);
  const target = createMultipassHostVmClient(targetVmName);

  await target.exec(`sudo apt-get update -y && sudo apt-get install -y openssh-server`, {
    shell: true,
  });
  await target.exec(`sudo systemctl enable --now ssh`, { shell: true });

  // Generate a key on initiator and trust it on target
  await initiator.exec(`mkdir -p /home/ubuntu/.ssh && chmod 700 /home/ubuntu/.ssh`, {
    shell: true,
  });
  await initiator.exec(
    `test -f /home/ubuntu/.ssh/id_ed25519 || ssh-keygen -t ed25519 -N '' -f /home/ubuntu/.ssh/id_ed25519`,
    { shell: true }
  );

  const pubKey = (
    await initiator.exec(`cat /home/ubuntu/.ssh/id_ed25519.pub`, { shell: true })
  ).stdout.trim();

  await target.exec(`mkdir -p /home/ubuntu/.ssh && chmod 700 /home/ubuntu/.ssh`, { shell: true });
  await target.exec(
    `grep -qF "${pubKey.replaceAll(
      '"',
      '\\"'
    )}" /home/ubuntu/.ssh/authorized_keys 2>/dev/null || echo "${pubKey.replaceAll(
      '"',
      '\\"'
    )}" >> /home/ubuntu/.ssh/authorized_keys`,
    { shell: true }
  );
  await target.exec(`chmod 600 /home/ubuntu/.ssh/authorized_keys`, { shell: true });
};

const runSshLateral = async ({
  initiatorVmName,
  targetVmName,
  domain,
  webPort,
}: {
  initiatorVmName: string;
  targetVmName: string;
  domain: string;
  webPort: number;
}): Promise<void> => {
  const initiator = createMultipassHostVmClient(initiatorVmName);
  const targetIp = await getVmIpv4(targetVmName);

  // Run the same benign chain remotely via SSH (lateral-ish)
  await initiator.exec(
    `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@${targetIp} "sudo apt-get update -y && sudo apt-get install -y dnsutils curl && dig +tries=1 +time=2 ${domain} || true && sudo mkdir -p /var/tmp/ref7707 && sudo chown -R ubuntu:ubuntu /var/tmp/ref7707 && curl -fsS -o /var/tmp/ref7707/fontdrvhost.exe http://${domain}:${webPort}/fontdrvhost.exe && curl -fsS -o /var/tmp/ref7707/config.ini http://${domain}:${webPort}/config.ini && curl -fsS -o /var/tmp/ref7707/wmsetup.log http://${domain}:${webPort}/wmsetup.log && bash -lc 'sleep 0.2' "`,
    { shell: true }
  );
};

export const runRef7707Lab = async (options: RunRef7707LabOptions): Promise<void> => {
  if (options.teardownVm && options.teardownVm.length > 0) {
    await createMultipassHostVmClient(options.teardownVm).destroy();
    return;
  }

  await startRuntimeServices({
    kibanaUrl: options.kibanaUrl,
    elasticUrl: options.elasticUrl,
    fleetServerUrl: options.fleetServerUrl,
    username: options.username,
    password: options.password,
    apiKey: options.apiKey,
    spaceId: options.spaceId,
    version: options.version,
    policy: options.policy,
    includeOsquery: true,
    log: options.log,
  });

  const { kbnClient, log } = getRuntimeServices();
  let dnsVmName: string | undefined;
  let webVmName: string | undefined;
  let initiatorVmName: string | undefined;
  let victimVmName: string | undefined;

  try {
    if (options.spaceId && options.spaceId !== DEFAULT_SPACE_ID) {
      await enableFleetSpaceAwareness(kbnClient);
      await ensureSpaceIdExists(kbnClient, options.spaceId);
    }

    await checkDependencies();

    await startFleetServerIfNecessary({
      kbnClient,
      logger: log,
      version: options.version,
    });

    const agentPolicyId =
      options.policy && options.policy.length > 0
        ? options.policy
        : (await getOrCreateDefaultAgentPolicy({ kbnClient, log })).id;

    if (!agentPolicyId) {
      throw new Error(`Unable to determine agent policy id for the lab run`);
    }

    // Ensure core integrations for the scenario
    await addEndpointIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId });
    await addOsqueryIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId });

    const dnsTelemetrySource = options.dnsTelemetrySource ?? 'network_packet_capture';
    const allowMissingNetworkPacketCapture =
      options.allowMissingNetworkPacketCapture ?? options.allowMissingPacketbeat ?? false;

    if (dnsTelemetrySource === 'network_packet_capture') {
      try {
        await addNetworkPacketCaptureDnsIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId });
      } catch (e: any) {
        if (allowMissingNetworkPacketCapture) {
          log.warning(
            `[ref7707] Network Packet Capture integration could not be installed/configured for DNS-only. Continuing without it (dns.question.name may be missing).`
          );
        } else {
          throw e;
        }
      }
    } else if (dnsTelemetrySource === 'packetbeat') {
      try {
        await addPacketbeatDnsIntegrationToAgentPolicy({ kbnClient, log, agentPolicyId });
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        const isPacketbeatNotFound =
          msg.includes('[packetbeat] package not found in registry') ||
          (msg.includes('packetbeat') && msg.includes('package not found'));

        if (isPacketbeatNotFound && options.allowMissingPacketbeat) {
          log.warning(
            `[ref7707] Packetbeat package not found in the Fleet package registry. Continuing without Packetbeat DNS (dns.question.name may be missing).`
          );
        } else if (isPacketbeatNotFound) {
          throw new Error(
            `Packetbeat package not found in the Fleet package registry.\n\n` +
              `Fix: ensure Kibana can reach an Elastic Package Registry that contains 'packetbeat', then re-run.\n` +
              `Workaround: pass --allowMissingPacketbeat or --dnsTelemetrySource=defend/none.\n\n` +
              `Original error: ${msg}`
          );
        } else {
          throw e;
        }
      }
    } else if (dnsTelemetrySource === 'defend') {
      log.info(`[ref7707] Skipping Packetbeat DNS integration (dnsTelemetrySource=defend)`);
    } else {
      log.warning(`[ref7707] Skipping DNS telemetry setup entirely (dnsTelemetrySource=none)`);
    }

    const activeSpaceId = (await fetchActiveSpace(kbnClient)).id;
    const prefix = options.vmPrefix?.length ? options.vmPrefix : `ref7707-${activeSpaceId}`;

    dnsVmName = generateVmName(`${prefix}-dns`);
    webVmName = generateVmName(`${prefix}-web`);

    // Create infra VMs (no agent)
    log.info(`Creating infra VMs (dns + web)`);
    await createVm({
      type: 'multipass',
      name: dnsVmName,
      image: options.multipassImage,
      disk: '5G',
      cpus: 1,
      memory: '1G',
      log,
    });
    await createVm({
      type: 'multipass',
      name: webVmName,
      image: options.multipassImage,
      disk: '5G',
      cpus: 1,
      memory: '1G',
      log,
    });

    // Create endpoint hosts (with agents)
    initiatorVmName = generateVmName(`${prefix}-initiator`);
    victimVmName = generateVmName(`${prefix}-victim`);

    log.info(`Creating and enrolling endpoint hosts (initiator + victim)`);
    await createAndEnrollEndpointHost({
      kbnClient,
      log,
      hostname: initiatorVmName,
      agentPolicyId,
      version: options.version,
      useClosestVersionMatch: false,
      disk: '15G',
      multipassImage: options.multipassImage,
    });
    await createAndEnrollEndpointHost({
      kbnClient,
      log,
      hostname: victimVmName,
      agentPolicyId,
      version: options.version,
      useClosestVersionMatch: false,
      disk: '15G',
      multipassImage: options.multipassImage,
    });

    // Wait for both to show online (helps with later osquery tasks)
    await waitForHostToEnroll(kbnClient, log, initiatorVmName, 180000);
    await waitForHostToEnroll(kbnClient, log, victimVmName, 180000);

    const webIp = await getVmIpv4(webVmName);
    const dnsIp = await getVmIpv4(dnsVmName);

    // Configure infra
    await setupWebServer({ webVmName, port: DEFAULT_WEB_PORT });
    await configureDnsmasq({ dnsVmName, webVmIp: webIp, domains: REF7707_DOMAINS });

    // Configure victims to use dns-vm resolver so DNS queries are generated
    await configureVictimDnsResolver({ victimVmName: initiatorVmName, dnsServerIp: dnsIp });
    await configureVictimDnsResolver({ victimVmName, dnsServerIp: dnsIp });

    // Run benign chain on initiator (local)
    const domain = REF7707_DOMAINS[0];
    const orchestrator = options.orchestrator ?? 'local';

    if (orchestrator === 'caldera') {
      if (!options.calderaUrl) {
        throw new Error(`--calderaUrl is required when --orchestrator=caldera`);
      }
      if (!options.calderaApiKey) {
        throw new Error(`--calderaApiKey is required when --orchestrator=caldera`);
      }

      // 1) Deploy sandcat to both endpoint VMs (Ubuntu multipass) so Caldera can control them.
      await deploySandcatToMultipassUbuntuVm({
        vmName: initiatorVmName,
        calderaUrl: options.calderaUrl,
        log,
      });
      await deploySandcatToMultipassUbuntuVm({
        vmName: victimVmName,
        calderaUrl: options.calderaUrl,
        log,
      });

      // 2) Ensure Caldera pack exists (abilities + adversary).
      const { adversaryId, abilityIds } = await ensureRef7707CalderaPack({
        calderaUrl: options.calderaUrl,
        calderaApiKey: options.calderaApiKey,
        log,
        domain,
        webPort: DEFAULT_WEB_PORT,
        dnsIp,
        webIp,
      });
      if (!adversaryId) {
        throw new Error(`Unable to determine Caldera adversary id for REF7707 lab pack`);
      }

      const caldera = new CalderaClient({
        calderaUrl: options.calderaUrl,
        apiKey: options.calderaApiKey,
      });

      // 3) Create and start an operation.
      const opName = `ref7707-lab-${prefix}-${Date.now()}`;
      const operation = await caldera.createOperation({
        name: opName,
        adversary: { adversary_id: adversaryId },
        state: 'running',
        autonomous: 1,
        auto_close: true,
        // sandcat is deployed with -group ref7707
        group: 'ref7707',
      });
      const operationId = operation?.id;
      log.info(`[caldera] created operation: ${opName}${operationId ? ` (${operationId})` : ''}`);
      if (operationId) {
        const base = options.calderaUrl.replace(/\/$/, '');
        log.info(`[caldera] dashboard: ${base}/#/operations/${operationId}`);
      }
      log.info(`[caldera] dashboard: ${options.calderaUrl.replace(/\/$/, '')}/#/operations`);

      // 4) Wait for links to show up (best-effort). This ensures the script doesn't exit before
      //    the emulation generates telemetry.
      const waitMs = options.calderaWaitMs ?? 10 * 60 * 1000;
      const start = Date.now();
      let expectedLinks = 0;
      if (operationId) {
        // Refresh operation (host_group size determines expected chain length)
        const ops = await caldera.getOperations();
        const op0 = ops.find((o) => o?.id === operationId);
        const hosts = Array.isArray(op0?.host_group) ? op0.host_group.length : 1;
        expectedLinks = hosts * abilityIds.length;
      }
      while (Date.now() - start < waitMs) {
        if (!operationId) break;
        const ops = await caldera.getOperations();
        const op = ops.find((o) => o?.id === operationId);
        const chainLen = Array.isArray(op?.chain) ? op.chain.length : 0;
        const state = op?.state ?? 'unknown';
        log.info(
          `[caldera] operation state=${state} chain=${chainLen}${
            expectedLinks ? `/${expectedLinks}` : ''
          }`
        );
        if (expectedLinks && chainLen >= expectedLinks) break;
        await new Promise((r) => setTimeout(r, 10_000));
      }
    } else {
      log.info(`Running benign REF7707-like chain on initiator using domain [${domain}]`);
      await runBenignChainOnHost({ vmName: initiatorVmName, domain, webPort: DEFAULT_WEB_PORT });

      // SSH lateral-ish: initiator triggers the same chain on victim via SSH
      log.info(`Setting up SSH lateral-ish emulation (initiator -> victim)`);
      await setupSshLateral({ initiatorVmName, targetVmName: victimVmName });
      await runSshLateral({
        initiatorVmName,
        targetVmName: victimVmName,
        domain,
        webPort: DEFAULT_WEB_PORT,
      });
    }

    log.info(
      `Lab complete.\nDNS VM: ${dnsVmName}\nWEB VM: ${webVmName}\nINIT VM: ${initiatorVmName}\nVICT VM: ${victimVmName}`
    );

    if (options.cleanup && dnsVmName && webVmName && initiatorVmName && victimVmName) {
      log.info(`Cleaning up VMs`);
      await Promise.all([
        createMultipassHostVmClient(dnsVmName, log).destroy(),
        createMultipassHostVmClient(webVmName, log).destroy(),
        createMultipassHostVmClient(initiatorVmName, log).destroy(),
        createMultipassHostVmClient(victimVmName, log).destroy(),
      ]);
    }
  } catch (e) {
    log.error(dump(e));
    throw e;
  } finally {
    await stopRuntimeServices();
  }
};
