/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { EntityType } from '../../../../common/search_strategy';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';

interface WriterBulkResponse {
  errors: string[];
  docs_written: number;
  took: number;
}

interface BulkParams {
  host?: EntityRiskScoreRecord[];
  user?: EntityRiskScoreRecord[];
  service?: EntityRiskScoreRecord[];
  ai_agent?: EntityRiskScoreRecord[];
  refresh?: 'wait_for';
}

const WRITTEN_ENTITY_TYPES = [
  EntityType.host,
  EntityType.user,
  EntityType.service,
  EntityType.ai_agent,
] as const;

export interface RiskEngineDataWriter {
  bulk: (params: BulkParams) => Promise<WriterBulkResponse>;
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
      if (!WRITTEN_ENTITY_TYPES.some((entityType) => params[entityType]?.length)) {
        return { errors: [], docs_written: 0, took: 0 };
      }

      const { errors, items, took } = await this.options.esClient.bulk({
        operations: this.buildBulkOperations(params),
        refresh: params.refresh ?? false,
      });

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

  private buildBulkOperations = (params: BulkParams): BulkOperationContainer[] =>
    WRITTEN_ENTITY_TYPES.flatMap(
      (entityType) =>
        params[entityType]?.flatMap((score) => [
          { create: { _index: this.options.index } },
          this.scoreToEcs(score, entityType),
        ]) ?? []
    ) as BulkOperationContainer[];

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
