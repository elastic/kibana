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
import { getLatestEntitiesIndexName } from './assets/latest_index';
import { getUpdatesEntitiesDataStreamName } from './assets/updates_data_stream';
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import { ingestEntities } from '../infra/elasticsearch/ingest';
import {
  getAlertsIndexName,
  getSecuritySolutionDataViewName,
} from './assets/external_indices_contants';

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
    this.logger.debug('starting entity extraction');

    try {
      const entityDefinition = getEntityDefinition(type, this.namespace);

      const maxPageSearchSize = 10000; // TODO: get from config in the saved object
      const indexPatterns = await this.getIndexPatterns(type);
      const latestIndex = getLatestEntitiesIndexName(type, this.namespace);

      // TODO: Fetch the default lookback window from the entity store saved object configuration
      // instead of using a hard-coded 5-minute lookback. This temporary default ensures that, when
      // no explicit from/to dates are provided, we still retrieve recent data for entity extraction.
      const fromDateISO = opts?.fromDateISO || moment().utc().subtract(5, 'minute').toISOString();
      const toDateISO = opts?.toDateISO || moment().utc().toISOString();

      const query = buildLogsExtractionEsqlQuery({
        indexPatterns,
        latestIndex,
        entityDefinition,
        maxPageSearchSize,
        fromDateISO,
        toDateISO,
      });

      this.logger.debug(`Running query to extract logs from ${fromDateISO} to ${toDateISO}`);
      const esqlResponse = await executeEsqlQuery({ esClient: this.esClient, query });

      this.logger.debug(`Found ${esqlResponse.values.length}, ingesting them`);
      await ingestEntities({
        esClient: this.esClient,
        esqlResponse,
        esIdField: HASHED_ID,
        targetIndex: latestIndex,
        logger: this.logger,
      });

      return {
        success: true,
        count: esqlResponse.values.length,
        scannedIndices: indexPatterns,
      };
    } catch (error) {
      // TODO: store error on saved object
      this.logger.error(error);
      return { success: false, error };
    }
  }

  // TODO: We need to include index patterns provided manually by the customer
  private async getIndexPatterns(type: EntityType) {
    const updatesDataStream = getUpdatesEntitiesDataStreamName(type, this.namespace);
    const indexPatterns: string[] = [updatesDataStream];

    try {
      const secSolDataView = await this.dataViewsService.get(
        getSecuritySolutionDataViewName(this.namespace)
      );

      const alertsIndex = getAlertsIndexName(this.namespace);
      const cleanIndices = secSolDataView
        .getIndexPattern()
        .split(',')
        .filter((index) => index !== alertsIndex);
      indexPatterns.push(...cleanIndices);
    } catch (error) {
      this.logger.warn(
        'Problems finding security solution data view indices, defaulting to logs-*'
      );
      this.logger.warn(error);
      indexPatterns.push('logs-*');
    }

    return indexPatterns;
  }
}
