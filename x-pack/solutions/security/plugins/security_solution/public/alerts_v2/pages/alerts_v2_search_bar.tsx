/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { useKibana } from '../../common/lib/kibana';

export interface AlertsV2SearchBarProps {
  /** The active (submitted) ES|QL query. */
  query: AggregateQuery;
  /** The active time range. */
  timeRange: TimeRange;
  /** Called when the user presses Run / submits the bar. */
  onSubmit: (payload: { query: AggregateQuery; timeRange: TimeRange }) => void;
}

/**
 * ES|QL search bar for the Alerts v2 page, rendered in the same "Query in ES|QL"
 * mode Discover uses: the `unifiedSearch` AggregateQuerySearchBar (ES|QL editor +
 * time picker + Run button).
 *
 * The bar only *consumes* a DataView (for the time picker); it does not build one.
 * So we derive an ad-hoc, in-memory DataView from the query's `FROM` clause and
 * feed it in, re-deriving whenever the query changes — mirroring Discover. The
 * actual data fetch never uses this DataView; Elasticsearch resolves indices from
 * the query text itself.
 */
export const AlertsV2SearchBar = ({ query, timeRange, onSubmit }: AlertsV2SearchBarProps) => {
  const {
    services: { unifiedSearch, dataViews, http },
  } = useKibana();

  const SearchBar = unifiedSearch.ui.AggregateQuerySearchBar;

  const [dataView, setDataView] = useState<DataView | undefined>();

  useEffect(() => {
    let cancelled = false;
    getESQLAdHocDataview({ query: query.esql, dataViewsService: dataViews, http }).then((next) => {
      if (!cancelled) {
        setDataView(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query.esql, dataViews, http]);

  const indexPatterns = useMemo(() => (dataView ? [dataView] : undefined), [dataView]);

  const onQuerySubmit = useCallback(
    (payload: { dateRange: TimeRange; query?: Query | AggregateQuery }) => {
      const nextQuery =
        payload.query && 'esql' in payload.query ? payload.query : query;
      onSubmit({ query: nextQuery, timeRange: payload.dateRange });
    },
    [onSubmit, query]
  );

  return (
    <SearchBar
      appName="securitySolution"
      query={query}
      dateRangeFrom={timeRange.from}
      dateRangeTo={timeRange.to}
      indexPatterns={indexPatterns}
      showQueryInput
      showDatePicker
      showFilterBar={false}
      showSaveQuery={false}
      displayStyle="inPage"
      onQuerySubmit={onQuerySubmit}
    />
  );
};
