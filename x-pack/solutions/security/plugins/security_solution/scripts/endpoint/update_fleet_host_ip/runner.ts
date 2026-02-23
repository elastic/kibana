/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { createRuntimeServices } from '../common/stack_services';
import {
  cleanupAndAddFleetServerHostSettings,
  startFleetServerIfNecessary,
  updateFleetElasticsearchOutputHostNames,
} from '../common/fleet_server/fleet_server_services';
import type { KbnClient } from '@kbn/test';
import { fetchAgentPolicyEnrollmentKey, fetchFleetAgents } from '../common/fleet_services';
import { findVm, createMultipassHostVmClient } from '../common/vm_services';

export interface RunUpdateFleetHostIpOptions {
  kibanaUrl: string;
  elasticUrl: string;
  username: string;
  password: string;
  apiKey?: string;
  spaceId?: string;
  hostIp: string;
  fleetServerPort: number;
  restartFleetServer: boolean;
  updateMultipassAgents: boolean;
  multipassNameFilter?: string;
  log?: ToolingLog;
}

const findFleetAgentByHostname = async (kbnClient: KbnClient, hostname: string) => {
  const response = await fetchFleetAgents(kbnClient, {
    perPage: 1,
    kuery: `(local_metadata.host.hostname.keyword : "${hostname}")`,
    showInactive: true,
  } as any);
  return response.items?.[0];
};

const reEnrollMultipassAgent = async ({
  vmName,
  fleetServerUrl,
  enrollmentToken,
  log,
}: {
  vmName: string;
  fleetServerUrl: string;
  enrollmentToken: string;
  log: ToolingLog;
}) => {
  const vm = createMultipassHostVmClient(vmName, log);

  log.info(`Re-enrolling Elastic Agent on VM [${vmName}] to Fleet Server [${fleetServerUrl}]`);

  const enrollCommand = `sudo bash -lc 'set -euo pipefail
if [ -x /opt/Elastic/Agent/elastic-agent ]; then
  AGENT=/opt/Elastic/Agent/elastic-agent
elif command -v elastic-agent >/dev/null 2>&1; then
  AGENT=$(command -v elastic-agent)
else
  echo \"elastic-agent binary not found\" >&2
  exit 1
fi

\"$AGENT\" enroll --force --insecure --url \"${fleetServerUrl}\" --enrollment-token \"${enrollmentToken}\"

\"$AGENT\" restart || systemctl restart elastic-agent || true
'`;

  await vm.exec(enrollCommand);
};

export const runUpdateFleetHostIp = async (options: RunUpdateFleetHostIpOptions): Promise<void> => {
  const log = options.log ?? createToolingLogger();

  if (!options.hostIp) {
    throw new Error(`Missing required --hostIp`);
  }

  // Force the "real host IP" resolution used by Fleet tooling.
  process.env.KBN_LOCALHOST_REAL_IP = options.hostIp;

  const fleetServerUrl = `https://${options.hostIp}:${options.fleetServerPort}`;

  log.info(`Updating Fleet settings to use host IP: ${options.hostIp}`);

  const { kbnClient } = await createRuntimeServices({
    kibanaUrl: options.kibanaUrl,
    elasticsearchUrl: options.elasticUrl,
    username: options.username,
    password: options.password,
    apiKey: options.apiKey,
    spaceId: options.spaceId,
    log,
  });

  // 1) Update Fleet settings (Fleet Server hosts + ES output hosts)
  await cleanupAndAddFleetServerHostSettings(kbnClient, log, fleetServerUrl);
  await updateFleetElasticsearchOutputHostNames(kbnClient, log);

  // 2) Restart Fleet Server container so it uses the updated ES output host and re-enrolls cleanly.
  if (options.restartFleetServer) {
    await startFleetServerIfNecessary({
      kbnClient,
      logger: log,
      port: options.fleetServerPort,
      force: true,
    });
  }

  // 3) Update multipass VMs by re-enrolling agents (works even if they were stuck on an old/unreachable Fleet URL).
  if (options.updateMultipassAgents) {
    const filter = options.multipassNameFilter ? new RegExp(options.multipassNameFilter) : undefined;
    const { data: vms } = await findVm('multipass');

    const targetVms = filter ? vms.filter((name) => filter.test(name)) : vms;

    if (targetVms.length === 0) {
      log.warning(`No multipass VMs found${filter ? ` matching [${filter}]` : ''}. Nothing to update.`);
      return;
    }

    log.info(`Updating ${targetVms.length} multipass VM(s)`);
    await log.indent(4, async () => {
      for (const vmName of targetVms) {
        try {
          const agent = await findFleetAgentByHostname(kbnClient, vmName);
          const agentPolicyId = agent?.policy_id;

          if (!agentPolicyId) {
            log.warning(`Skipping VM [${vmName}] (no matching Fleet agent policy id found)`);
            continue;
          }

          const enrollmentToken = await fetchAgentPolicyEnrollmentKey(kbnClient, agentPolicyId);
          if (!enrollmentToken) {
            log.warning(`Skipping VM [${vmName}] (no enrollment token found for policy [${agentPolicyId}])`);
            continue;
          }

          await reEnrollMultipassAgent({ vmName, fleetServerUrl, enrollmentToken, log });
        } catch (e) {
          log.error(`Failed to update VM [${vmName}]: ${(e as Error).message}`);
          log.verbose(e);
        }
      }
    });
  }
};


