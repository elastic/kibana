/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, termsQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_RULE_PRODUCER,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { HOST_NAME_FIELD, INFRA_ALERT_CONSUMERS } from '../../../../../common/constants';
import { GetHostParameters } from '../types';

export async function getHostsAlertsCount({
  alertsClient,
  hostNames,
  from,
  to,
  limit,
}: Pick<GetHostParameters, 'alertsClient' | 'from' | 'to' | 'limit'> & {
  hostNames: string[];
}) {
  const rangeQuery = [
    {
      range: {
        'kibana.alert.time_range': {
          gte: from,
          lte: to,
        },
      },
    },
  ];
  const params = {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...termsQuery(ALERT_RULE_PRODUCER, ...INFRA_ALERT_CONSUMERS),
          ...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
          ...termsQuery(HOST_NAME_FIELD, ...hostNames),
          ...rangeQuery,
        ],
      },
    },
    aggs: {
      hosts: {
        terms: {
          field: HOST_NAME_FIELD,
          size: limit,
          order: {
            _key: 'asc',
          },
        },
        aggs: {
          alerts_count: {
            cardinality: {
              field: ALERT_UUID,
            },
          },
        },
      },
    },
  };

  const result = await alertsClient.search(params);

  const filterAggBuckets = result.aggregations?.hosts.buckets ?? [];

  return filterAggBuckets.map((bucket) => ({
    name: bucket.key as string,
    alertsCount: bucket.alerts_count.value,
  }));
}
