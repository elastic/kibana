/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import type { EntityStoreEuidApi } from '@kbn/entity-store/public';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useQueryAlerts } from '../../../../../detections/containers/detection_engine/alerts/use_query';
import { fetchQueryAlerts } from '../../../../../detections/containers/detection_engine/alerts/api';
import { ALERTS_QUERY_NAMES } from '../../../../../detections/containers/detection_engine/alerts/constants';
import type { IdentityFields } from '../../../../../flyout/document_details/shared/utils';

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

export interface AttackEntityListEntry {
  identityFields: IdentityFields;
  sampleSource: Record<string, unknown>;
}

function extractEntityEntriesFromBuckets(
  euidApi: EntityStoreEuidApi | undefined,
  buckets: TermsBucketWithTopHits[] | undefined,
  entityType: 'user' | 'host'
): AttackEntityListEntry[] {
  if (!buckets || !Array.isArray(buckets)) {
    return [];
  }
  const result: AttackEntityListEntry[] = [];
  for (const b of buckets) {
    const hit = b.sample?.hits?.hits?.[0];
    const source = hit?._source;
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      const identityFields = euidApi?.euid?.getEntityIdentifiersFromDocument(entityType, source);
      if (identityFields != null) {
        result.push({
          identityFields,
          sampleSource: source as Record<string, unknown>,
        });
      }
    }
  }
  return result;
}

export interface UseAttackEntitiesListsResult {
  userEntityEntries: AttackEntityListEntry[];
  hostEntityEntries: AttackEntityListEntry[];
  loading: boolean;
  error: boolean;
}

/**
 * Hook that returns distinct user and host entity identifiers across all alerts that belong to an attack.
 * Accepts `originalAlertIds` explicitly (de-obfuscated via getOriginalAlertIds) so it can be used in
 * contexts outside the legacy `useAttackDetailsContext()` (e.g. flyout_v2 tool panels).
 * Uses EUID runtime fields so the same logical user/host is deduplicated across alerts.
 */
export const useAttackEntitiesLists = (
  originalAlertIds: string[]
): UseAttackEntitiesListsResult => {
  const euidApi = useEntityStoreEuidApi();

  const query = useMemo(() => {
    if (!euidApi?.euid) {
      return { query: { ids: { values: originalAlertIds } }, size: 0, aggs: {} };
    }
    return {
      query: { ids: { values: originalAlertIds } },
      size: 0,
      runtime_mappings: {
        [USER_EUID_RUNTIME_FIELD]: euidApi.euid.painless.getEuidRuntimeMapping('user'),
        [HOST_EUID_RUNTIME_FIELD]: euidApi.euid.painless.getEuidRuntimeMapping('host'),
      },
      aggs: {
        unique_users_by_euid: {
          terms: {
            field: USER_EUID_RUNTIME_FIELD,
            size: TERMS_AGG_SIZE,
            min_doc_count: 1,
          },
          aggs: {
            sample: { top_hits: { size: 1, _source: true } },
          },
        },
        unique_hosts_by_euid: {
          terms: {
            field: HOST_EUID_RUNTIME_FIELD,
            size: TERMS_AGG_SIZE,
            min_doc_count: 1,
          },
          aggs: {
            sample: { top_hits: { size: 1, _source: true } },
          },
        },
      },
    };
  }, [originalAlertIds, euidApi?.euid]);

  const { loading, data, setQuery } = useQueryAlerts<unknown, AttackEntitiesListsAggregations>({
    fetchMethod: fetchQueryAlerts,
    query,
    skip: originalAlertIds.length === 0 || !euidApi?.euid,
    queryName: ALERTS_QUERY_NAMES.ATTACK_ENTITIES_LISTS,
  });

  useEffect(() => {
    setQuery(query);
  }, [query, setQuery]);

  return useMemo(() => {
    const userEntityEntries = extractEntityEntriesFromBuckets(
      euidApi ?? undefined,
      data?.aggregations?.unique_users_by_euid?.buckets,
      'user'
    );
    const hostEntityEntries = extractEntityEntriesFromBuckets(
      euidApi ?? undefined,
      data?.aggregations?.unique_hosts_by_euid?.buckets,
      'host'
    );
    const error = !loading && data === undefined && originalAlertIds.length > 0;

    return {
      userEntityEntries,
      hostEntityEntries,
      loading,
      error,
    };
  }, [data, loading, originalAlertIds.length, euidApi]);
};
