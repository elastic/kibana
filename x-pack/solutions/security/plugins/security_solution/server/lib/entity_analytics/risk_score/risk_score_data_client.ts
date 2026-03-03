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
}
