/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { chunk } from 'lodash';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
} from '@kbn/alerting-plugin/common';
import type { PublicAlertsClient } from '@kbn/alerting-plugin/server/alerts_client/types';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type { SecurityActionGroupId } from '../types';

interface FilterDuplicateAlertsOpts<T> {
  alerts: T[];
  alertsClient: PublicAlertsClient<
    RuleAlertData,
    AlertInstanceState,
    AlertInstanceContext,
    SecurityActionGroupId
  > | null;
}

/**
 * finds if any of alerts has duplicate and filter them out
 */
export const filterDuplicateAlerts = async <T extends { _id: string }>({
  alerts,
  alertsClient,
}: FilterDuplicateAlertsOpts<T>) => {
  if (!alertsClient) {
    throw new AlertsClientError();
  }
  const CHUNK_SIZE = 10000;
  const alertChunks = chunk(alerts, CHUNK_SIZE);
  const filteredAlerts: typeof alerts = [];

  for (const alertChunk of alertChunks) {
    const request: estypes.SearchRequest = {
      query: {
        ids: {
          values: alertChunk.map((alert) => alert._id),
        },
      },
      aggs: {
        uuids: {
          terms: {
            field: ALERT_UUID,
            size: CHUNK_SIZE,
          },
        },
      },
      size: 0,
    };
    // TODO - alerts client should already handle space ID but double check
    const response = await alertsClient.search(request);
    const uuidsMap: Record<string, boolean> = {};
    const aggs = response.aggregations as
      | Record<estypes.AggregateName, { buckets: Array<{ key: string }> }>
      | undefined;
    if (aggs != null) {
      aggs.uuids.buckets.forEach((bucket) => (uuidsMap[bucket.key] = true));
      const newAlerts = alertChunk.filter((alert) => !uuidsMap[alert._id]);
      filteredAlerts.push(...newAlerts);
    } else {
      filteredAlerts.push(...alertChunk);
    }
  }

  return filteredAlerts;
};
