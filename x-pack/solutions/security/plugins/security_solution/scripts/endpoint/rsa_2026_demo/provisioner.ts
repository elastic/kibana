/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { prefixedOutputLogger } from '../common/utils';
import type { ProvisioningContext, Rsa2026DemoConfig } from './types';
import { mergeConfig } from './config';
import {
  stepFleetServer,
  stepPolicies,
  stepEndpoints,
  stepGui,
  stepBrowserHistory,
  stepDetectionRule,
  stepWorkflow,
  type ProvisioningStep,
} from './steps';
import { findVm, getHostVmClient } from '../common/vm_services';
import {
  unEnrollFleetAgent,
  deleteAgentPolicy,
  fetchAgentPolicyList,
  fetchFleetAgents,
} from '../common/fleet_services';
import { DETECTION_ENGINE_RULES_URL } from '../../../common/constants';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';
import { findRules } from '../common/detection_rules_services';
import {
  DEFAULT_RSA_2026_STATE_FILE,
  deleteRsa2026DemoState,
  loadRsa2026DemoState,
  updateRsa2026DemoState,
} from './state';

/**
 * Main provisioning function for RSA 2026 demo
 * Can run all steps or specific steps based on the steps parameter
 */
export const provisionRsa2026Demo = async (
  kbnClient: KbnClient,
  esClient: Client,
  log: ToolingLog,
  userConfig: Partial<Rsa2026DemoConfig>,
  steps?: ProvisioningStep[]
): Promise<ProvisioningContext> => {
  const config = mergeConfig(userConfig);
  const logger = prefixedOutputLogger('provisionRsa2026Demo()', log);

  logger.info('Starting RSA 2026 demo provisioning');
  logger.info(`Configuration: ${config.defendOsqueryCount} Defend+Osquery, ${config.osqueryOnlyCount} Osquery-only endpoints`);
  
  if (steps && steps.length > 0) {
    logger.info(`Running specific steps: ${steps.join(', ')}`);
  } else {
    logger.info('Running all steps');
  }

  const context: ProvisioningContext = {
    kbnClient,
    esClient,
    log: logger,
    config,
    endpoints: [],
    policyIds: {
      defendOsquery: '',
      osqueryOnly: '',
    },
  };

  const allSteps: ProvisioningStep[] = [
    'fleet-server',
    'policies',
    'endpoints',
    'gui',
    'browser-history',
    'detection-rule',
    'workflow',
  ];

  const stepsToRun = steps && steps.length > 0 ? steps : allSteps;

  return logger.indent(4, async () => {
    // Persist a minimal state file as we go so cleanup can work across separate runs/steps
    await updateRsa2026DemoState({}, DEFAULT_RSA_2026_STATE_FILE);

    // Step 1: Fleet Server
    if (stepsToRun.includes('fleet-server')) {
      await stepFleetServer(kbnClient, logger, config);
    }

    // Step 2: Policies
    if (stepsToRun.includes('policies')) {
      context.policyIds = await stepPolicies(kbnClient, logger);
      await updateRsa2026DemoState(
        { agentPolicyIds: [context.policyIds.defendOsquery, context.policyIds.osqueryOnly] },
        DEFAULT_RSA_2026_STATE_FILE
      );
    }

    // Step 3: Endpoints (requires policies)
    if (stepsToRun.includes('endpoints')) {
      if (!context.policyIds.defendOsquery || !context.policyIds.osqueryOnly) {
        // If policies weren't created in this run, try to get them
        if (stepsToRun.includes('policies')) {
          throw new Error('Policies must be created before endpoints');
        }
        // Try to fetch existing policies (simplified - in production you'd query by name pattern)
        context.policyIds = await stepPolicies(kbnClient, logger);
      }
      context.endpoints = await stepEndpoints(kbnClient, logger, config, context.policyIds);
      await updateRsa2026DemoState(
        {
          vmNames: context.endpoints.map((e) => e.hostname),
          agentIds: context.endpoints.map((e) => e.agentId).filter((id) => id && id !== 'unknown'),
        },
        DEFAULT_RSA_2026_STATE_FILE
      );
    }

    // Step 4: Browser History (requires endpoints)
    if (stepsToRun.includes('gui')) {
      if (context.endpoints.length === 0) {
        if (stepsToRun.includes('endpoints')) {
          throw new Error('Endpoints must be created before GUI setup');
        }
        const vmType = process.env.CI ? 'vagrant' : 'multipass';
        const existingVms = await findVm(vmType, /^rsa-2026-/, logger);
        if (existingVms.data.length === 0) {
          throw new Error('No existing endpoints found. Please run endpoints step first.');
        }
        context.endpoints = existingVms.data.map((hostname) => ({
          hostname,
          agentId: 'unknown',
          hostVm: getHostVmClient(hostname, vmType, undefined, logger),
          policyType: hostname.includes('defend-osquery') ? 'defend-osquery' : 'osquery-only',
        }));
      }

      await stepGui(context.endpoints, logger, config);
    }

    // Step 5: Browser History (requires endpoints)
    if (stepsToRun.includes('browser-history')) {
      if (context.endpoints.length === 0) {
        // If endpoints weren't created in this run, try to find existing ones
        if (stepsToRun.includes('endpoints')) {
          throw new Error('Endpoints must be created before browser history');
        }
        // Try to find existing endpoints
        const vmType = process.env.CI ? 'vagrant' : 'multipass';
        const existingVms = await findVm(vmType, /^rsa-2026-/, logger);
        if (existingVms.data.length === 0) {
          throw new Error('No existing endpoints found. Please run endpoints step first.');
        }
        // Reconstruct endpoints from existing VMs
        context.endpoints = existingVms.data.map((hostname) => ({
          hostname,
          agentId: 'unknown',
          hostVm: getHostVmClient(hostname, vmType, undefined, logger),
          policyType: hostname.includes('defend-osquery') ? 'defend-osquery' : 'osquery-only',
        }));
      }
      await stepBrowserHistory(context.endpoints, logger, config);
    }

    // Step 6: Detection Rule
    if (stepsToRun.includes('detection-rule') && config.createDetectionRule) {
      context.detectionRuleId = await stepDetectionRule(kbnClient, logger);
      if (context.detectionRuleId) {
        await updateRsa2026DemoState(
          { detectionRuleIds: [context.detectionRuleId] },
          DEFAULT_RSA_2026_STATE_FILE
        );
      }
    }

    // Step 7: Workflow
    if (stepsToRun.includes('workflow') && config.createWorkflow) {
      const workflowResult = await stepWorkflow(
        esClient,
        kbnClient,
        logger,
        config.virustotalApiKey || ''
      );
      if (workflowResult) {
        context.workflowId = workflowResult.workflowId;
        context.virusTotalConnectorId = workflowResult.connectorId;
        await updateRsa2026DemoState(
          { workflowIds: [workflowResult.workflowId], connectorIds: [workflowResult.connectorId] },
          DEFAULT_RSA_2026_STATE_FILE
        );
      }
    }

    logger.info('RSA 2026 demo provisioning completed successfully');
    logger.info(`Created ${context.endpoints.length} endpoints`);
    if (context.detectionRuleId) {
      logger.info(`Detection rule ID: ${context.detectionRuleId}`);
    }
    if (context.workflowId) {
      logger.info(`Workflow ID: ${context.workflowId}`);
    }

    return context;
  });
};

/**
 * Cleans up provisioned resources
 */
export const cleanupRsa2026Demo = async (
  context: ProvisioningContext,
  options: { cleanupAll?: boolean } = {}
): Promise<void> => {
  const logger = prefixedOutputLogger('cleanupRsa2026Demo()', context.log);

  logger.info('Cleaning up RSA 2026 demo resources');

  return logger.indent(4, async () => {
    const { cleanupAll = false } = options;

    const persistedState = await loadRsa2026DemoState(DEFAULT_RSA_2026_STATE_FILE);

    const isNotFoundError = (e: unknown): boolean => {
      const err = e as { response?: { status?: number }; message?: string };
      return err?.response?.status === 404 || /status code 404/i.test(err?.message ?? '');
    };

    const deleted = {
      policies: new Set<string>(),
      rules: new Set<string>(),
      workflows: new Set<string>(),
      connectors: new Set<string>(),
      agents: new Set<string>(),
    };

    // Un-enroll agents first (best-effort). This helps allow policy deletion.
    if (cleanupAll) {
      // Prefer agent ids from persisted state if present
      const agentIdsFromState = persistedState?.agentIds ?? [];
      for (const agentId of agentIdsFromState) {
        if (deleted.agents.has(agentId)) continue;
        logger.info(`Unenrolling Fleet agent from state: ${agentId}`);
        try {
          await unEnrollFleetAgent(context.kbnClient, agentId, true);
          deleted.agents.add(agentId);
        } catch (error) {
          logger.warning(`Failed to unenroll agent ${agentId}: ${error}`);
        }
      }

      for (const endpoint of context.endpoints) {
        if (!endpoint.agentId || endpoint.agentId === 'unknown') {
          continue;
        }
        logger.info(`Unenrolling Fleet agent: ${endpoint.agentId} (${endpoint.hostname})`);
        try {
          await unEnrollFleetAgent(context.kbnClient, endpoint.agentId, true);
        } catch (error) {
          logger.warning(`Failed to unenroll agent ${endpoint.agentId}: ${error}`);
        }
      }
    }

    // Destroy VMs
    // If this run did not have endpoints in context, fall back to persisted VM names
    if (context.endpoints.length === 0 && persistedState?.vmNames?.length) {
      const vmType = process.env.CI ? 'vagrant' : 'multipass';
      context.endpoints = persistedState.vmNames.map((hostname) => ({
        hostname,
        agentId: 'unknown',
        hostVm: getHostVmClient(hostname, vmType, undefined, logger),
        policyType: hostname.includes('defend-osquery') ? 'defend-osquery' : 'osquery-only',
      }));
    }

    for (const endpoint of context.endpoints) {
      logger.info(`Cleaning up endpoint: ${endpoint.hostname}`);
      try {
        await endpoint.hostVm.destroy();
        logger.info(`VM destroyed: ${endpoint.hostname}`);
      } catch (error) {
        logger.warning(`Failed to destroy VM ${endpoint.hostname}: ${error}`);
      }
    }

    if (cleanupAll) {
      // Delete by persisted IDs first (more deterministic)
      for (const ruleId of persistedState?.detectionRuleIds ?? []) {
        if (deleted.rules.has(ruleId)) continue;
        try {
          await context.kbnClient
            .request({
              method: 'DELETE',
              path: DETECTION_ENGINE_RULES_URL,
              headers: { 'elastic-api-version': '2023-10-31' },
              query: { id: ruleId },
            })
            .catch(catchAxiosErrorFormatAndThrow);
          deleted.rules.add(ruleId);
        } catch (error) {
          if (!isNotFoundError(error)) {
            logger.warning(`Failed to delete detection rule from state ${ruleId}: ${error}`);
          }
        }
      }

      for (const workflowId of persistedState?.workflowIds ?? []) {
        if (deleted.workflows.has(workflowId)) continue;
        try {
          await context.kbnClient
            .request({
              method: 'DELETE',
              path: `/api/workflows/${workflowId}`,
              headers: { 'elastic-api-version': '2023-10-31' },
            })
            .catch(catchAxiosErrorFormatAndThrow);
          deleted.workflows.add(workflowId);
        } catch (error) {
          if (!isNotFoundError(error)) {
            logger.warning(`Failed to delete workflow from state ${workflowId}: ${error}`);
          }
        }
      }

      for (const connectorId of persistedState?.connectorIds ?? []) {
        if (deleted.connectors.has(connectorId)) continue;
        try {
          await context.kbnClient
            .request({
              method: 'DELETE',
              path: `/api/actions/connector/${connectorId}`,
              headers: { 'elastic-api-version': '2023-10-31' },
            })
            .catch(catchAxiosErrorFormatAndThrow);
          deleted.connectors.add(connectorId);
        } catch (error) {
          if (!isNotFoundError(error)) {
            logger.warning(`Failed to delete connector from state ${connectorId}: ${error}`);
          }
        }
      }

      for (const policyId of persistedState?.agentPolicyIds ?? []) {
        if (deleted.policies.has(policyId)) continue;
        try {
          await deleteAgentPolicy(context.kbnClient, policyId);
          deleted.policies.add(policyId);
        } catch (error) {
          if (!isNotFoundError(error)) {
            logger.warning(`Failed to delete agent policy from state ${policyId}: ${error}`);
          }
        }
      }

      // Best-effort: un-enroll any RSA-2026 agents still present in Fleet (including ones created in past runs)
      // This helps policy deletion succeed.
      try {
        const agents = await fetchFleetAgents(context.kbnClient, { perPage: 1000 });
        const rsaAgents = agents.items.filter((agent) =>
          agent.local_metadata?.host?.hostname?.startsWith('rsa-2026-')
        );

        logger.info(`Found ${rsaAgents.length} RSA 2026 Fleet agents to unenroll`);

        for (const agent of rsaAgents) {
          const hostname = agent.local_metadata?.host?.hostname ?? 'unknown-hostname';
          logger.info(`Unenrolling RSA 2026 Fleet agent: ${agent.id} (${hostname})`);
          try {
            await unEnrollFleetAgent(context.kbnClient, agent.id, true);
          } catch (error) {
            logger.warning(`Failed to unenroll agent ${agent.id}: ${error}`);
          }
        }
      } catch (error) {
        logger.warning(`Failed to list/unenroll RSA 2026 agents: ${error}`);
      }

      // Delete detection rule (if created)
      const deleteDetectionRuleById = async (id: string) => {
        logger.info(`Deleting detection rule: ${id}`);
        await context.kbnClient
          .request({
            method: 'DELETE',
            path: DETECTION_ENGINE_RULES_URL,
            headers: { 'elastic-api-version': '2023-10-31' },
            query: { id },
          })
          .catch(catchAxiosErrorFormatAndThrow);
        logger.info(`Deleted detection rule: ${id}`);
      };

      try {
        if (context.detectionRuleId) {
          await deleteDetectionRuleById(context.detectionRuleId);
        } else {
          // Best-effort: delete by known rule name (useful when cleanup runs after a partial execution path)
          const ruleName = 'RSA 2026 Demo - Malicious Domain Detection (REF7707)';
          const existingRules = await findRules(context.kbnClient, {
            perPage: 100,
            filter: `alert.attributes.name: "${ruleName}"`,
          });
          for (const rule of existingRules.data) {
            await deleteDetectionRuleById(rule.id);
          }
        }
      } catch (error) {
        logger.warning(`Failed to delete detection rule(s): ${error}`);
      }

      // Delete workflow (if created)
      const deleteWorkflowById = async (id: string) => {
        logger.info(`Deleting workflow: ${id}`);
        await context.kbnClient
          .request({
            method: 'DELETE',
            path: `/api/workflows/${id}`,
            headers: { 'elastic-api-version': '2023-10-31' },
          })
          .catch(catchAxiosErrorFormatAndThrow);
        logger.info(`Deleted workflow: ${id}`);
      };

      try {
        if (context.workflowId) {
          await deleteWorkflowById(context.workflowId);
        } else {
          // Best-effort: delete by known workflow name
          const workflowName = 'RSA 2026 Demo - VirusTotal Domain Check';
          const workflowsResponse = await context.kbnClient
            .request({
              method: 'GET',
              path: '/api/workflows',
              headers: { 'elastic-api-version': '2023-10-31' },
              query: { search: workflowName },
            })
            .catch(() => ({ data: { data: [] } }));

          const workflows =
            (workflowsResponse.data as { data?: Array<{ id: string; name?: string }> }).data ?? [];
          for (const w of workflows) {
            if (w.id) {
              await deleteWorkflowById(w.id);
            }
          }
        }
      } catch (error) {
        logger.warning(`Failed to delete workflow(s): ${error}`);
      }

      // Delete VirusTotal connector(s) created by this script (by name + type)
      try {
        // If we know the connector id, delete it directly first
        if (context.virusTotalConnectorId) {
          if (!deleted.connectors.has(context.virusTotalConnectorId)) {
            try {
              await context.kbnClient
                .request({
                  method: 'DELETE',
                  path: `/api/actions/connector/${context.virusTotalConnectorId}`,
                  headers: { 'elastic-api-version': '2023-10-31' },
                })
                .catch(catchAxiosErrorFormatAndThrow);
              deleted.connectors.add(context.virusTotalConnectorId);
            } catch (error) {
              if (!isNotFoundError(error)) {
                throw error;
              }
            }
          }
        }

        const connectorsResponse = await context.kbnClient
          .request({
            method: 'GET',
            path: '/api/actions/connectors',
            headers: { 'elastic-api-version': '2023-10-31' },
          })
          .catch(catchAxiosErrorFormatAndThrow)
          .then((r) => r.data as unknown);

        const connectors: Array<{ id: string; name: string; connector_type_id: string }> =
          Array.isArray(connectorsResponse) ? connectorsResponse : (connectorsResponse as any)?.data ?? [];

        const vtConnectors =
          connectors.filter(
            (c) => c.connector_type_id === '.virustotal' && c.name === 'RSA 2026 Demo - VirusTotal'
          ) ?? [];

        for (const c of vtConnectors) {
          if (deleted.connectors.has(c.id)) continue;
          logger.info(`Deleting VirusTotal connector: ${c.name} (${c.id})`);
          try {
            await context.kbnClient
              .request({
                method: 'DELETE',
                path: `/api/actions/connector/${c.id}`,
                headers: { 'elastic-api-version': '2023-10-31' },
              })
              .catch(catchAxiosErrorFormatAndThrow);
            logger.info(`Deleted connector: ${c.id}`);
            deleted.connectors.add(c.id);
          } catch (error) {
            if (!isNotFoundError(error)) {
              logger.warning(`Failed to delete connector ${c.id}: ${error}`);
            }
          }
        }
      } catch (error) {
        if (!isNotFoundError(error)) {
          logger.warning(`Failed to list/delete VirusTotal connectors: ${error}`);
        }
      }

      // Delete agent policies created by this run (best-effort)
      for (const policyId of [context.policyIds.defendOsquery, context.policyIds.osqueryOnly]) {
        if (!policyId) continue;
        if (deleted.policies.has(policyId)) continue;
        logger.info(`Deleting agent policy: ${policyId}`);
        try {
          await deleteAgentPolicy(context.kbnClient, policyId);
          logger.info(`Deleted agent policy: ${policyId}`);
          deleted.policies.add(policyId);
        } catch (error) {
          if (!isNotFoundError(error)) {
            logger.warning(`Failed to delete agent policy ${policyId}: ${error}`);
          }
        }
      }

      // Best-effort: delete any additional RSA demo policies if they exist (useful when policies were created in a different run)
      try {
        const list = await fetchAgentPolicyList(context.kbnClient, { perPage: 100, withAgentCount: true });
        for (const item of list.items) {
          if (!item.name?.startsWith('RSA 2026 -')) {
            continue;
          }
          if (item.id === context.policyIds.defendOsquery || item.id === context.policyIds.osqueryOnly) {
            continue;
          }
          if (deleted.policies.has(item.id)) {
            continue;
          }
          logger.info(`Deleting RSA 2026 agent policy: ${item.name} (${item.id})`);
          try {
            await deleteAgentPolicy(context.kbnClient, item.id);
            logger.info(`Deleted agent policy: ${item.id}`);
            deleted.policies.add(item.id);
          } catch (error) {
            if (!isNotFoundError(error)) {
              logger.warning(`Failed to delete agent policy ${item.id}: ${error}`);
            }
          }
        }
      } catch (error) {
        logger.warning(`Failed to list/delete RSA 2026 agent policies by name: ${error}`);
      }
    }

    logger.info('Cleanup completed');

    if (cleanupAll) {
      await deleteRsa2026DemoState(DEFAULT_RSA_2026_STATE_FILE);
    }
  });
};

