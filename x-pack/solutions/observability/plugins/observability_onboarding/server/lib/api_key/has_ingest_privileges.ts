/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ApiKeyPrivileges } from './has_api_key_privileges';
import {
  APM_EVENT_WRITE_APPLICATION,
  INDEX_LOGS_AND_METRICS,
  INDEX_OTLP_LOGS_METRICS_AND_TRACES,
  INDEX_PROMETHEUS_REMOTE_WRITE,
} from './privileges';

// Unlike the API key checks, these leave out `manage_own_api_key`, so users who cannot create
// keys still get the endpoint URLs. The logs and metrics set matches the host onboarding check.
const INGEST_PRIVILEGES: readonly ApiKeyPrivileges[] = [
  { index: [INDEX_LOGS_AND_METRICS] },
  { index: [INDEX_OTLP_LOGS_METRICS_AND_TRACES] },
  { index: [INDEX_PROMETHEUS_REMOTE_WRITE] },
  { application: [APM_EVENT_WRITE_APPLICATION] },
];

/**
 * Checks whether the current user can write data through at least one onboarding endpoint.
 */
export async function hasIngestPrivileges(esClient: ElasticsearchClient): Promise<boolean> {
  const results = await Promise.all(
    INGEST_PRIVILEGES.map((privileges) => esClient.security.hasPrivileges(privileges))
  );

  return results.some(({ has_all_requested: hasAllRequested }) => hasAllRequested);
}
