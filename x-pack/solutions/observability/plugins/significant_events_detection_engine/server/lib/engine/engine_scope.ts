/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { InferenceClient } from '@kbn/inference-common';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type {
  KnowledgeIndicatorClient,
  PriceResult,
  RuleEventsClient,
} from '@kbn/significant-events-plugin/server';
import type { EngineConfig } from '../../../common';
import type { DetectionEngineConfig } from '../../config';
import type { DetectionEngineStartDependencies } from '../../types';
import { createAgentBuilderAgent } from '../agent/agent_builder_agent';
import type { IDiscoveryAgentInstaller } from '../agent/discovery_agent_type';
import { createHeuristicAgent } from '../agent/heuristic_agent';
import type { IDiscoveryAgent } from '../agent/types';
import { DetectionEngineError } from '../errors';
import { createEngineStorage, type IEngineStorage } from '../storage/engine_storage';
import type { IManagedIndexInstaller } from '../storage/managed_index';
import { createRuleEventsReader, type IRuleEventsReader } from '../strategies/rule_events_reader';

/** Saved-object find cap; the catalog is read in one page. */
const MAX_LISTED_SOURCES = 10_000;

/** Plugin config with durations as milliseconds. */
export interface EngineLimits {
  timeBudgetMs: number;
  leaseDurationMs: number;
  maxBucketsPerRun: number;
  maxCatchUpMs: number;
  maxRuleEventRows: number;
  maxDetectionsPerRun: number;
  maxPendingDetections: number;
  agentTimeoutMs: number;
  reconcileIntervalMs: number;
}

export function toEngineLimits(config: DetectionEngineConfig): EngineLimits {
  return {
    timeBudgetMs: config.run.timeBudget.asMilliseconds(),
    leaseDurationMs: Math.max(
      config.run.leaseDuration.asMilliseconds(),
      config.run.timeBudget.asMilliseconds() + 60_000
    ),
    maxBucketsPerRun: config.run.maxBucketsPerRun,
    maxCatchUpMs: config.run.maxCatchUp.asMilliseconds(),
    maxRuleEventRows: config.run.maxRuleEventRows,
    maxDetectionsPerRun: config.run.maxDetectionsPerRun,
    maxPendingDetections: config.run.maxPendingDetections,
    agentTimeoutMs: config.agent.timeout.asMilliseconds(),
    reconcileIntervalMs: config.rules.reconcileInterval.asMilliseconds(),
  };
}

/**
 * Everything engine code needs for one request, scoped to its user and space. Reads of the
 * customer's data and writes of rules run as the user; the engine's own storage runs as the
 * Kibana system user behind the routes' privilege checks.
 */
export interface IEngineScope {
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
  limits: EngineLimits;
  storage: IEngineStorage;
  /** Customer data, as the user, across CPS-linked projects. */
  dataEsClient: ElasticsearchClient;
  /** Alert indices and other local reads, as the user. */
  userEsClient: ElasticsearchClient;
  ruleEvents: IRuleEventsReader;
  cpsEnabled: boolean;
  sourcesClient: SourcesClient;
  /** Enabled sources of the space. */
  listSources(): Promise<NightshiftSource[]>;
  getKnowledgeIndicatorClient(source?: NightshiftSource): Promise<KnowledgeIndicatorClient>;
  getRuleEventsClient(): Promise<RuleEventsClient>;
  getRulesClient(): Promise<RulesClientApi>;
  inferenceClient: InferenceClient;
  getPrices(): Promise<PriceResult | null>;
  agentBuilderAvailable: boolean;
  /** The agent the settings ask for; the heuristic when Agent Builder is not available. */
  createAgent(config: EngineConfig): IDiscoveryAgent;
}

/** What the plugin builds once, at start, to create scopes from. */
export interface EngineScopeFactoryDeps {
  core: CoreStart;
  plugins: DetectionEngineStartDependencies;
  logger: Logger;
  limits: EngineLimits;
  installer: IManagedIndexInstaller;
  agentInstaller?: IDiscoveryAgentInstaller;
}

export type CreateEngineScope = (request: KibanaRequest) => Promise<IEngineScope>;

/** Creates the scope factory; every route and the scheduler's run share it. */
export function createEngineScopeFactory({
  core,
  plugins,
  logger,
  limits,
  installer,
  agentInstaller,
}: EngineScopeFactoryDeps): CreateEngineScope {
  const internalEsClient = core.elasticsearch.client.asInternalUser;

  return async (request) => {
    const significantEvents = await plugins.significantEvents.getScopedServices({ request });
    await significantEvents.assertAccess();
    const spaceId = significantEvents.spaceId;
    const sourcesClient = await plugins.nightshiftSources.getSourcesClient({ request });
    const { agentBuilder } = plugins;

    return {
      spaceId,
      request,
      logger: logger.get(spaceId),
      limits,
      storage: createEngineStorage({
        internalEsClient,
        dataStreams: core.dataStreams,
        installer,
        spaceId,
      }),
      dataEsClient: significantEvents.dataEsClient,
      userEsClient: core.elasticsearch.client.asScoped(request).asCurrentUser,
      ruleEvents: createRuleEventsReader({ esClient: internalEsClient, spaceId }),
      cpsEnabled: significantEvents.cpsEnabled,
      sourcesClient,
      async listSources() {
        const { sources, total } = await sourcesClient.list({
          page: 1,
          perPage: MAX_LISTED_SOURCES,
          enabled: true,
        });
        if (total > sources.length) {
          throw new DetectionEngineError(
            `The space has ${total} sources, more than the ${MAX_LISTED_SOURCES} the engine reads`,
            500
          );
        }
        return sources;
      },
      getKnowledgeIndicatorClient: (source) =>
        significantEvents.getKnowledgeIndicatorClient(source),
      getRuleEventsClient: () => significantEvents.getRuleEventsClient(),
      getRulesClient: () =>
        plugins.alertingVTwo.getRulesClientWithRequestInSpace(request, request.spaceId),
      inferenceClient: plugins.inference.getClient({ request }),
      getPrices: () => plugins.significantEvents.getPrices(),
      agentBuilderAvailable: agentBuilder !== undefined && agentInstaller !== undefined,
      createAgent(config) {
        if (config.agent.kind === 'agent_builder' && agentBuilder && agentInstaller) {
          return createAgentBuilderAgent({
            agentBuilder,
            installer: agentInstaller,
            request,
            spaceId,
            connectorId: config.agent.connector_id,
            timeoutMs: limits.agentTimeoutMs,
          });
        }
        return createHeuristicAgent();
      },
    };
  };
}
