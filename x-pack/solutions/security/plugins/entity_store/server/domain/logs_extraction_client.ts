/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import moment from 'moment';
import { SavedObjectsErrorHelpers, type ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
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
import type { EngineDescriptorClient, LogExtractionState } from './definitions/saved_objects';
import { ENGINE_STATUS } from './constants';
import { parseDurationToMs } from '../infra/time';

interface LogsExtractionOptions {
  specificWindow?: {
    fromDateISO: string;
    toDateISO: string;
  };
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
    private dataViewsService: DataViewsService,
    private engineDescriptorClient: EngineDescriptorClient
  ) {}

  public async extractLogs(
    type: EntityType,
    opts?: LogsExtractionOptions
  ): Promise<ExtractedLogsSummary> {
    this.logger.debug('starting entity extraction');

    try {
      const engineDescriptor = await this.engineDescriptorClient.findOrThrow(type);

      if (engineDescriptor.status !== ENGINE_STATUS.STARTED) {
        return { success: false, error: new Error(`Entity store is not started for type ${type}`) };
      }

      const entityDefinition = getEntityDefinition(type, this.namespace);

      const maxPageSearchSize = engineDescriptor.logExtractionState.docsLimit;
      const indexPatterns = await this.getIndexPatterns(
        type,
        engineDescriptor.logExtractionState.additionalIndexPattern
      );
      const latestIndex = getLatestEntitiesIndexName(type, this.namespace);

      const { fromDateISO, toDateISO } = this.getExtractionWindow(
        engineDescriptor.logExtractionState,
        opts
      );

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

      const operationResult = {
        success: true,
        count: esqlResponse.values.length,
        scannedIndices: indexPatterns,
      };

      // With specific window, we don't need to update the pagination timestamp
      if (opts?.specificWindow) {
        return operationResult;
      }

      const paginationTimestamp = this.extractLastSeenTimestamp(esqlResponse);

      await this.engineDescriptorClient.update(type, {
        logExtractionState: {
          ...engineDescriptor.logExtractionState,
          paginationTimestamp,
          lastExecutionTimestamp: moment().utc().toISOString(),
        },
      });

      return operationResult;
    } catch (error) {
      return this.handleError(error, type);
    }
  }

  private extractLastSeenTimestamp(esqlResponse: ESQLSearchResponse): string {
    if (esqlResponse.values.length === 0) {
      // if no logs are found, we use the current time as the last seen timestamp
      return moment().utc().toISOString();
    }

    const timestampIndex = esqlResponse.columns.findIndex((column) => column.name === '@timestamp');
    if (timestampIndex === -1) {
      throw new Error('@timestamp column not found in esql response, internal logic error');
    }

    return esqlResponse.values[esqlResponse.values.length - 1][timestampIndex] as string;
  }

  private getExtractionWindow(
    logExtractionState: LogExtractionState,
    opts?: LogsExtractionOptions
  ): { fromDateISO: string; toDateISO: string } {
    if (opts?.specificWindow) {
      return opts.specificWindow;
    }

    const delayMs = parseDurationToMs(logExtractionState.delay);

    const fromDateISO =
      logExtractionState.paginationTimestamp ||
      logExtractionState.lastExecutionTimestamp ||
      this.getFromDate(logExtractionState);

    const toDateISO = moment().utc().subtract(delayMs, 'millisecond').toISOString();

    return { fromDateISO, toDateISO };
  }

  private getFromDate(logExtractionState: LogExtractionState): string {
    const lookbackPeriodMs = parseDurationToMs(logExtractionState.lookbackPeriod);
    return moment().utc().subtract(lookbackPeriodMs, 'millisecond').toISOString();
  }

  private handleError(error: any, type: EntityType): ExtractedLogsSummary {
    this.logger.error(error);

    if (SavedObjectsErrorHelpers.isSavedObjectsClientError(error)) {
      if (error.message.includes('Entity store is not started for type')) {
        return { success: false, error: new Error(`Entity store is not started for type ${type}`) };
      }
    }

    this.engineDescriptorClient.update(type, {
      error: { message: error.message, action: 'extractLogs' },
    });
    return { success: false, error };
  }

  private async getIndexPatterns(type: EntityType, additionalIndexPatterns: string) {
    const updatesDataStream = getUpdatesEntitiesDataStreamName(type, this.namespace);
    const cleanAdditionalIndicesPatterns = additionalIndexPatterns
      .split(',')
      .filter((index) => index !== '');
    const indexPatterns: string[] = [updatesDataStream, ...cleanAdditionalIndicesPatterns];

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
