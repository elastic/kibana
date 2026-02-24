/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { randomBytes } from 'crypto';
import { userInfo } from 'os';
import {
    startRuntimeServices,
    stopRuntimeServices,
    getRuntimeServices,
} from '../endpoint_agent_runner/runtime';
import type { GcpFleetVmConfig } from '../gcp_fleet_vm/types';
import { provisionGcpFleetVm } from '../gcp_fleet_vm/provisioner';
import { addNetworkPacketCaptureDnsIntegrationToAgentPolicy } from './services/add_network_packet_capture_dns_integration';
import { provisionRef7707GcpInfra } from './gcp_infra';
import { toGcpNameToken, truncateGcpName } from '../gcp_fleet_vm/gcloud';

const logNextCommand = (log: ToolingLog, cmd: string) => {
    log.info(`[ref7707] next: run Caldera operation:`);
    for (const line of cmd.split('\n')) log.info(line);
};

const runSetup: RunFn = async ({ log, flags }) => {
    createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

    const usernameToken = toGcpNameToken(userInfo().username);
    const runToken = randomBytes(3).toString('hex'); // 6 chars

    const kibanaUrl = (flags.kibanaUrl as string) || '';
    const elasticUrl = (flags.elasticUrl as string) || '';
    const username = (flags.username as string) || '';
    const password = (flags.password as string) || '';
    const apiKey = (flags.apiKey as string) || '';
    const spaceId = (flags.spaceId as string) || '';
    const version = (flags.version as string) || '';

    const gcpProject = (flags.gcpProject as string) || '';
    const gcpZone = (flags.gcpZone as string) || '';
    const tailscaleAuthKey = (flags.tailscaleAuthKey as string) || process.env.TS_AUTHKEY || '';
    const localTailscaleHostname = (flags.localTailscaleHostname as string) || process.env.TS_HOSTNAME || '';

    const fleetServerMode = (flags.fleetServerMode as string) || 'gcp';
    const fleetServerPort = Number((flags.fleetServerPort as string) || '8220');
    const fleetServerName =
        (flags.fleetServerName as string) || truncateGcpName(`${usernameToken}-kbn-fleet-server`, 63);

    const namePrefix = (flags.namePrefix as string) || '';
    const ubuntuAgentCount = Number((flags.ubuntuAgentCount as string) || '1');
    const windowsAgentCount = Number((flags.windowsAgentCount as string) || '0');
    const osqueryOnlyAgentCount = Number((flags.osqueryOnlyAgentCount as string) || '0');
    const agentMachineType = (flags.agentMachineType as string) || '';
    const fleetServerMachineType = (flags.fleetServerMachineType as string) || '';

    const enableCaldera = Boolean(flags.enableCaldera);
    const calderaUrl = (flags.calderaUrl as string) || '';

    const enableDnsTelemetry = flags.enableDnsTelemetry !== undefined ? Boolean(flags.enableDnsTelemetry) : true;

    if (!kibanaUrl) throw new Error(`--kibanaUrl is required`);
    if (!elasticUrl) throw new Error(`--elasticUrl is required`);
    if (!gcpProject) throw new Error(`--gcpProject is required`);
    if (!gcpZone) throw new Error(`--gcpZone is required`);
    if (!tailscaleAuthKey) throw new Error(`--tailscaleAuthKey is required (or set TS_AUTHKEY)`);
    if (!namePrefix) throw new Error(`--namePrefix is required`);

    await startRuntimeServices({
        kibanaUrl,
        elasticUrl,
        username,
        password,
        apiKey,
        spaceId,
        version,
        log,
    });

    try {
        const { kbnClient } = getRuntimeServices();

        const cfg: GcpFleetVmConfig = {
            gcpProject,
            gcpZone,
            elasticUrl,
            localTailscaleHostname: localTailscaleHostname || undefined,
            fleetServerMode: fleetServerMode === 'local-docker' ? 'local-docker' : 'gcp',
            fleetServerPort,
            fleetServerName,
            fleetServerMachineType: fleetServerMachineType || 'e2-medium',
            ubuntuAgentCount,
            windowsAgentCount,
            osqueryOnlyAgentCount,
            agentMachineType: agentMachineType || 'e2-medium',
            agentVersion: version || undefined,
            tailscaleAuthKey,
            enableCaldera,
            enableInvokeAtomic: false,
            calderaUrl: calderaUrl || undefined,
            namePrefix: namePrefix || truncateGcpName(`${usernameToken}-${runToken}-kbn-gcp-agent`, 45),
            cleanup: false,
            cleanupAll: false,
            insecureFleetEnroll: true,
        };

        log.info(`[ref7707] provisioning Fleet Server + agent VMs on GCP`);
        const ctx = await provisionGcpFleetVm(kbnClient, log, cfg);

        if (enableDnsTelemetry) {
            log.info(`[ref7707] enabling DNS telemetry on agent policy: ${ctx.agentPolicyId}`);
            await addNetworkPacketCaptureDnsIntegrationToAgentPolicy({
                kbnClient,
                log,
                agentPolicyId: ctx.agentPolicyId,
            });
            log.info(`[ref7707] DNS telemetry enabled. Wait ~30-90s for agents to receive policy updates.`);
        } else {
            log.info(`[ref7707] skipping DNS telemetry enablement (--enableDnsTelemetry=false)`);
        }

        log.info(`[ref7707] provisioning REF7707 infra (dns-vm + web-vm) on GCP`);
        const infra = await provisionRef7707GcpInfra({
            log,
            gcpProject,
            gcpZone,
            tailscaleAuthKey,
            namePrefix,
        });

        const calderaHost = ctx.calderaUrl || (calderaUrl ? calderaUrl : '');
        const nextCmd =
            `node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/run_ref7707_caldera_operation.js \\\n` +
            `  --calderaUrl "${calderaHost || 'http://<your-tailscale-host>:8888'}" \\\n` +
            `  --calderaApiKey "$CALDERA_API_KEY" \\\n` +
            `  --domain "${infra.domain}" \\\n` +
            `  --webPort ${infra.webPort} \\\n` +
            `  --dnsIp ${infra.dnsIp} \\\n` +
            `  --webIp ${infra.webIp}`;

        logNextCommand(log, nextCmd);
    } finally {
        await stopRuntimeServices();
    }
};

export const cli = () => {
    run(runSetup, {
        description: `
One-shot REF7707 (GCP) setup:
- Provision Fleet Server + Elastic Agent VMs (GCP, via Tailscale)
- Enable DNS telemetry on the created agent policy (network_traffic DNS-only)
- Provision REF7707 lab infra (dns-vm + web-vm)

Then prints the exact command to run the Caldera operation.
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
                'tailscaleAuthKey',
                'localTailscaleHostname',
                'fleetServerMode',
                'fleetServerPort',
                'fleetServerName',
                'fleetServerMachineType',
                'agentMachineType',
                'ubuntuAgentCount',
                'windowsAgentCount',
                'osqueryOnlyAgentCount',
                'namePrefix',
                'calderaUrl',
                'logLevel',
            ],
            boolean: ['enableCaldera', 'enableDnsTelemetry'],
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
                tailscaleAuthKey: '',
                localTailscaleHostname: '',
                fleetServerMode: 'gcp',
                fleetServerPort: '8220',
                fleetServerName: '',
                fleetServerMachineType: '',
                agentMachineType: '',
                ubuntuAgentCount: '1',
                windowsAgentCount: '0',
                osqueryOnlyAgentCount: '0',
                namePrefix: '',
                enableCaldera: true,
                calderaUrl: '',
                enableDnsTelemetry: true,
            },
            help: `
  --gcpProject             GCP project id (required)
  --gcpZone                GCP zone (required)
  --tailscaleAuthKey       Tailscale auth key (or set TS_AUTHKEY) (required)
  --localTailscaleHostname Optional: your local Tailscale MagicDNS hostname (or set TS_HOSTNAME)
  --namePrefix             Prefix for VM names (required). Agents will be <namePrefix>-ubuntu-1..N, infra will be <namePrefix>-ref7707-dns/web

  --ubuntuAgentCount       Number of Ubuntu agent VMs (with full integrations)
  --windowsAgentCount      Number of Windows agent VMs
  --osqueryOnlyAgentCount  Number of Ubuntu agent VMs with Osquery-only policy (no Elastic Defend, includes Caldera sandcat)
  --enableCaldera          Also deploy Caldera sandcat agents (default: true)
  --calderaUrl             Optional Caldera URL override (default derived from local Tailscale host + :8888)
  --enableDnsTelemetry     Enable network_traffic DNS telemetry on the agent policy (default: true)
`,
        },
    });
};


