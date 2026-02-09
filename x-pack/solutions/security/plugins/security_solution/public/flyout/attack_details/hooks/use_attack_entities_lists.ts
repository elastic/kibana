/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';
import { useAttackDetailsContext } from '../context';
import { normalizeToStringArray } from './use_header_data';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { fetchQueryAlerts } from '../../../detections/containers/detection_engine/alerts/api';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';

const FIELD_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids' as const;
const FIELD_REPLACEMENTS = 'kibana.alert.attack_discovery.replacements' as const;
const TERMS_AGG_SIZE = 200;

const EMPTY_REPLACEMENTS: Record<string, string> = {};

interface TermsBucket {
  key: string | string[];
  doc_count: number;
}

interface AttackEntitiesListsAggregations {
  unique_user_names?: { buckets: TermsBucket[] };
  unique_host_names?: { buckets: TermsBucket[] };
}

function bucketKeysToArray(buckets: TermsBucket[] | undefined): string[] {
  if (!buckets || !Array.isArray(buckets)) {
    return [];
  }
  const names: string[] = [];
  for (const b of buckets) {
    const key = b.key;
    if (typeof key === 'string') {
      if (key) names.push(key);
    } else if (Array.isArray(key)) {
      key.forEach((k) => {
        if (typeof k === 'string' && k) names.push(k);
      });
    }
  }
  return names;
}

export interface UseAttackEntitiesListsResult {
  userNames: string[];
  hostNames: string[];
  loading: boolean;
  error: boolean;
}

/**
 * Hook that returns distinct user and host names across all alerts that belong to the current attack.
 * Queries the detection alerts index filtered by the attack's alert IDs and uses terms aggregations.
 */
export const useAttackEntitiesLists = (): UseAttackEntitiesListsResult => {
  const { getFieldsData } = useAttackDetailsContext();

  const alertIds = useMemo(
    () => normalizeToStringArray(getFieldsData(FIELD_ALERT_IDS)),
    [getFieldsData]
  );

  const replacements = useMemo(() => {
    const value = getFieldsData(FIELD_REPLACEMENTS);
    if (!value || typeof value === 'string' || Array.isArray(value)) {
      return EMPTY_REPLACEMENTS;
    }
    return value as Record<string, string>;
  }, [getFieldsData]);

  const originalAlertIds = useMemo(
    () => getOriginalAlertIds({ alertIds, replacements }),
    [alertIds, replacements]
  );

  const query = useMemo(
    () => ({
      query: {
        ids: {
          values: originalAlertIds,
        },
      },
      size: 0,
      aggs: {
        unique_user_names: {
          terms: {
            field: 'user.name',
            size: TERMS_AGG_SIZE,
          },
        },
        unique_host_names: {
          terms: {
            field: 'host.name',
            size: TERMS_AGG_SIZE,
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
    const userNames = bucketKeysToArray(data?.aggregations?.unique_user_names?.buckets);
    const hostNames = bucketKeysToArray(data?.aggregations?.unique_host_names?.buckets);
    const error = !loading && data === undefined && originalAlertIds.length > 0;

    return {
      userNames,
      hostNames,
      loading,
      error,
    };
  }, [data, loading, originalAlertIds.length]);
};
