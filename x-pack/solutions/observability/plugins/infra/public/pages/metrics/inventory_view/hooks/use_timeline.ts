/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'lodash';
import { useEffect, useMemo } from 'react';
import { getIntervalInSeconds } from '../../../../../common/utils/get_interval_in_seconds';
import type { InfraTimerangeInput } from '../../../../../common/http_api/snapshot_api';
import type { UseSnapshotRequest } from './use_snaphot';
import { useSnapshot } from './use_snaphot';
import { useWaffleOptionsContext } from './use_waffle_options';

const ONE_MINUTE = 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;
const ONE_MONTH = ONE_DAY * 30;

const getDisplayInterval = (interval: string | undefined) => {
  if (interval) {
    const intervalInSeconds = getIntervalInSeconds(interval);
    if (intervalInSeconds < 300) return '5m';
  }
  return interval;
};

const getTimeLengthFromInterval = (interval: string | undefined) => {
  if (interval) {
    const intervalInSeconds = getIntervalInSeconds(interval);
    // Get up to 288 datapoints based on interval
    const timeLength =
      intervalInSeconds <= ONE_MINUTE * 15
        ? ONE_DAY
        : intervalInSeconds <= ONE_MINUTE * 35
        ? ONE_DAY * 3
        : intervalInSeconds <= ONE_HOUR * 2.5
        ? ONE_WEEK
        : ONE_MONTH;
    return { timeLength, intervalInSeconds };
  } else {
    return { timeLength: 0, intervalInSeconds: 0 };
  }
};

export function useTimeline({
  kuery,
  metrics,
  nodeType,
  sourceId,
  currentTime,
  accountId,
  region,
  interval,
  shouldReload,
}: Omit<UseSnapshotRequest, 'groupBy'> & {
  interval?: string;
  shouldReload: boolean;
}) {
  const { preferredSchema } = useWaffleOptionsContext();
  const displayInterval = useMemo(() => getDisplayInterval(interval), [interval]);
  const timeLengthResult = useMemo(
    () => getTimeLengthFromInterval(displayInterval),
    [displayInterval]
  );
  const { timeLength, intervalInSeconds } = timeLengthResult;

  const endTime = currentTime + intervalInSeconds * 1000;
  const startTime = currentTime - timeLength * 1000;
  const timerange: InfraTimerangeInput = {
    interval: displayInterval ?? '',
    to: endTime,
    from: startTime,
    forceInterval: true,
  };

  const { nodes, error, loading, reload } = useSnapshot(
    {
      metrics,
      groupBy: null,
      currentTime,
      nodeType,
      timerange,
      kuery,
      sourceId,
      accountId,
      region,
      includeTimeseries: true,
      schema: preferredSchema,
    },
    { sendRequestImmediately: false }
  );

  useEffect(() => {
    if (shouldReload) {
      reload();
    }
  }, [reload, shouldReload]);

  const timeseries = nodes ? first(nodes.map((node) => first(node.metrics)?.timeseries)) : null;

  return {
    error: error || null,
    loading: !interval ? true : loading,
    timeseries,
    startTime,
    endTime,
    reload,
  };
}
