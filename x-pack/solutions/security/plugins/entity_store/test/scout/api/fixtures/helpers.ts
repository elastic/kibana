/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import type { EntityType } from '../../../../common';
import { ENTITY_STORE_ROUTES, LATEST_INDEX, UPDATES_INDEX } from './constants';

/**
 * API client shape required by forceUserExtraction.
 * Use this instead of importing Scout's ApiClient type.
 */
export interface ForceLogExtractionApiClient {
  post(
    url: string,
    options: {
      headers: Record<string, string>;
      responseType: 'json';
      body: unknown;
    }
  ): Promise<{ statusCode: number; body: unknown }>;
}

export const ingestDoc = async (esClient: EsClient, body: Record<string, unknown>) =>
  esClient.index({
    index: UPDATES_INDEX,
    refresh: 'wait_for',
    body,
  });

export const searchDocById = async (esClient: EsClient, id: string) => {
  await esClient.indices.refresh({ index: LATEST_INDEX });
  return await esClient.search({
    index: LATEST_INDEX,
    query: {
      bool: {
        filter: {
          term: { 'entity.id': id },
        },
      },
    },
    size: 2,
  });
};

export const forceLogExtraction = async (
  apiClient: ForceLogExtractionApiClient,
  headers: Record<string, string>,
  entityType: EntityType,
  fromDateISO: string,
  toDateISO: string
) =>
  await apiClient.post(ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION(entityType), {
    headers,
    responseType: 'json',
    body: { fromDateISO, toDateISO },
  });
