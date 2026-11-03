/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, CoreStart, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { isWorkflowsEnabled } from '@kbn/discoveries/impl/lib/helpers/is_workflows_enabled';
import type { AdhocAttackDiscoveryDataClient, DiscoveriesPluginStartDeps } from '../types';
import { createAttackDiscoveryAttachmentType } from './attachments/attack_discovery';
import { createAttackDiscoveryVerdictAttachmentType } from './attachments/attack_discovery_verdict';
import { createDiagnosticReportAttachmentType } from './attachments/diagnostic_report';
import { registerSkills } from './skills/register_skills';

export interface DiscoveriesAgentBuilderDeps {
  adhocAttackDiscoveryDataClient: AdhocAttackDiscoveryDataClient;
  agentBuilder: AgentBuilderPluginSetup;
  analytics?: AnalyticsServiceSetup;
  getEventLogIndex: () => Promise<string>;
  getEventLogger: () => Promise<IEventLogger>;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
  workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
}

/**
 * Registers Discoveries' agent builder attachment types and skills. The `security.attack_discovery`
 * attachment type is always registered, because Security Solution's "Add to chat" produces it;
 * everything else only when the feature flag is ON. Registration is deferred through
 * `getStartServices()` because the request-free feature flags reader (`coreStart.featureFlags`) is
 * only available at start. Attachment types and skills are read lazily at request time, so
 * registering after setup is safe. Kibana's server entry and the task pod entry both call this.
 */
export const registerDiscoveriesAgentBuilderContributions = ({
  adhocAttackDiscoveryDataClient,
  agentBuilder,
  analytics,
  getEventLogIndex,
  getEventLogger,
  getStartServices,
  logger,
  workflowsManagementApi,
}: DiscoveriesAgentBuilderDeps): void => {
  void getStartServices()
    .then(async ({ coreStart }) => {
      // Registered regardless of the flag: Security Solution's "Add to chat" attaches
      // discoveries as this type, so it must not depend on the workflows kill switch.
      agentBuilder.attachments.registerType(
        createAttackDiscoveryAttachmentType({
          adhocAttackDiscoveryDataClient,
          esClient: coreStart.elasticsearch.client,
          logger,
        })
      );

      if (!(await isWorkflowsEnabled(coreStart.featureFlags))) {
        logger.debug(
          () =>
            'discoveries: Attack Discovery workflows disabled; skipping agent builder registration'
        );
        return;
      }

      agentBuilder.attachments.registerType(createDiagnosticReportAttachmentType());

      // By value, so unlike the discovery itself it needs no data client to
      // resolve against.
      agentBuilder.attachments.registerType(createAttackDiscoveryVerdictAttachmentType());

      await registerSkills(agentBuilder, logger, {
        getEventLogIndex,
        getStartServices,
        runAttackDiscoveryToolDeps: {
          analytics,
          getEventLogIndex,
          getEventLogger,
          getStartServices,
          logger,
          workflowsManagementApi,
        },
        workflowExecutionLookup:
          workflowsManagementApi != null
            ? {
                getWorkflowExecution: (executionId, spaceId, options) =>
                  workflowsManagementApi.getWorkflowExecution(executionId, spaceId, options),
              }
            : undefined,
        workflowFetcher: workflowsManagementApi,
      });
    })
    .catch((error) => {
      logger.error(`discoveries: Error registering skills: ${error}`);
    });
};
