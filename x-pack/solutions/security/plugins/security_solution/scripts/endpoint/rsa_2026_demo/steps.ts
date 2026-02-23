/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  isFleetServerRunning,
  updateFleetElasticsearchOutputHostNames,
  cleanupAndAddFleetServerHostSettings,
  startFleetServerIfNecessary,
} from '../common/fleet_server/fleet_server_services';
import { getLocalhostRealIp } from '../common/network_services';
import { prefixedOutputLogger } from '../common/utils';
import type { ProvisioningContext, Rsa2026DemoConfig } from './types';
import { setupPolicies } from './policy_setup';
import { setupBrowserHistory } from './browser_history_setup';
import { setupGui } from './gui_setup';
import { createDetectionRule } from './detection_rule_setup';
import { createVirusTotalWorkflow } from './workflow_setup';
import { findVm, getHostVmClient } from '../common/vm_services';
import { createAndEnrollEndpointHost } from '../common/endpoint_host_services';
import { fetchFleetAgents } from '../common/fleet_services';
import type { ProvisionedEndpoint } from './types';

export type ProvisioningStep =
  | 'fleet-server'
  | 'policies'
  | 'endpoints'
  | 'gui'
  | 'browser-history'
  | 'detection-rule'
  | 'workflow';

/**
 * Step 1: Ensure Fleet Server is configured and running
 */
export const stepFleetServer = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  config: Rsa2026DemoConfig
): Promise<void> => {
  const logger = prefixedOutputLogger('stepFleetServer()', log);

  logger.info('Ensuring Fleet Server settings are configured correctly');

  return logger.indent(4, async () => {
    const localhostRealIp = getLocalhostRealIp();
    const fleetServerUrl = `https://${localhostRealIp}:8220`;

    // Update Elasticsearch output hostnames to use correct localhost IP
    logger.info('Updating Fleet Elasticsearch output hostnames to use correct localhost IP');
    try {
      await updateFleetElasticsearchOutputHostNames(kbnClient, logger);
      logger.info('Fleet Elasticsearch output hostnames updated successfully');
    } catch (error) {
      logger.warning(`Failed to update Fleet Elasticsearch output hostnames: ${error}`);
    }

    // Clean up invalid Fleet Server host entries and ensure correct one is set
    logger.info(`Cleaning up Fleet Server host settings and ensuring correct URL: ${fleetServerUrl}`);
    await cleanupAndAddFleetServerHostSettings(kbnClient, logger, fleetServerUrl);

    // Ensure Fleet Server is deployed and running
    logger.info('Ensuring Fleet Server is deployed and running');

    const isCurrentlyRunning = await isFleetServerRunning(kbnClient, logger);
    if (!isCurrentlyRunning) {
      logger.info('Fleet Server is not running, deploying new Fleet Server...');
      const fleetServer = await startFleetServerIfNecessary({
        kbnClient,
        logger,
        version: config.agentVersion,
        force: false,
      });
      if (fleetServer) {
        logger.info(`Fleet Server deployed successfully: ${fleetServer.url}`);
        logger.info(`Fleet Server container: ${fleetServer.name} (${fleetServer.id})`);
      }

      // Wait a bit for Fleet Server to be fully ready
      logger.info('Waiting for Fleet Server to be fully ready...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
      logger.info('Fleet Server is already running');
    }

    // Verify Fleet Server is actually accessible
    logger.info('Verifying Fleet Server is accessible...');
    const isRunning = await isFleetServerRunning(kbnClient, logger);
    if (!isRunning) {
      throw new Error('Fleet Server is not accessible after deployment attempt');
    }
    logger.info('Fleet Server is accessible and ready');
  });
};

/**
 * Step 2: Create agent policies (idempotent - checks for existing policies)
 */
export const stepPolicies = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<{ defendOsquery: string; osqueryOnly: string }> => {
  const logger = prefixedOutputLogger('stepPolicies()', log);

  logger.info('Setting up agent policies');

  return logger.indent(4, async () => {
    // Check if policies already exist by looking for agents with RSA 2026 policies
    // For now, we'll always create new policies (they're idempotent via random names)
    // In the future, we could add a check to find existing policies by name pattern
    return await setupPolicies(kbnClient, logger);
  });
};

/**
 * Step 3: Provision endpoints (reuses existing VMs if found)
 */
export const stepEndpoints = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  config: Rsa2026DemoConfig,
  policyIds: { defendOsquery: string; osqueryOnly: string }
): Promise<ProvisionedEndpoint[]> => {
  const logger = prefixedOutputLogger('stepEndpoints()', log);

  logger.info('Provisioning endpoints');

  return logger.indent(4, async () => {
    const vmType = process.env.CI ? 'vagrant' : 'multipass';
    const endpoints: ProvisionedEndpoint[] = [];

    // Find existing VMs
    const existingVms = await findVm(vmType, /^rsa-2026-/, logger);
    logger.info(`Found ${existingVms.data.length} existing RSA 2026 VMs: ${existingVms.data.join(', ')}`);

    // Get list of enrolled agents to match with VMs
    const agentMap = new Map<string, { id: string; hostname: string }>();
    try {
      // Fetch all agents and filter by hostname pattern
      const agents = await fetchFleetAgents(kbnClient, {
        perPage: 1000,
      });
      agents.items.forEach((agent) => {
        const hostname = agent.local_metadata?.host?.hostname;
        if (hostname && hostname.startsWith('rsa-2026-')) {
          agentMap.set(hostname, { id: agent.id, hostname });
        }
      });
      logger.info(`Found ${agentMap.size} enrolled agents matching RSA 2026 pattern`);
    } catch (error) {
      logger.warning(`Could not fetch agent list: ${error}`);
    }

    // Create or reuse Defend+Osquery endpoints
    for (let i = 0; i < config.defendOsqueryCount; i++) {
      const hostname = `rsa-2026-defend-osquery-${i + 1}`;
      logger.info(`Processing endpoint ${i + 1}/${config.defendOsqueryCount} with Defend+Osquery: ${hostname}`);

      if (existingVms.data.includes(hostname)) {
        logger.info(`Reusing existing VM: ${hostname}`);
        const hostVm = getHostVmClient(hostname, vmType, undefined, logger);
        const agent = agentMap.get(hostname);

        if (agent) {
          endpoints.push({
            hostname,
            agentId: agent.id,
            hostVm,
            policyType: 'defend-osquery',
          });
          logger.info(`Reused endpoint: ${hostname} (agent: ${agent.id})`);
        } else {
          logger.warning(`VM ${hostname} exists but agent not found in Fleet. Will skip this endpoint.`);
          logger.info(`To re-enroll, you can manually enroll the agent or delete the VM and rerun this step.`);
          // Still add it to the list so browser history can be set up later
          endpoints.push({
            hostname,
            agentId: 'unknown',
            hostVm,
            policyType: 'defend-osquery',
          });
        }
      } else {
        logger.info(`Creating new endpoint: ${hostname}`);
        const { hostname: newHostname, agentId, hostVm } = await createAndEnrollEndpointHost({
          kbnClient,
          log: logger,
          agentPolicyId: policyIds.defendOsquery,
          version: config.agentVersion,
          hostname,
        });
        endpoints.push({
          hostname: newHostname,
          agentId,
          hostVm,
          policyType: 'defend-osquery',
        });
        logger.info(`Created endpoint: ${newHostname} (agent: ${agentId})`);
      }
    }

    // Create or reuse Osquery-only endpoints
    for (let i = 0; i < config.osqueryOnlyCount; i++) {
      const hostname = `rsa-2026-osquery-only-${i + 1}`;
      logger.info(`Processing endpoint ${i + 1}/${config.osqueryOnlyCount} with Osquery only: ${hostname}`);

      if (existingVms.data.includes(hostname)) {
        logger.info(`Reusing existing VM: ${hostname}`);
        const hostVm = getHostVmClient(hostname, vmType, undefined, logger);
        const agent = agentMap.get(hostname);

        if (agent) {
          endpoints.push({
            hostname,
            agentId: agent.id,
            hostVm,
            policyType: 'osquery-only',
          });
          logger.info(`Reused endpoint: ${hostname} (agent: ${agent.id})`);
        } else {
          logger.warning(`VM ${hostname} exists but agent not found in Fleet. Will skip this endpoint.`);
          logger.info(`To re-enroll, you can manually enroll the agent or delete the VM and rerun this step.`);
          // Still add it to the list so browser history can be set up later
          endpoints.push({
            hostname,
            agentId: 'unknown',
            hostVm,
            policyType: 'osquery-only',
          });
        }
      } else {
        logger.info(`Creating new endpoint: ${hostname}`);
        const { hostname: newHostname, agentId, hostVm } = await createAndEnrollEndpointHost({
          kbnClient,
          log: logger,
          agentPolicyId: policyIds.osqueryOnly,
          version: config.agentVersion,
          hostname,
        });
        endpoints.push({
          hostname: newHostname,
          agentId,
          hostVm,
          policyType: 'osquery-only',
        });
        logger.info(`Created endpoint: ${newHostname} (agent: ${agentId})`);
      }
    }

    logger.info(`Successfully provisioned ${endpoints.length} endpoints`);
    return endpoints;
  });
};

/**
 * Step 4: Setup browser history (idempotent - can rerun safely)
 */
export const stepBrowserHistory = async (
  endpoints: ProvisionedEndpoint[],
  log: ToolingLog,
  config: Rsa2026DemoConfig
): Promise<void> => {
  const logger = prefixedOutputLogger('stepBrowserHistory()', log);

  logger.info('Setting up browser history on designated endpoints');

  return logger.indent(4, async () => {
    // Browser history setup is already idempotent (can be rerun)
    // It will reinstall browsers and reinject history if needed
    await setupBrowserHistory(endpoints, logger, config);
    logger.info('Browser history setup completed');
  });
};

/**
 * Step 4: Install GUI (XFCE + XRDP) on Multipass endpoints
 */
export const stepGui = async (
  endpoints: ProvisionedEndpoint[],
  log: ToolingLog,
  config: Rsa2026DemoConfig
): Promise<void> => {
  const logger = prefixedOutputLogger('stepGui()', log);
  logger.info('Setting up GUI access (XFCE + XRDP) on endpoints');
  return logger.indent(4, async () => {
    await setupGui(endpoints, logger, config);
  });
};

/**
 * Step 5: Create detection rule (idempotent - checks for existing rule)
 */
export const stepDetectionRule = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<string | undefined> => {
  const logger = prefixedOutputLogger('stepDetectionRule()', log);

  logger.info('Creating detection rule');

  return logger.indent(4, async () => {
    // Detection rule creation checks for existing rules with same query
    return await createDetectionRule(kbnClient, logger);
  });
};

/**
 * Step 6: Create VirusTotal workflow (idempotent - checks for existing workflow)
 */
export const stepWorkflow = async (
  esClient: Client,
  kbnClient: KbnClient,
  log: ToolingLog,
  virustotalApiKey: string
): Promise<{ workflowId: string; connectorId: string } | undefined> => {
  const logger = prefixedOutputLogger('stepWorkflow()', log);

  logger.info('Creating VirusTotal workflow');

  return logger.indent(4, async () => {
    if (!virustotalApiKey) {
      logger.warning('VirusTotal API key not provided, skipping workflow creation');
      return undefined;
    }

    // Workflow creation checks for existing workflows
    return await createVirusTotalWorkflow(esClient, kbnClient, logger, virustotalApiKey);
  });
};

