/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { randomBytes } from 'crypto';
import { userInfo } from 'os';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import {
  startRuntimeServices,
  stopRuntimeServices,
  getRuntimeServices,
} from '../endpoint_agent_runner/runtime';
import type { GcpFleetVmConfig } from './types';
import {
  cleanupGcpFleetVm,
  deployCalderaAgentToExistingUbuntuVms,
  provisionGcpFleetVm,
} from './provisioner';
import { getPreferredLocalTailscaleHost } from './tailscale';
import { toGcpNameToken, truncateGcpName } from './gcloud';

const redact = (value: string | undefined) => (value ? '<redacted>' : '');

const runProvisioning: RunFn = async (cliContext) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

  const usernameToken = toGcpNameToken(userInfo().username);
  const runToken = randomBytes(3).toString('hex'); // 6 chars

  // Caldera-only mode: deploy to existing Ubuntu VM(s)
  if (cliContext.flags.deployCalderaToExistingUbuntu) {
    const gcpProject = cliContext.flags.gcpProject as string;
    const gcpZone = cliContext.flags.gcpZone as string;
    const target = (cliContext.flags.calderaTargetUbuntuVms as string) || '';
    const vmNames = target
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!gcpProject) throw new Error(`--gcpProject is required`);
    if (!gcpZone) throw new Error(`--gcpZone is required`);
    if (!vmNames.length) {
      throw new Error(`--calderaTargetUbuntuVms is required (comma-separated VM names)`);
    }

    const localTailscaleHostname =
      (cliContext.flags.localTailscaleHostname as string) || process.env.TS_HOSTNAME || '';

    const calderaUrlFlag = (cliContext.flags.calderaUrl as string) || '';
    let calderaUrl = calderaUrlFlag;
    if (!calderaUrl) {
      const preferred = await getPreferredLocalTailscaleHost(cliContext.log);
      const host = localTailscaleHostname || preferred.hostname || preferred.ip;
      calderaUrl = `http://${host}:8888`;
    }

    const enableInvokeAtomic = Boolean(cliContext.flags.enableInvokeAtomic);
    await deployCalderaAgentToExistingUbuntuVms(cliContext.log, {
      gcpProject,
      gcpZone,
      vmNames,
      calderaUrl,
      enableInvokeAtomic,
    });
    return;
  }

  const kibanaUrl = cliContext.flags.kibanaUrl as string;
  const elasticUrl = cliContext.flags.elasticUrl as string;

  await startRuntimeServices({
    kibanaUrl,
    elasticUrl,
    username: cliContext.flags.username as string,
    password: cliContext.flags.password as string,
    apiKey: cliContext.flags.apiKey as string,
    spaceId: cliContext.flags.spaceId as string,
    version: cliContext.flags.version as string,
    log: cliContext.log,
  });

  const { kbnClient, log } = getRuntimeServices();

  const tailscaleAuthKey =
    (cliContext.flags.tailscaleAuthKey as string) || process.env.TS_AUTHKEY || '';
  if (!tailscaleAuthKey) {
    throw new Error(
      `Tailscale auth key is required. Provide --tailscaleAuthKey or set TS_AUTHKEY in your environment.`
    );
  }

  const preferredTs = await getPreferredLocalTailscaleHost(getRuntimeServices().log);
  const localTailscaleHostname =
    (cliContext.flags.localTailscaleHostname as string) ||
    process.env.TS_HOSTNAME ||
    preferredTs.hostname ||
    '';

  const enableCaldera = Boolean(cliContext.flags.enableCaldera);
  const enableInvokeAtomic = Boolean(cliContext.flags.enableInvokeAtomic);
  const fleetServerMode = (cliContext.flags.fleetServerMode as string) || 'gcp';
  const config: GcpFleetVmConfig = {
    gcpProject: cliContext.flags.gcpProject as string,
    gcpZone: cliContext.flags.gcpZone as string,
    elasticUrl,
    // Prefer MagicDNS by default when available
    localTailscaleHostname: localTailscaleHostname || undefined,
    fleetServerMode: fleetServerMode === 'local-docker' ? 'local-docker' : 'gcp',
    fleetServerPort: cliContext.flags.fleetServerPort
      ? Number(cliContext.flags.fleetServerPort)
      : 8220,
    fleetServerName:
      (cliContext.flags.fleetServerName as string) ||
      // Prefer a stable default so subsequent runs reuse the same Fleet Server VM when healthy.
      truncateGcpName(`${usernameToken}-kbn-fleet-server`, 63),
    fleetServerMachineType: (cliContext.flags.fleetServerMachineType as string) || 'e2-medium',
    ubuntuAgentCount: cliContext.flags.ubuntuAgentCount
      ? Number(cliContext.flags.ubuntuAgentCount)
      : 1,
    windowsAgentCount: cliContext.flags.windowsAgentCount
      ? Number(cliContext.flags.windowsAgentCount)
      : 0,
    agentMachineType: (cliContext.flags.agentMachineType as string) || 'e2-medium',
    agentVersion: cliContext.flags.version as string,
    tailscaleAuthKey,
    enableCaldera,
    enableInvokeAtomic,
    calderaUrl: (cliContext.flags.calderaUrl as string) || undefined,
    namePrefix:
      (cliContext.flags.namePrefix as string) ||
      truncateGcpName(`${usernameToken}-${runToken}-kbn-gcp-agent`, 45),
    cleanup: Boolean(cliContext.flags.cleanup),
    cleanupAll: Boolean(cliContext.flags.cleanupAll),
    insecureFleetEnroll: cliContext.flags.insecureFleetEnroll !== false,
    osqueryOnlyAgentCount: cliContext.flags.osqueryOnlyAgentCount
      ? Number(cliContext.flags.osqueryOnlyAgentCount)
      : 0,
  };

  const configForLogs = {
    ...config,
    tailscaleAuthKey: redact(config.tailscaleAuthKey),
  };
  log.info(`Configuration: ${JSON.stringify(configForLogs, null, 2)}`);

  try {
    const ctx = await provisionGcpFleetVm(kbnClient, log, config);
    log.info(`Provisioning complete.`);
    log.info(`Fleet Server URL: ${ctx.fleetServerUrl}`);
    log.info(`Elasticsearch Output URL (Tailscale): ${ctx.elasticsearchOutputUrl}`);
    if (ctx.calderaUrl) {
      log.info(`Caldera URL (Tailscale): ${ctx.calderaUrl}`);
    }

    if (config.cleanup) {
      log.info(`Cleanup requested; deleting GCP VMs and revoking enrollment keys...`);
      await cleanupGcpFleetVm(log, config, ctx, kbnClient);
    } else {
      log.info(`Use --cleanup to delete the created VMs.`);
    }
  } finally {
    await stopRuntimeServices();
  }
};

export const cli = () => {
  run(runProvisioning, {
    description: `
Provision Fleet Server + Elastic Agent VMs on GCP, using Tailscale to make local-only Elasticsearch reachable from GCP.

Optionally deploy Caldera agents (sandcat) to the same VMs.
`,
    flags: {
      string: [
        'kibanaUrl',
        'elasticUrl',
        'username',
        'password',
        'apiKey',
        'spaceId',
        'version',
        'gcpProject',
        'gcpZone',
        'fleetServerName',
        'fleetServerMachineType',
        'fleetServerMode',
        'fleetServerPort',
        'agentMachineType',
        'ubuntuAgentCount',
        'windowsAgentCount',
        'osqueryOnlyAgentCount',
        'tailscaleAuthKey',
        'localTailscaleHostname',
        'calderaUrl',
        'calderaTargetUbuntuVms',
        'namePrefix',
      ],
      boolean: [
        'cleanup',
        'cleanupAll',
        'enableCaldera',
        'enableInvokeAtomic',
        'deployCalderaToExistingUbuntu',
        'insecureFleetEnroll',
      ],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
        apiKey: '',
        spaceId: '',
        version: '',
        gcpProject: '',
        gcpZone: 'us-central1-a',
        fleetServerMode: 'gcp',
        fleetServerPort: '8220',
        ubuntuAgentCount: '1',
        windowsAgentCount: '0',
        osqueryOnlyAgentCount: '0',
        enableCaldera: false,
        enableInvokeAtomic: false,
        insecureFleetEnroll: true,
        deployCalderaToExistingUbuntu: false,
        cleanup: false,
        cleanupAll: false,
        namePrefix: '',
      },
      help: `
  --gcpProject               GCP project id (required)
  --gcpZone                  GCP zone (default: us-central1-a)
  --fleetServerMode          Fleet Server mode: gcp | local-docker (default: gcp)
  --fleetServerPort          Fleet Server port (default: 8220)
  --fleetServerName          Fleet Server VM name (default: <username>-kbn-fleet-server)
  --fleetServerMachineType   Fleet Server VM machine type (default: e2-medium)
  --agentMachineType         Agent VM machine type (default: e2-medium)
  --ubuntuAgentCount         Number of Ubuntu agent VMs (default: 1)
  --windowsAgentCount        Number of Windows agent VMs (default: 0)
  --osqueryOnlyAgentCount    Number of Ubuntu agent VMs with Osquery-only policy (default: 0)
  --tailscaleAuthKey         Tailscale auth key (or set TS_AUTHKEY env var) (required)
  --localTailscaleHostname   Optional: your local Tailscale MagicDNS hostname (or set TS_HOSTNAME)

  --enableCaldera            Also deploy Caldera sandcat agents (optional)
  --enableInvokeAtomic       Also install Atomic Red Team + Invoke-AtomicRedTeam on agent VMs (best-effort)
  --calderaUrl               Caldera URL (default: derived from local Tailscale IP + :8888)
  --deployCalderaToExistingUbuntu  Deploy Caldera sandcat to existing Ubuntu VM(s) and exit
  --calderaTargetUbuntuVms   Comma-separated list of existing Ubuntu VM names (used with --deployCalderaToExistingUbuntu)
  --insecureFleetEnroll      Use --insecure for agent enrollment (default: true, set --no-insecureFleetEnroll for TLS verification)

  --namePrefix               Prefix for agent VM names (default: <username>-<random>-kbn-gcp-agent)
  --kibanaUrl                Kibana URL (default: http://127.0.0.1:5601)
  --elasticUrl               Elasticsearch URL (default: http://127.0.0.1:9200) (must be reachable over Tailscale)
  --username / --password    Kibana/Elasticsearch credentials (defaults: elastic/changeme)
  --apiKey                   Kibana API key (alternative to username/password)
  --version                  Elastic Agent version (default: stack-matching)

  --cleanup                  Delete created VMs at the end
`,
    },
  });
};
