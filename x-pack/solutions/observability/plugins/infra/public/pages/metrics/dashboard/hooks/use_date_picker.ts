/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import { constant, identity } from 'fp-ts/function';
import type { TimeRange } from '@kbn/es-query';
import createContainer from 'constate';
import { useCallback, useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import { useReloadRequestTimeContext } from '../../../../hooks/use_reload_request_time';
import { parseDateRange } from '../../../../utils/datemath';

export interface UseDateRangeProviderProps {
  dateRange?: TimeRange;
}

export const getDefaultDateRange = () => {
  // Default to the last 15 minutes as relative time range for now
  return {
    from: 'now-15m',
    to: 'now',
  };
};

export function useDatePicker({ dateRange = getDefaultDateRange() }: UseDateRangeProviderProps) {
  const { updateReloadRequestTime } = useReloadRequestTimeContext();
  const DatePickerUrlStateRT = rt.partial({
    dateRange: rt.type({
      from: rt.string,
      to: rt.string,
    }),
  });

  const DatePickerUrlRT = rt.union([DatePickerUrlStateRT, rt.null]);

  const encodeUrlState = DatePickerUrlRT.encode;
  const decodeUrlState = (value: unknown) => {
    return pipe(DatePickerUrlRT.decode(value), fold(constant(undefined), identity));
  };

  type DatePickerUrl = rt.TypeOf<typeof DatePickerUrlRT>;

  const [urlState, setUrlState] = useUrlState<DatePickerUrl>({
    defaultState: { dateRange },
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'dashboardParams',
  });

  const [parsedDateRange, setParsedDateRange] = useState(
    parseDateRange(urlState?.dateRange ?? dateRange)
  );

  useEffectOnce(() => {
    setUrlState({
      ...(!urlState?.dateRange
        ? {
            dateRange,
          }
        : undefined),
    });
  });

  const setDateRange = useCallback(
    (newDateRange: TimeRange) => {
      setUrlState({ dateRange: newDateRange });
      setParsedDateRange(parseDateRange(newDateRange));
      updateReloadRequestTime();
    },
    [setUrlState, updateReloadRequestTime]
  );

  const onRefresh = useCallback(
    (newDateRange: TimeRange) => {
      setDateRange(newDateRange);
    },
    [setDateRange]
  );

  const getParsedDateRange = useCallback(() => {
    const defaultDateRange = getDefaultDateRange();
    const { from = defaultDateRange.from, to = defaultDateRange.to } = parsedDateRange;

    return { from, to };
  }, [parsedDateRange]);

  return {
    dateRange: urlState?.dateRange ?? dateRange,
    getParsedDateRange,
    onRefresh,
    setDateRange,
  };
}

export const [DatePickerProvider, useDatePickerContext] = createContainer(useDatePicker);
