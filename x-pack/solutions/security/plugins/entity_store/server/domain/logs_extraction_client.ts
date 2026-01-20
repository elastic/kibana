/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import moment from 'moment';
import type { EntityType } from './definitions/entity_schema';
import { getEntityDefinition } from './definitions/registry';
import { buildLogsExtractionEsqlQuery } from './logs_extraction/logs_extraction_query_builder';
import { getLatestEntitiesIndexName } from './assets/latest_index';
export class LogsExtractionClient {
  constructor(private logger: Logger, private namespace: string) {}

  public extractLogs(type: EntityType) {
    const logger = this.logger.get(type);
    logger.debug('starting entity extraction');

    const indexPatterns = ['logs-*']; // get dynamically
    const maxPageSearchSize = 10000; // get from config
    const latestIndex = getLatestEntitiesIndexName(type, this.namespace);
    const entityDefinition = getEntityDefinition({ type });

    // Needs to be fetched from the saved object
    const fromDateISO = moment().utc().subtract(1, 'minute').toISOString();
    const toDateISO = moment().utc().toISOString();

    const query = buildLogsExtractionEsqlQuery({
      indexPatterns,
      latestIndex,
      entityDefinition,
      maxPageSearchSize,
      fromDateISO,
      toDateISO,
    });
  }
}
