/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, isEmpty } from 'lodash';
import type { PropsWithChildren, FC } from 'react';
import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import deepEqual from 'fast-deep-equal';

import type { DataViewBase, Filter, Query, AggregateQuery, TimeRange } from '@kbn/es-query';
import type { FilterManager, SavedQuery, SavedQueryTimeFilter } from '@kbn/data-plugin/public';
import { TimeHistory } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SearchBarProps } from '@kbn/unified-search-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { css, Global } from '@emotion/react';
import { useKibana } from '../../lib/kibana';
import { convertToQueryType } from './convert_to_query_type';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

export interface QueryBarComponentProps {
  dataTestSubj?: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  hideSavedQuery?: boolean;
  indexPattern: DataViewBase;
  isLoading?: boolean;
  isRefreshPaused?: boolean;
  filterQuery: Query;
  filterManager: FilterManager;
  filters: Filter[];
  onChangedQuery?: (query: Query) => void;
  onSubmitQuery: (query: Query, timefilter?: SavedQueryTimeFilter) => void;
  refreshInterval?: number;
  savedQuery?: SavedQuery;
  onSavedQuery: (savedQuery: SavedQuery | undefined) => void;
  displayStyle?: SearchBarProps['displayStyle'];
  isDisabled?: boolean;
  bubbleSubmitEvent?: boolean;
}

export const isDataView = (obj: unknown): obj is DataView =>
  obj != null && typeof obj === 'object' && Object.hasOwn(obj, 'getName');

const CustomStylesWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const wrapperClassName = 'ruleEditQueryBarWrapper';

  const customCss = css`
    .${wrapperClassName} .kbnQueryBar__filterButtonGroup {
      align-self: start;
    }

    .${wrapperClassName} .kbnQueryBar__wrap {
      height: auto !important;
    }
  `;

  return (
    <>
      <Global styles={customCss} />
      <div className={wrapperClassName}>{children}</div>
    </>
  );
};

export const QueryBar = memo<QueryBarComponentProps>(
  ({
    dateRangeFrom,
    dateRangeTo,
    hideSavedQuery = false,
    indexPattern,
    isLoading = false,
    isRefreshPaused,
    filterQuery,
    filterManager,
    filters,
    onChangedQuery,
    onSubmitQuery,
    refreshInterval,
    savedQuery,
    onSavedQuery,
    dataTestSubj,
    displayStyle,
    isDisabled,
    bubbleSubmitEvent,
  }) => {
    const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
    const { data } = useKibana().services;
    const [dataView, setDataView] = useState<DataView>();
    const onQuerySubmit = useCallback(
      (payload: { dateRange: TimeRange; query?: Query | AggregateQuery }) => {
        if (payload.query != null && !deepEqual(payload.query, filterQuery)) {
          const payloadQuery = convertToQueryType(payload.query);

          onSubmitQuery(payloadQuery);
        }
      },
      [filterQuery, onSubmitQuery]
    );

    const onQueryChange = useCallback(
      (payload: { dateRange: TimeRange; query?: Query | AggregateQuery }) => {
        if (onChangedQuery && payload.query != null && !deepEqual(payload.query, filterQuery)) {
          const payloadQuery = convertToQueryType(payload.query);
          onChangedQuery(payloadQuery);
        }
      },
      [filterQuery, onChangedQuery]
    );

    const onSavedQueryUpdated = useCallback(
      (savedQueryUpdated: SavedQuery) => {
        const { query: newQuery, filters: newFilters, timefilter } = savedQueryUpdated.attributes;
        onSubmitQuery(newQuery, timefilter);
        filterManager.setFilters(newFilters || []);
        onSavedQuery(savedQueryUpdated);
      },
      [filterManager, onSubmitQuery, onSavedQuery]
    );

    const onClearSavedQuery = useCallback(() => {
      if (savedQuery != null) {
        onSubmitQuery({
          query: '',
          language: savedQuery.attributes.query.language,
        });
        filterManager.setFilters([]);
        onSavedQuery(undefined);
      }
    }, [filterManager, onSubmitQuery, onSavedQuery, savedQuery]);

    const onFiltersUpdated = useCallback(
      (newFilters: Filter[]) => {
        filterManager.setFilters(newFilters);
      },
      [filterManager]
    );

    const isEsql = filterQuery?.language === 'esql';
    const query = useMemo(() => {
      if (isEsql && typeof filterQuery.query === 'string') {
        return { esql: filterQuery.query };
      }
      return filterQuery;
    }, [filterQuery, isEsql]);

    useEffect(() => {
      let dv: DataView;
      if (isDataView(indexPattern)) {
        setDataView(indexPattern);
      } else if (!isEsql && !isEmpty(indexPattern.title)) {
        const createDataView = async () => {
          dv = await data.dataViews.create({ id: indexPattern.title, title: indexPattern.title });
          setDataView(dv);
        };
        createDataView();
      }
      return () => {
        if (dv?.id && !newDataViewPickerEnabled) {
          data.dataViews.clearInstanceCache(dv?.id);
        }
      };
    }, [data.dataViews, indexPattern, isEsql, newDataViewPickerEnabled]);

    const searchBarFilters = useMemo(() => {
      if (isDataView(indexPattern) || isEsql) {
        return filters;
      }

      /**
       * We update filters and set new data view id to make sure that SearchBar does not show data view picker
       * More details in https://github.com/elastic/kibana/issues/174026
       */
      const updatedFilters = cloneDeep(filters);
      updatedFilters.forEach((filter) => (filter.meta.index = indexPattern.title));
      return updatedFilters;
    }, [filters, indexPattern, isEsql]);

    const timeHistory = useMemo(() => new TimeHistory(new Storage(localStorage)), []);
    const arrDataView = useMemo(() => (dataView != null ? [dataView] : []), [dataView]);
    return (
      <CustomStylesWrapper>
        <SearchBar
          showSubmitButton={false}
          dateRangeFrom={dateRangeFrom}
          dateRangeTo={dateRangeTo}
          filters={searchBarFilters}
          indexPatterns={arrDataView}
          isLoading={isLoading}
          isRefreshPaused={isRefreshPaused}
          query={query}
          onClearSavedQuery={onClearSavedQuery}
          onFiltersUpdated={onFiltersUpdated}
          onQueryChange={onQueryChange}
          onQuerySubmit={onQuerySubmit}
          onSaved={onSavedQuery}
          onSavedQueryUpdated={onSavedQueryUpdated}
          refreshInterval={refreshInterval}
          showAutoRefreshOnly={false}
          showFilterBar={!hideSavedQuery}
          showDatePicker={false}
          showQueryInput={true}
          showSaveQuery={true}
          timeHistory={timeHistory}
          dataTestSubj={dataTestSubj}
          savedQuery={savedQuery}
          displayStyle={isEsql ? 'withBorders' : displayStyle}
          isDisabled={isDisabled}
          bubbleSubmitEvent={bubbleSubmitEvent}
        />
      </CustomStylesWrapper>
    );
  }
);

QueryBar.displayName = 'QueryBar';
