/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { LogsExtractionClient } from './logs_extraction_client';
export {
  CcsLogsExtractionClient,
  type CcsExtractToUpdatesParams,
  type CcsExtractToUpdatesResult,
} from './ccs_logs_extraction_client';
export {
  HASHED_ID_FIELD,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  buildRemainingLogsCountQuery,
  buildLogsExtractionEsqlQuery,
  extractPaginationParams,
  type PaginationParams,
} from './logs_extraction_query_builder';
