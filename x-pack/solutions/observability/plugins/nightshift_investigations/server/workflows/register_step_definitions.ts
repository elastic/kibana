/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, CoreStart, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { InvestigationLocator, NightshiftSettingsLocator } from '../../common/locators';
import type {
  GetAlertsClient,
  GetAutomationsSoClient,
  GetEpisodeLookup,
  GetInvestigationsClient,
} from '../routes/types';
import type { InvestigationNotificationDeps } from '../lib/notifications/send_investigation_notifications';
import type { NightshiftTelemetryClient } from '../telemetry';
import type { GetTriggerEmitter } from '../types';
import { ensureInvestigationAgentStepDefinition } from '../step_definitions/ensure_investigation_agent';
import { sendNotificationsStepDefinition } from '../step_definitions/send_notifications';
import { handleInvestigationFailureStepDefinition } from '../step_definitions/handle_investigation_failure';
import { renderSlackMessageStepDefinition } from '../step_definitions/render_slack_message';
import { triggerInvestigationStepDefinition } from '../step_definitions/trigger_investigation';
import { followUpRecoveredAlertStepDefinition } from '../step_definitions/follow_up_recovered_alert';
import { classifyOnlineEvalsRoundStepDefinition } from '../step_definitions/classify_online_evals_round';
import { obtainSandboxStepDefinition } from '../step_definitions/obtain_sandbox';
import { composeHydrateNotificationsStepDefinition } from '../step_definitions/compose_hydrate_notifications';
import { resolveModelStepDefinition } from '../step_definitions/resolve_model';
import { cortexHydrateStepDefinition } from '../step_definitions/cortex_hydrate';
import { memoryMaterializeToSandboxStepDefinition } from '../step_definitions/memory_materialize_to_sandbox';
import { cortexOptimizeStepDefinition } from '../step_definitions/cortex_optimize';
import { decisionTreeHydrateStepDefinition } from '../step_definitions/decision_tree_hydrate';
import { decisionTreePrepareStepDefinition } from '../step_definitions/decision_tree_prepare';
import { decisionTreeReinforceStepDefinition } from '../step_definitions/decision_tree_reinforce';
import { memoryOptimizeStepDefinition } from '../step_definitions/memory_optimize';

/**
 * What the Nightshift workflow steps read, as explicit getters. Kibana's `server` entry and the
 * task pod's tasks entry each build their own; the steps are the same.
 */
export interface NightshiftStepDeps {
  logger: Logger;
  analytics: Pick<AnalyticsServiceSetup, 'reportEvent'>;
  telemetry: NightshiftTelemetryClient;
  investigationLocator: Pick<InvestigationLocator, 'getRedirectUrl'>;
  settingsLocator: NightshiftSettingsLocator;
  getInvestigationsClient: GetInvestigationsClient;
  getAutomationsSoClient: GetAutomationsSoClient;
  getAlertsClient: GetAlertsClient;
  getEpisodeLookup: GetEpisodeLookup;
  getActions: InvestigationNotificationDeps['getActions'];
  getRoutingClient: InvestigationNotificationDeps['getRoutingClient'];
  getTriggerEmitter: GetTriggerEmitter;
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  getAgentAvailability: () => AgentAvailabilityConfig;
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  getSandboxStart: () => SandboxPluginStart | undefined;
  getTelemetryConnectorId: (
    request: KibanaRequest,
    conversationId?: string
  ) => string | undefined | Promise<string | undefined>;
  isEvalsAvailable: () => boolean;
  isOnlineEvalsPaused: () => boolean;
  isCortexEnabled: () => boolean;
  isMemoryEnabled: () => boolean;
  isDecisionTreesEnabled: () => boolean;
}

/** Registers every Nightshift workflow step (the `nightshift.*` step types). */
export const registerNightshiftStepDefinitions = (
  workflowsExtensions: Pick<WorkflowsExtensionsServerPluginSetup, 'registerStepDefinition'>,
  deps: NightshiftStepDeps
): void => {
  const { logger } = deps;
  workflowsExtensions.registerStepDefinition(
    triggerInvestigationStepDefinition(
      deps.getInvestigationsClient,
      deps.getAutomationsSoClient,
      deps.getAlertsClient,
      deps.getEpisodeLookup,
      deps.getActions,
      deps.settingsLocator
    )
  );
  workflowsExtensions.registerStepDefinition(
    followUpRecoveredAlertStepDefinition(deps.getInvestigationsClient)
  );
  workflowsExtensions.registerStepDefinition(
    classifyOnlineEvalsRoundStepDefinition({
      getAgentBuilder: deps.getAgentBuilder,
      isEvalsAvailable: deps.isEvalsAvailable,
      isPaused: deps.isOnlineEvalsPaused,
    })
  );
  // `agentBuilder` is only available from `start()`, so the step resolves it lazily.
  workflowsExtensions.registerStepDefinition(
    ensureInvestigationAgentStepDefinition({
      getAgentBuilder: deps.getAgentBuilder,
      getAgentAvailability: deps.getAgentAvailability,
    })
  );
  workflowsExtensions.registerStepDefinition(
    resolveModelStepDefinition({
      getInference: deps.getInference,
      getSavedObjects: deps.getSavedObjects,
      getUiSettings: deps.getUiSettings,
      logger: logger.get('resolve_model'),
    })
  );
  workflowsExtensions.registerStepDefinition(
    sendNotificationsStepDefinition({
      investigationLocator: deps.investigationLocator,
      getInvestigationsClient: deps.getInvestigationsClient,
      getActions: deps.getActions,
      getRoutingClient: deps.getRoutingClient,
    })
  );
  workflowsExtensions.registerStepDefinition(
    handleInvestigationFailureStepDefinition({
      investigationLocator: deps.investigationLocator,
      getInvestigationsClient: deps.getInvestigationsClient,
      getActions: deps.getActions,
      getRoutingClient: deps.getRoutingClient,
      getTriggerEmitter: deps.getTriggerEmitter,
    })
  );
  workflowsExtensions.registerStepDefinition(
    renderSlackMessageStepDefinition({
      investigationLocator: deps.investigationLocator,
      getInvestigationsClient: deps.getInvestigationsClient,
    })
  );
  // Registered even when disabled: the combined workflow no-ops a writer branch instead
  // of failing on an unknown step type, and obtain runs first to hand both writers a sandbox.
  workflowsExtensions.registerStepDefinition(
    obtainSandboxStepDefinition({
      getSandboxStart: deps.getSandboxStart,
      logger: logger.get('sandbox'),
    })
  );
  workflowsExtensions.registerStepDefinition(
    cortexHydrateStepDefinition({
      getSandboxStart: deps.getSandboxStart,
      analytics: deps.analytics as AnalyticsServiceSetup,
      logger: logger.get('cortex'),
      isEnabled: deps.isCortexEnabled,
    })
  );
  workflowsExtensions.registerStepDefinition(
    memoryMaterializeToSandboxStepDefinition({
      getSandboxStart: deps.getSandboxStart,
      logger: logger.get('memory'),
      isEnabled: deps.isMemoryEnabled,
      telemetry: deps.telemetry,
    })
  );
  workflowsExtensions.registerStepDefinition(composeHydrateNotificationsStepDefinition());
  // Registered unconditionally: the combined materialize workflow installs with Cortex
  // or Memory, so a trees-off install would otherwise reference an unknown step type.
  // The handler no-ops on the flag instead, matching cortex/memory above.
  workflowsExtensions.registerStepDefinition(
    decisionTreeHydrateStepDefinition({
      getSandboxStart: deps.getSandboxStart,
      logger: logger.get('decision_trees'),
      isEnabled: deps.isDecisionTreesEnabled,
    })
  );
  workflowsExtensions.registerStepDefinition(
    cortexOptimizeStepDefinition({
      getAgentBuilder: deps.getAgentBuilder,
      getInference: deps.getInference,
      getSavedObjects: deps.getSavedObjects,
      getUiSettings: deps.getUiSettings,
      analytics: deps.analytics as AnalyticsServiceSetup,
      logger: logger.get('cortex'),
      isEnabled: deps.isCortexEnabled,
    })
  );
  workflowsExtensions.registerStepDefinition(
    memoryOptimizeStepDefinition({
      getAgentBuilder: deps.getAgentBuilder,
      getInference: deps.getInference,
      getSavedObjects: deps.getSavedObjects,
      getUiSettings: deps.getUiSettings,
      logger: logger.get('memory'),
      isEnabled: deps.isMemoryEnabled,
      telemetry: deps.telemetry,
    })
  );
  // Registered unconditionally for the same reason as the tree hydrate above: the
  // combined optimize workflow installs with Cortex or Memory and now runs the
  // reinforcement phase too. The handler no-ops on the flag.
  workflowsExtensions.registerStepDefinition(
    decisionTreePrepareStepDefinition({
      getTelemetryConnectorId: deps.getTelemetryConnectorId,
      logger: logger.get('decision_trees'),
      isEnabled: deps.isDecisionTreesEnabled,
    })
  );
  workflowsExtensions.registerStepDefinition(
    decisionTreeReinforceStepDefinition({
      getAgentBuilder: deps.getAgentBuilder,
      isEnabled: deps.isDecisionTreesEnabled,
    })
  );
};
