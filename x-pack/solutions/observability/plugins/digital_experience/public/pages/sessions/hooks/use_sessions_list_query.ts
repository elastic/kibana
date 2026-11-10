/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { SESSIONS_LIST_DEFAULT_PER_PAGE, type SessionSortField } from '../../../../common/sessions';
import { useDigitalExperienceParams } from '../../../hooks/use_digital_experience_params';
import { useUpdateUrlQuery } from '../../../hooks/use_update_url_query';
import type { DurationBucket, SessionsListUrlQuery } from '../../../utils/sessions_list_query';

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

/**
 * The sessions list's search, filters, sort and page from the URL, and setters that keep the other
 * params, e.g. the time range. Changing what is listed goes back to the first page.
 */
export const useSessionsListQuery = () => {
  const { query } = useDigitalExperienceParams('/{serviceName}/sessions');
  const updateUrlQuery = useUpdateUrlQuery();

  const state = useMemo<SessionsListState>(
    () => ({
      search: query.search,
      browser: query.browser,
      os: query.os,
      country: query.country,
      entryPage: query.entryPage,
      hasErrors: query.hasErrors ?? false,
      duration: query.duration,
      sortField: query.sortField ?? 'start_time',
      sortDirection: query.sortDirection ?? 'desc',
      page: query.page ?? 0,
      perPage: query.perPage ?? SESSIONS_LIST_DEFAULT_PER_PAGE,
    }),
    [query]
  );

  const update = useCallback(
    (patch: Partial<Record<keyof SessionsListUrlQuery, string | undefined>>, replace = false) =>
      // Paging is only kept when it's what changes.
      updateUrlQuery(patch, { replace, remove: 'page' in patch ? [] : ['page'] }),
    [updateUrlQuery]
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
