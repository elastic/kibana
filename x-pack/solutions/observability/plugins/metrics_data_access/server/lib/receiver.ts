/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, LogMeta, Logger } from '@kbn/core/server';
import type {
  IlmExplainLifecycleRequest,
  IlmGetLifecycleRequest,
  IndicesGetDataStreamRequest,
  IndicesGetRequest,
  IndicesStatsRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  DataStream,
  IlmPhase,
  IlmPhases,
  IlmPolicy,
  IlmStats,
  Index,
  IndexStats,
} from './indices_metadata_service.types';
import { Chunked } from './utils';

export interface ITelemetryReceiver {
  start(esClient: ElasticsearchClient): Promise<void>;

  getIndices(): Promise<string[]>;
  getDataStreams(): Promise<DataStream[]>;
  getIndicesStats(indices: string[]): AsyncGenerator<IndexStats, void, unknown>;
  getIlmsStats(indices: string[]): AsyncGenerator<IlmStats, void, unknown>;
  isIlmStatsAvailable(): Promise<boolean>;
  getIlmsPolicies(ilms: string[]): AsyncGenerator<IlmPolicy, void, unknown>;
}

export class TelemetryReceiver implements ITelemetryReceiver {
  private readonly logger: Logger;
  private _esClient?: ElasticsearchClient;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public async start(esClient: ElasticsearchClient) {
    this.logger.info('Starting telemetry receiver');
    this._esClient = esClient;
  }

  public async getIndices(): Promise<string[]> {
    const es = this.esClient();

    this.logger.info('Fetching indices');

    const request: IndicesGetRequest = {
      index: '*',
      expand_wildcards: ['open', 'hidden'],
      filter_path: ['*.settings.index.provided_name'],
    };

    return es.indices
      .get(request)
      .then((indices) => Array.from(Object.keys(indices)))
      .catch((error) => {
        this.logger.warn('Error fetching indices', { error_message: error } as LogMeta);
        throw error;
      });
  }

  public async getDataStreams(): Promise<DataStream[]> {
    const es = this.esClient();

    this.logger.info('Fetching datstreams');

    const request: IndicesGetDataStreamRequest = {
      name: '*',
      expand_wildcards: ['open', 'hidden'],
      filter_path: ['data_streams.name', 'data_streams.indices'],
    };

    return es.indices
      .getDataStream(request)
      .then((response) =>
        response.data_streams.map((ds) => {
          return {
            datastream_name: ds.name,
            indices:
              ds.indices?.map((index) => {
                return {
                  index_name: index.index_name,
                  ilm_policy: index.ilm_policy,
                } as Index;
              }) ?? [],
          } as DataStream;
        })
      )
      .catch((error) => {
        this.logger.warn('Error fetching datastreams', { error_message: error } as LogMeta);
        throw error;
      });
  }

  public async *getIndicesStats(indices: string[]) {
    const es = this.esClient();

    this.logger.info('Fetching indices stats');

    const groupedIndices = this.chunkStringsByMaxLength(indices);

    this.logger.info('Splitted indices into groups', {
      groups: groupedIndices.length,
      indices: indices.length,
    } as LogMeta);

    for (const group of groupedIndices) {
      const request: IndicesStatsRequest = {
        index: group,
        level: 'indices',
        metric: ['docs', 'search', 'store'],
        expand_wildcards: ['open', 'hidden'],
        filter_path: [
          'indices.*.total.search.query_total',
          'indices.*.total.search.query_time_in_millis',
          'indices.*.total.docs.count',
          'indices.*.total.docs.deleted',
          'indices.*.total.store.size_in_bytes',
        ],
      };

      try {
        const response = await es.indices.stats(request);
        for (const [indexName, stats] of Object.entries(response.indices ?? {})) {
          yield {
            index_name: indexName,
            query_total: stats.total?.search?.query_total,
            query_time_in_millis: stats.total?.search?.query_time_in_millis,
            docs_count: stats.total?.docs?.count,
            docs_deleted: stats.total?.docs?.deleted,
            docs_total_size_in_bytes: stats.total?.store?.size_in_bytes,
          } as IndexStats;
        }
      } catch (error) {
        this.logger.warn('Error fetching indices stats', { error_message: error } as LogMeta);
        throw error;
      }
    }
  }

  public async isIlmStatsAvailable() {
    const es = this.esClient();
    const request: IlmExplainLifecycleRequest = {
      index: '-invalid-index',
      only_managed: false,
      filter_path: ['indices.*.phase', 'indices.*.age', 'indices.*.policy'],
    };

    const result = await es.ilm
      .explainLifecycle(request)
      .then(() => {
        return true;
      })
      .catch((error) => {
        return error?.meta?.statusCode === 404 ?? false;
      });

    return result;
  }

  public async *getIlmsStats(indices: string[]) {
    const es = this.esClient();

    const groupedIndices = this.chunkStringsByMaxLength(indices);

    this.logger.info('Splitted ilms into groups', {
      groups: groupedIndices.length,
      indices: indices.length,
    } as LogMeta);

    for (const group of groupedIndices) {
      const request: IlmExplainLifecycleRequest = {
        index: group.join(','),
        only_managed: false,
        filter_path: ['indices.*.phase', 'indices.*.age', 'indices.*.policy'],
      };

      const data = await es.ilm.explainLifecycle(request);

      try {
        for (const [indexName, stats] of Object.entries(data.indices ?? {})) {
          const entry = {
            index_name: indexName,
            phase: ('phase' in stats && stats.phase) || undefined,
            age: ('age' in stats && stats.age) || undefined,
            policy_name: ('policy' in stats && stats.policy) || undefined,
          } as IlmStats;

          yield entry;
        }
      } catch (error) {
        this.logger.warn('Error fetching ilm stats', { error_message: error } as LogMeta);
        throw error;
      }
    }
  }

  public async *getIlmsPolicies(ilms: string[]) {
    const es = this.esClient();

    const phase = (obj: unknown): IlmPhase | null | undefined => {
      let value: IlmPhase | null | undefined;
      if (obj !== null && obj !== undefined && typeof obj === 'object' && 'min_age' in obj) {
        value = {
          min_age: obj.min_age,
        } as IlmPhase;
      }
      return value;
    };

    const groupedIlms = this.chunkStringsByMaxLength(ilms);

    this.logger.info('Splitted ilms into groups', {
      groups: groupedIlms.length,
      ilms: ilms.length,
    } as LogMeta);

    for (const group of groupedIlms) {
      this.logger.info('Fetching ilm policies');
      const request: IlmGetLifecycleRequest = {
        name: group.join(','),
        filter_path: [
          '*.policy.phases.cold.min_age',
          '*.policy.phases.delete.min_age',
          '*.policy.phases.frozen.min_age',
          '*.policy.phases.hot.min_age',
          '*.policy.phases.warm.min_age',
          '*.modified_date',
        ],
      };

      const response = await es.ilm.getLifecycle(request);
      try {
        for (const [policyName, stats] of Object.entries(response ?? {})) {
          yield {
            policy_name: policyName,
            modified_date: stats.modified_date,
            phases: {
              cold: phase(stats.policy.phases.cold),
              delete: phase(stats.policy.phases.delete),
              frozen: phase(stats.policy.phases.frozen),
              hot: phase(stats.policy.phases.hot),
              warm: phase(stats.policy.phases.warm),
            } as IlmPhases,
          } as IlmPolicy;
        }
      } catch (error) {
        this.logger.warn('Error fetching ilm policies', {
          error_message: error.message,
        } as LogMeta);
        throw error;
      }
    }
  }

  private esClient(): ElasticsearchClient {
    if (this._esClient === undefined || this._esClient === null) {
      throw Error('elasticsearch client is unavailable');
    }
    return this._esClient;
  }

  private chunkStringsByMaxLength(strings: string[], maxLength: number = 3072): string[][] {
    // plus 1 for the comma separator
    return this.chunkedBy(strings, maxLength, (index) => index.length + 1);
  }

  private chunkedBy<T>(list: T[], size: number, weight: (v: T) => number): T[][] {
    function chunk(acc: Chunked<T>, value: T): Chunked<T> {
      const currentWeight = weight(value);
      if (acc.weight + currentWeight <= size) {
        acc.current.push(value);
        acc.weight += currentWeight;
      } else {
        acc.chunks.push(acc.current);
        acc.current = [value];
        acc.weight = currentWeight;
      }
      return acc;
    }

    return list.reduce(chunk, new Chunked<T>()).flush();
  }
}
