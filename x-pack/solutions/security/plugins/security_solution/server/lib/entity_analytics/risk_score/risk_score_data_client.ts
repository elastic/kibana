/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  MappingDynamicMapping,
  Metadata,
  AggregationsAggregationContainer,
  AggregationsCompositeAggregateKey,
} from '@elastic/elasticsearch/lib/api/types';
import {
  createOrUpdateComponentTemplate,
  createOrUpdateIndexTemplate,
} from '@kbn/alerting-plugin/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import type { AuditLogger } from '@kbn/security-plugin-types-server';
import {
  getIndexPatternDataStream,
  getTransformOptions,
  mappingComponentName,
  nameSpaceAwareMappingsComponentName,
  riskScoreFieldMap,
  totalFieldsLimit,
} from './configurations';
import { createDataStream, rolloverDataStream } from '../utils/create_datastream';
import type { RiskEngineDataWriter as Writer } from './risk_engine_data_writer';
import { RiskEngineDataWriter } from './risk_engine_data_writer';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../common/entity_analytics/risk_engine';
import type {
  GetRiskScoreSpikesResponse,
  SpikeEntity,
} from '../../../../common/api/entity_analytics';
import {
  createTransform,
  deleteTransform,
  stopTransform,
  getLatestTransformId,
} from '../utils/transforms';
import { getRiskInputsIndex } from './get_risk_inputs_index';

import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { retryTransientEsErrors } from '../utils/retry_transient_es_errors';
import { RiskScoreAuditActions } from './audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../audit';
import {
  createEventIngestedPipeline,
  getIngestPipelineName,
} from '../utils/event_ingested_pipeline';

interface RiskScoringDataClientOpts {
  logger: Logger;
  kibanaVersion: string;
  esClient: ElasticsearchClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  auditLogger?: AuditLogger | undefined;
}

interface ServiceBucketKey {
  'service.name': string;
}

interface HostBucketKey {
  'host.name': string;
}

interface UserBucketKey {
  'user.name': string;
}
interface SpikeAggResult {
  after_key: AggregationsCompositeAggregateKey;
  buckets: Array<{
    key: ServiceBucketKey | HostBucketKey | UserBucketKey;
    baseline_score: { baseline: { value: number | null } };
    recent_score: { recent: { value: number } };
    score_spike?: {
      value: number;
    };
  }>;
}

export class RiskScoreDataClient {
  private writerCache: Map<string, Writer> = new Map();
  constructor(private readonly options: RiskScoringDataClientOpts) {}

  public async getWriter({ namespace }: { namespace: string }): Promise<Writer> {
    if (this.writerCache.get(namespace)) {
      return this.writerCache.get(namespace) as Writer;
    }
    const indexPatterns = getIndexPatternDataStream(namespace);
    await this.initializeWriter(namespace, indexPatterns.alias);
    return this.writerCache.get(namespace) as Writer;
  }

  private async initializeWriter(namespace: string, index: string): Promise<Writer> {
    const writer = new RiskEngineDataWriter({
      esClient: this.options.esClient,
      namespace,
      index,
      logger: this.options.logger,
    });

    this.writerCache.set(namespace, writer);
    return writer;
  }

  public refreshRiskScoreIndex = async () => {
    await this.options.esClient.indices.refresh({
      index: getRiskScoreTimeSeriesIndex(this.options.namespace),
    });
  };

  public getRiskInputsIndex = ({ dataViewId }: { dataViewId: string }) =>
    getRiskInputsIndex({
      dataViewId,
      logger: this.options.logger,
      soClient: this.options.soClient,
    });

  public createOrUpdateRiskScoreLatestIndex = async () => {
    await createOrUpdateIndex({
      esClient: this.options.esClient,
      logger: this.options.logger,
      options: {
        index: getRiskScoreLatestIndex(this.options.namespace),
        mappings: mappingFromFieldMap(riskScoreFieldMap, false),
        settings: {
          // set to null because it was previously set but we now want it to be removed
          'index.default_pipeline': null,
        },
      },
    });
  };

  public createOrUpdateRiskScoreComponentTemplate = async () =>
    createOrUpdateComponentTemplate({
      logger: this.options.logger,
      esClient: this.options.esClient,
      template: {
        name: nameSpaceAwareMappingsComponentName(this.options.namespace),
        _meta: {
          managed: true,
        },
        template: {
          settings: {},
          mappings: mappingFromFieldMap(riskScoreFieldMap, 'strict'),
        },
      } as ClusterPutComponentTemplateRequest,
      totalFieldsLimit,
    });

  public createOrUpdateRiskScoreIndexTemplate = async () => {
    const indexPatterns = getIndexPatternDataStream(this.options.namespace);
    const indexMetadata: Metadata = {
      kibana: {
        version: this.options.kibanaVersion,
      },
      managed: true,
      namespace: this.options.namespace,
    };

    return createOrUpdateIndexTemplate({
      logger: this.options.logger,
      esClient: this.options.esClient,
      template: {
        name: indexPatterns.template,
        data_stream: { hidden: true },
        index_patterns: [indexPatterns.alias],
        composed_of: [nameSpaceAwareMappingsComponentName(this.options.namespace)],
        template: {
          lifecycle: {},
          settings: {
            'index.mapping.total_fields.limit': totalFieldsLimit,
            'index.default_pipeline': getIngestPipelineName(this.options.namespace),
          },
          mappings: {
            dynamic: false,
            _meta: indexMetadata,
          },
        },
        _meta: indexMetadata,
      },
    });
  };

  public rolloverRiskScoreTimeSeriesIndex = async () =>
    rolloverDataStream({
      esClient: this.options.esClient,
      logger: this.options.logger,
      dataStreamName: getRiskScoreTimeSeriesIndex(this.options.namespace),
    });

  public async init() {
    const namespace = this.options.namespace;
    const esClient = this.options.esClient;

    try {
      await createEventIngestedPipeline(esClient, namespace);

      await this.createOrUpdateRiskScoreComponentTemplate();

      await this.createOrUpdateRiskScoreIndexTemplate();

      const indexPatterns = getIndexPatternDataStream(namespace);
      await createDataStream({
        logger: this.options.logger,
        esClient,
        totalFieldsLimit,
        indexPatterns,
      });

      await this.createOrUpdateRiskScoreLatestIndex();

      const transformId = getLatestTransformId(namespace);
      await createTransform({
        esClient,
        logger: this.options.logger,
        transform: {
          transform_id: transformId,
          ...getTransformOptions({
            dest: getRiskScoreLatestIndex(namespace),
            source: [indexPatterns.alias],
            namespace: this.options.namespace,
          }),
        },
      });

      this.options.auditLogger?.log({
        message: 'System installed risk engine Elasticsearch components',
        event: {
          action: RiskScoreAuditActions.RISK_ENGINE_INSTALL,
          category: AUDIT_CATEGORY.DATABASE,
          type: AUDIT_TYPE.CHANGE,
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });
    } catch (error) {
      this.options.logger.error(`Error initializing risk engine resources: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes all resources created by init().
   * It returns an array of errors that occurred during the deletion.
   *
   * WARNING: It will remove all data.
   */
  public async tearDown() {
    const namespace = this.options.namespace;
    const esClient = this.options.esClient;
    const indexPatterns = getIndexPatternDataStream(namespace);
    const errors: Error[] = [];
    const addError = (e: Error) => errors.push(e);

    await deleteTransform({
      esClient,
      logger: this.options.logger,
      transformId: getLatestTransformId(namespace),
      deleteData: true,
    }).catch(addError);

    await esClient.indices
      .deleteDataStream(
        {
          name: indexPatterns.alias,
        },
        { ignore: [404] }
      )
      .catch(addError);

    await esClient.indices
      .deleteIndexTemplate(
        {
          name: indexPatterns.template,
        },
        { ignore: [404] }
      )
      .catch(addError);

    await esClient.cluster
      .deleteComponentTemplate(
        {
          name: nameSpaceAwareMappingsComponentName(namespace),
        },
        { ignore: [404] }
      )
      .catch(addError);

    await esClient.cluster
      .deleteComponentTemplate(
        {
          name: mappingComponentName,
        },
        { ignore: [404] }
      )
      .catch(addError);

    return errors;
  }

  /**
   * Ensures that configuration migrations for risk score indices are seamlessly handled across Kibana upgrades.
   *
   * Upgrades:
   * - Migrating to 8.12+ requires a change to the risk score latest transform index's 'dynamic' setting to ensure that
   * unmapped fields are allowed within stored documents.
   *
   */
  public async upgradeIfNeeded() {
    const desiredDynamicValue = 'false';
    const currentDynamicValue = await this.getRiskScoreLatestIndexDynamicConfiguration();
    if (currentDynamicValue !== desiredDynamicValue) {
      await this.setRiskScoreLatestIndexDynamicConfiguration(desiredDynamicValue);
    }
  }

  private async getRiskScoreLatestIndexDynamicConfiguration(): Promise<string | undefined> {
    const riskScoreLatestIndexName = getRiskScoreLatestIndex(this.options.namespace);
    const riskScoreLatestIndexResponse = await retryTransientEsErrors(
      () => this.options.esClient.indices.get({ index: riskScoreLatestIndexName }),
      { logger: this.options.logger }
    );
    return riskScoreLatestIndexResponse[riskScoreLatestIndexName]?.mappings?.dynamic?.toString();
  }

  /**
   * Sets the risk score latest index's 'dynamic' mapping property to the desired value.
   * @throws Error if the index does not exist.
   */
  private async setRiskScoreLatestIndexDynamicConfiguration(dynamic: MappingDynamicMapping) {
    return retryTransientEsErrors(
      () =>
        this.options.esClient.indices.putMapping({
          index: getRiskScoreLatestIndex(this.options.namespace),
          dynamic,
        }),
      { logger: this.options.logger }
    );
  }

  public copyTimestampToEventIngestedForRiskScore = (abortSignal?: AbortSignal) => {
    return this.options.esClient.updateByQuery(
      {
        index: getRiskScoreLatestIndex(this.options.namespace),
        conflicts: 'proceed',
        ignore_unavailable: true,
        allow_no_indices: true,
        query: {
          bool: {
            must_not: {
              exists: {
                field: 'event.ingested',
              },
            },
          },
        },
        script: {
          source: 'ctx._source.event.ingested = ctx._source.@timestamp',
          lang: 'painless',
        },
      },
      {
        requestTimeout: '5m',
        retryOnTimeout: true,
        maxRetries: 2,
        signal: abortSignal,
      }
    );
  };

  public async reinstallTransform() {
    const esClient = this.options.esClient;
    const namespace = this.options.namespace;
    const transformId = getLatestTransformId(namespace);
    const indexPatterns = getIndexPatternDataStream(namespace);

    await stopTransform({ esClient, logger: this.options.logger, transformId });
    await deleteTransform({ esClient, logger: this.options.logger, transformId });
    await createTransform({
      esClient,
      logger: this.options.logger,
      transform: {
        transform_id: transformId,
        ...getTransformOptions({
          dest: getRiskScoreLatestIndex(namespace),
          source: [indexPatterns.alias],
          namespace: this.options.namespace,
        }),
      },
    });
  }
  private getRiskScoreField = (identifierField: string): string => {
    switch (identifierField) {
      case 'user.name':
        return 'user.risk.calculated_score_norm';
      case 'host.name':
        return 'host.risk.calculated_score_norm';
      case 'service.name':
        return 'service.risk.calculated_score_norm';
      default:
        throw new Error(`Unknown identifier field: ${identifierField}`);
    }
  };

  private buildRiskSpikeAggForIdentifier = (
    identifierField: string,
    afterKey?: AggregationsCompositeAggregateKey
  ): AggregationsAggregationContainer => {
    const scoreField = this.getRiskScoreField(identifierField);

    return {
      composite: {
        size: 1000,
        after: afterKey,
        sources: [
          {
            [identifierField]: {
              terms: {
                field: identifierField,
              },
            },
          },
        ],
      },
      aggs: {
        baseline_score: {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-24h',
                lt: 'now-6h',
              },
            },
          },
          aggs: {
            baseline: {
              avg: {
                field: scoreField,
              },
            },
          },
        },
        recent_score: {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-6h',
                lt: 'now',
              },
            },
          },
          aggs: {
            recent: {
              max: {
                field: scoreField,
              },
            },
          },
        },
        score_spike: {
          bucket_script: {
            buckets_path: {
              baseline: 'baseline_score>baseline',
              recent: 'recent_score>recent',
            },
            script: 'params.recent - params.baseline',
          },
        },
      },
    };
  };

  async getRiskScoreSpikes({
    countPerCategory = 25,
  }: {
    countPerCategory?: number;
  }): Promise<GetRiskScoreSpikesResponse> {
    const esClient = this.options.esClient;
    const namespace = this.options.namespace;

    let userAfterKey: AggregationsCompositeAggregateKey | undefined;
    let hostAfterKey: AggregationsCompositeAggregateKey | undefined;
    let serviceAfterKey: AggregationsCompositeAggregateKey | undefined;

    const SCORE_SPIKE_THRESHOLD = 30; // if a user has a score spike > 30, add to spikesAboveBaseline
    const HIGH_NEW_SCORE_THRESHOLD = 70; // if a user has a first score > 70, add to newScoreSpikes

    const newScoreSpikes: SpikeEntity[] = []; // top 25 spikes sorted by recent_score desc where score_spike doesn't exist AND recent_score > 70
    const spikesAboveBaseline: SpikeEntity[] = []; // top 25 spikes sorted by score_spike desc where score_spike > 30

    const processBuckets = (
      buckets: SpikeAggResult['buckets'],
      identifierField: 'user.name' | 'host.name' | 'service.name'
    ) => {
      buckets.forEach((bucket) => {
        const {
          key,
          baseline_score: baselineScore,
          recent_score: recentScore,
          score_spike: scoreSpike,
        } = bucket;
        const identifierValue = key[identifierField as keyof typeof key];

        if (
          baselineScore.baseline.value &&
          scoreSpike &&
          scoreSpike?.value > SCORE_SPIKE_THRESHOLD
        ) {
          spikesAboveBaseline.push({
            spike: scoreSpike.value,
            identifierKey: identifierField,
            identifier: identifierValue,
            baseline: baselineScore.baseline.value,
          });
        } else if (!scoreSpike && recentScore.recent.value > HIGH_NEW_SCORE_THRESHOLD) {
          newScoreSpikes.push({
            spike: recentScore.recent.value,
            identifierKey: identifierField,
            identifier: identifierValue,
            baseline: 0,
          });
        }
      });
    };

    do {
      const query = {
        index: getRiskScoreTimeSeriesIndex(namespace),
        size: 0,
        aggs: {
          users: this.buildRiskSpikeAggForIdentifier('user.name', userAfterKey),
          hosts: this.buildRiskSpikeAggForIdentifier('host.name', hostAfterKey),
          services: this.buildRiskSpikeAggForIdentifier('service.name', serviceAfterKey),
        },
      };

      // console.log(JSON.stringify(query));

      const response = await esClient.search(query);

      // console.log(JSON.stringify(response));

      const {
        users: { buckets: userBuckets, after_key: latestUserAfterKey },
        hosts: { buckets: hostBuckets, after_key: latestHostAfterKey },
        services: { buckets: serviceBuckets, after_key: latestServiceAfterKey },
      } = response.aggregations as unknown as {
        users: SpikeAggResult;
        hosts: SpikeAggResult;
        services: SpikeAggResult;
      };

      userAfterKey = latestUserAfterKey;
      hostAfterKey = latestHostAfterKey;
      serviceAfterKey = latestServiceAfterKey;

      processBuckets(userBuckets, 'user.name');
      processBuckets(hostBuckets, 'host.name');
      processBuckets(serviceBuckets, 'service.name');
    } while (userAfterKey || hostAfterKey || serviceAfterKey);

    // Sort the spikes by recent_score desc and trim to 25
    newScoreSpikes.sort((a, b) => b.spike - a.spike);
    newScoreSpikes.splice(countPerCategory);

    spikesAboveBaseline.sort((a, b) => b.spike - a.spike);
    spikesAboveBaseline.splice(countPerCategory);

    return {
      newScoreSpikes,
      spikesAboveBaseline,
    };
  }
}
