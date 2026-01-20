/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { EntityType } from './definitions/entity_schema';
import { getEntityDefinition } from './definitions/registry';
import {
  buildLogsExtractionEsqlQuery,
  HASHED_ID,
} from './logs_extraction/logs_extraction_query_builder';
import { getLatestEntitiesIndexName, getResetEntitiesIndexName } from './assets/latest_index';
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import { ingestEntities } from '../infra/elasticsearch/ingest';
import { alertsIndexName, securitySolutionDataViewName } from './assets/external_indices_contants';

interface LogsExtractionOptions {
  fromDateISO?: string;
  toDateISO?: string;
}

interface ExtractedLogsSummary {
  success: boolean;
  count?: number;
  scannedIndices?: string[];
  error?: Error;
}

export class LogsExtractionClient {
  constructor(
    private logger: Logger,
    private namespace: string,
    private esClient: ElasticsearchClient,
    private dataViewsService: DataViewsService
  ) {}

  public async extractLogs(
    type: EntityType,
    opts?: LogsExtractionOptions
  ): Promise<ExtractedLogsSummary> {
    const logger = this.logger.get('logsExtraction').get(type);
    logger.debug('starting entity extraction');

    try {
      const entityDefinition = getEntityDefinition({ type });

      const maxPageSearchSize = 10000; // get from config in the saved object
      const indexPatterns = await this.getIndexPatterns(type, logger);
      const latestIndex = getLatestEntitiesIndexName(type, this.namespace);

      // Needs to be fetched from the saved object
      const fromDateISO = opts?.fromDateISO || moment().utc().subtract(1, 'minute').toISOString();
      const toDateISO = opts?.toDateISO || moment().utc().toISOString();

      const query = buildLogsExtractionEsqlQuery({
        indexPatterns,
        latestIndex,
        entityDefinition,
        maxPageSearchSize,
        fromDateISO,
        toDateISO,
      });

      logger.debug(`Running query to extract logs from ${fromDateISO} to ${toDateISO}`);
      const esqlResponse = await executeEsqlQuery({ esClient: this.esClient, query });

      logger.debug(`Found ${esqlResponse.values.length}, ingesting them`);
      await ingestEntities({
        esClient: this.esClient,
        esqlResponse,
        esIdField: HASHED_ID,
        targetIndex: latestIndex,
        logger,
      });
      return {
        success: true,
        count: esqlResponse.values.length,
        scannedIndices: indexPatterns,
      };
    } catch (error) {
      // store error on saved object
      logger.error(error);
      return { success: false, error };
    }
  }

  // We need to include index patterns provided manually by the customer
  private async getIndexPatterns(type: EntityType, logger: Logger) {
    const resetIndex = getResetEntitiesIndexName(type, this.namespace);
    const alertsIndex = alertsIndexName(this.namespace);
    const secSolIndices = [];

    try {
      const secSolDataView = await this.dataViewsService.get(
        securitySolutionDataViewName(this.namespace)
      );
      secSolIndices.push(...secSolDataView.getIndexPattern().split(','));
    } catch (error) {
      logger.error('Problems find security solution data view indices, defaulting to logs-*');
      logger.error(error);
      secSolIndices.push('logs-*');
    }

    const indexPatterns = [...secSolIndices, alertsIndex, resetIndex];
    return indexPatterns;
  }
}
