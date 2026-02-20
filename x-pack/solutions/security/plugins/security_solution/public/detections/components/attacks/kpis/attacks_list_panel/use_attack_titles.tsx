/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { fetchQueryUnifiedAlerts } from '../../../../containers/detection_engine/alerts/api';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';

interface AttackDetails {
  _id: string;
  _source: { 'kibana.alert.attack_discovery.title'?: string };
}

export interface UseAttackTitlesProps {
  /** Array of attack IDs to fetch titles for */
  attackIds: string[];
}

/**
 * Hook for fetching attack titles
 * @param props - The props for the hook
 * @returns The attack titles
 */
export const useAttackTitles = ({ attackIds }: UseAttackTitlesProps) => {
  // Get the attack details query
  const attacksDetailsQuery = useMemo(() => {
    if (attackIds.length === 0) return {};
    return {
      size: attackIds.length,
      _source: ['kibana.alert.attack_discovery.title'],
      query: { ids: { values: attackIds } },
    };
  }, [attackIds]);

  // Get the attack details data
  const {
    data: detailsData,
    loading: isDetailsLoading,
    refetch: refetchDetails,
    setQuery: setDetailsQuery,
  } = useQueryAlerts<AttackDetails, {}>({
    fetchMethod: fetchQueryUnifiedAlerts,
    query: attacksDetailsQuery,
    skip: attackIds.length === 0,
    queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_DETAILS,
  });

  // Set the attack details query
  useEffect(() => {
    setDetailsQuery(attacksDetailsQuery);
  }, [attacksDetailsQuery, setDetailsQuery]);

  // Extract the attack titles
  const attackTitles = useMemo(() => {
    const titles: Record<string, string> = {};
    if (detailsData?.hits?.hits) {
      detailsData.hits.hits.forEach((hit) => {
        const source = hit._source;
        const title = source?.['kibana.alert.attack_discovery.title'];
        if (title) {
          titles[hit._id] = title;
        }
      });
    }
    return titles;
  }, [detailsData]);

  return {
    attackTitles,
    isLoading: isDetailsLoading,
    refetch: refetchDetails,
  };
};
