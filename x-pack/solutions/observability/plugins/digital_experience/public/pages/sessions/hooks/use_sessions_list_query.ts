/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { omit } from 'lodash';
import qs from 'query-string';
import type { SessionSortField } from '../../../../common/sessions';
import { useDigitalExperienceParams } from '../../../hooks/use_digital_experience_params';
import type { DurationBucket, SessionsListUrlQuery } from '../../../utils/sessions_list_query';

export const SESSIONS_PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
/** The list API's last page. */
const MAX_PAGE = 1000;

/** Keys that narrow the list, which `clearFilters` removes. */
const FILTER_KEYS = [
  'search',
  'browser',
  'os',
  'country',
  'entryPage',
  'hasErrors',
  'duration',
] as const satisfies ReadonlyArray<keyof SessionsListUrlQuery>;

export interface SessionsListState {
  search?: string;
  browser?: string;
  os?: string;
  country?: string;
  entryPage?: string;
  hasErrors: boolean;
  duration?: DurationBucket;
  sortField: SessionSortField;
  sortDirection: 'asc' | 'desc';
  page: number;
  perPage: number;
}

const toPage = (value: string | undefined): number => {
  const page = Number(value);
  return Number.isInteger(page) && page >= 0 ? Math.min(page, MAX_PAGE) : 0;
};

const toPageSize = (value: string | undefined): number => {
  const size = Number(value);
  return SESSIONS_PAGE_SIZES.some((option) => option === size) ? size : DEFAULT_PAGE_SIZE;
};

/** An empty param, e.g. `?browser=`, counts as unset. */
const valueOf = (value: string | undefined): string | undefined => value || undefined;

/**
 * The sessions list's search, filters, sort and page from the URL, and setters that keep the other
 * params, e.g. the time range. Changing what is listed goes back to the first page.
 */
export const useSessionsListQuery = () => {
  const { query } = useDigitalExperienceParams('/{serviceName}/sessions');
  const history = useHistory();
  const location = useLocation();

  const state = useMemo<SessionsListState>(
    () => ({
      search: valueOf(query.search),
      browser: valueOf(query.browser),
      os: valueOf(query.os),
      country: valueOf(query.country),
      entryPage: valueOf(query.entryPage),
      hasErrors: query.hasErrors === 'true',
      duration: query.duration,
      sortField: query.sortField ?? 'start_time',
      sortDirection: query.sortDirection ?? 'desc',
      page: toPage(query.page),
      perPage: toPageSize(query.perPage),
    }),
    [query]
  );

  const update = useCallback(
    (patch: Partial<Record<keyof SessionsListUrlQuery, string | undefined>>, replace = false) => {
      const current = qs.parse(location.search);
      // Paging is only kept when it's what changes.
      const base = 'page' in patch ? current : omit(current, 'page');
      const next: Record<string, unknown> = { ...base };
      for (const [key, value] of Object.entries(patch)) {
        if (value) {
          next[key] = value;
        } else {
          delete next[key];
        }
      }
      // Sorted like the typed router's links, so a breadcrumb to this page matches the URL exactly.
      const nextLocation = { ...location, search: qs.stringify(next) };
      if (replace) {
        history.replace(nextLocation);
      } else {
        history.push(nextLocation);
      }
    },
    [history, location]
  );

  const setSearch = useCallback(
    // Replaced, so Back doesn't step through each search as it was typed.
    (search: string) => update({ search: search.trim() || undefined }, true),
    [update]
  );

  const clearFilters = useCallback(
    () => update(Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined]))),
    [update]
  );

  const hasActiveFilters = FILTER_KEYS.some((key) =>
    key === 'hasErrors' ? state.hasErrors : Boolean(state[key])
  );

  return { state, update, setSearch, clearFilters, hasActiveFilters };
};
