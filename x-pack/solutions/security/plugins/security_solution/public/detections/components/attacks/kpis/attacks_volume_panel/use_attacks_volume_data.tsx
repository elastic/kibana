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
import { useAttackIds } from './use_attack_ids';
import { useAttackTimestamps } from './use_attack_timestamps';

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

  // Get the attack IDs
  const {
    attackIds,
    isLoading: isAggLoading,
    refetch: refetchAgg,
  } = useAttackIds({
    filters,
    query,
  });

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
