/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedApiConfig } from './types';

export const buildWorkflowInputs = ({
  alertsIndexPattern,
  end,
  filter,
  parsedApiConfig,
  size,
  start,
}: {
  alertsIndexPattern: string;
  end?: string;
  filter?: Record<string, unknown>;
  parsedApiConfig: ParsedApiConfig;
  size?: number;
  start?: string;
}): Record<string, string | undefined> => ({
  alerts_index_pattern: alertsIndexPattern,
  anonymization_fields: JSON.stringify([]),
  api_config: JSON.stringify({
    action_type_id: parsedApiConfig.action_type_id,
    connector_id: parsedApiConfig.connector_id,
    model: parsedApiConfig.model,
  }),
  end: end ?? undefined,
  filter: filter ? JSON.stringify(filter) : undefined,
  size: String(size ?? 100),
  start: start ?? undefined,
});
