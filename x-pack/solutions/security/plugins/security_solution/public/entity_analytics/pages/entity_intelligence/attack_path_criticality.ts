/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';

interface ValueBucket {
  key: string;
}
interface ValuesAggregation {
  buckets?: ValueBucket[];
  sum_other_doc_count?: number;
  doc_count_error_upper_bound?: number;
}
export interface HostCriticalityResponse {
  timed_out?: boolean;
  _shards?: { failed?: number };
  aggregations?: {
    hosts?: {
      buckets?: Record<
        string,
        {
          entity_ids?: ValuesAggregation;
          criticalities?: ValuesAggregation;
        }
      >;
    };
  };
}

/** Scopes criticality evidence to current-space hosts and exposes duplicate-name identities. */
export const buildHostCriticalitySearch = (spaceId: string, hostNames: readonly string[]) => ({
  index: getEntitiesAlias(ENTITY_LATEST, spaceId),
  allow_no_indices: true,
  ignore_unavailable: true,
  size: 0,
  query: {
    bool: { filter: [{ term: { 'entity.EngineMetadata.Type': 'host' } }] },
  },
  aggs: {
    hosts: {
      filters: {
        filters: Object.fromEntries(
          hostNames.map((name) => [name, { term: { 'host.name': name } }])
        ),
      },
      aggs: {
        entity_ids: { terms: { field: 'entity.id', size: 2 } },
        criticalities: { terms: { field: 'asset.criticality', size: 2 } },
      },
    },
  },
});

const singleCompleteValue = (aggregation: ValuesAggregation | undefined): string | undefined => {
  if (
    !aggregation ||
    aggregation.buckets?.length !== 1 ||
    (aggregation.sum_other_doc_count ?? 0) > 0 ||
    (aggregation.doc_count_error_upper_bound ?? 0) > 0
  )
    return undefined;
  return aggregation.buckets[0].key;
};

/** A name resolves only when a complete response identifies one canonical host and criticality. */
export const readHostCriticality = (response: HostCriticalityResponse): Map<string, string> => {
  const result = new Map<string, string>();
  if (response.timed_out || (response._shards?.failed ?? 0) > 0) return result;
  for (const [name, bucket] of Object.entries(response.aggregations?.hosts?.buckets ?? {})) {
    const id = singleCompleteValue(bucket.entity_ids);
    const criticality = singleCompleteValue(bucket.criticalities);
    if (id && criticality) result.set(name, criticality);
  }
  return result;
};
