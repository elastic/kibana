/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  CoreSetup,
  CoreStart,
  IScopedClusterClient,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { ECS_COMPONENT_TEMPLATE_NAME } from '@kbn/alerting-plugin/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type { IRuleDataClient, IndexOptions } from '@kbn/rule-registry-plugin/server';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import { ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID } from '@kbn/elastic-assistant-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import {
  ATTACK_DISCOVERY_ALERTS_CONTEXT,
  attackDiscoveryAlertFieldMap,
} from '@kbn/discoveries/impl/attack_discovery/alert_fields';
import {
  ATTACK_DISCOVERY_MISCONFIGURATION_EVENT,
  ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT,
  ATTACK_DISCOVERY_STEP_FAILURE_EVENT,
} from '@kbn/discoveries/impl/lib/telemetry/event_based_telemetry';
import { reportMisconfiguration } from '@kbn/discoveries/impl/lib/telemetry/report_misconfiguration';
import { DEFAULT_CONNECTOR_TIMEOUT_MS } from '.';
import { logStartupHealthCheck } from './lib/startup_health_check';
import { workflowExecutor } from './lib/schedules/workflow_executor';
import { registerRoutes } from './routes';
import { createDiagnosticReportAttachmentType } from './agent_builder/attachments/diagnostic_report';
import { registerSkills } from './skills/register_skills';
import type {
  DiscoveriesPluginSetup,
  DiscoveriesPluginSetupDeps,
  DiscoveriesPluginStart,
  DiscoveriesPluginStartDeps,
} from './types';
import { AD_WORKFLOW_IDS, installStatic } from './managed_workflows/install_static';
import { registerOwner } from './managed_workflows/register_owner';
import {
  registerWorkflowSteps,
  type StepRegistrationResult,
} from './workflows/register_workflow_steps';

interface DiscoveriesConfig {
  connectorTimeout?: number;
  enabled: boolean;
  langSmithApiKey?: string;
  langSmithProject?: string;
}

/**
 * Extracts authorization headers from the alerting framework's pre-authenticated
 * scoped cluster client for use in the workflow execution engine's fake request.
 *
 * The alerting framework authenticates rule executors via the rule's stored
 * API key, but only exposes pre-scoped clients — not the authenticated
 * KibanaRequest. The workflow execution engine needs an authenticated
 * KibanaRequest to create its own scoped services, so this function bridges
 * the gap by extracting the authorization header from the scoped client's
 * transport layer.
 */
const createWorkflowAuthHeaders = async ({
  executionId,
  logger,
  scopedClusterClient,
}: {
  executionId: string;
  logger: Logger;
  scopedClusterClient: IScopedClusterClient;
}): Promise<Record<string, string>> => {
  try {
    const esClient = scopedClusterClient.asCurrentUser;

    // The scoped ES client's transport stores the authorization header that
    // the alerting framework derived from the rule's stored API key. We extract
    // it directly instead of creating a derived API key, which avoids the
    // "illegal_argument_exception: creating derived api keys requires an
    // explicit role descriptor" limitation.
    const transportHeaders: Record<string, string> =
      (esClient.transport as unknown as { headers: Record<string, string> }).headers ?? {};

    if (transportHeaders.authorization) {
      return { authorization: transportHeaders.authorization };
    }

    logger.warn(
      () => `No authorization header found in scoped client transport for execution ${executionId}`
    );
    return {};
  } catch (error) {
    logger.warn(
      () => `Failed to extract auth headers for workflow execution ${executionId}: ${error.message}`
    );

    return {};
  }
};

export class DiscoveriesPlugin
  implements
    Plugin<
      DiscoveriesPluginSetup,
      DiscoveriesPluginStart,
      DiscoveriesPluginSetupDeps,
      DiscoveriesPluginStartDeps
    >
{
  private analytics?: AnalyticsServiceSetup;
  private readonly config: DiscoveriesConfig;
  private readonly logger: Logger;
  private adhocAttackDiscoveryDataClient?: IRuleDataClient;
  private workflowsExtensionsStart?: WorkflowsExtensionsServerPluginStart;
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  private workflowStepRegistrationResult: StepRegistrationResult = {
    failedSteps: [],
    registeredSteps: [],
  };

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get<DiscoveriesConfig>();
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup<DiscoveriesPluginStartDeps, DiscoveriesPluginStart>,
    plugins: DiscoveriesPluginSetupDeps
  ): DiscoveriesPluginSetup {
    this.analytics = core.analytics;
    core.analytics.registerEventType(ATTACK_DISCOVERY_MISCONFIGURATION_EVENT);
    core.analytics.registerEventType(ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT);
    core.analytics.registerEventType(ATTACK_DISCOVERY_STEP_FAILURE_EVENT);

    if (this.config.enabled) {
      registerOwner({ workflowsExtensions: plugins.workflowsExtensions });
    }

    if (!plugins.ruleRegistry) {
      // NOTE: `ruleRegistry` is optional in `kibana.jsonc` so this plugin can have a browser-side
      // component (needed for Workflows UI step schema registration). However, this server plugin
      // requires `ruleRegistry` to persist Attack Discoveries.
      this.logger.error(
        '🔴 discoveries: ruleRegistry plugin is missing. Cannot initialize Attack Discovery persistence or routes.'
      );
      throw new Error('discoveries requires ruleRegistry on the server');
    }

    /**
     * Initialize the `default` index for ad-hoc generated Attack Discoveries.
     *
     * This mirrors what elastic_assistant does, but is owned by this plugin so we have
     * zero runtime dependency on elastic_assistant.
     */
    const ruleDataServiceOptions: IndexOptions = {
      // IMPORTANT: These values MUST match what elastic_assistant uses to ensure
      // both plugins read/write to the same index. See elastic_assistant/server/plugin.ts
      // The resulting index pattern is: .adhoc.alerts-siem.security.attack.discovery-{namespace}
      feature: ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
      registrationContext: ATTACK_DISCOVERY_ALERTS_CONTEXT,
      dataset: Dataset.alerts,
      additionalPrefix: '.adhoc',
      componentTemplateRefs: [ECS_COMPONENT_TEMPLATE_NAME],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(attackDiscoveryAlertFieldMap),
        },
      ],
    };

    this.adhocAttackDiscoveryDataClient =
      plugins.ruleRegistry.ruleDataService.initializeIndex(ruleDataServiceOptions);

    const getStartServices = async () => {
      const [coreStart, pluginsStart] = await core.getStartServices();
      return { coreStart, pluginsStart };
    };

    // Get eventLog pattern
    const eventLogIndex = plugins.eventLog.getIndexPattern();

    // Create lazy getter for eventLogger
    const getEventLogger = async () => {
      return plugins.eventLog.getLogger({
        event: { provider: 'securitySolution.attackDiscovery' },
      });
    };

    const getEventLogIndex = async () => eventLogIndex;

    this.workflowsManagementApi = plugins.workflowsManagement?.management;

    if (this.workflowsManagementApi) {
      this.logger.debug(
        () =>
          'WorkflowsManagement API available (default workflows will be ensured on-demand by routes)'
      );
    } else {
      this.logger.warn('WorkflowsManagement API not available, skipping workflow registration');
    }

    this.workflowStepRegistrationResult = registerWorkflowSteps(plugins.workflowsExtensions, {
      adhocAttackDiscoveryDataClient: this.adhocAttackDiscoveryDataClient,
      analytics: core.analytics,
      connectorTimeout: this.config.connectorTimeout ?? DEFAULT_CONNECTOR_TIMEOUT_MS,
      getEventLogIndex,
      getEventLogger,
      getStartServices,
      langSmithApiKey: this.config.langSmithApiKey,
      langSmithProject: this.config.langSmithProject,
      logger: this.logger,
      workflowsManagementApi: this.workflowsManagementApi,
    });

    if (this.workflowStepRegistrationResult.failedSteps.length > 0) {
      reportMisconfiguration({
        analytics: core.analytics,
        logger: this.logger,
        params: {
          detail: `Failed to register steps: ${this.workflowStepRegistrationResult.failedSteps
            .map((s) => `${s.id} (${s.error})`)
            .join(', ')}`,
          misconfiguration_type: 'step_registration_failed',
        },
      });
    }

    // Register agent builder attachment types and skills
    if (plugins.agentBuilder) {
      plugins.agentBuilder.attachments.registerType(createDiagnosticReportAttachmentType());
      const workflowsManagementApi = this.workflowsManagementApi;
      registerSkills(plugins.agentBuilder, this.logger, {
        getEventLogIndex,
        runAttackDiscoveryToolDeps: {
          analytics: core.analytics,
          getEventLogIndex,
          getEventLogger,
          getStartServices,
          logger: this.logger,
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
      }).catch((error) => {
        this.logger.error(`discoveries: Error registering skills: ${error}`);
      });
    } else {
      this.logger.debug(
        'discoveries: agentBuilder plugin not available, skipping skill registration'
      );
    }

    const router = core.http.createRouter();

    registerRoutes(router, this.logger, {
      analytics: core.analytics,
      getEventLogIndex,
      getEventLogger,
      getStartServices,
      workflowsManagementApi: this.workflowsManagementApi,
    });

    // Register the workflow executor factory with elastic_assistant so scheduled
    // rules that carry a workflowConfig can dispatch to this plugin's executor.
    if (plugins.elasticAssistant) {
      const logger = this.logger;
      const workflowsManagementApi = this.workflowsManagementApi;

      const publicBaseUrl = core.http.basePath.publicBaseUrl;

      plugins.elasticAssistant.registerAttackDiscoveryWorkflowExecutor(async (options) => {
        // The alerting framework authenticates via the rule's stored API key but
        // only exposes pre-scoped clients — NOT the authenticated KibanaRequest.
        // The workflow execution engine needs an authenticated KibanaRequest to
        // create its own scoped services (ES client, actions client, etc.), so we
        // derive a short-lived API key from the alerting framework's scoped client.
        const authHeaders = await createWorkflowAuthHeaders({
          executionId: options.executionId,
          logger,
          scopedClusterClient: options.services.scopedClusterClient,
        });

        const fakeRawRequest: FakeRawRequest = { headers: authHeaders, path: '/' };
        const request = kibanaRequestFactory(fakeRawRequest);

        return workflowExecutor({
          deps: {
            analytics: this.analytics,
            getEventLogIndex,
            getEventLogger,
            getStartServices,
            logger,
            publicBaseUrl,
            request,
            workflowsExtensions: this.workflowsExtensionsStart,
            workflowsManagementApi,
          },
          options,
        });
      });

      logger.debug(() => 'Registered workflow executor with elastic_assistant');
    } else {
      this.logger.warn('elastic_assistant not available, skipping workflow executor registration');
    }

    return {};
  }

  public start(_core: CoreStart, plugins: DiscoveriesPluginStartDeps): DiscoveriesPluginStart {
    this.workflowsExtensionsStart = plugins.workflowsExtensions;

    installStatic({
      enabled: this.config.enabled,
      workflowsExtensions: plugins.workflowsExtensions,
    })
      .then(({ failedIds }) => {
        logStartupHealthCheck({
          expectedWorkflowIds: AD_WORKFLOW_IDS,
          failedWorkflowIds: failedIds,
          logger: this.logger,
          workflowsManagementApiAvailable: this.workflowsManagementApi != null,
        });
      })
      .catch((error) => {
        this.logger.error(
          `discoveries: Failed to install static managed workflows: ${error.message}`
        );
      });

    return {};
  }

  public stop() {}
}
