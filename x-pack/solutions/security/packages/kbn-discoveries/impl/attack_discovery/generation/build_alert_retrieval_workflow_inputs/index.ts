/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedApiConfig } from '../types';

export const buildAlertRetrievalWorkflowInputs = ({
  alertsIndexPattern,
  anonymizationFields,
  apiConfig,
  end,
  esqlQuery,
  filter,
  size,
  start,
}: {
  alertsIndexPattern: string;
  anonymizationFields?: unknown[];
  apiConfig: ParsedApiConfig;
  end?: string;
  esqlQuery?: string;
  filter?: Record<string, unknown>;
  size?: number;
  start?: string;
}): Record<string, unknown> => ({
  alerts_index_pattern: alertsIndexPattern,
  anonymization_fields: anonymizationFields ?? [],
  api_config: {
    action_type_id: apiConfig.action_type_id,
    connector_id: apiConfig.connector_id,
    model: apiConfig.model,
  },
  end: end ?? undefined,
  esql_query: esqlQuery,
  filter: filter ?? undefined,
  size: size ?? 100,
  start: start ?? undefined,
});
