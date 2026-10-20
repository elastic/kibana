/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDebouncedValue } from '@kbn/react-hooks';
import {
  SEVERITY_OPTIONS,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  type Severity,
  type SignificantEventStatus,
} from '@kbn/significant-events-schema';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  clearNightshiftEventIdParam,
  getNightshiftEventIdFromSearch,
  setNightshiftEventIdParam,
} from '../../../common/url_params';

const SEARCH_QUERY_PARAM = 'search';
const STATUS_QUERY_PARAM = 'status';
const SEVERITY_QUERY_PARAM = 'severity';
const PAGE_QUERY_PARAM = 'page';
const SEARCH_DEBOUNCE_MS = 300;
const MAX_SEARCH_LENGTH = 500;

const isSignificantEventStatus = (value: string): value is SignificantEventStatus =>
  SIGNIFICANT_EVENT_STATUS_OPTIONS.includes(value as SignificantEventStatus);

const isSeverity = (value: string): value is Severity =>
  SEVERITY_OPTIONS.includes(value as Severity);

const getPage = (params: URLSearchParams): number => {
  const value = Number(params.get(PAGE_QUERY_PARAM));
  return Number.isInteger(value) && value > 0 ? value : 1;
};

export const useEventsUrlState = () => {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const urlSearch = (params.get(SEARCH_QUERY_PARAM) ?? '').slice(0, MAX_SEARCH_LENGTH);
  const [searchValue, setSearchValue] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS).trim();
  const status = params.getAll(STATUS_QUERY_PARAM).filter(isSignificantEventStatus);
  const severity = params.getAll(SEVERITY_QUERY_PARAM).filter(isSeverity);
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

  useEffect(() => {
    setSearchValue(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    if (debouncedSearch === urlSearch) {
      return;
    }

    updateParams((nextParams) => {
      if (debouncedSearch) {
        nextParams.set(SEARCH_QUERY_PARAM, debouncedSearch);
      } else {
        nextParams.delete(SEARCH_QUERY_PARAM);
      }
      nextParams.delete(PAGE_QUERY_PARAM);
    }, true);
  }, [debouncedSearch, updateParams, urlSearch]);

  const setListParam = useCallback(
    (key: typeof STATUS_QUERY_PARAM | typeof SEVERITY_QUERY_PARAM, values: readonly string[]) => {
      updateParams((nextParams) => {
        nextParams.delete(key);
        values.forEach((value) => nextParams.append(key, value));
        nextParams.delete(PAGE_QUERY_PARAM);
      });
    },
    [updateParams]
  );

  const onSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value.slice(0, MAX_SEARCH_LENGTH));
  }, []);

  const setPage = useCallback(
    (nextPage: number) => {
      updateParams((nextParams) => {
        if (nextPage > 1) {
          nextParams.set(PAGE_QUERY_PARAM, String(nextPage));
        } else {
          nextParams.delete(PAGE_QUERY_PARAM);
        }
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

  const closeEvent = useCallback(() => {
    updateParams(clearNightshiftEventIdParam);
  }, [updateParams]);

  const clearFilters = useCallback(() => {
    setSearchValue('');
    updateParams((nextParams) => {
      nextParams.delete(SEARCH_QUERY_PARAM);
      nextParams.delete(STATUS_QUERY_PARAM);
      nextParams.delete(SEVERITY_QUERY_PARAM);
      nextParams.delete(PAGE_QUERY_PARAM);
    });
  }, [updateParams]);

  return {
    searchValue,
    debouncedSearch,
    status,
    severity,
    page,
    eventId,
    hasFilters: Boolean(debouncedSearch || status.length || severity.length),
    onSearchChange,
    setStatus: (nextStatus: SignificantEventStatus[]) =>
      setListParam(STATUS_QUERY_PARAM, nextStatus),
    setSeverity: (nextSeverity: Severity[]) => setListParam(SEVERITY_QUERY_PARAM, nextSeverity),
    setPage,
    openEvent,
    closeEvent,
    clearFilters,
  };
};
