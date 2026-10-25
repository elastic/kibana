/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkStats } from '@elastic/elasticsearch/lib/helpers';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { RiskWriterProfile } from './maintainer/utils/risk_writer_profile';
import { EntityType } from '../../../../common/search_strategy';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';

interface WriterBulkResponse {
  errors: string[];
  docs_written: number;
  took: number;
}

interface BulkParams {
  profile?: RiskWriterProfile;
  host?: EntityRiskScoreRecord[];
  user?: EntityRiskScoreRecord[];
  service?: EntityRiskScoreRecord[];
  refresh?: 'wait_for';
}

export interface RiskEngineDataWriter {
  bulk: (params: BulkParams) => Promise<WriterBulkResponse>;
}

export interface RiskScoreStreamOptions {
  flushBytes: number;
  flushInterval: number;
  concurrency: number;
}

interface RiskEngineDataWriterOptions {
  esClient: ElasticsearchClient;
  index: string;
  namespace: string;
  logger: Logger;
}

export class RiskEngineDataWriter implements RiskEngineDataWriter {
  constructor(private readonly options: RiskEngineDataWriterOptions) {}

  public bulk = async (params: BulkParams) => {
    try {
      if (!params.host?.length && !params.user?.length && !params.service?.length) {
        return { errors: [], docs_written: 0, took: 0 };
      }

      const operations = this.buildBulkOperations(params);
      params.profile?.recordDocuments('consumed', operations.length / 2);
      const { errors, items, took } = await this.options.esClient.bulk(
        { operations, refresh: params.refresh ?? false },
        params.profile ? { context: params.profile.context } : undefined
      );

      return {
        errors: errors
          ? items
              .map((item) => item.create?.error?.reason)
              .filter((error): error is string => !!error)
          : [],
        docs_written: items.filter(
          (item) => item.create?.status === 201 || item.create?.status === 200
        ).length,
        took,
      };
    } catch (e) {
      this.options.logger.error(`Error writing risk scores: ${e.message}`);
      return {
        errors: [`${e.message}`],
        docs_written: 0,
        took: 0,
      };
    }
  };

  public stream = ({
    scores,
    profile,
    entityType,
    refresh,
    ...options
  }: RiskScoreStreamOptions & {
    scores: AsyncGenerator<EntityRiskScoreRecord>;
    profile?: RiskWriterProfile;
    entityType: EntityType;
    refresh?: 'wait_for';
  }): Promise<BulkStats> => {
    let dropped = 0;
    return this.options.esClient.helpers.bulk(
      {
        ...options,
        datasource: scores,
        refresh: refresh ?? false,
        onDocument: (score) => [
          { create: { _index: this.options.index } },
          this.scoreToEcs(score, entityType),
        ],
        onDrop: ({ status, error }) => {
          dropped += 1;
          if (dropped <= 5) {
            this.options.logger.warn(
              `Risk score stream dropped a document: ${status} ${error?.reason}`
            );
          }
        },
      },
      profile ? { context: profile.context } : undefined
    );
  };

  private buildBulkOperations = (params: BulkParams): BulkOperationContainer[] => {
    const hostBody =
      params.host?.flatMap((score) => [
        { create: { _index: this.options.index } },
        this.scoreToEcs(score, EntityType.host),
      ]) ?? [];

    const userBody =
      params.user?.flatMap((score) => [
        { create: { _index: this.options.index } },
        this.scoreToEcs(score, EntityType.user),
      ]) ?? [];

    const serviceBody =
      params.service?.flatMap((score) => [
        { create: { _index: this.options.index } },
        this.scoreToEcs(score, EntityType.service),
      ]) ?? [];
    // TODO get enabled entity types and loop through them to build the array
    return [...hostBody, ...userBody, ...serviceBody] as BulkOperationContainer[];
  };

  private scoreToEcs = (score: EntityRiskScoreRecord, identifierType: EntityType): unknown => {
    const { '@timestamp': _, ...rest } = score;
    return {
      '@timestamp': score['@timestamp'],
      [identifierType]: {
        name: score.id_value,
        risk: {
          ...rest,
        },
      },
    };
  };
}
