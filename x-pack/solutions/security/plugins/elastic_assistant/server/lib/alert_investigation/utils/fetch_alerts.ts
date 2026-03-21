/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface AlertWithId {
  readonly _id: string;
  readonly _source: Record<string, unknown>;
}

/**
 * Fetches alerts by IDs from Elasticsearch with proper type filtering
 *
 * DRY utility - consolidates the mget + filter pattern used across workflow steps
 * Replaces 3 duplicate implementations (15 lines each = 45 lines → 1 function)
 */
export async function fetchAlertsByIds({
  esClient,
  indexPattern,
  alertIds,
  logger,
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
  alertIds: string[];
  logger: Logger;
}): Promise<AlertWithId[]> {
  if (alertIds.length === 0) {
    return [];
  }

  const alertDocs = await esClient.mget({
    index: indexPattern,
    ids: alertIds,
  });

  const alerts = alertDocs.docs
    .filter(
      (doc): doc is typeof doc & { found: true; _id: string; _source: Record<string, unknown> } =>
        'found' in doc &&
        (doc as { found?: boolean }).found === true &&
        '_source' in doc &&
        doc._id != null
    )
    .map((doc) => ({
      _id: doc._id,
      _source: doc._source,
    }));

  const missingCount = alertIds.length - alerts.length;
  if (missingCount > 0) {
    logger.warn(
      `${missingCount}/${alertIds.length} alerts not found in index ${indexPattern} ` +
        `(alerts may have been deleted during processing)`
    );
  }

  return alerts;
}
