/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import { fetchQueryAttacks } from '../../../../containers/detection_engine/alerts/api';
import { useInspectButton } from '../../../alerts_kpis/common/hooks';

const ATTACK_TIMESTAMPS_QUERY_ID = 'attacks-kpi-attack-timestamps';

interface AttackDetails {
  _id: string;
  _source: { 'kibana.alert.start'?: string; '@timestamp': string };
}

export interface UseAttackTimestampsProps {
  /** Array of attack IDs to fetch timestamps for */
  attackIds: string[];
}

/**
 * Hook for fetching attack start times
 * @param props - The props for the hook
 * @returns The attack start times
 */
export const useAttackTimestamps = ({ attackIds }: UseAttackTimestampsProps) => {
  const { deleteQuery, setQuery } = useGlobalTime();

  // Get the attack details query
  const attacksDetailsQuery = useMemo(() => {
    if (attackIds.length === 0) return {};
    return {
      size: attackIds.length,
      _source: ['kibana.alert.start', '@timestamp'],
      query: { ids: { values: attackIds } },
    };
  }, [attackIds]);

  // Get the attack details data
  const {
    data: detailsData,
    loading: isDetailsLoading,
    refetch: refetchDetails,
    request,
    response,
    setQuery: setDetailsQuery,
  } = useQueryAlerts<AttackDetails, {}>({
    fetchMethod: fetchQueryAttacks,
    query: attacksDetailsQuery,
    skip: attackIds.length === 0,
    queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_DETAILS,
  });

  // Set the attack details query
  useEffect(() => {
    setDetailsQuery(attacksDetailsQuery);
  }, [attacksDetailsQuery, setDetailsQuery]);

  const refetch = useCallback(() => {
    if (attackIds.length > 0 && refetchDetails) {
      refetchDetails();
    }
  }, [attackIds.length, refetchDetails]);

  useInspectButton({
    deleteQuery,
    loading: isDetailsLoading,
    response,
    setQuery,
    refetch,
    request,
    uniqueQueryId: ATTACK_TIMESTAMPS_QUERY_ID,
  });

  // Extract the attack start times
  const attackStartTimes = useMemo(() => {
    const times: Record<string, number> = {};
    if (detailsData?.hits?.hits) {
      detailsData.hits.hits.forEach((hit) => {
        const source = hit._source;
        // Prefer kibana.alert.start, fallback to @timestamp
        const startStr = source?.['kibana.alert.start'] || source?.['@timestamp'];
        if (startStr) {
          times[hit._id] = new Date(startStr).getTime();
        }
      });
    }
    return times;
  }, [detailsData]);

  return {
    attackStartTimes,
    isLoading: isDetailsLoading,
    refetch,
  };
};
