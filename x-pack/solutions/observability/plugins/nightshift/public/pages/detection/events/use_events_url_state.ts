/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSignificantEventsSortField,
  MAX_SIGNIFICANT_EVENTS_SEARCH_LENGTH,
  SIGNIFICANT_EVENT_INVESTIGATION_STATES,
  SIGNIFICANT_EVENTS_SORT_ORDERS,
  type SignificantEventInvestigationState,
  type SignificantEventsSortField,
  type SignificantEventsSortOrder,
} from '@kbn/significant-events-plugin/common';
import {
  SEVERITY_OPTIONS,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  type Severity,
  type SignificantEventStatus,
} from '@kbn/significant-events-schema';
import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  clearNightshiftEventIdParam,
  getNightshiftEventIdFromSearch,
  setNightshiftEventIdParam,
} from '../../../common/url_params';
import { PAGE_QUERY_PARAM } from '../constants';
import { useUrlSearchParam } from '../use_url_search_param';

// PAGE_QUERY_PARAM lives in ../constants because the time range hook also resets it.
const SEARCH_QUERY_PARAM = 'search';
const STATUS_QUERY_PARAM = 'status';
const SEVERITY_QUERY_PARAM = 'severity';
const INVESTIGATION_QUERY_PARAM = 'investigation';
const SORT_FIELD_QUERY_PARAM = 'sortField';
const SORT_ORDER_QUERY_PARAM = 'sortOrder';
// The design leads with the most severe events.
const DEFAULT_SORT: EventsSort = { field: 'severity', order: 'desc' };
const isSignificantEventStatus = (value: string): value is SignificantEventStatus =>
  SIGNIFICANT_EVENT_STATUS_OPTIONS.includes(value as SignificantEventStatus);

const isSeverity = (value: string): value is Severity =>
  SEVERITY_OPTIONS.includes(value as Severity);

const isInvestigationState = (value: string): value is SignificantEventInvestigationState =>
  SIGNIFICANT_EVENT_INVESTIGATION_STATES.includes(value as SignificantEventInvestigationState);

export interface EventsSort {
  field: SignificantEventsSortField;
  order: SignificantEventsSortOrder;
}

const getSort = (params: URLSearchParams): EventsSort => {
  const field = params.get(SORT_FIELD_QUERY_PARAM);
  const order = params.get(SORT_ORDER_QUERY_PARAM);
  return {
    field: isSignificantEventsSortField(field) ? field : DEFAULT_SORT.field,
    order: SIGNIFICANT_EVENTS_SORT_ORDERS.find((option) => option === order) ?? DEFAULT_SORT.order,
  };
};

const getPage = (params: URLSearchParams): number => {
  const value = Number(params.get(PAGE_QUERY_PARAM));
  return Number.isInteger(value) && value > 0 ? value : 1;
};

export const useEventsUrlState = () => {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const {
    value: searchValue,
    query: searchQuery,
    onChange: onSearchChange,
    clear: clearSearch,
  } = useUrlSearchParam(SEARCH_QUERY_PARAM, MAX_SIGNIFICANT_EVENTS_SEARCH_LENGTH);
  const status = params.getAll(STATUS_QUERY_PARAM).filter(isSignificantEventStatus);
  const severity = params.getAll(SEVERITY_QUERY_PARAM).filter(isSeverity);
  const investigation = params.getAll(INVESTIGATION_QUERY_PARAM).filter(isInvestigationState);
  const sort = getSort(params);
  const page = getPage(params);
  const eventId = getNightshiftEventIdFromSearch(search);

  const updateParams = useCallback(
    (update: (nextParams: URLSearchParams) => void, replace = false) => {
      const nextParams = new URLSearchParams(search);
      update(nextParams);
      const nextLocation = { pathname, search: nextParams.toString() };
      if (replace) {
        history.replace(nextLocation);
      } else {
        history.push(nextLocation);
      }
    },
    [history, pathname, search]
  );

  const setListParam = useCallback(
    (
      key:
        | typeof STATUS_QUERY_PARAM
        | typeof SEVERITY_QUERY_PARAM
        | typeof INVESTIGATION_QUERY_PARAM,
      values: readonly string[]
    ) => {
      updateParams((nextParams) => {
        nextParams.delete(key);
        values.forEach((value) => nextParams.append(key, value));
        nextParams.delete(PAGE_QUERY_PARAM);
      });
    },
    [updateParams]
  );

  const setPage = useCallback(
    (nextPage: number, replace = false) => {
      updateParams((nextParams) => {
        if (nextPage > 1) {
          nextParams.set(PAGE_QUERY_PARAM, String(nextPage));
        } else {
          nextParams.delete(PAGE_QUERY_PARAM);
        }
      }, replace);
    },
    [updateParams]
  );

  const setSort = useCallback(
    (nextSort: EventsSort) => {
      updateParams((nextParams) => {
        nextParams.set(SORT_FIELD_QUERY_PARAM, nextSort.field);
        nextParams.set(SORT_ORDER_QUERY_PARAM, nextSort.order);
        nextParams.delete(PAGE_QUERY_PARAM);
      });
    },
    [updateParams]
  );

  const openEvent = useCallback(
    (nextEventId: string) => {
      updateParams((nextParams) => setNightshiftEventIdParam(nextParams, nextEventId));
    },
    [updateParams]
  );

  const closeEvent = useCallback(
    (replace = false) => {
      updateParams(clearNightshiftEventIdParam, replace);
    },
    [updateParams]
  );

  const clearFilters = useCallback(() => {
    clearSearch();
    updateParams((nextParams) => {
      nextParams.delete(SEARCH_QUERY_PARAM);
      nextParams.delete(STATUS_QUERY_PARAM);
      nextParams.delete(SEVERITY_QUERY_PARAM);
      nextParams.delete(INVESTIGATION_QUERY_PARAM);
      nextParams.delete(PAGE_QUERY_PARAM);
    });
  }, [clearSearch, updateParams]);

  return {
    searchValue,
    searchQuery,
    status,
    severity,
    investigation,
    sort,
    page,
    eventId,
    hasFilters: Boolean(searchQuery || status.length || severity.length || investigation.length),
    onSearchChange,
    setStatus: (nextStatus: SignificantEventStatus[]) =>
      setListParam(STATUS_QUERY_PARAM, nextStatus),
    setSeverity: (nextSeverity: Severity[]) => setListParam(SEVERITY_QUERY_PARAM, nextSeverity),
    setInvestigation: (nextInvestigation: SignificantEventInvestigationState[]) =>
      setListParam(INVESTIGATION_QUERY_PARAM, nextInvestigation),
    setSort,
    setPage,
    openEvent,
    closeEvent,
    clearFilters,
  };
};
