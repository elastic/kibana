/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskHost } from '@kbn/task-manager-plugin/server/task_type_module';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityTaskPluginStart } from '@kbn/security-plugin/server/task_plugin';
import { getNamespacedRuleDataAlias } from '@kbn/rule-registry-plugin/server';
import type {
  WorkflowsExtensionsServerPluginStart,
  WorkflowStepsContribution,
} from '@kbn/workflows-extensions/server';
import { AppClient } from '../client';
import { SecuritySolutionEventBus } from '../events/event_bus';
import { registerSecurityWorkflowEventBridge } from '../workflows/triggers/event_bridge';
import { createSecurityAlertsClientFactory } from '../lib/detection_engine/alerts/create_alerts_client';
import {
  SECURITY_ALERTS_SETTINGS_ID,
  type SecurityAlertsTaskProcessSettings,
} from './security_alerts_settings';
import { registerSecurityWorkflowSteps } from '../workflows/register_security_workflow_steps';
import { createEndpointWorkflowServices } from './endpoint_workflow_services';
import {
  SECURITY_AGENT_BUILDER_SETTINGS_ID,
  type SecurityAgentBuilderSettings,
} from './agent_builder_settings';
import { getEndpointResponseActionsRunSavedObjectTypes } from '../endpoint/run_time/saved_objects';
import { events } from '../lib/telemetry/event_based/events';

export interface SecurityWorkflowEvents {
  eventBus?: SecuritySolutionEventBus;
  flushEvents?: () => Promise<void>;
}

/**
 * The workflow steps and triggers of the plugin, in the task process of the workflow task types.
 * Listed under `taskTypeContributions['workflow-steps']` in `kibana.jsonc`.
 */
export const contribution: WorkflowStepsContribution = {
  declares: {
    settings: [SECURITY_ALERTS_SETTINGS_ID, SECURITY_AGENT_BUILDER_SETTINGS_ID],
    // `securitySolution.alerts` above needs the spaces service (`spaces`) and
    // `securitySolution.events` needs the workflow trigger client (`workflows.extensions`): both
    // services another pack provides, not this one.
    requires: ['spaces', 'workflows.extensions'],
    // `registerSecurityWorkflowSteps` (../workflows/register_security_workflow_steps.ts) registers
    // every `security.*` step below unconditionally, and `threat_intel.fetch_source` only when the
    // process is given a `threatIntelLogger` (always true here). Lets `resolvePacksForDefinition`
    // select this pack for a workflow that uses one of these steps instead of falling back to a
    // full load.
    stepTypes: [
      'security.assignAlert',
      'security.assignAttack',
      'security.buildAlertEntityGraph',
      'security.buildExceptionEntriesFilter',
      'security.createExceptionListItem',
      'security.createNote',
      'security.createRule',
      'security.createRuleException',
      'security.deleteNote',
      'security.disableRule',
      'security.enableRule',
      'security.getAlertEntities',
      'security.getNotes',
      'security.patchRule',
      'security.renderAlertNarrative',
      'security.setAlertStatus',
      'security.setAlertTags',
      'security.setAttackStatus',
      'security.setAttackTags',
      'security.updateNote',
      'threat_intel.fetch_source',
    ],
    registerAnalyticsEventTypes: (analytics) => {
      events.forEach((event) => analytics.registerEventType(event));
    },
    createSavedObjectTypes: (_encryption, settings) => {
      const snapshot = settings[SECURITY_AGENT_BUILDER_SETTINGS_ID] as
        | SecurityAgentBuilderSettings
        | undefined;
      return snapshot
        ? getEndpointResponseActionsRunSavedObjectTypes(snapshot.config.experimentalFeatures)
        : [];
    },
  },
  provides: {
    'securitySolution.endpoint': ({ host, settings, services }) => {
      const snapshot = settings[SECURITY_AGENT_BUILDER_SETTINGS_ID] as
        | SecurityAgentBuilderSettings
        | undefined;
      if (!snapshot || !services)
        throw new Error('Native Endpoint requires its dispatch settings and execution services');
      return createEndpointWorkflowServices(host as TaskHost, snapshot, services);
    },
    'securitySolution.events': ({ host: taskHost, settings, services, logger }) => {
      const host = taskHost as TaskHost;
      const snapshot = settings[SECURITY_ALERTS_SETTINGS_ID] as
        | SecurityAlertsTaskProcessSettings
        | undefined;
      if (!snapshot || !services || !host.onRunEnd)
        throw new Error(
          'Native Security events require their dispatch snapshot and lifecycle services'
        );
      if (!snapshot.workflowEventsAvailable) return { eventBus: undefined };
      const eventBus = new SecuritySolutionEventBus();
      const flushEvents = registerSecurityWorkflowEventBridge(
        eventBus,
        services.getService<WorkflowsExtensionsServerPluginStart>('workflows.extensions'),
        logger
      );
      services.registerRunCompletion(flushEvents);
      host.onRunEnd(async () => {
        eventBus.removeAllListeners();
      });
      return { eventBus, flushEvents };
    },
    'securitySolution.alerts': ({ host: taskHost, settings, services }) => {
      const host = taskHost as TaskHost;
      const snapshot = settings[SECURITY_ALERTS_SETTINGS_ID] as
        | SecurityAlertsTaskProcessSettings
        | undefined;
      const security = host.plugins?.security as SecurityTaskPluginStart | undefined;
      if (!snapshot || !services || !security || !host.onRunEnd)
        throw new Error(
          'Native Security alerts require their dispatch settings, Security and run lifecycle services'
        );
      const spaces = services.getService<SpacesPluginStart>('spaces');
      const { eventBus } = services.getService<SecurityWorkflowEvents>('securitySolution.events');
      return createSecurityAlertsClientFactory({
        getEsClient: (request) => host.elasticsearch.asScoped(request).asCurrentUser,
        getSearchIndex: (request) =>
          snapshot.searchIndexName
            ? getNamespacedRuleDataAlias(
                snapshot.searchIndexName,
                spaces.spacesService.getSpaceId(request)
              )
            : undefined,
        getAppClient: (request) => {
          if (!snapshot.appClientInitialized)
            throw new Error('The dispatching Security alerts client is not initialized');
          return new AppClient(
            spaces.spacesService.getSpaceId(request),
            { signalsIndex: snapshot.signalsIndex },
            host.server.version,
            snapshot.kibanaBranch,
            snapshot.buildFlavor
          );
        },
        getAuditLogger: (request) => security.audit.asScoped(request),
        getSecurity: async () => security,
        eventBus,
      });
    },
  },
  register: (registry, { logger }) => {
    registerSecurityWorkflowSteps(registry, {
      threatIntelLogger: logger.get('securitySolution', 'threatIntel'),
    });
  },
};
