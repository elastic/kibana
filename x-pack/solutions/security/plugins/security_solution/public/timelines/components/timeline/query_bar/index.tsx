/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import type { Filter, Query } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import type { FilterManager, SavedQuery, SavedQueryTimeFilter } from '@kbn/data-plugin/public';
import styled from '@emotion/styled';
import { PageScope } from '../../../../data_view_manager/constants';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { InputsModelId } from '../../../../common/store/inputs/constants';

import { convertKueryToElasticSearchQuery } from '../../../../common/lib/kuery';
import type { KqlMode } from '../../../store/model';
import { useSavedQueryServices } from '../../../../common/utils/saved_query_services';
import type { DispatchUpdateReduxTime } from '../../../../common/components/super_date_picker';
import { QueryBar } from '../../../../common/components/query_bar';
import type { DataProvider } from '../data_providers/data_provider';
import { buildGlobalQuery, getNonDropAreaFilters, TIMELINE_FILTER_DROP_AREA } from '../helpers';
import { timelineActions } from '../../../store';
import type { KueryFilterQuery, KueryFilterQueryKind } from '../../../../../common/types/timeline';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';

export interface QueryBarTimelineComponentProps {
  dataProviders: DataProvider[];
  filters: Filter[];
  filterManager: FilterManager;
  filterQuery: KueryFilterQuery;
  from: string;
  fromStr: string;
  kqlMode: KqlMode;
  isRefreshPaused: boolean;
  refreshInterval: number;
  savedQueryId: string | null;
  setSavedQueryId: (savedQueryId: string | null) => void;
  timelineId: string;
  to: string;
  toStr: string;
  updateReduxTime: DispatchUpdateReduxTime;
}

const SearchBarContainer = styled.div`
  /*
  *
  * hide search bar default filters as they are disturbing the layout  as shown below
  *
  * Filters are displayed with QueryBar so below is how is the layout with default filters.
  *
  *
  *                    --------------------------------
  *   -----------------|                              |------------
  *   | DataViewPicker |        QueryBar              | Date      |
  *   -------------------------------------------------------------
  *                    |      Filters                 |
  *                    --------------------------------
  *
  * The tree under this component makes sure that default filters are not rendered and we can separately display
  * them outside query component so that layout is as below:
  *
  *   -----------------------------------------------------------
  *   | DataViewPicker |      QueryBar              |   Date    |
  *   -----------------------------------------------------------
  *   |                       Filters                           |
  *   -----------------------------------------------------------
  *
  * */

  .uniSearchBar .filter-items-group {
    display: none;
  }

  .euiDataGrid__restrictBody & {
    .kbnQueryBar {
      display: flex;
    }
  }
`;

// eslint-disable-next-line react/display-name
export const QueryBarTimeline = memo<QueryBarTimelineComponentProps>(
  ({
    dataProviders,
    filters,
    filterManager,
    filterQuery,
    from,
    fromStr,
    kqlMode,
    isRefreshPaused,
    savedQueryId,
    setSavedQueryId,
    refreshInterval,
    timelineId,
    to,
    toStr,
    updateReduxTime,
  }) => {
    const dispatch = useDispatch();
    const [dateRangeFrom, setDateRangeFrom] = useState<string>(
      fromStr != null ? fromStr : new Date(from).toISOString()
    );
    const [dateRangeTo, setDateRangTo] = useState<string>(
      toStr != null ? toStr : new Date(to).toISOString()
    );
    const { dataView } = useDataView(PageScope.timeline);
    const browserFields = useBrowserFields(PageScope.timeline);

    const [savedQuery, setSavedQuery] = useState<SavedQuery | undefined>(undefined);
    const [filterQueryConverted, setFilterQueryConverted] = useState<Query>({
      query: filterQuery != null ? filterQuery.expression : '',
      language: filterQuery != null ? filterQuery.kind : 'kuery',
    });
    const queryBarFilters = useMemo(() => getNonDropAreaFilters(filters), [filters]);

    const [dataProvidersDsl, setDataProvidersDsl] = useState<string>(
      convertKueryToElasticSearchQuery(buildGlobalQuery(dataProviders, browserFields), dataView)
    );
    const savedQueryServices = useSavedQueryServices();

    const applyKqlFilterQuery = useCallback(
      (expression: string, kind: KueryFilterQueryKind) =>
        dispatch(
          timelineActions.applyKqlFilterQuery({
            id: timelineId,
            filterQuery: {
              kuery: {
                kind,
                expression,
              },
              serializedQuery: convertKueryToElasticSearchQuery(expression, dataView),
            },
          })
        ),
      [dispatch, dataView, timelineId]
    );

    useEffect(() => {
      setFilterQueryConverted({
        query: filterQuery != null ? filterQuery.expression : '',
        language: filterQuery != null ? filterQuery.kind : 'kuery',
      });
    }, [filterQuery]);

    useEffect(() => {
      setDataProvidersDsl(
        convertKueryToElasticSearchQuery(buildGlobalQuery(dataProviders, browserFields), dataView)
      );
    }, [dataProviders, browserFields, dataView]);

    useEffect(() => {
      if (fromStr != null && toStr != null) {
        setDateRangeFrom(fromStr);
        setDateRangTo(toStr);
      } else if (from != null && to != null) {
        setDateRangeFrom(new Date(from).toISOString());
        setDateRangTo(new Date(to).toISOString());
      }
    }, [from, fromStr, to, toStr]);

    useEffect(() => {
      let isSubscribed = true;

      async function setSavedQueryByServices() {
        if (savedQueryId != null && savedQueryServices != null) {
          try {
            // The getSavedQuery function will throw a promise rejection in
            // src/legacy/core_plugins/data/public/search/search_bar/lib/saved_query_service.ts
            // if the savedObjectsClient is undefined. This is happening in a test
            // so I wrapped this in a try catch to keep the unhandled promise rejection
            // warning from appearing in tests.
            const mySavedQuery = await savedQueryServices.getSavedQuery(savedQueryId);
            if (isSubscribed && mySavedQuery != null) {
              setSavedQuery({
                ...mySavedQuery,
                attributes: {
                  ...mySavedQuery.attributes,
                  filters: getNonDropAreaFilters(filters),
                },
              });
            }
          } catch (exc) {
            setSavedQuery(undefined);
          }
        } else if (isSubscribed) {
          setSavedQuery(undefined);
        }
      }

      setSavedQueryByServices();
      return () => {
        isSubscribed = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedQueryId]);

    const onSubmitQuery = useCallback(
      (newQuery: Query, timefilter?: SavedQueryTimeFilter) => {
        if (
          filterQuery == null ||
          (filterQuery != null && filterQuery.expression !== newQuery.query) ||
          filterQuery.kind !== newQuery.language
        ) {
          applyKqlFilterQuery(newQuery.query as string, newQuery.language as KueryFilterQueryKind);
        }
        if (timefilter != null) {
          const isQuickSelection = timefilter.from.includes('now') || timefilter.to.includes('now');

          updateReduxTime({
            id: InputsModelId.timeline,
            end: timefilter.to,
            start: timefilter.from,
            isInvalid: false,
            isQuickSelection,
            timelineId,
            hasRangeChanged: true,
          });
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [filterQuery, timelineId]
    );

    const onSavedQuery = useCallback(
      (newSavedQuery: SavedQuery | undefined) => {
        if (newSavedQuery != null) {
          if (newSavedQuery.id !== savedQueryId) {
            setSavedQueryId(newSavedQuery.id);
          }
          if (savedQueryServices != null && dataProvidersDsl !== '') {
            const dataProviderFilterExists =
              newSavedQuery.attributes.filters != null
                ? newSavedQuery.attributes.filters.findIndex(
                    (f) => f.meta.controlledBy === TIMELINE_FILTER_DROP_AREA
                  )
                : -1;
            savedQueryServices.updateQuery(newSavedQuery.id, {
              ...newSavedQuery.attributes,
              filters:
                newSavedQuery.attributes.filters != null
                  ? dataProviderFilterExists > -1
                    ? [
                        ...newSavedQuery.attributes.filters.slice(0, dataProviderFilterExists),
                        getDataProviderFilter(dataProvidersDsl),
                        ...newSavedQuery.attributes.filters.slice(dataProviderFilterExists + 1),
                      ]
                    : [...newSavedQuery.attributes.filters, getDataProviderFilter(dataProvidersDsl)]
                  : [],
            });
          }
        } else {
          setSavedQueryId(null);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [dataProvidersDsl, savedQueryId, savedQueryServices]
    );

    if (!dataView) {
      return null;
    }

    return (
      <SearchBarContainer className="search_bar_container">
        <QueryBar
          dateRangeFrom={dateRangeFrom}
          dateRangeTo={dateRangeTo}
          hideSavedQuery={kqlMode === 'search'}
          indexPattern={dataView}
          isRefreshPaused={isRefreshPaused}
          filterQuery={filterQueryConverted}
          filterManager={filterManager}
          filters={queryBarFilters}
          onSubmitQuery={onSubmitQuery}
          refreshInterval={refreshInterval}
          savedQuery={savedQuery}
          onSavedQuery={onSavedQuery}
          dataTestSubj={'timelineQueryInput'}
          displayStyle="inPage"
          preventCacheClearOnUnmount={true}
        />
      </SearchBarContainer>
    );
  }
);

export const getDataProviderFilter = (dataProviderDsl: string): Filter => {
  const dslObject = JSON.parse(dataProviderDsl);
  const key = Object.keys(dslObject);
  return {
    ...dslObject,
    meta: {
      alias: TIMELINE_FILTER_DROP_AREA,
      controlledBy: TIMELINE_FILTER_DROP_AREA,
      negate: false,
      disabled: false,
      type: 'custom',
      key: isEmpty(key) ? 'bool' : key[0],
      value: dataProviderDsl,
    },
    $state: {
      store: FilterStateStore.APP_STATE,
    },
  };
};
