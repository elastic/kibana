/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import dateMath from '@elastic/datemath';
import type { Filter, Query } from '@kbn/es-query';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { parseAttacksVolumeData, getInterval } from './helpers';
import { useAlertsAggregation } from '../common/use_alerts_aggregation';
import { useAttackTimestamps } from './use_attack_timestamps';
import type { AttacksVolumeAgg, AttacksVolumeBucket } from './types';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import { getAttacksVolumeAggregations } from './aggregations';

export interface UseAttacksVolumeDataProps {
  /** Optional array of filters to apply to the query */
  filters?: Filter[];
  /** Optional query object */
  query?: Query;
}

/**
 * Hook for fetching and parsing attacks volume data
 * @param props - The props for the hook
 * @returns The parsed chart data and loading state
 */
export const useAttacksVolumeData = ({ filters, query }: UseAttacksVolumeDataProps) => {
  const { from, to } = useGlobalTime();

  // Get the start and end times
  const startTime = useMemo(() => dateMath.parse(from)?.valueOf() || 0, [from]);
  const endTime = useMemo(() => dateMath.parse(to, { roundUp: true })?.valueOf() || 0, [to]);

  // Get the interval between the start and end times
  const intervalMs = useMemo(() => getInterval(startTime, endTime), [startTime, endTime]);

  const aggs = useMemo(() => getAttacksVolumeAggregations(), []);

  // Get the attack IDs
  const {
    data: aggData,
    loading: isAggLoading,
    refetch: refetchAgg,
  } = useAlertsAggregation<AttacksVolumeAgg>({
    filters,
    query,
    aggs,
    queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
  });

  const attackIds = useMemo(() => {
    if (!aggData?.aggregations?.attacks?.buckets) return [];
    return aggData.aggregations.attacks.buckets.map((b: AttacksVolumeBucket) => b.key);
  }, [aggData]);

  // Get the attack start times
  const {
    attackStartTimes,
    isLoading: isDetailsLoading,
    refetch: refetchDetails,
  } = useAttackTimestamps({
    attackIds,
  });

  // Parse the attack start times into a chart data series
  const items = useMemo(() => {
    return parseAttacksVolumeData({ attackStartTimes, intervalMs, min: startTime, max: endTime });
  }, [attackStartTimes, intervalMs, startTime, endTime]);

  // Refetch the attack IDs and start times
  const refetch = () => {
    refetchAgg?.();
    refetchDetails?.();
  };

  return {
    items,
    isLoading: isAggLoading || (attackIds.length > 0 && isDetailsLoading),
    refetch,
    intervalMs, // exposing interval might be useful for chart axis formatting
  };
};
