/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED } from '@kbn/management-settings-ids';
import { installDiscoveryAgents } from '../../agent_builder/agents/discovery';
import type {
  SignificantEventsScheduledWorkflowsConfig,
  SignificantEventsScheduledWorkflowsService,
} from '../workflows/significant_events_scheduled_workflows';

/** Writes the scheduled-discovery toggle and reconciles its agents and workflows, rolling the toggle back on failure. */
export const setScheduledDiscoveryEnabled = async ({
  uiSettingsClient,
  workflowService,
  agentBuilder,
  request,
  spaceId,
  enabled,
  config,
  logger,
  skipExecutionDrain,
  reconcileWhenUnchanged = false,
}: {
  uiSettingsClient: IUiSettingsClient;
  workflowService: SignificantEventsScheduledWorkflowsService;
  agentBuilder: AgentBuilderPluginStart | undefined;
  request: KibanaRequest;
  spaceId: string;
  enabled: boolean;
  config: SignificantEventsScheduledWorkflowsConfig;
  logger: Logger;
  skipExecutionDrain?: boolean;
  /** Reconcile workflows even when the toggle already matches, so a cadence change is applied. */
  reconcileWhenUnchanged?: boolean;
}): Promise<void> => {
  const previousEnabled = Boolean(
    await uiSettingsClient.get<boolean>(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
    )
  );
  const changed = previousEnabled !== enabled;
  if (!changed && !reconcileWhenUnchanged) {
    return;
  }

  if (changed) {
    await uiSettingsClient.set(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      enabled
    );
  }

  try {
    if (enabled) {
      if (!agentBuilder) {
        throw new Error(
          'Agent Builder is required to enable significant events scheduled discovery'
        );
      }
      await installDiscoveryAgents({ agentBuilder, spaceId });
    }
    await workflowService.ensureWorkflow({
      enabled,
      request,
      spaceId,
      config,
      ...(skipExecutionDrain === undefined ? {} : { skipExecutionDrain }),
    });
  } catch (error) {
    if (changed) {
      await uiSettingsClient
        .set(OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED, previousEnabled)
        .catch((rollbackError) => {
          logger.warn(`Failed to rollback settings after workflow sync error: ${rollbackError}`);
        });
    }
    throw error;
  }
};
