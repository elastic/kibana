/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import pRetry from 'p-retry';
import axios from 'axios';
import execa from 'execa';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import type {
  GetEnrollmentAPIKeysResponse,
  GetOutputsResponse,
  PostEnrollmentAPIKeyRequest,
  PostEnrollmentAPIKeyResponse,
  PutOutputRequest,
} from '@kbn/fleet-plugin/common/types';
import {
  enrollmentAPIKeyRouteService,
  outputRoutesService,
} from '@kbn/fleet-plugin/common/services';
import {
  API_VERSIONS,
  FLEET_SERVER_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';

import { cleanupAndAddFleetServerHostSettings } from '../common/fleet_server/fleet_server_services';
import {
  addEndpointIntegrationToAgentPolicy,
  createAgentPolicy,
  createIntegrationPolicy,
  ensureFleetSetup,
  fetchAgentPolicyList,
  fetchIntegrationPolicyList,
  fetchPackageInfo,
  generateFleetServiceToken,
  getAgentVersionMatchingCurrentStack,
  waitForHostToEnroll,
  waitForHostToEnrollAny,
} from '../common/fleet_services';

import {
  assertGcloudAvailable,
  gcloud,
  gcloudAddLabels,
  gcloudDeleteInstance,
  gcloudInstanceExists,
  gcloudSsh,
  GCP_REQUIRED_LABELS,
  redactSecrets,
  toGcpNameToken,
} from './gcloud';
import {
  assertTailscaleAvailable,
  getLocalTailscaleIpv4,
  getLocalTailscaleMagicDnsName,
} from './tailscale';
import {
  ubuntuElasticAgentStartupScript,
  ubuntuFleetServerStartupScript,
  windowsElasticAgentStartupScriptPs1,
} from './startup_scripts';
import type {
  DeployCalderaToExistingUbuntuConfig,
  GcpFleetVmConfig,
  GcpFleetVmContext,
  ProvisionedGcpVm,
} from './types';
import { resolveElasticAgentDownloadUrl } from './agent_artifacts';

const writeTempFile = (baseName: string, content: string) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-gcp-fleet-vm-'));
  const filePath = path.join(dir, baseName);
  fs.writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 });
  return { dir, filePath };
};

const docker = async (log: ToolingLog, args: string[]) => {
  log.debug(`Running docker: docker ${args.join(' ')}`);
  return execa('docker', args);
};

const ensureDockerAvailable = async (log: ToolingLog) => {
  try {
    await docker(log, ['version']);
  } catch (e) {
    throw new Error(`Docker is required for fleetServerMode=local-docker.\n${e}`);
  }
};

const startLocalDockerFleetServer = async ({
  log,
  agentVersion,
  esUrl,
  fleetServerPolicyId,
  fleetServiceToken,
  port,
}: {
  log: ToolingLog;
  agentVersion: string;
  esUrl: string;
  fleetServerPolicyId: string;
  fleetServiceToken: string;
  port: number;
}): Promise<void> => {
  await ensureDockerAvailable(log);

  const user = toGcpNameToken(os.userInfo().username);
  const containerName = `${user}-kbn-gcp-fleet-server-${port}`;

  // If a container is already running, reuse it (avoid redeploying Fleet Server unnecessarily).
  const isRunning = await docker(log, ['inspect', '-f', '{{.State.Running}}', containerName])
    .then((r) => r.stdout.trim() === 'true')
    .catch(() => false);
  if (isRunning) {
    log.info(`Local Fleet Server container [${containerName}] is already running; reusing.`);
    return;
  }

  // Best-effort cleanup of a previous stopped container
  await docker(log, ['rm', '-f', containerName]).catch(() => undefined);

  await docker(log, [
    'run',
    '--rm',
    '--detach',
    '--name',
    containerName,
    '--add-host',
    'host.docker.internal:host-gateway',
    '--publish',
    `${port}:8220`,
    '--env',
    'FLEET_SERVER_ENABLE=1',
    '--env',
    `FLEET_SERVER_ELASTICSEARCH_HOST=${esUrl}`,
    '--env',
    `FLEET_SERVER_SERVICE_TOKEN=${fleetServiceToken}`,
    '--env',
    `FLEET_SERVER_POLICY=${fleetServerPolicyId}`,
    `docker.elastic.co/elastic-agent/elastic-agent:${agentVersion}`,
  ]);

  // Wait for status endpoint to come up (TLS, self-signed). Accept 200/401/403 as "up".
  const statusUrl = `https://127.0.0.1:${port}/api/status`;
  log.info(`Waiting for local Fleet Server container to become ready at ${statusUrl}`);
  await pRetry(
    async () => {
      const { status } = await axios.get(statusUrl, {
        timeout: 5000,
        validateStatus: (s) => s === 200 || s === 401 || s === 403,
        httpsAgent: new (await import('https')).Agent({ rejectUnauthorized: false }),
      });
      if (![200, 401, 403].includes(status)) {
        throw new Error(`Unexpected HTTP status: ${status}`);
      }
    },
    { retries: 30, minTimeout: 2000, maxTimeout: 5000 }
  );
};

const stopLocalDockerFleetServer = async (log: ToolingLog, port: number) => {
  const user = toGcpNameToken(os.userInfo().username);
  const containerName = `${user}-kbn-gcp-fleet-server-${port}`;
  await docker(log, ['rm', '-f', containerName]).catch(() => undefined);
};

const toTailscaleReachableUrl = (
  localUrl: string,
  opts: { tailscaleIp: string; tailscaleHostname?: string }
): string => {
  const url = new URL(localUrl);
  // If user already provided a non-local host, keep it.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    url.hostname = opts.tailscaleHostname || opts.tailscaleIp;
  }
  return url.toString().replace(/\/$/, '');
};

const setFleetElasticsearchOutputHosts = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  hosts: string[]
): Promise<void> => {
  log.info(`Updating Fleet Elasticsearch output hosts to: ${hosts.join(', ')}`);

  const { data } = await kbnClient.request<GetOutputsResponse>({
    method: 'GET',
    path: outputRoutesService.getListPath(),
    headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
  });

  const esOutputs = data.items.filter((o) => o.type === 'elasticsearch');
  if (!esOutputs.length) {
    throw new Error(`No Elasticsearch outputs were found in Fleet settings`);
  }

  for (const { id, ...output } of esOutputs) {
    const update: PutOutputRequest['body'] = {
      // Fleet update requires full output body (minus id)
      ...(output as PutOutputRequest['body']),
      hosts,
    };

    await kbnClient.request({
      method: 'PUT',
      path: outputRoutesService.getUpdatePath(id),
      headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
      body: update,
    });
  }
};

const getOrCreateAgentPolicyByName = async ({
  kbnClient,
  log,
  name,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
  name: string;
}) => {
  const existing = await fetchAgentPolicyList(kbnClient, {
    perPage: 1,
    kuery: `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.name: "${name}"`,
    withAgentCount: true,
  });

  if (existing.items?.[0]) {
    log.info(`Re-using existing agent policy: ${existing.items[0].name} (${existing.items[0].id})`);
    return existing.items[0];
  }

  log.info(`Creating agent policy: ${name}`);
  return createAgentPolicy({
    kbnClient,
    policy: {
      name,
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
    } as any,
  });
};

const ensureFleetServerPolicyId = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<string> => {
  const existing = await fetchIntegrationPolicyList(kbnClient, {
    perPage: 1,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "${FLEET_SERVER_PACKAGE}"`,
  }).then((r) => r.items[0]);

  if (existing?.policy_ids?.[0]) {
    log.info(`Using existing Fleet Server policy id: ${existing.policy_ids[0]}`);
    return existing.policy_ids[0];
  }

  log.info(`Creating Fleet Server agent policy + integration`);
  const pkg = await fetchPackageInfo(kbnClient, 'fleet_server');
  const agentPolicy = await getOrCreateAgentPolicyByName({
    kbnClient,
    log,
    name: 'GCP Fleet Server',
  });

  await createIntegrationPolicy(kbnClient, {
    name: 'GCP Fleet Server integration',
    description: `Created by script: ${__filename}`,
    namespace: 'default',
    policy_ids: [agentPolicy.id],
    enabled: true,
    inputs: [
      {
        type: 'fleet-server',
        policy_template: 'fleet_server',
        enabled: true,
        streams: [],
        vars: {
          max_agents: { type: 'integer' },
          max_connections: { type: 'integer' },
          custom: { value: '', type: 'yaml' },
        },
      },
    ],
    package: { name: 'fleet_server', title: pkg.title, version: pkg.version },
  } as any);

  return agentPolicy.id;
};

const createEnrollmentApiKey = async (kbnClient: KbnClient, policyId: string): Promise<string> => {
  const { data } = await kbnClient.request<PostEnrollmentAPIKeyResponse>({
    method: 'POST',
    path: enrollmentAPIKeyRouteService.getCreatePath(),
    headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
    body: {
      name: `gcp-fleet-vm-${Date.now()}`,
      policy_id: policyId,
    } as PostEnrollmentAPIKeyRequest['body'],
  });

  return data.item.api_key;
};

const ensureOsqueryIntegrationOnPolicy = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  policyId: string
): Promise<void> => {
  // Check if Osquery Manager integration is already on the policy
  const existingIntegrations = await fetchIntegrationPolicyList(kbnClient, {
    perPage: 100,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.policy_ids:"${policyId}"`,
  });

  const hasOsquery = existingIntegrations.items?.some((p) => p.package?.name === 'osquery_manager');

  if (hasOsquery) {
    log.info(`Osquery Manager integration already exists on policy ${policyId}`);
    return;
  }

  log.info(`Adding Osquery Manager integration to policy ${policyId}`);
  const osqueryPkg = await fetchPackageInfo(kbnClient, 'osquery_manager');

  await createIntegrationPolicy(kbnClient, {
    name: `Osquery Manager - Osquery Only`,
    description: 'Osquery Manager for Osquery-only GCP VM agents',
    namespace: 'default',
    policy_ids: [policyId],
    enabled: true,
    inputs: [
      {
        type: 'osquery',
        policy_template: 'osquery_manager',
        enabled: true,
        streams: [],
        config: {},
      },
    ],
    package: { name: 'osquery_manager', title: osqueryPkg.title, version: osqueryPkg.version },
  } as any);
};

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
  const { filePath, dir } = writeTempFile(`${name}-startup.sh`, startupScript);
  try {
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
      '--metadata-from-file',
      `startup-script=${filePath}`,
      '--boot-disk-size',
      '30GB',
      '--quiet',
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  await gcloudAddLabels({ log, project, zone, instance: name, labels: GCP_REQUIRED_LABELS });
};

const createWindowsInstance = async ({
  log,
  project,
  zone,
  name,
  machineType,
  startupScriptPs1,
}: {
  log: ToolingLog;
  project: string;
  zone: string;
  name: string;
  machineType: string;
  startupScriptPs1: string;
}): Promise<void> => {
  const { filePath, dir } = writeTempFile(`${name}-startup.ps1`, startupScriptPs1);
  try {
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
      'windows-2022',
      '--image-project',
      'windows-cloud',
      '--metadata-from-file',
      `windows-startup-script-ps1=${filePath}`,
      '--quiet',
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  await gcloudAddLabels({ log, project, zone, instance: name, labels: GCP_REQUIRED_LABELS });
};

const fetchFleetServerTailscaleIpv4 = async (cfg: GcpFleetVmConfig, log: ToolingLog) => {
  return pRetry(
    async () => {
      const ip = await gcloudSsh({
        log,
        project: cfg.gcpProject,
        zone: cfg.gcpZone,
        instance: cfg.fleetServerName,
        command: `sudo tailscale ip -4 | head -n 1`,
      });
      if (!ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        throw new Error(`Invalid Tailscale IPv4 returned: ${ip}`);
      }
      return ip;
    },
    { retries: 30, minTimeout: 5000, maxTimeout: 10000 }
  );
};

const dumpFleetServerDebug = async (cfg: GcpFleetVmConfig, log: ToolingLog): Promise<void> => {
  try {
    log.warning(`Fleet Server did not enroll in time. Fetching VM diagnostics...`);
    const cmd = [
      'set -euo pipefail',
      'echo "--- hostname ---"',
      'hostname || true',
      'echo "--- tailscale ---"',
      'sudo tailscale status || true',
      'echo "--- elastic-agent status ---"',
      'sudo systemctl status elastic-agent --no-pager || true',
      'echo "--- elastic-agent logs (tail) ---"',
      'sudo journalctl -u elastic-agent --no-pager -n 200 || true',
      'echo "--- google startup script log (tail) ---"',
      'sudo tail -n 200 /var/log/google-startup-scripts.log 2>/dev/null || true',
      'echo "--- syslog (startup) (tail) ---"',
      'sudo tail -n 200 /var/log/syslog 2>/dev/null || true',
    ].join(' ; ');

    const out = await gcloudSsh({
      log,
      project: cfg.gcpProject,
      zone: cfg.gcpZone,
      instance: cfg.fleetServerName,
      command: cmd,
    });
    log.warning(`Fleet Server VM diagnostics:\n${redactSecrets(out)}`);
  } catch (e) {
    log.warning(`Failed to fetch Fleet Server VM diagnostics: ${e}`);
  }
};

const validateCalderaOnUbuntuVm = async (
  cfg: Pick<GcpFleetVmConfig, 'gcpProject' | 'gcpZone'>,
  log: ToolingLog,
  vmName: string
): Promise<void> => {
  log.info(`Validating Caldera sandcat service on Ubuntu VM [${vmName}]`);
  const cmd = [
    'set -euo pipefail',
    'echo "--- sandcat binary ---"',
    'sudo ls -la /opt/sandcat/sandcat /opt/sandcat/sandcat.go 2>/dev/null || true',
    'sudo file /opt/sandcat/sandcat 2>/dev/null || true',
    'echo "--- sandcat.go (size + head) ---"',
    'sudo wc -c /opt/sandcat/sandcat.go 2>/dev/null || true',
    'sudo head -n 20 /opt/sandcat/sandcat.go 2>/dev/null || true',
    'echo "--- systemd status ---"',
    'sudo systemctl is-enabled sandcat 2>/dev/null || true',
    'sudo systemctl is-active sandcat 2>/dev/null || true',
    'sudo systemctl status sandcat --no-pager || true',
    'echo "--- journal (tail) ---"',
    'sudo journalctl -u sandcat -n 80 --no-pager || true',
    // Fail if not active (so callers can decide how strict to be)
    'sudo systemctl is-active --quiet sandcat',
    'echo "OK: sandcat is active"',
  ].join(' ; ');

  await gcloudSsh({
    log,
    project: cfg.gcpProject,
    zone: cfg.gcpZone,
    instance: vmName,
    command: cmd,
  });
};

const fetchFleetServerTailscaleMagicDnsName = async (
  cfg: GcpFleetVmConfig,
  log: ToolingLog
): Promise<string | undefined> => {
  return pRetry(
    async () => {
      const raw = await gcloudSsh({
        log,
        project: cfg.gcpProject,
        zone: cfg.gcpZone,
        instance: cfg.fleetServerName,
        command: `sudo tailscale status --json 2>/dev/null`,
      });
      const parsed = JSON.parse(raw) as any;
      const dnsName = (parsed?.Self?.DNSName as string | undefined) || '';
      const cleaned = dnsName.trim().replace(/\.$/, '');
      if (!cleaned) {
        throw new Error(`Missing Self.DNSName in tailscale status json`);
      }
      return cleaned;
    },
    { retries: 10, minTimeout: 5000, maxTimeout: 10000 }
  ).catch(() => undefined);
};

const validateFleetServerVmHealthy = async (
  cfg: GcpFleetVmConfig,
  log: ToolingLog
): Promise<boolean> => {
  try {
    log.info(`Validating existing Fleet Server VM [${cfg.fleetServerName}] health`);
    const cmd = [
      'set -euo pipefail',
      'echo "--- tailscale ---"',
      'sudo tailscale status || true',
      'echo "--- elastic-agent ---"',
      'sudo systemctl is-active --quiet elastic-agent && echo "elastic-agent:active" || echo "elastic-agent:inactive"',
      // Fleet Server status endpoint (Elastic Agent exposes it on 8220 by default in this script)
      'echo "--- fleet-server status ---"',
      // Accept any 2xx/3xx/401/403 as "up"
      'code="$(curl -ksS --max-time 5 -o /dev/null -w \'%{http_code}\' https://127.0.0.1:8220/api/status || true)"',
      'echo "fleet-server-http: $code"',
      'if [[ "$code" == 2* || "$code" == 3* || "$code" == "401" || "$code" == "403" ]]; then echo "fleet-server:up"; else echo "fleet-server:down"; exit 1; fi',
    ].join(' ; ');

    await gcloudSsh({
      log,
      project: cfg.gcpProject,
      zone: cfg.gcpZone,
      instance: cfg.fleetServerName,
      command: cmd,
    });
    return true;
  } catch (e) {
    log.warning(`Existing Fleet Server VM health check failed; will recreate. Reason: ${e}`);
    return false;
  }
};

const validateAgentVmStartupComplete = async (
  cfg: Pick<GcpFleetVmConfig, 'gcpProject' | 'gcpZone'>,
  log: ToolingLog,
  vmName: string
): Promise<boolean> => {
  try {
    const out = await gcloudSsh({
      log,
      project: cfg.gcpProject,
      zone: cfg.gcpZone,
      instance: vmName,
      command: [
        'set -euo pipefail',
        'echo "--- tailscale ---"',
        'sudo tailscale status >/dev/null 2>&1 && echo "tailscale:up" || echo "tailscale:down"',
        'echo "--- elastic-agent ---"',
        'sudo systemctl is-active --quiet elastic-agent && echo "agent:active" || echo "agent:inactive"',
      ].join(' ; '),
    });
    const tsUp = out.includes('tailscale:up');
    const agentActive = out.includes('agent:active');
    if (!tsUp) log.warning(`[${vmName}] Tailscale is not up yet`);
    if (!agentActive) log.warning(`[${vmName}] Elastic Agent is not active yet`);
    return tsUp && agentActive;
  } catch (e) {
    log.warning(`[${vmName}] startup health check failed: ${e}`);
    return false;
  }
};

export const provisionGcpFleetVm = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  config: GcpFleetVmConfig
): Promise<GcpFleetVmContext> => {
  await assertGcloudAvailable(log);
  await assertTailscaleAvailable(log);

  const localTsIp = await getLocalTailscaleIpv4();
  const localTsHostname = config.localTailscaleHostname || (await getLocalTailscaleMagicDnsName());

  const totalVmCount =
    config.ubuntuAgentCount + config.windowsAgentCount + config.osqueryOnlyAgentCount + 1;
  if (
    totalVmCount > 1 &&
    config.tailscaleAuthKey.includes('tskey-auth-') &&
    !config.tailscaleAuthKey.includes('CNTRL')
  ) {
    log.warning(
      `You are provisioning ${totalVmCount} VMs but the Tailscale auth key may be single-use (ephemeral). ` +
        `If enrollment fails on the second VM, use a reusable auth key from https://login.tailscale.com/admin/settings/keys`
    );
  }

  const elasticsearchOutputUrl = toTailscaleReachableUrl(config.elasticUrl, {
    tailscaleIp: localTsIp,
    tailscaleHostname: localTsHostname,
  });

  // Preflight: make sure local Elasticsearch is reachable on the Tailscale address.
  log.info(`Validating Elasticsearch is reachable at ${elasticsearchOutputUrl}`);
  await axios
    .get(elasticsearchOutputUrl, {
      timeout: 5000,
      // We only care that the endpoint is reachable over the network.
      // Auth failures (401/403) are acceptable here and treated as "reachable".
      validateStatus: (status) => status === 200 || status === 401 || status === 403,
    })
    .catch((e) => {
      throw new Error(
        `Elasticsearch is not reachable at ${elasticsearchOutputUrl}.\n` +
          `Make sure Elasticsearch is bound/published on the Tailscale interface and accessible from other Tailscale nodes.\n` +
          `Original error: ${e}`
      );
    });

  await ensureFleetSetup(kbnClient, log);

  const agentVersion =
    config.agentVersion || (await getAgentVersionMatchingCurrentStack(kbnClient, log));
  log.info(`Using Elastic Agent version: ${agentVersion}`);

  const [linuxAgentUrl, windowsAgentUrl] = await Promise.all([
    resolveElasticAgentDownloadUrl(agentVersion, 'linux-x86_64'),
    resolveElasticAgentDownloadUrl(agentVersion, 'windows-x86_64'),
  ]);

  // Set Fleet output hosts to Tailscale-reachable Elasticsearch before any agents enroll.
  await setFleetElasticsearchOutputHosts(kbnClient, log, [elasticsearchOutputUrl]);

  const fleetServerPolicyId = await ensureFleetServerPolicyId(kbnClient, log);
  const serviceToken = await generateFleetServiceToken(kbnClient, log);

  // Create (or reuse) a dedicated workload policy for GCP agents
  const agentPolicy = await getOrCreateAgentPolicyByName({
    kbnClient,
    log,
    name: 'GCP VM agents',
  });
  const enrollmentToken = await createEnrollmentApiKey(kbnClient, agentPolicy.id);

  // Ensure the main workload policy has Elastic Defend (EDR Complete) + Osquery Manager
  await addEndpointIntegrationToAgentPolicy({
    kbnClient,
    log,
    agentPolicyId: agentPolicy.id,
    name: 'Elastic Defend - GCP VM agents',
  });
  await ensureOsqueryIntegrationOnPolicy(kbnClient, log, agentPolicy.id);

  // Create (or reuse) Osquery-only policy if osqueryOnlyAgentCount > 0
  let osqueryOnlyPolicy: { id: string; name: string } | undefined;
  let osqueryOnlyEnrollmentToken: string | undefined;
  if (config.osqueryOnlyAgentCount > 0) {
    osqueryOnlyPolicy = await getOrCreateAgentPolicyByName({
      kbnClient,
      log,
      name: 'GCP VM agents - Osquery Only',
    });
    osqueryOnlyEnrollmentToken = await createEnrollmentApiKey(kbnClient, osqueryOnlyPolicy.id);

    // Add Osquery Manager integration to the Osquery-only policy (if not already present)
    await ensureOsqueryIntegrationOnPolicy(kbnClient, log, osqueryOnlyPolicy.id);
  }

  const calderaUrl = config.enableCaldera
    ? config.calderaUrl || `http://${localTsHostname || localTsIp}:8888`
    : undefined;

  let fleetServerUrl = '';
  let fleetServerVm: ProvisionedGcpVm | undefined;

  // 1) Fleet Server
  if (config.fleetServerMode === 'local-docker') {
    // Fleet Server running locally in Docker; publish it via Tailscale host/IP for GCP agents.
    const tailscaleHost = localTsHostname || localTsIp;
    fleetServerUrl = `https://${tailscaleHost}:${config.fleetServerPort}`;

    log.info(`Starting local Fleet Server (Docker) on port ${config.fleetServerPort}`);
    await startLocalDockerFleetServer({
      log,
      agentVersion,
      esUrl: elasticsearchOutputUrl,
      fleetServerPolicyId,
      fleetServiceToken: serviceToken,
      port: config.fleetServerPort,
    });
    log.info(`Fleet Server URL (Tailscale): ${fleetServerUrl}`);
  } else {
    // Fleet Server VM (Ubuntu)
    const exists = await gcloudInstanceExists({
      log,
      project: config.gcpProject,
      zone: config.gcpZone,
      instance: config.fleetServerName,
    });
    if (exists) {
      const healthy = await validateFleetServerVmHealthy(config, log);
      if (healthy) {
        log.info(
          `Fleet Server VM [${config.fleetServerName}] is healthy; reusing (skipping create).`
        );
      } else {
        log.warning(
          `Recreating Fleet Server VM [${config.fleetServerName}] due to failed health check`
        );
        await gcloudDeleteInstance({
          log,
          project: config.gcpProject,
          zone: config.gcpZone,
          instance: config.fleetServerName,
        });
        await createUbuntuInstance({
          log,
          project: config.gcpProject,
          zone: config.gcpZone,
          name: config.fleetServerName,
          machineType: config.fleetServerMachineType,
          startupScript: ubuntuFleetServerStartupScript({
            tailscaleAuthKey: config.tailscaleAuthKey,
            elasticsearchUrl: elasticsearchOutputUrl,
            fleetServerPolicyId,
            fleetServiceToken: serviceToken,
            agentDownloadUrl: linuxAgentUrl,
            insecure: config.insecureFleetEnroll,
          }),
        });
      }
    } else {
      log.info(`Provisioning Fleet Server VM [${config.fleetServerName}]`);
      await createUbuntuInstance({
        log,
        project: config.gcpProject,
        zone: config.gcpZone,
        name: config.fleetServerName,
        machineType: config.fleetServerMachineType,
        startupScript: ubuntuFleetServerStartupScript({
          tailscaleAuthKey: config.tailscaleAuthKey,
          elasticsearchUrl: elasticsearchOutputUrl,
          fleetServerPolicyId,
          fleetServiceToken: serviceToken,
          agentDownloadUrl: linuxAgentUrl,
          insecure: config.insecureFleetEnroll,
        }),
      });
    }

    const [fleetServerTsIp, fleetServerTsHostname] = await Promise.all([
      fetchFleetServerTailscaleIpv4(config, log),
      fetchFleetServerTailscaleMagicDnsName(config, log),
    ]);
    const fleetServerHost = fleetServerTsHostname || fleetServerTsIp;
    fleetServerUrl = `https://${fleetServerHost}:${config.fleetServerPort}`;
    fleetServerVm = { name: config.fleetServerName, os: 'ubuntu' };
    log.info(`Fleet Server URL (Tailscale): ${fleetServerUrl}`);
  }

  // 2) Update Kibana Fleet settings so Kibana can ping Fleet Server
  await cleanupAndAddFleetServerHostSettings(kbnClient, log, fleetServerUrl);

  // 3) Wait for Fleet Server agent to show up in Fleet (only applicable for GCP mode)
  if (config.fleetServerMode === 'gcp') {
    try {
      // Cloud images sometimes enroll with an FQDN (or other hostname variant) rather than the instance name.
      // Ask the VM what its hostname is, then wait for any of the plausible candidates.
      const remoteHostname = await gcloudSsh({
        log,
        project: config.gcpProject,
        zone: config.gcpZone,
        instance: config.fleetServerName,
        command: `hostname 2>/dev/null || true`,
      }).then((s) => s.trim());
      const remoteHostnameShort = await gcloudSsh({
        log,
        project: config.gcpProject,
        zone: config.gcpZone,
        instance: config.fleetServerName,
        command: `hostname -s 2>/dev/null || true`,
      }).then((s) => s.trim());

      const candidates = Array.from(
        new Set(
          [config.fleetServerName, remoteHostnameShort, remoteHostname]
            .map((s) => s.trim())
            .filter(Boolean)
        )
      );
      await waitForHostToEnrollAny(kbnClient, log, candidates, 1_200_000);
    } catch (e) {
      await dumpFleetServerDebug(config, log);
      throw e;
    }
  }

  const agentVms: ProvisionedGcpVm[] = [];

  // 4) Ubuntu agent VMs (created in parallel for speed)
  const ubuntuVmCreationPromises: Array<Promise<void>> = [];
  for (let i = 0; i < config.ubuntuAgentCount; i++) {
    const name = `${config.namePrefix}-ubuntu-${i + 1}`;
    agentVms.push({ name, os: 'ubuntu' });
    ubuntuVmCreationPromises.push(
      (async () => {
        const exists = await gcloudInstanceExists({
          log,
          project: config.gcpProject,
          zone: config.gcpZone,
          instance: name,
        });
        if (exists) {
          log.info(`Ubuntu agent VM [${name}] already exists; reusing (skipping create).`);
          return;
        }
        log.info(`Provisioning Ubuntu agent VM [${name}]`);
        await createUbuntuInstance({
          log,
          project: config.gcpProject,
          zone: config.gcpZone,
          name,
          machineType: config.agentMachineType,
          startupScript: ubuntuElasticAgentStartupScript({
            tailscaleAuthKey: config.tailscaleAuthKey,
            fleetServerUrl,
            enrollmentToken,
            agentDownloadUrl: linuxAgentUrl,
            enableCaldera: config.enableCaldera,
            calderaUrl,
            enableInvokeAtomic: config.enableInvokeAtomic,
            insecure: config.insecureFleetEnroll,
          }),
        });
      })()
    );
  }

  // 5) Windows agent VMs (created in parallel for speed)
  const windowsVmCreationPromises: Array<Promise<void>> = [];
  for (let i = 0; i < config.windowsAgentCount; i++) {
    const name = `${config.namePrefix}-windows-${i + 1}`;
    agentVms.push({ name, os: 'windows' });
    windowsVmCreationPromises.push(
      (async () => {
        const exists = await gcloudInstanceExists({
          log,
          project: config.gcpProject,
          zone: config.gcpZone,
          instance: name,
        });
        if (exists) {
          log.info(`Windows agent VM [${name}] already exists; reusing (skipping create).`);
          return;
        }
        log.info(`Provisioning Windows agent VM [${name}]`);
        await createWindowsInstance({
          log,
          project: config.gcpProject,
          zone: config.gcpZone,
          name,
          machineType: config.agentMachineType,
          startupScriptPs1: windowsElasticAgentStartupScriptPs1({
            tailscaleAuthKey: config.tailscaleAuthKey,
            fleetServerUrl,
            enrollmentToken,
            agentDownloadUrl: windowsAgentUrl,
            enableCaldera: config.enableCaldera,
            calderaUrl,
            enableInvokeAtomic: config.enableInvokeAtomic,
            insecure: config.insecureFleetEnroll,
          }),
        });
      })()
    );
  }

  // 5.5) Osquery-only Ubuntu agent VMs (created in parallel)
  const osqueryOnlyVms: ProvisionedGcpVm[] = [];
  const osqueryVmCreationPromises: Array<Promise<void>> = [];
  if (config.osqueryOnlyAgentCount > 0 && osqueryOnlyEnrollmentToken) {
    for (let i = 0; i < config.osqueryOnlyAgentCount; i++) {
      const name = `${config.namePrefix}-osquery-${i + 1}`;
      osqueryOnlyVms.push({ name, os: 'ubuntu' });
      osqueryVmCreationPromises.push(
        (async () => {
          const exists = await gcloudInstanceExists({
            log,
            project: config.gcpProject,
            zone: config.gcpZone,
            instance: name,
          });
          if (exists) {
            log.info(`Osquery-only agent VM [${name}] already exists; reusing (skipping create).`);
            return;
          }
          log.info(`Provisioning Osquery-only agent VM [${name}]`);
          await createUbuntuInstance({
            log,
            project: config.gcpProject,
            zone: config.gcpZone,
            name,
            machineType: config.agentMachineType,
            startupScript: ubuntuElasticAgentStartupScript({
              tailscaleAuthKey: config.tailscaleAuthKey,
              fleetServerUrl,
              enrollmentToken: osqueryOnlyEnrollmentToken,
              agentDownloadUrl: linuxAgentUrl,
              enableCaldera: config.enableCaldera,
              calderaUrl,
              enableInvokeAtomic: config.enableInvokeAtomic,
              insecure: config.insecureFleetEnroll,
            }),
          });
        })()
      );
    }
  }

  // Wait for all VM creations to complete in parallel
  await Promise.all([
    ...ubuntuVmCreationPromises,
    ...windowsVmCreationPromises,
    ...osqueryVmCreationPromises,
  ]);

  // 6) Wait for all agents to enroll
  for (const vm of agentVms) {
    try {
      await waitForHostToEnroll(kbnClient, log, vm.name, 900_000);
    } catch (e) {
      log.warning(`Agent [${vm.name}] did not enroll in time. Running diagnostics...`);
      await validateAgentVmStartupComplete(config, log, vm.name);
      throw e;
    }
  }
  for (const vm of osqueryOnlyVms) {
    try {
      await waitForHostToEnroll(kbnClient, log, vm.name, 900_000);
    } catch (e) {
      log.warning(`Agent [${vm.name}] did not enroll in time. Running diagnostics...`);
      await validateAgentVmStartupComplete(config, log, vm.name);
      throw e;
    }
  }

  // 6.1) If Caldera is enabled, validate sandcat is running on Ubuntu agent VMs.
  // If validation fails, attempt an SSH-based install/repair and re-validate.
  const allUbuntuVms = [...agentVms, ...osqueryOnlyVms].filter((vm) => vm.os === 'ubuntu');
  if (config.enableCaldera) {
    for (const vm of allUbuntuVms) {
      try {
        await validateCalderaOnUbuntuVm(config, log, vm.name);
      } catch (e) {
        log.warning(`Caldera sandcat validation failed on [${vm.name}]: ${e}`);
        if (calderaUrl) {
          try {
            await deployCalderaAgentToExistingUbuntuVms(log, {
              gcpProject: config.gcpProject,
              gcpZone: config.gcpZone,
              vmNames: [vm.name],
              calderaUrl,
            });
            await validateCalderaOnUbuntuVm(config, log, vm.name);
            log.info(`Caldera sandcat repaired on [${vm.name}]`);
          } catch (e2) {
            // Keep going so we can validate other VMs too.
            log.warning(`Caldera sandcat repair failed on [${vm.name}]: ${e2}`);
          }
        } else {
          log.warning(`Caldera sandcat repair skipped (missing calderaUrl)`);
        }
      }
    }
  }

  // 7) Validate Fleet Server can reach Elasticsearch via Tailscale (from within the VM)
  if (config.fleetServerMode === 'gcp') {
    log.info(`Validating Fleet Server VM can reach Elasticsearch at ${elasticsearchOutputUrl}`);
    await gcloudSsh({
      log,
      project: config.gcpProject,
      zone: config.gcpZone,
      instance: config.fleetServerName,
      command: `code="$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' ${elasticsearchOutputUrl} || true)"; if [[ "$code" == "200" || "$code" == "401" || "$code" == "403" ]]; then echo OK; else echo "BAD_HTTP_$code"; exit 1; fi`,
    });
  }

  return {
    fleetServerVm: fleetServerVm ?? { name: 'local-docker', os: 'ubuntu' },
    agentVms,
    osqueryOnlyVms,
    fleetServerUrl,
    elasticsearchOutputUrl,
    calderaUrl,
    fleetServerPolicyId,
    agentPolicyId: agentPolicy.id,
    osqueryOnlyPolicyId: osqueryOnlyPolicy?.id,
  };
};

export const cleanupGcpFleetVm = async (
  log: ToolingLog,
  cfg: Pick<GcpFleetVmConfig, 'gcpProject' | 'gcpZone'>,
  ctx: Pick<
    GcpFleetVmContext,
    'fleetServerVm' | 'agentVms' | 'agentPolicyId' | 'fleetServerPolicyId' | 'osqueryOnlyPolicyId'
  >,
  kbnClient?: KbnClient
): Promise<void> => {
  log.info(`Cleaning up GCP VMs`);
  const toDelete = [ctx.fleetServerVm, ...ctx.agentVms];
  for (const vm of toDelete) {
    try {
      if (vm.name === 'local-docker') {
        continue;
      }
      await gcloudDeleteInstance({
        log,
        project: cfg.gcpProject,
        zone: cfg.gcpZone,
        instance: vm.name,
      });
    } catch (e) {
      log.warning(`Failed to delete VM [${vm.name}]: ${e}`);
    }
  }

  if (kbnClient) {
    const policyIds = [ctx.agentPolicyId, ctx.fleetServerPolicyId, ctx.osqueryOnlyPolicyId].filter(
      Boolean
    ) as string[];

    for (const policyId of policyIds) {
      try {
        const { data } = await kbnClient.request<GetEnrollmentAPIKeysResponse>({
          method: 'GET',
          path: enrollmentAPIKeyRouteService.getListPath(),
          headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
          query: { kuery: `policy_id: "${policyId}"` },
        });

        for (const key of data.items ?? []) {
          try {
            await kbnClient.request({
              method: 'DELETE',
              path: enrollmentAPIKeyRouteService.getDeletePath(key.id),
              headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
            });
            log.info(`Revoked enrollment key [${key.id}] for policy [${policyId}]`);
          } catch (e) {
            log.warning(`Failed to revoke enrollment key [${key.id}]: ${e}`);
          }
        }
      } catch (e) {
        log.warning(`Failed to list enrollment keys for policy [${policyId}]: ${e}`);
      }
    }
  }
};

export const deployCalderaAgentToExistingUbuntuVms = async (
  log: ToolingLog,
  cfg: DeployCalderaToExistingUbuntuConfig
): Promise<void> => {
  await assertGcloudAvailable(log);

  const calderaUrl = cfg.calderaUrl.replace(/\/$/, '');
  const sandcatService = [
    '[Unit]',
    'Description=Caldera Sandcat Agent',
    'After=network-online.target',
    'Wants=network-online.target',
    '',
    '[Service]',
    'Type=simple',
    // NOTE: calderaUrl is embedded so we don't depend on environment at runtime.
    `ExecStart=/opt/sandcat/sandcat -server ${calderaUrl} -group ref7707 -paw %H`,
    'Restart=always',
    'RestartSec=5',
    '',
    '[Install]',
    'WantedBy=multi-user.target',
    '',
  ].join('\n');
  const sandcatServiceB64 = Buffer.from(sandcatService, 'utf8').toString('base64');

  log.info(`Deploying Caldera sandcat agent to existing Ubuntu VMs via SSH`);
  log.info(`Caldera URL: ${calderaUrl}`);

  for (const vm of cfg.vmNames) {
    log.info(`Deploying sandcat to VM [${vm}]`);

    const scriptLines = [
      'set -euo pipefail',
      `CALDERA_URL="${calderaUrl}"`,
      'echo "[caldera] checking reachability..."',
      // Accept any 2xx/3xx from the Caldera UI endpoint as "reachable"
      `code="$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "$CALDERA_URL" || true)"`,
      `if [[ "$code" != 2* && "$code" != 3* ]]; then echo "[caldera] Caldera not reachable (HTTP $code)"; exit 1; fi`,
      'sudo apt-get update -y',
      'sudo apt-get install -y --no-install-recommends curl ca-certificates golang-go file',
      'sudo mkdir -p /opt/sandcat',
      'echo "[caldera] downloading sandcat..."',
      // Caldera's sandcat download endpoint (route varies by deployment; try a couple)
      'downloaded="false"',
      'rm -f /opt/sandcat/sandcat.dl',
      'for url in "$CALDERA_URL/file/download" "$CALDERA_URL/api/v2/file/download"; do',
      '  echo "[caldera] trying: $url"',
      '  if sudo curl -kfsSL --retry 5 --retry-delay 2 -X POST -H "file:sandcat.go" -H "platform:linux" "$url" -o /opt/sandcat/sandcat.dl; then downloaded="true"; break; fi',
      'done',
      'if [[ "$downloaded" != "true" ]]; then echo "[caldera] ERROR: failed to download sandcat.go (404?)"; exit 1; fi',
      'sudo test -s /opt/sandcat/sandcat.dl',
      'bytes="$(sudo wc -c < /opt/sandcat/sandcat.dl | tr -d \' \')"',
      'kind="$(sudo file -b /opt/sandcat/sandcat.dl || true)"',
      'echo "[caldera] downloaded payload (${bytes} bytes): ${kind}"',
      'if echo "$kind" | grep -qi "ELF"; then',
      '  echo "[caldera] installing binary directly"',
      '  sudo mv /opt/sandcat/sandcat.dl /opt/sandcat/sandcat',
      '  sudo chmod +x /opt/sandcat/sandcat',
      '  sudo file /opt/sandcat/sandcat || true',
      'else',
      '  echo "[caldera] treating payload as Go source"',
      '  sudo mv /opt/sandcat/sandcat.dl /opt/sandcat/sandcat.go',
      '  if ! sudo grep -qE "^package[[:space:]]+" /opt/sandcat/sandcat.go; then echo "[caldera] ERROR: payload is neither ELF nor Go source"; sudo head -n 20 /opt/sandcat/sandcat.go || true; exit 1; fi',
      '  echo "[caldera] compiling sandcat..."',
      '  cd /opt/sandcat',
      '  sudo go build -o /opt/sandcat/sandcat /opt/sandcat/sandcat.go',
      '  sudo chmod +x /opt/sandcat/sandcat',
      '  sudo file /opt/sandcat/sandcat || true',
      'fi',
      'echo "[caldera] writing systemd unit..."',
      `echo "${sandcatServiceB64}" | base64 -d | sudo tee /etc/systemd/system/sandcat.service >/dev/null`,
      'sudo systemctl daemon-reload',
      'sudo systemctl enable --now sandcat',
      'sudo systemctl status sandcat --no-pager || true',
      ...(cfg.enableInvokeAtomic
        ? [
            'echo "[invoke-atomic] installing Atomic Red Team + Invoke-Atomic (best-effort)"',
            'sudo apt-get update -y || true',
            'sudo apt-get install -y --no-install-recommends git unzip || true',
            'ATOMIC_DIR="/opt/atomic-red-team"',
            'if [[ ! -d "$ATOMIC_DIR/.git" ]]; then sudo rm -rf "$ATOMIC_DIR" || true; sudo git clone --depth 1 https://github.com/redcanaryco/atomic-red-team.git "$ATOMIC_DIR" || true; fi',
            'echo "export ATOMIC_RED_TEAM_PATH=$ATOMIC_DIR" | sudo tee /etc/profile.d/atomic-red-team.sh >/dev/null || true',
            'if ! command -v pwsh >/dev/null 2>&1; then if command -v snap >/dev/null 2>&1; then echo "[invoke-atomic] attempting snap install powershell"; sudo snap install powershell --classic || true; fi; fi',
            'if command -v pwsh >/dev/null 2>&1; then pwsh -NoProfile -NonInteractive -Command "Set-PSRepository -Name PSGallery -InstallationPolicy Trusted; Install-Module Invoke-AtomicRedTeam -Force -Scope AllUsers" || true; pwsh -NoProfile -NonInteractive -Command "[Environment]::SetEnvironmentVariable(\\"PathToAtomicsFolder\\",\\"$ATOMIC_DIR/atomics\\",\\"Machine\\")" || true; else echo "[invoke-atomic] pwsh not available; skipping module install"; fi',
          ]
        : []),
      'echo "[caldera] done"',
    ];
    const scriptB64 = Buffer.from(scriptLines.join('\n'), 'utf8').toString('base64');
    // Force bash and avoid quoting hazards by decoding the multi-line script on the VM.
    const command = `bash -lc "$(echo ${scriptB64} | base64 -d)"`;

    await gcloudSsh({
      log,
      project: cfg.gcpProject,
      zone: cfg.gcpZone,
      instance: vm,
      command,
    });
  }
};
