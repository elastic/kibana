/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';
import { fromQuery, toQuery } from '@kbn/observability-plugin/public';
import type { ClassicRumTimeRange } from './types';

const getTimeRange = (search: string): ClassicRumTimeRange | undefined => {
  const { rangeFrom, rangeTo } = toQuery(search);
  return typeof rangeFrom === 'string' && typeof rangeTo === 'string'
    ? { rangeFrom, rangeTo }
    : undefined;
};

const isSameTimeRange = (a?: ClassicRumTimeRange, b?: ClassicRumTimeRange): boolean =>
  a?.rangeFrom === b?.rangeFrom && a?.rangeTo === b?.rangeTo;

/**
 * In-memory URL for the embedded dashboard: pins `serviceName`, starts in the host's environment and
 * keeps the time range in sync with the host app in both directions.
 */
export const useEmbeddedHistory = ({
  serviceName,
  environment,
  timeRange,
  onTimeRangeChange,
}: {
  serviceName: string;
  environment?: string;
  timeRange?: ClassicRumTimeRange;
  onTimeRangeChange?: (timeRange: ClassicRumTimeRange) => void;
}): MemoryHistory => {
  const timeRangeRef = useRef(timeRange);
  timeRangeRef.current = timeRange;
  const environmentRef = useRef(environment);
  environmentRef.current = environment;
  const onTimeRangeChangeRef = useRef(onTimeRangeChange);
  onTimeRangeChangeRef.current = onTimeRangeChange;

  // Only the service name recreates the history; time range changes are applied in place below.
  const history = useMemo(
    () =>
      createMemoryHistory({
        initialEntries: [
          `/?${fromQuery({
            serviceName,
            ...(environmentRef.current ? { environment: environmentRef.current } : {}),
            ...timeRangeRef.current,
          })}`,
        ],
      }),
    [serviceName]
  );

  useEffect(() => {
    if (!timeRange || isSameTimeRange(timeRange, getTimeRange(history.location.search))) {
      return;
    }
    history.replace({
      ...history.location,
      search: fromQuery({ ...toQuery(history.location.search), ...timeRange }),
    });
  }, [history, timeRange]);

  useEffect(
    () =>
      history.listen(({ search }) => {
        const embeddedTimeRange = getTimeRange(search);
        if (embeddedTimeRange && !isSameTimeRange(embeddedTimeRange, timeRangeRef.current)) {
          onTimeRangeChangeRef.current?.(embeddedTimeRange);
        }
      }),
    [history]
  );

  return history;
};
