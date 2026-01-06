/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ElasticsearchClient } from '@kbn/core/server';
import { type estypes } from '@elastic/elasticsearch';
import { type AttackDiscoveryAlertDocument } from '../../schedules/types';

export const getConnectors = async ({
  esClient,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
}) => {
  const result = await esClient.search<AttackDiscoveryAlertDocument>({
    index: `.alerts-security.attack.discovery.alerts-${spaceId}`,
    size: 0,
    aggs: {
      distinct_values: {
        terms: {
          field: 'kibana.alert.attack_discovery.api_config.name',
          size: 10000,
        },
      },
    },
  });

  const agg = result.aggregations?.distinct_values as estypes.AggregationsStringTermsAggregate;

  if (!Array.isArray(agg.buckets)) return [];

  const buckets = agg.buckets ?? [];
  const connectorNames: string[] = buckets.map((bucket) => bucket.key?.toString() as string);

  return connectorNames;
};
