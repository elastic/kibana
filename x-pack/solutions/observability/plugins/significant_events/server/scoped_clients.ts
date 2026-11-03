/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { AlertEventsClientApi, AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import type { InferenceClient } from '@kbn/inference-common';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type { KnowledgeIndicatorService } from './lib/knowledge_indicators/knowledge_indicator_service';
import {
  createSourceKnowledgeStateClient,
  SOURCE_KNOWLEDGE_STATE_TYPE,
  SOURCE_WRITE_LEASE_WAIT_MS,
} from './lib/knowledge_indicators/source_knowledge_state';
import {
  createSignificantEventsClients,
  type SignificantEventsServices,
} from './lib/significant_events/significant_events_clients';
import { createSignificantEventsAlertingContextResolver } from './lib/significant_events/alerting/significant_events_alerting_context';
import type { SignificantEventsAlertingContext } from './lib/significant_events/alerting/significant_events_alerting_context';
import { getSignificantEventsTuningConfig } from './lib/significant_events/helpers/get_significant_events_tuning_config';
import { createTriggerEmitter } from './workflows/triggers/emit';
import { getRequestAbortSignal } from './routes/utils/get_request_abort_signal';
import type { KnowledgeIndicatorClient } from './lib/knowledge_indicators/knowledge_indicator_client/knowledge_indicator_client';
import type { RouteHandlerScopedClients } from './routes/types';

const RULE_CREATION_APP = 'nightshift';

/**
 * The scoped clients Agent Builder tools, skills and attachments use: all of `RouteHandlerScopedClients`
 * but what only routes need (starting onboarding, the fields metadata client).
 */
export type AgentBuilderScopedClients = Omit<
  RouteHandlerScopedClients,
  'scheduleSourceOnboarding' | 'fieldsMetadataClient'
>;

export type GetAgentBuilderScopedClients = (params: {
  request: KibanaRequest;
}) => Promise<AgentBuilderScopedClients>;

type ScopedCoreStart = Pick<
  CoreTasksStart,
  'savedObjects' | 'uiSettings' | 'elasticsearch' | 'dataStreams'
>;

export interface AgentBuilderScopedClientsPluginsStart {
  inference: { getClient: (params: { request: KibanaRequest }) => InferenceClient };
  licensing: Pick<LicensingPluginStart, 'getLicense' | 'license$' | 'featureUsage'>;
  nightshiftSources: {
    getSourcesClient: (params: { request: KibanaRequest }) => Promise<SourcesClient>;
  };
  alertingVTwo: Pick<
    AlertingServerStart,
    'getAlertEventsClientWithRequest' | 'getRulesClientWithRequestInSpace'
  >;
  workflowsExtensions?: Parameters<typeof createTriggerEmitter>[0]['workflowsExtensions'];
}

/**
 * Builds the clients of one request. Kibana's `server` entry and the task pod's `server/tasks` entry
 * both call this, so tools and skills see the same clients in either place.
 */
export const createAgentBuilderScopedClients = async ({
  request,
  coreStart,
  pluginsStart,
  cpsEnabled,
  significantEventsServices,
  knowledgeIndicatorService,
  logger,
}: {
  request: KibanaRequest;
  coreStart: ScopedCoreStart;
  pluginsStart: AgentBuilderScopedClientsPluginsStart;
  cpsEnabled: boolean;
  significantEventsServices: SignificantEventsServices;
  knowledgeIndicatorService: KnowledgeIndicatorService;
  logger: Logger;
}): Promise<AgentBuilderScopedClients> => {
  const scopedSoClient = coreStart.savedObjects.getScopedClient(request);
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(scopedSoClient);
  const globalUiSettingsClient = coreStart.uiSettings.globalAsScopedToClient(scopedSoClient);

  // `scopedClusterClient`: origin-only. Used for everything the plugin owns (its hidden
  // data streams), which only ever exists in the origin project.
  // `streamDataEsClient`: always routed across every CPS-linked project, regardless of the
  // active space's project routing expression. Knowledge indicators are stored per space,
  // but they model all data available to a source, so extraction must always read across
  // every linked project.
  //
  // Detection matches that all-projects scope when CPS is enabled via `withAllProjectsRouting`.
  const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
  const streamDataEsClient = coreStart.elasticsearch.client.asScoped(request, {
    projectRouting: 'expression',
    value: PROJECT_ROUTING_ALL,
  }).asCurrentUser;
  const soClient = scopedSoClient;
  const inferenceClient = pluginsStart.inference.getClient({ request });
  const licensing = pluginsStart.licensing;

  const [tuningConfig, sourcesClient] = await Promise.all([
    getSignificantEventsTuningConfig(globalUiSettingsClient, logger),
    pluginsStart.nightshiftSources.getSourcesClient({ request }),
  ]);

  // Core always populates `request.spaceId` (default space when the URL has no prefix), so
  // no fallback is needed. Knowledge indicators and their rules are scoped to this space.
  const space = request.spaceId;

  let alertEventsClientPromise: Promise<AlertEventsClientApi> | undefined;
  const getAlertEventsClient = (): Promise<AlertEventsClientApi> => {
    alertEventsClientPromise ??= pluginsStart.alertingVTwo.getAlertEventsClientWithRequest(request);
    return alertEventsClientPromise;
  };

  const significantEventsClients = createSignificantEventsClients({
    services: significantEventsServices,
    dataStreams: coreStart.dataStreams,
    esClient: scopedClusterClient.asCurrentUser,
    internalEsClient: scopedClusterClient.asInternalUser,
    logger,
    space,
    getAlertEventsClient,
    triggerEmitter: createTriggerEmitter({
      workflowsExtensions: pluginsStart.workflowsExtensions,
      request,
      logger,
    }),
  });

  const getAlertingV2RulesClient = async () =>
    pluginsStart.alertingVTwo.getRulesClientWithRequestInSpace(request, space, {
      app: RULE_CREATION_APP,
    });

  const resolveSignificantEventsAlertingContext = createSignificantEventsAlertingContextResolver({
    getAlertingV2RulesClient,
    cpsEnabled,
  });

  const sourceKnowledgeState = createSourceKnowledgeStateClient({
    repository: coreStart.savedObjects.createInternalRepository([SOURCE_KNOWLEDGE_STATE_TYPE]),
    space,
    sourcesClient,
  });
  const createKnowledgeIndicatorClient = (
    context: SignificantEventsAlertingContext,
    source?: NightshiftSource
  ) =>
    knowledgeIndicatorService.getClient({
      esClient: scopedClusterClient.asInternalUser,
      soClient,
      space,
      context,
      config: tuningConfig,
      withSourceWrite: (sourceId, run, options) => {
        const shouldWaitForLease = options?.waitForLease !== false;
        return sourceKnowledgeState.write({
          sourceId,
          allowDisabled: options?.allowDisabled,
          waitForLeaseMs: shouldWaitForLease ? SOURCE_WRITE_LEASE_WAIT_MS : undefined,
          signal: shouldWaitForLease ? getRequestAbortSignal(request) : undefined,
          expectedRevision:
            typeof request.headers['x-nightshift-source-revision'] === 'string' &&
            request.headers['x-nightshift-source-revision']
              ? request.headers['x-nightshift-source-revision']
              : source?.esql_updated_at,
          run,
        });
      },
    });

  let kiClientPromise: ReturnType<typeof createKnowledgeIndicatorClient> | undefined;
  const getKnowledgeIndicatorClient = async (
    source?: NightshiftSource
  ): Promise<KnowledgeIndicatorClient> => {
    if (source) {
      return createKnowledgeIndicatorClient(
        await resolveSignificantEventsAlertingContext(),
        source
      );
    }
    kiClientPromise ??= (async () =>
      createKnowledgeIndicatorClient(await resolveSignificantEventsAlertingContext()))();
    return kiClientPromise;
  };

  const license = await licensing.getLicense();
  const isSecurityEnabled = license.getFeature('security').isEnabled;

  return {
    scopedClusterClient,
    streamDataEsClient,
    soClient,
    space,
    getSignificantEventsAlertingContext: resolveSignificantEventsAlertingContext,
    getKnowledgeIndicatorClient,
    sourceKnowledgeState,
    getAlertEventsClient,
    ...significantEventsClients,
    inferenceClient,
    sourcesClient,
    licensing,
    uiSettingsClient,
    globalUiSettingsClient,
    isSecurityEnabled,
    tuningConfig,
  };
};
