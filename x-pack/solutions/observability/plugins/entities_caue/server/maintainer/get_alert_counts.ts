/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';

/** Read-alias pattern for APM/observability alerts. Matches the RAC index name pattern:
 *  `.alerts-observability.*.alerts-<namespace>`
 *  Confirmed at rule_registry/server/rule_data_client/rule_data_client.test.ts:84.
 */
const alertsIndexPattern = (namespace: string) => `.alerts-observability.*.alerts-${namespace}`;

/**
 * Returns the number of currently-active alerts per service name.
 * Uses the same aggregation shape as APM's get_service_alerts.ts.
 *
 * Returns `null` when the query fails (e.g. index not found, no privileges)
 * so callers can treat the service as `Unknown` rather than `Healthy`.
 */
export const getAlertCounts = async ({
  esClient,
  namespace,
  serviceNames,
  logger,
}: {
  esClient: ElasticsearchClient;
  namespace: string;
  serviceNames: string[];
  logger: Logger;
}): Promise<Map<string, number> | null> => {
  if (serviceNames.length === 0) return new Map();

  try {
    const resp = await esClient.search<
      unknown,
      { by_service: { buckets: Array<{ key: string; alert_count: { value: number } }> } }
    >({
      index: alertsIndexPattern(namespace),
      allow_no_indices: true,
      ignore_unavailable: true,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { 'kibana.alert.status': 'active' } },
            { terms: { 'service.name': serviceNames } },
          ],
        },
      },
      aggs: {
        by_service: {
          terms: {
            field: 'service.name',
            size: serviceNames.length,
          },
          aggs: {
            alert_count: {
              cardinality: { field: 'kibana.alert.uuid' },
            },
          },
        },
      },
    });

    const counts = new Map<string, number>();
    for (const bucket of resp.aggregations?.by_service.buckets ?? []) {
      counts.set(bucket.key, bucket.alert_count.value);
    }
    // Services with no active alerts are absent from buckets → they have count 0
    return counts;
  } catch (err) {
    logger.warn(`[service-health-score] Failed to fetch alert counts: ${err?.message}`);
    return null;
  }
};
