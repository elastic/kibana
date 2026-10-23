/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import { UI_SETTINGS } from '@kbn/data-service';
import type { EntityInventoryEntityType } from '../../types';
import { DEFAULT_TIME_RANGE, ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS } from '../constants';
import { useEntityInventoryKibana } from '../hooks/use_kibana';
import { INVALID_QUERY_TOAST_TITLE, TIME_RANGE_CLAMPED_TOAST_TITLE } from '../translations';
import { clampTimeRange } from '../utils/clamp_time_range';

export interface EntityInventorySearchSubmitPayload {
  dateRange: TimeRange;
  query?: Query;
}

export interface EntityInventorySearchContextValue {
  entityType: EntityInventoryEntityType;
  query: Query;
  filters: Filter[];
  dateRange: TimeRange;
  setFilters: (filters: Filter[]) => void;
  /** Commits a search and returns the effective date range. An invalid query is not committed. */
  submit: (payload: EntityInventorySearchSubmitPayload) => TimeRange;
}

const DEFAULT_QUERY: Query = { language: 'kuery', query: '' };

const EntityInventorySearchContext = createContext<EntityInventorySearchContextValue | null>(null);

/** Holds the page's controlled search state; it never writes to the global query services. */
export const EntityInventorySearchProvider = ({
  entityType,
  children,
}: {
  entityType: EntityInventoryEntityType;
  children?: React.ReactNode;
}) => {
  const {
    services: { notifications, uiSettings },
  } = useEntityInventoryKibana();
  const [query, setQuery] = useState<Query>(DEFAULT_QUERY);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [dateRange, setDateRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);

  const submit = useCallback(
    ({ dateRange: submittedRange, query: submittedQuery }: EntityInventorySearchSubmitPayload) => {
      let queryToCommit = submittedQuery;
      if (submittedQuery?.language === 'kuery') {
        try {
          fromKueryExpression(submittedQuery.query, {
            allowLeadingWildcards: uiSettings.get(UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS),
          });
        } catch (error) {
          notifications.toasts.addError(error, { title: INVALID_QUERY_TOAST_TITLE });
          queryToCommit = undefined;
        }
      }

      const { range, wasClamped, isValid } = clampTimeRange(
        submittedRange,
        ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS
      );
      const effectiveRange = isValid ? range : dateRange;

      if (wasClamped) {
        notifications.toasts.addWarning({ title: TIME_RANGE_CLAMPED_TOAST_TITLE });
      }
      if (queryToCommit) {
        setQuery(queryToCommit);
      }
      setDateRange(effectiveRange);

      return effectiveRange;
    },
    [dateRange, notifications, uiSettings]
  );

  const value = useMemo(
    () => ({ entityType, query, filters, dateRange, setFilters, submit }),
    [entityType, query, filters, dateRange, submit]
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
