/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import type { AlertsClient } from '../../lib/create_alerts_client/create_alerts_client';
import { getGroupByTermsAgg } from './get_group_by_terms_agg';

interface Bucket {
  key: Record<string, any>;
  doc_count: number;
}

type EntityTypeBucketsAggregation = Record<string, { buckets: Bucket[] }>;

export async function getLatestEntitiesAlerts({
  alertsClient,
  identityFieldsBySource,
}: {
  alertsClient: AlertsClient;
  identityFieldsBySource: Record<string, string[]>;
}): Promise<Array<{ [key: string]: any; alertsCount?: number }>> {
  if (Object.keys(identityFieldsBySource).length === 0) {
    return [];
  }

  const filter = {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
      },
    },
  };

  const response = await alertsClient.search({
    ...filter,
    aggs: getGroupByTermsAgg(identityFieldsBySource),
  });

  const aggregations = response.aggregations as EntityTypeBucketsAggregation;

  const alerts = Object.keys(identityFieldsBySource)
    .map((sourceId) => {
      const entityAggregation = aggregations?.[sourceId];

      const buckets = entityAggregation.buckets ?? [];

      return buckets.map((bucket: Bucket) => ({
        alertsCount: bucket.doc_count,
        ...bucket.key,
      }));
    })
    .flat();

  return alerts;
}
