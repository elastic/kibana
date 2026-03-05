/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { euid } from '@kbn/entity-store/public';
import type { EntityIdentifiers } from '../../document_details/shared/utils';
import type { GetFieldsData } from '../../document_details/shared/hooks/use_get_fields_data';
import {
  getUserEntityIdentifiers,
  getHostEntityIdentifiers,
} from '../../document_details/shared/utils';
import { useOriginalAlertIds } from './use_original_alert_ids';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { fetchQueryAlerts } from '../../../detections/containers/detection_engine/alerts/api';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';

const TERMS_AGG_SIZE = 200;

const USER_EUID_RUNTIME_FIELD = 'attack_entities_euid_user';
const HOST_EUID_RUNTIME_FIELD = 'attack_entities_euid_host';

interface TermsBucketWithTopHits {
  key: string;
  doc_count: number;
  sample?: {
    hits: {
      hits: Array<{ _source?: Record<string, unknown> }>;
    };
  };
}

interface AttackEntitiesListsAggregations {
  unique_users_by_euid?: { buckets: TermsBucketWithTopHits[] };
  unique_hosts_by_euid?: { buckets: TermsBucketWithTopHits[] };
}

/**
 * Builds a getFieldsData-like function from a raw _source document so we can reuse
 * getUserEntityIdentifiers / getHostEntityIdentifiers with aggregation hit _source.
 */
function getFieldsDataFromSource(source: Record<string, unknown>): GetFieldsData {
  return (field: string): string | string[] | null | undefined => {
    const parts = field.split('.');
    let v: unknown = source;
    for (const p of parts) {
      v =
        v != null && typeof v === 'object' && p in v
          ? (v as Record<string, unknown>)[p]
          : undefined;
    }
    if (v !== undefined) return v as string | string[] | null | undefined;
    const flat = source[field];
    return flat !== undefined ? (flat as string | string[] | null | undefined) : undefined;
  };
}

function extractEntityIdentifiersFromBuckets(
  buckets: TermsBucketWithTopHits[] | undefined,
  extractIdentifiers: (source: Record<string, unknown>) => EntityIdentifiers | null
): EntityIdentifiers[] {
  if (!buckets || !Array.isArray(buckets)) {
    return [];
  }
  const result: EntityIdentifiers[] = [];
  for (const b of buckets) {
    const hit = b.sample?.hits?.hits?.[0];
    const source = hit?._source;
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      const identifiers = extractIdentifiers(source as Record<string, unknown>);
      if (identifiers && Object.keys(identifiers).length > 0) {
        result.push(identifiers);
      }
    }
  }
  return result;
}

function extractUserIdentifiersFromSource(
  source: Record<string, unknown>
): EntityIdentifiers | null {
  const getFieldsData = getFieldsDataFromSource(source);
  return getUserEntityIdentifiers(source as unknown as Ecs, getFieldsData);
}

function extractHostIdentifiersFromSource(
  source: Record<string, unknown>
): EntityIdentifiers | null {
  const getFieldsData = getFieldsDataFromSource(source);
  return getHostEntityIdentifiers(source as unknown as Ecs, getFieldsData);
}

export interface UseAttackEntitiesListsResult {
  userEntityIdentifiers: EntityIdentifiers[];
  hostEntityIdentifiers: EntityIdentifiers[];
  loading: boolean;
  error: boolean;
}

/**
 * Hook that returns distinct user and host entity identifiers across all alerts that belong to the current attack.
 * Uses EUID (entity unique ID) runtime fields so the same logical user/host is deduplicated (e.g. same user
 * by user.name vs user.entity.id). Queries the detection alerts index filtered by the attack's alert IDs,
 * with terms aggregations on the EUID runtime fields and top_hits to get a sample document per entity for identifier extraction.
 */
export const useAttackEntitiesLists = (): UseAttackEntitiesListsResult => {
  const originalAlertIds = useOriginalAlertIds();

  const query = useMemo(
    () => ({
      query: {
        ids: {
          values: originalAlertIds,
        },
      },
      size: 0,
      runtime_mappings: {
        [USER_EUID_RUNTIME_FIELD]: euid.getEuidPainlessRuntimeMapping('user'),
        [HOST_EUID_RUNTIME_FIELD]: euid.getEuidPainlessRuntimeMapping('host'),
      },
      aggs: {
        unique_users_by_euid: {
          terms: {
            field: USER_EUID_RUNTIME_FIELD,
            size: TERMS_AGG_SIZE,
            min_doc_count: 1,
          },
          aggs: {
            sample: {
              top_hits: {
                size: 1,
                _source: true,
              },
            },
          },
        },
        unique_hosts_by_euid: {
          terms: {
            field: HOST_EUID_RUNTIME_FIELD,
            size: TERMS_AGG_SIZE,
            min_doc_count: 1,
          },
          aggs: {
            sample: {
              top_hits: {
                size: 1,
                _source: true,
              },
            },
          },
        },
      },
    }),
    [originalAlertIds]
  );

  const { loading, data, setQuery } = useQueryAlerts<unknown, AttackEntitiesListsAggregations>({
    fetchMethod: fetchQueryAlerts,
    query,
    skip: originalAlertIds.length === 0,
    queryName: ALERTS_QUERY_NAMES.ATTACK_ENTITIES_LISTS,
  });

  useEffect(() => {
    setQuery(query);
  }, [query, setQuery]);

  return useMemo(() => {
    const userEntityIdentifiers = extractEntityIdentifiersFromBuckets(
      data?.aggregations?.unique_users_by_euid?.buckets,
      extractUserIdentifiersFromSource
    );
    const hostEntityIdentifiers = extractEntityIdentifiersFromBuckets(
      data?.aggregations?.unique_hosts_by_euid?.buckets,
      extractHostIdentifiersFromSource
    );
    const error = !loading && data === undefined && originalAlertIds.length > 0;

    return {
      userEntityIdentifiers,
      hostEntityIdentifiers,
      loading,
      error,
    };
  }, [data, loading, originalAlertIds.length]);
};
