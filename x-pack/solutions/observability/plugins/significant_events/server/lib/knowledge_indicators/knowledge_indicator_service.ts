/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  type SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import type { SignificantEventsPluginStartDependencies } from '../../types';
import { isSignificantEventsFeatureFlagEnabled } from '../feature_flags/is_significant_events_feature_flag_enabled';
import {
  knowledgeIndicatorsDataStream,
  type StoredKnowledgeIndicator,
  type knowledgeIndicatorsMappings,
} from './data_stream';
import { IndicatorReader } from './knowledge_indicator_client/indicator_reader';
import { RevisionReader } from './knowledge_indicator_client/revision_reader';
import {
  KnowledgeIndicatorClient,
  type KnowledgeIndicatorClientDeps,
  type KnowledgeIndicatorDataStreamClient,
} from './knowledge_indicator_client';
import { ruleIdsFromQueryLinks } from './rule_ids_from_query_links';
import type { SignificantEventsAlertingContext } from '../significant_events/alerting/significant_events_alerting_context';

export class KnowledgeIndicatorService {
  constructor(
    private readonly coreSetup: CoreSetup<SignificantEventsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClient({
    esClient,
    soClient,
    space,
    context,
    withSourceWrite,
    config = DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  }: {
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
    space: string;
    context: SignificantEventsAlertingContext;
    withSourceWrite?: KnowledgeIndicatorClientDeps['withSourceWrite'];
    config?: Pick<
      SignificantEventsTuningConfig,
      'semantic_min_score' | 'rrf_rank_constant' | 'feature_ttl_days'
    >;
  }): Promise<KnowledgeIndicatorClient> {
    const [coreStart] = await this.coreSetup.getStartServices();
    const significantEventsAvailable = await isSignificantEventsFeatureFlagEnabled(
      coreStart.featureFlags
    );

    const dataStreamClient: KnowledgeIndicatorDataStreamClient =
      await coreStart.dataStreams.initializeClient<
        typeof knowledgeIndicatorsMappings,
        StoredKnowledgeIndicator & Record<string, unknown>
      >(knowledgeIndicatorsDataStream.name);

    return new KnowledgeIndicatorClient(
      {
        dataStreamClient,
        esClient,
        soClient,
        logger: this.logger.get('knowledge_indicators'),
        space,
        withSourceWrite,
      },
      significantEventsAvailable,
      context,
      config
    );
  }

  /** Rule ids of a space's queries backed by an alerting rule, read without a rules client. */
  async listRuleBackedRuleIds({
    esClient,
    space,
  }: {
    esClient: ElasticsearchClient;
    space: string;
  }): Promise<string[]> {
    const links = await new IndicatorReader(
      new RevisionReader(esClient, this.logger.get('knowledge_indicators'), space)
    ).getRuleBackedQueryLinks();
    return ruleIdsFromQueryLinks(links);
  }
}
