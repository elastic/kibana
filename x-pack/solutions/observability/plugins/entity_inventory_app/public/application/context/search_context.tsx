/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { EntityInventoryEntityCategory } from '../../types';
import { ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS } from '../constants';
import { useKibana } from '../../hooks/use_kibana';
import { INVALID_QUERY_TOAST_TITLE, TIME_RANGE_CLAMPED_TOAST_TITLE } from '../translations';
import { clampTimeRange } from '../utils/clamp_time_range';
import { validateQuery } from '../utils/validate_query';
import type { FilterControlsSelection } from '../filters/utils/selection';
import { useUrlSearchState } from './use_url_search_state';

export interface EntityInventorySearchSubmitPayload {
  dateRange: TimeRange;
  query?: Query;
}

export interface EntityInventorySearchContextValue {
  entityCategory: EntityInventoryEntityCategory;
  query: Query;
  filters: Filter[];
  dateRange: TimeRange;
  setFilters: (filters: Filter[]) => void;
  filterControls: FilterControlsSelection;
  setFilterControls: (selection: FilterControlsSelection) => void;
  refreshToken: number;
  /** Commits a search and returns the effective date range. An invalid query is not committed. */
  submit: (payload: EntityInventorySearchSubmitPayload) => TimeRange;
}

const EntityInventorySearchContext = createContext<EntityInventorySearchContextValue | null>(null);

/** Holds the page's search state in the URL; it never writes to the global query services. */
export const EntityInventorySearchProvider = ({
  entityCategory,
  children,
}: {
  entityCategory: EntityInventoryEntityCategory;
  children?: React.ReactNode;
}) => {
  const {
    services: { notifications, uiSettings },
  } = useKibana();
  const [{ query, filters, dateRange, filterControls }, updateSearchState] = useUrlSearchState();
  const [refreshToken, setRefreshToken] = useState(0);

  const setFilters = useCallback(
    (nextFilters: Filter[]) => updateSearchState({ filters: nextFilters }),
    [updateSearchState]
  );

  const setFilterControls = useCallback(
    (selection: FilterControlsSelection) => updateSearchState({ filterControls: selection }),
    [updateSearchState]
  );

  const submit = useCallback(
    ({ dateRange: submittedRange, query: submittedQuery }: EntityInventorySearchSubmitPayload) => {
      let queryToCommit = submittedQuery;
      // SearchBar submits the raw query text without parsing it; reject invalid KQL here so the
      // last valid query is kept and consumers never receive a query that fails to parse.
      const queryError = submittedQuery && validateQuery(submittedQuery, uiSettings);
      if (queryError) {
        notifications.toasts.addError(queryError, { title: INVALID_QUERY_TOAST_TITLE });
        queryToCommit = undefined;
      }

      const { range, wasClamped, isValid } = clampTimeRange(
        submittedRange,
        ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS
      );
      const effectiveRange = isValid ? range : dateRange;

      if (wasClamped) {
        notifications.toasts.addWarning({ title: TIME_RANGE_CLAMPED_TOAST_TITLE });
      }
      updateSearchState({
        ...(queryToCommit && { query: queryToCommit }),
        dateRange: effectiveRange,
      });
      setRefreshToken((token) => token + 1);

      return effectiveRange;
    },
    [dateRange, notifications, updateSearchState, uiSettings]
  );

  const value = useMemo(
    () => ({
      entityCategory,
      query,
      filters,
      dateRange,
      setFilters,
      filterControls,
      setFilterControls,
      refreshToken,
      submit,
    }),
    [
      entityCategory,
      query,
      filters,
      dateRange,
      setFilters,
      filterControls,
      setFilterControls,
      refreshToken,
      submit,
    ]
  );

  return (
    <EntityInventorySearchContext.Provider value={value}>
      {children}
    </EntityInventorySearchContext.Provider>
  );
};

/** Reads the search state of the surrounding entity inventory page shell. */
export const useEntityInventorySearch = (): EntityInventorySearchContextValue => {
  const context = useContext(EntityInventorySearchContext);
  if (!context) {
    throw new Error(
      'useEntityInventorySearch must be used within an EntityInventorySearchProvider'
    );
  }
  return context;
};
