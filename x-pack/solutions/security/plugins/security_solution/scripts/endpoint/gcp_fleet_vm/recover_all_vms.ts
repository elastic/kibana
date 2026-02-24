/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import pLimit from 'p-limit';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { gcloud, gcloudSsh } from './gcloud';

interface GcpVmInfo {
  name: string;
  zone: string;
  status: string;
  natIp?: string;
}

interface RecoveryResult {
  vmName: string;
  tailscaleStatus: 'ok' | 'reauthed' | 'failed' | 'skipped';
  agentStatus: 'restarted' | 'failed' | 'skipped';
  error?: string;
}

interface FleetAgent {
  id: string;
  status: string;
  local_metadata?: {
    host?: {
      hostname?: string;
    };
  };
  last_checkin?: string;
}

/**
 * Lists GCP VM instances matching a filter pattern
 */
const listGcpVms = async (
  log: ToolingLog,
  project: string,
  zone: string,
  filter: string
): Promise<GcpVmInfo[]> => {
  try {
    const { stdout } = await gcloud(log, [
      'compute',
      'instances',
      'list',
      '--project',
      project,
      '--filter',
      filter,
      '--format',
      'json(name,zone,status,networkInterfaces[0].accessConfigs[0].natIP)',
    ]);

    const instances = JSON.parse(stdout || '[]');
    return instances.map((inst: Record<string, unknown>) => ({
      name: inst.name as string,
      zone: ((inst.zone as string) || '').split('/').pop() || zone,
      status: inst.status as string,
      natIp: (
        (inst.networkInterfaces as Array<{ accessConfigs?: Array<{ natIP?: string }> }>)?.[0]
          ?.accessConfigs?.[0]?.natIP || ''
      ).toString(),
    }));
  } catch (e) {
    log.error(`Failed to list GCP VMs: ${e}`);
    return [];
  }
};

/**
 * Starts or resumes a stopped/suspended VM
 */
const startVm = async (
  log: ToolingLog,
  project: string,
  zone: string,
  vmName: string,
  status: string
): Promise<boolean> => {
  try {
    // SUSPENDED VMs need 'resume', TERMINATED VMs need 'start'
    const action = status === 'SUSPENDED' ? 'resume' : 'start';
    log.info(`[gcp] ${action === 'resume' ? 'Resuming' : 'Starting'} VM: ${vmName}`);
    await gcloud(log, [
      'compute',
      'instances',
      action,
      vmName,
      '--project',
      project,
      '--zone',
      zone,
      '--quiet',
    ]);
    // Wait for VM to be running
    await new Promise((resolve) => setTimeout(resolve, 10000));
    return true;
  } catch (e) {
    log.error(`Failed to ${status === 'SUSPENDED' ? 'resume' : 'start'} VM ${vmName}: ${e}`);
    return false;
  }
};

/**
 * Checks and repairs Tailscale on a VM
 */
const repairTailscale = async (
  log: ToolingLog,
  project: string,
  zone: string,
  vmName: string,
  tailscaleAuthKey: string
): Promise<'ok' | 'reauthed' | 'failed'> => {
  try {
    // Check current Tailscale status
    const checkResult = await gcloudSsh({
      log,
      project,
      zone,
      instance: vmName,
      command: 'sudo tailscale status 2>&1 | head -5 || echo "TAILSCALE_ERROR"',
    });

    const needsReauth =
      checkResult.includes('Logged out') ||
      checkResult.includes('NeedsLogin') ||
      checkResult.includes('not logged in') ||
      checkResult.includes('stopped') ||
      checkResult.includes('TAILSCALE_ERROR');

    if (!needsReauth) {
      log.info(`[${vmName}] Tailscale is already connected`);
      return 'ok';
    }

    if (!tailscaleAuthKey) {
      log.warning(`[${vmName}] Tailscale needs re-auth but no auth key provided`);
      return 'failed';
    }

    log.info(`[${vmName}] Re-authenticating Tailscale...`);

    // Restart tailscaled service first
    await gcloudSsh({
      log,
      project,
      zone,
      instance: vmName,
      command: 'sudo systemctl restart tailscaled && sleep 3',
    });

    // Re-authenticate
    await gcloudSsh({
      log,
      project,
      zone,
      instance: vmName,
      command: `sudo tailscale up --auth-key="${tailscaleAuthKey}" --hostname="${vmName}" --accept-dns=true`,
    });

    // Verify
    const verifyResult = await gcloudSsh({
      log,
      project,
      zone,
      instance: vmName,
      command: 'sudo tailscale status 2>&1 | head -3',
    });

    if (verifyResult.includes('Logged out') || verifyResult.includes('NeedsLogin')) {
      log.error(`[${vmName}] Tailscale re-auth failed`);
      return 'failed';
    }

    log.info(`[${vmName}] Tailscale re-authenticated successfully`);
    return 'reauthed';
  } catch (e) {
    log.error(`[${vmName}] Tailscale repair failed: ${e}`);
    return 'failed';
  }
};

/**
 * Restarts Elastic Agent on a VM
 */
const restartElasticAgent = async (
  log: ToolingLog,
  project: string,
  zone: string,
  vmName: string
): Promise<'restarted' | 'failed'> => {
  try {
    log.info(`[${vmName}] Restarting Elastic Agent...`);
    await gcloudSsh({
      log,
      project,
      zone,
      instance: vmName,
      command: 'sudo systemctl restart elastic-agent',
    });

    // Brief wait and verify
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const statusResult = await gcloudSsh({
      log,
      project,
      zone,
      instance: vmName,
      command:
        'sudo systemctl is-active elastic-agent && echo "AGENT_ACTIVE" || echo "AGENT_INACTIVE"',
    });

    if (statusResult.includes('AGENT_ACTIVE')) {
      log.info(`[${vmName}] Elastic Agent restarted successfully`);
      return 'restarted';
    }

    log.warning(`[${vmName}] Elastic Agent may not be running`);
    return 'failed';
  } catch (e) {
    log.error(`[${vmName}] Failed to restart Elastic Agent: ${e}`);
    return 'failed';
  }
};

/**
 * Fetches Fleet agent status from Kibana
 */
const getFleetAgentStatus = async (
  log: ToolingLog,
  kibanaUrl: string,
  username: string,
  password: string
): Promise<FleetAgent[]> => {
  try {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const { stdout } = await execa('curl', [
      '-s',
      '-u',
      `${username}:${password}`,
      `${kibanaUrl}/api/fleet/agents`,
      '-H',
      'elastic-api-version: 2023-10-31',
    ]);

    const response = JSON.parse(stdout);
    return response.items || [];
  } catch (e) {
    log.error(`Failed to fetch Fleet agent status: ${e}`);
    return [];
  }
};

/**
 * Main recovery function
 */
const runRecovery: RunFn = async ({ log, flags }) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  const gcpProject = (flags.gcpProject as string) || process.env.GCP_PROJECT || '';
  const gcpZone = (flags.gcpZone as string) || 'us-central1-a';
  const vmFilter = (flags.vmFilter as string) || '';
  const tailscaleAuthKey = (flags.tailscaleAuthKey as string) || process.env.TS_AUTHKEY || '';
  const kibanaUrl = (flags.kibanaUrl as string) || 'http://127.0.0.1:5601';
  const username = (flags.username as string) || 'elastic';
  const password = (flags.password as string) || 'changeme';
  const concurrency = Number(flags.concurrency) || 4;
  const startSuspended = Boolean(flags.startSuspended);
  const skipAgentRestart = Boolean(flags.skipAgentRestart);

  if (!gcpProject) {
    throw new Error(`--gcpProject is required (or set GCP_PROJECT env var)`);
  }

  if (!tailscaleAuthKey) {
    log.warning(
      `No Tailscale auth key provided (--tailscaleAuthKey or TS_AUTHKEY). VMs requiring re-auth will be skipped.`
    );
  }

  // Build filter - default to user's VMs if no filter specified
  let filter = vmFilter;
  if (!filter) {
    const { stdout: whoami } = await execa('whoami');
    const username = whoami
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    filter = `name~"^${username}-"`;
    log.info(`No --vmFilter provided, using default: ${filter}`);
  }

  log.info(`Discovering GCP VMs matching filter: ${filter}`);
  const allVms = await listGcpVms(log, gcpProject, gcpZone, filter);

  if (allVms.length === 0) {
    log.info(`No VMs found matching filter: ${filter}`);
    return;
  }

  log.info(`Found ${allVms.length} VMs:`);
  for (const vm of allVms) {
    log.info(`  - ${vm.name} (${vm.status}) ${vm.natIp || ''}`);
  }

  // Separate running and suspended VMs
  const runningVms = allVms.filter((vm) => vm.status === 'RUNNING');
  const suspendedVms = allVms.filter(
    (vm) => vm.status === 'SUSPENDED' || vm.status === 'TERMINATED'
  );

  // Optionally start/resume suspended VMs
  if (startSuspended && suspendedVms.length > 0) {
    log.info(`Starting/resuming ${suspendedVms.length} suspended/terminated VMs...`);
    const limit = pLimit(concurrency);
    await Promise.all(
      suspendedVms.map((vm) =>
        limit(async () => {
          const started = await startVm(log, gcpProject, vm.zone, vm.name, vm.status);
          if (started) {
            runningVms.push(vm);
          }
        })
      )
    );
    // Wait for VMs to fully start
    log.info(`Waiting for VMs to initialize...`);
    await new Promise((resolve) => setTimeout(resolve, 30000));
  } else if (suspendedVms.length > 0) {
    log.info(
      `Skipping ${suspendedVms.length} suspended VMs. Use --startSuspended to start/resume them.`
    );
  }

  if (runningVms.length === 0) {
    log.info(`No running VMs to repair.`);
    return;
  }

  // Repair VMs in parallel
  log.info(`\nRepairing ${runningVms.length} running VMs (concurrency: ${concurrency})...\n`);
  const limit = pLimit(concurrency);
  const results: RecoveryResult[] = await Promise.all(
    runningVms.map((vm) =>
      limit(async (): Promise<RecoveryResult> => {
        const result: RecoveryResult = {
          vmName: vm.name,
          tailscaleStatus: 'skipped',
          agentStatus: 'skipped',
        };

        try {
          // Step 1: Repair Tailscale
          result.tailscaleStatus = await repairTailscale(
            log,
            gcpProject,
            vm.zone,
            vm.name,
            tailscaleAuthKey
          );

          // Step 2: Restart Elastic Agent (if Tailscale is ok)
          if (!skipAgentRestart && result.tailscaleStatus !== 'failed') {
            result.agentStatus = await restartElasticAgent(log, gcpProject, vm.zone, vm.name);
          }
        } catch (e) {
          result.error = String(e);
        }

        return result;
      })
    )
  );

  // Wait for agents to check in
  log.info(`\nWaiting for agents to reconnect to Fleet...`);
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // Check Fleet status
  log.info(`\nChecking Fleet agent status...\n`);
  const fleetAgents = await getFleetAgentStatus(log, kibanaUrl, username, password);

  // Build summary
  log.info(`\n${'='.repeat(60)}`);
  log.info(`RECOVERY SUMMARY`);
  log.info(`${'='.repeat(60)}\n`);

  const vmHostnames = new Set(runningVms.map((vm) => vm.name));
  const matchingAgents = fleetAgents.filter((agent) =>
    vmHostnames.has(agent.local_metadata?.host?.hostname || '')
  );

  log.info(`VM Recovery Results:`);
  for (const result of results) {
    const fleetAgent = matchingAgents.find(
      (a) => a.local_metadata?.host?.hostname === result.vmName
    );
    const fleetStatus = fleetAgent?.status || 'not found';
    const statusIcon = fleetStatus === 'online' ? '✅' : fleetStatus === 'offline' ? '❌' : '⚠️';

    log.info(
      `  ${statusIcon} ${result.vmName.padEnd(35)} | Tailscale: ${result.tailscaleStatus.padEnd(
        10
      )} | Agent: ${result.agentStatus.padEnd(10)} | Fleet: ${fleetStatus}`
    );
    if (result.error) {
      log.info(`     Error: ${result.error}`);
    }
  }

  const onlineCount = matchingAgents.filter((a) => a.status === 'online').length;
  const offlineCount = matchingAgents.filter((a) => a.status === 'offline').length;
  const totalMatched = matchingAgents.length;

  log.info(`\nFleet Status Summary:`);
  log.info(`  Total VMs processed: ${runningVms.length}`);
  log.info(`  Agents found in Fleet: ${totalMatched}`);
  log.info(`  Online: ${onlineCount}`);
  log.info(`  Offline: ${offlineCount}`);

  if (offlineCount > 0) {
    log.warning(
      `\n⚠️  Some agents are still offline. They may need more time to reconnect or manual investigation.`
    );
  } else if (onlineCount === runningVms.length) {
    log.info(`\n✅ All agents are online!`);
  }
};

export const cli = () => {
  run(runRecovery, {
    description: `
Recover all GCP VMs by checking and repairing Tailscale connectivity and restarting Elastic Agents.

This script will:
1. Discover all GCP VMs matching the filter pattern
2. Optionally start suspended/terminated VMs
3. Check and re-authenticate Tailscale if needed
4. Restart Elastic Agent on each VM
5. Verify Fleet agent status

Example usage:
  # Recover all your VMs (filter by username)
  node run_gcp_vm_recover_all.js --gcpProject=elastic-security-dev

  # Recover VMs matching a specific pattern
  node run_gcp_vm_recover_all.js --gcpProject=elastic-security-dev --vmFilter='name~"^patryk-ref7707"'

  # Also start suspended VMs
  node run_gcp_vm_recover_all.js --gcpProject=elastic-security-dev --startSuspended
`,
    flags: {
      string: [
        'gcpProject',
        'gcpZone',
        'vmFilter',
        'tailscaleAuthKey',
        'kibanaUrl',
        'username',
        'password',
        'concurrency',
        'logLevel',
      ],
      boolean: ['startSuspended', 'skipAgentRestart'],
      default: {
        gcpZone: 'us-central1-a',
        tailscaleAuthKey: '',
        kibanaUrl: 'http://127.0.0.1:5601',
        username: 'elastic',
        password: 'changeme',
        concurrency: '4',
        startSuspended: false,
        skipAgentRestart: false,
      },
      help: `
  --gcpProject          GCP project id (required, or set GCP_PROJECT env var)
  --gcpZone             GCP zone (default: us-central1-a)
  --vmFilter            GCP filter pattern for VMs (default: name~"^<username>-")
                        Examples:
                          --vmFilter='name~"^patryk-ref7707"'
                          --vmFilter='name~"fleet-server" OR name~"ubuntu"'
  --tailscaleAuthKey    Tailscale auth key for re-authentication (or set TS_AUTHKEY env var)
  --kibanaUrl           Kibana URL for Fleet status check (default: http://127.0.0.1:5601)
  --username            Kibana username (default: elastic)
  --password            Kibana password (default: changeme)
  --concurrency         Number of VMs to repair in parallel (default: 4)
  --startSuspended      Start suspended/terminated VMs before repair
  --skipAgentRestart    Only repair Tailscale, don't restart Elastic Agent
`,
    },
  });
};
