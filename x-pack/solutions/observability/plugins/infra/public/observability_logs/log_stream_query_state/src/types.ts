/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshInterval } from '@kbn/data-plugin/public';
import { AggregateQuery, BoolQuery, DataViewBase, Query, Filter, TimeRange } from '@kbn/es-query';
import { PageEndBufferReachedEvent } from '../../log_stream_position_state/src/notifications';

export type AnyQuery = Query | AggregateQuery;

export interface ParsedQuery {
  bool: BoolQuery;
}

export interface LogStreamQueryContextWithDataViews {
  dataViews: DataViewBase[];
}

export interface LogStreamQueryContextWithSavedQueryId {
  savedQueryId: string;
}
export interface LogStreamQueryContextWithQuery {
  query: AnyQuery;
}

export interface LogStreamQueryContextWithParsedQuery {
  parsedQuery: ParsedQuery;
}

export interface LogStreamQueryContextWithFilters {
  filters: Filter[];
}

export interface LogStreamQueryContextWithValidationError {
  validationError: Error;
}

export type ExtendedTimeRange = TimeRange & { lastChangedCompletely: number };
export interface LogStreamQueryContextWithTimeRange {
  timeRange: ExtendedTimeRange;
}

export interface LogStreamQueryContextWithRefreshInterval {
  refreshInterval: RefreshInterval;
}

export interface Timestamps {
  startTimestamp: number;
  endTimestamp: number;
  lastChangedTimestamp: number;
}

export interface LogStreamQueryContextWithTimestamps {
  timestamps: Timestamps;
}

export type LogStreamQueryContextWithTime = LogStreamQueryContextWithTimeRange &
  LogStreamQueryContextWithRefreshInterval &
  LogStreamQueryContextWithTimestamps;

export type LogStreamQueryTypestate =
  | {
      value: 'uninitialized';
      context: LogStreamQueryContextWithDataViews & LogStreamQueryContextWithTime;
    }
  | {
      value: 'query' | { query: 'validating' };
      context: LogStreamQueryContextWithDataViews &
        LogStreamQueryContextWithParsedQuery &
        LogStreamQueryContextWithQuery &
        LogStreamQueryContextWithFilters &
        LogStreamQueryContextWithTime;
    }
  | {
      value: { query: 'valid' };
      context: LogStreamQueryContextWithDataViews &
        LogStreamQueryContextWithParsedQuery &
        LogStreamQueryContextWithQuery &
        LogStreamQueryContextWithFilters &
        LogStreamQueryContextWithTime;
    }
  | {
      value: { query: 'invalid' };
      context: LogStreamQueryContextWithDataViews &
        LogStreamQueryContextWithParsedQuery &
        LogStreamQueryContextWithQuery &
        LogStreamQueryContextWithFilters &
        LogStreamQueryContextWithTime &
        LogStreamQueryContextWithValidationError;
    }
  | {
      value: 'time' | { time: 'initialized' } | { time: 'streaming' } | { time: 'static' };
      context: LogStreamQueryContextWithDataViews & LogStreamQueryContextWithTime;
    };

export type LogStreamQueryContext = LogStreamQueryTypestate['context'];

export type LogStreamQueryStateValue = LogStreamQueryTypestate['value'];

export interface UpdateTimeRangeEvent {
  type: 'UPDATE_TIME_RANGE';
  timeRange: Partial<TimeRange>;
}

export interface UpdateRefreshIntervalEvent {
  type: 'UPDATE_REFRESH_INTERVAL';
  refreshInterval: Partial<RefreshInterval>;
}

export type LogStreamQueryEvent =
  | {
      type: 'QUERY_FROM_SEARCH_BAR_CHANGED';
      query: AnyQuery;
    }
  | {
      type: 'FILTERS_FROM_SEARCH_BAR_CHANGED';
      filters: Filter[];
    }
  | {
      type: 'DATA_VIEWS_CHANGED';
      dataViews: DataViewBase[];
    }
  | {
      type: 'VALIDATION_SUCCEEDED';
      parsedQuery: ParsedQuery;
    }
  | {
      type: 'VALIDATION_FAILED';
      error: Error;
    }
  | {
      type: 'INITIALIZED_FROM_URL';
      query: AnyQuery;
      filters: Filter[];
      timeRange: TimeRange | null;
      refreshInterval: RefreshInterval | null;
    }
  | {
      type: 'INITIALIZED_FROM_TIME_FILTER_SERVICE';
      timeRange: TimeRange;
      refreshInterval: RefreshInterval;
    }
  | {
      type: 'TIME_FROM_TIME_FILTER_SERVICE_CHANGED';
      timeRange: TimeRange;
      refreshInterval: RefreshInterval;
    }
  | UpdateTimeRangeEvent
  | UpdateRefreshIntervalEvent
  | PageEndBufferReachedEvent;
