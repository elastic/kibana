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

const EMPTY_REPLACEMENTS: Record<string, string> = {};

interface AttackEntitiesAggregations {
  unique_users?: { value: number };
  unique_hosts?: { value: number };
}

export interface UseAttackEntitiesCountsResult {
  relatedUsers: number;
  relatedHosts: number;
  loading: boolean;
  error: boolean;
}

/**
 * Hook that returns distinct user and host counts across all alerts that belong to the current attack.
 * Queries the detection alerts index filtered by the attack's alert IDs and uses cardinality aggregations.
 */
export const useAttackEntitiesCounts = (): UseAttackEntitiesCountsResult => {
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
        unique_users: {
          cardinality: {
            field: 'user.name',
          },
        },
        unique_hosts: {
          cardinality: {
            field: 'host.name',
          },
        },
      },
    }),
    [originalAlertIds]
  );

  const { loading, data, setQuery } = useQueryAlerts<unknown, AttackEntitiesAggregations>({
    fetchMethod: fetchQueryAlerts,
    query,
    skip: originalAlertIds.length === 0,
    queryName: ALERTS_QUERY_NAMES.ATTACK_ENTITIES_COUNTS,
  });

  useEffect(() => {
    setQuery(query);
  }, [query, setQuery]);

  return useMemo(() => {
    const relatedUsers = data?.aggregations?.unique_users?.value ?? 0;
    const relatedHosts = data?.aggregations?.unique_hosts?.value ?? 0;
    const error = !loading && data === undefined && originalAlertIds.length > 0;

    return {
      relatedUsers,
      relatedHosts,
      loading,
      error,
    };
  }, [data, loading, originalAlertIds.length]);
};
