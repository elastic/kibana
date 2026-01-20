/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityType } from './definitions/entity_schema';
import { getEntityDefinition } from './definitions/registry';
import {
  buildLogsExtractionEsqlQuery,
  HASHED_ID,
} from './logs_extraction/logs_extraction_query_builder';
import { getLatestEntitiesIndexName, getResetEntitiesIndexName } from './assets/latest_index';
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import { ingestEntities } from '../infra/elasticsearch/ingest';

interface LogsExtractionOptions {
  fromDateISO?: string;
  toDateISO?: string;
}

export class LogsExtractionClient {
  constructor(
    private logger: Logger,
    private namespace: string,
    private esClient: ElasticsearchClient
  ) {}

  public async extractLogs(type: EntityType, opts?: LogsExtractionOptions) {
    const logger = this.logger.get('logsExtraction').get(type);
    logger.debug('starting entity extraction');

    const entityDefinition = getEntityDefinition({ type });

    const indexPatterns = this.getIndexPatterns(type); // get dynamically. Will we do all sec solution? or something else?
    const maxPageSearchSize = 10000; // get from config in the saved object
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

    try {
      logger.debug(`Running query to extract logs from ${fromDateISO} to ${toDateISO}`);
      const esqlResponse = await executeEsqlQuery({ esClient: this.esClient, query });
      // console.log(query);
      // console.log(esqlResponse);
      logger.debug(`Found ${esqlResponse.values.length}, ingesting them`);
      await ingestEntities({
        esClient: this.esClient,
        esqlResponse,
        esIdField: HASHED_ID,
        targetIndex: latestIndex,
        logger,
      });
      return true;
    } catch (error) {
      // store error on saved object
      logger.error(error);
      return false;
    }
  }

  private getIndexPatterns(type: EntityType) {
    const resetIndex = getResetEntitiesIndexName(type, this.namespace);
    const indexPatterns = ['logs-*', resetIndex]; // get dynamically. Will we do all sec solution? or something else?
    return indexPatterns;
  }
}
