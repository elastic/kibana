/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { url } from '@kbn/kibana-utils-plugin/common';
import { encode } from '@kbn/rison';
import type { Query } from '@kbn/es-query';
import { parse, stringify } from 'query-string';
import moment, { DurationInputObject } from 'moment';
import {
  defaultFilterStateKey,
  defaultPositionStateKey,
  DEFAULT_REFRESH_INTERVAL,
  LogViewReference,
} from '@kbn/logs-shared-plugin/common';
import type { FilterStateInUrl } from '../public/observability_logs/log_stream_query_state';
import type { PositionStateInUrl } from '../public/observability_logs/log_stream_position_state/src/url_state_storage_service';
import type { TimeRange } from './time';

export const defaultLogViewKey = 'logView';

const encodeRisonUrlState = (state: any) => encode(state);

// Used by Locator components
export const replaceLogPositionInQueryString = (time?: number) =>
  Number.isNaN(time) || time == null
    ? (value: string) => value
    : replaceStateKeyInQueryString<PositionStateInUrl>(defaultPositionStateKey, {
        position: {
          time: moment(time).toISOString(),
          tiebreaker: 0,
        },
      });

// NOTE: Used by Locator components
export const replaceLogViewInQueryString = (logViewReference: LogViewReference) =>
  replaceStateKeyInQueryString(defaultLogViewKey, logViewReference);

export const replaceStateKeyInQueryString =
  <UrlState extends any>(stateKey: string, urlState: UrlState | undefined) =>
  (queryString: string) => {
    const previousQueryValues = parse(queryString, { sort: false });
    const newValue =
      typeof urlState === 'undefined'
        ? previousQueryValues
        : {
            ...previousQueryValues,
            [stateKey]: encodeRisonUrlState(urlState),
          };
    return stringify(url.encodeQuery(newValue), { sort: false, encode: false });
  };

export const replaceLogFilterInQueryString = (query: Query, time?: number, timeRange?: TimeRange) =>
  replaceStateKeyInQueryString<FilterStateInUrl>(defaultFilterStateKey, {
    query,
    ...getTimeRange(time, timeRange),
    refreshInterval: DEFAULT_REFRESH_INTERVAL,
  });

const getTimeRange = (time?: number, timeRange?: TimeRange) => {
  if (timeRange) {
    return {
      timeRange: {
        from: new Date(timeRange.startTime).toISOString(),
        to: new Date(timeRange.endTime).toISOString(),
      },
    };
  } else if (time) {
    return {
      timeRange: {
        from: getTimeRangeStartFromTime(time),
        to: getTimeRangeEndFromTime(time),
      },
    };
  } else {
    return {};
  }
};

const defaultTimeRangeFromPositionOffset: DurationInputObject = { hours: 1 };

export const getTimeRangeStartFromTime = (time: number): string =>
  moment(time).subtract(defaultTimeRangeFromPositionOffset).toISOString();

export const getTimeRangeEndFromTime = (time: number): string =>
  moment(time).add(defaultTimeRangeFromPositionOffset).toISOString();
