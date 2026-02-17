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
import type {
  EntityType,
  ManagedEntityDefinition,
} from '../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../common/domain/definitions/registry';
import {
  buildLogsExtractionEsqlQuery,
  HASHED_ID_FIELD,
} from './logs_extraction/logs_extraction_query_builder';
import { getLatestEntitiesIndexName } from './assets/latest_index';
import { getUpdatesEntitiesDataStreamName } from './assets/updates_data_stream';
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import { ingestEntities } from '../infra/elasticsearch/ingest';
import {
  getAlertsIndexName,
  getSecuritySolutionDataViewName,
} from './assets/external_indices_contants';
import type {
  EngineDescriptor,
  EngineDescriptorClient,
  LogExtractionState,
} from './definitions/saved_objects';
import { ENGINE_STATUS } from './constants';
import { parseDurationToMs } from '../infra/time';

interface LogsExtractionOptions {
  specificWindow?: {
    fromDateISO: string;
    toDateISO: string;
  };
  abortController?: AbortController;
  countOnly?: boolean;
}

interface ExtractedLogsSummarySuccess {
  success: true;
  count: number;
  scannedIndices: string[];
}

interface ExtractedLogsSummaryError {
  success: false;
  error: Error;
}

type ExtractedLogsSummary = ExtractedLogsSummarySuccess | ExtractedLogsSummaryError;

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
        return {
          success: false,
          error: new Error(
            `Entity store is not started for type ${type}, status: ${engineDescriptor.status}`
          ),
        };
      }

      const delayMs = parseDurationToMs(engineDescriptor.logExtractionState.delay);
      const entityDefinition = getEntityDefinition(type, this.namespace);
      const { esqlResponse, indexPatterns } = await this.runQueryAndIngestDocs({
        engineDescriptor,
        opts,
        delayMs,
        entityDefinition,
      });

      const operationResult = {
        success: true as const,
        count: esqlResponse.values.length,
        scannedIndices: indexPatterns,
      };

      if (opts?.specificWindow || opts?.countOnly) {
        return operationResult;
      }

      const paginationTimestamp = this.extractLastSeenTimestamp(esqlResponse, delayMs);
      await this.engineDescriptorClient.update(type, {
        logExtractionState: {
          ...engineDescriptor.logExtractionState,
          paginationTimestamp,
          lastExecutionTimestamp: moment().utc().toISOString(),
        },
      });

      return operationResult;
    } catch (error) {
      return await this.handleError(error, type);
    }
  }

  private async runQueryAndIngestDocs({
    engineDescriptor,
    opts,
    delayMs,
    entityDefinition,
  }: {
    engineDescriptor: EngineDescriptor;
    opts?: LogsExtractionOptions;
    delayMs: number;
    entityDefinition: ManagedEntityDefinition;
  }) {
    const { docsLimit } = engineDescriptor.logExtractionState;
    const indexPatterns = await this.getIndexPatterns(
      engineDescriptor.logExtractionState.additionalIndexPattern
    );
    const latestIndex = getLatestEntitiesIndexName(this.namespace);

    const { fromDateISO, toDateISO } =
      opts?.specificWindow ||
      this.getExtractionWindow(engineDescriptor.logExtractionState, delayMs);

    // This is a sanity check to ensure the extraction window is valid
    // Ideally we have this validation on the API only and we trust
    // that our internal logic is correct. For the time being, we validate it here
    // too, so we have a few runs and understand it.
    this.validateExtractionWindow(fromDateISO, toDateISO);

    const query = buildLogsExtractionEsqlQuery({
      indexPatterns,
      latestIndex,
      entityDefinition,
      docsLimit,
      fromDateISO,
      toDateISO,
    });

    this.logger.debug(`Running query to extract logs from ${fromDateISO} to ${toDateISO}`);
    const esqlResponse = await executeEsqlQuery({
      esClient: this.esClient,
      query,
      abortController: opts?.abortController,
    });

    if (!opts?.countOnly) {
      this.logger.debug(`Found ${esqlResponse.values.length}, ingesting them`);
      await ingestEntities({
        esClient: this.esClient,
        esqlResponse,
        esIdField: HASHED_ID_FIELD,
        targetIndex: latestIndex,
        logger: this.logger,
        abortController: opts?.abortController,
      });
    }

    return { esqlResponse, indexPatterns };
  }

  private validateExtractionWindow(fromDateISO: string, toDateISO: string) {
    if (moment(fromDateISO).isAfter(moment(toDateISO))) {
      throw new Error('From date is after to date');
    }
  }

  private extractLastSeenTimestamp(esqlResponse: ESQLSearchResponse, delayMs: number): string {
    if (esqlResponse.values.length === 0) {
      // if no logs are found, we use the current time as the last seenTimestamp
      return moment().utc().subtract(delayMs, 'millisecond').toISOString();
    }

    const timestampIndex = esqlResponse.columns.findIndex((column) => column.name === '@timestamp');
    if (timestampIndex === -1) {
      throw new Error('@timestamp column not found in esql response, internal logic error');
    }

    return esqlResponse.values[esqlResponse.values.length - 1][timestampIndex] as string;
  }

  // Window scenarios:
  // 1. Fresh entity store, no paginationTimestamp or lastExecutionTimestamp:
  //    fromDate = now - lookbackPeriod | toDate = now - delay
  // 2. PaginationTimestamp is present:
  //    fromDate = paginationTimestamp | toDate = now - delay
  // 3. LastExecutionTimestamp is present:
  //    fromDate = lastExecutionTimestamp | toDate = now - delay
  private getExtractionWindow(
    logExtractionState: LogExtractionState,
    delayMs: number
  ): { fromDateISO: string; toDateISO: string } {
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

  private async handleError(error: any, type: EntityType): Promise<ExtractedLogsSummary> {
    this.logger.error(error);

    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return { success: false, error: new Error(`Entity store is not started for type ${type}`) };
    }

    await this.engineDescriptorClient.update(type, {
      error: { message: error.message, action: 'extractLogs' },
    });
    return { success: false, error };
  }

  public async getIndexPatterns(additionalIndexPatterns = '') {
    const updatesDataStream = getUpdatesEntitiesDataStreamName(this.namespace);
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
