/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import {
  ANONYMIZATION_FIELDS_FIND_ROUTE,
  anonymizationFieldsIndexForSpace,
  PUBLIC_API_VERSION,
} from './constants';

/**
 * Generation reads the space's anonymization-fields index directly, and only an AI Assistant
 * route creates it, so on a fresh stack every run fails with `index_not_found_exception` before
 * the model is called. Any request that builds the assistant data client installs the index.
 */
export const ensureAnonymizationFields = async ({
  esClient,
  fetch,
  space = 'default',
}: {
  esClient: EsClient;
  fetch: HttpHandler;
  space?: string;
}): Promise<void> => {
  try {
    await fetch(`${ANONYMIZATION_FIELDS_FIND_ROUTE}?per_page=1`, {
      method: 'GET',
      version: PUBLIC_API_VERSION,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
    });
  } catch (error) {
    throw new Error(
      `Failed to read anonymization fields: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  const index = anonymizationFieldsIndexForSpace(space);
  if (!(await esClient.indices.exists({ index }))) {
    throw new Error(
      `${index} is still missing, so generation would fail with index_not_found_exception. Open Attack discovery once in space "${space}", then retry.`
    );
  }
};
