/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set/fp';
import { getOr } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';
import { Subscription } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { FilterManager, SavedQuery } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { OnTimeChangeProps } from '@elastic/eui';
import { inputsActions } from '../../store/inputs';
import type { InputsRange } from '../../store/inputs/model';
import type { InputsModelId } from '../../store/inputs/constants';
import type { inputsModel, State } from '../../store';
import { formatDate } from '../super_date_picker';
import {
  endSelector,
  filterQuerySelector,
  fromStrSelector,
  isLoadingSelector,
  queriesSelector,
  savedQuerySelector,
  startSelector,
  toStrSelector,
} from './selectors';
import { timelineActions } from '../../../timelines/store';
import { useKibana } from '../../lib/kibana';
import { usersActions } from '../../../explore/users/store';
import { hostsActions } from '../../../explore/hosts/store';
import { networkActions } from '../../../explore/network/store';
import { useSyncSearchBarUrlParams } from '../../hooks/search_bar/use_sync_search_bar_url_param';
import { useSyncTimerangeUrlParam } from '../../hooks/search_bar/use_sync_timerange_url_param';

interface SiemSearchBarProps {
  dataTestSubj?: string;
  dataView: DataView;
  hideFilterBar?: boolean;
  hideQueryInput?: boolean;
  id: InputsModelId.global | InputsModelId.timeline;
  pollForSignalIndex?: () => void;
  timelineId?: string;
  /**
   * Allows to hide the query menu button displayed to the left of the query input.
   */
  hideQueryMenu?: boolean;
}

export const SearchBarComponent = memo<SiemSearchBarProps & PropsFromRedux>(
  ({
    dataTestSubj,
    dataView,
    end,
    filterQuery,
    fromStr,
    hideFilterBar = false,
    hideQueryInput = false,
    hideQueryMenu = false,
    id,
    isLoading = false,
    pollForSignalIndex,
    queries,
    savedQuery,
    setSavedQuery,
    setSearchBarFilter,
    start,
    toStr,
    updateSearch,
  }) => {
    const {
      data: {
        query: {
          timefilter: { timefilter },
          filterManager,
        },
      },
      unifiedSearch: {
        ui: { SearchBar },
      },
    } = useKibana().services;

    const dispatch = useDispatch();
    const setTablesActivePageToZero = useCallback(() => {
      dispatch(usersActions.setUsersTablesActivePageToZero());
      dispatch(hostsActions.setHostTablesActivePageToZero());
      dispatch(networkActions.setNetworkTablesActivePageToZero());
    }, [dispatch]);

    useSyncSearchBarUrlParams();
    useSyncTimerangeUrlParam();

    useEffect(() => {
      if (fromStr != null && toStr != null) {
        timefilter.setTime({ from: fromStr, to: toStr });
      } else if (start != null && end != null) {
        setTablesActivePageToZero();

        timefilter.setTime({
          from: new Date(start).toISOString(),
          to: new Date(end).toISOString(),
        });
      }
    }, [end, fromStr, start, timefilter, toStr, setTablesActivePageToZero]);

    const onQuerySubmit = useCallback(
      (payload: { dateRange: TimeRange; query?: Query }) => {
        // if the function is there, call it to check if the signals index exists yet
        // in order to update the index fields
        if (pollForSignalIndex != null) {
          pollForSignalIndex();
        }
        const isQuickSelection =
          payload.dateRange.from.includes('now') || payload.dateRange.to.includes('now');
        let updateSearchBar: UpdateReduxSearchBar = {
          id,
          end: toStr != null ? toStr : new Date(end).toISOString(),
          start: fromStr != null ? fromStr : new Date(start).toISOString(),
          isInvalid: false,
          isQuickSelection,
          updateTime: false,
          filterManager,
          setTablesActivePageToZero,
        };
        let isStateUpdated = false;

        if (
          (isQuickSelection &&
            (fromStr !== payload.dateRange.from || toStr !== payload.dateRange.to)) ||
          (!isQuickSelection &&
            (start !== formatDate(payload.dateRange.from) ||
              end !== formatDate(payload.dateRange.to)))
        ) {
          isStateUpdated = true;
          updateSearchBar.updateTime = true;
          updateSearchBar.end = payload.dateRange.to;
          updateSearchBar.start = payload.dateRange.from;
        }

        if (payload.query != null && !deepEqual(payload.query, filterQuery)) {
          isStateUpdated = true;
          updateSearchBar = set('query', payload.query, updateSearchBar);
        }

        if (!isStateUpdated) {
          // That mean we are doing a refresh!
          if (isQuickSelection && payload.dateRange.to !== payload.dateRange.from) {
            updateSearchBar.updateTime = true;
            updateSearchBar.end = payload.dateRange.to;
            updateSearchBar.start = payload.dateRange.from;
          } else {
            queries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
          }
        }

        window.setTimeout(() => updateSearch(updateSearchBar), 0);
      },
      [
        id,
        pollForSignalIndex,
        toStr,
        end,
        fromStr,
        start,
        filterManager,
        filterQuery,
        queries,
        updateSearch,
        setTablesActivePageToZero,
      ]
    );

    const onRefresh = useCallback(
      (payload: { dateRange: TimeRange }) => {
        if (payload.dateRange.from.includes('now') || payload.dateRange.to.includes('now')) {
          updateSearch({
            id,
            end: payload.dateRange.to,
            start: payload.dateRange.from,
            isInvalid: false,
            isQuickSelection: true,
            updateTime: true,
            filterManager,
            setTablesActivePageToZero,
          });
        } else {
          queries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
        }
      },
      [updateSearch, id, filterManager, queries, setTablesActivePageToZero]
    );

    const onSaved = useCallback(
      (newSavedQuery: SavedQuery) => {
        setSavedQuery({ id, savedQuery: newSavedQuery });
      },
      [id, setSavedQuery]
    );

    const onSavedQueryUpdated = useCallback(
      (savedQueryUpdated: SavedQuery) => {
        const isQuickSelection = savedQueryUpdated.attributes.timefilter
          ? savedQueryUpdated.attributes.timefilter.from.includes('now') ||
            savedQueryUpdated.attributes.timefilter.to.includes('now')
          : false;

        let updateSearchBar: UpdateReduxSearchBar = {
          id,
          filters: savedQueryUpdated.attributes.filters || [],
          end: toStr != null ? toStr : new Date(end).toISOString(),
          start: fromStr != null ? fromStr : new Date(start).toISOString(),
          isInvalid: false,
          isQuickSelection,
          updateTime: false,
          filterManager,
          setTablesActivePageToZero,
        };

        if (savedQueryUpdated.attributes.timefilter) {
          updateSearchBar.end = savedQueryUpdated.attributes.timefilter
            ? savedQueryUpdated.attributes.timefilter.to
            : updateSearchBar.end;
          updateSearchBar.start = savedQueryUpdated.attributes.timefilter
            ? savedQueryUpdated.attributes.timefilter.from
            : updateSearchBar.start;
          updateSearchBar.updateTime = true;
        }

        updateSearchBar = set('query', savedQueryUpdated.attributes.query, updateSearchBar);
        updateSearchBar = set('savedQuery', savedQueryUpdated, updateSearchBar);

        updateSearch(updateSearchBar);
      },
      [id, toStr, end, fromStr, start, filterManager, updateSearch, setTablesActivePageToZero]
    );

    const onClearSavedQuery = useCallback(() => {
      if (savedQuery != null) {
        updateSearch({
          id,
          filters: [],
          end: toStr != null ? toStr : new Date(end).toISOString(),
          start: fromStr != null ? fromStr : new Date(start).toISOString(),
          isInvalid: false,
          isQuickSelection: false,
          updateTime: false,
          query: {
            query: '',
            language: savedQuery.attributes.query.language,
          },
          resetSavedQuery: true,
          savedQuery: undefined,
          filterManager,
          setTablesActivePageToZero,
        });
      }
    }, [
      savedQuery,
      updateSearch,
      id,
      toStr,
      end,
      fromStr,
      start,
      filterManager,
      setTablesActivePageToZero,
    ]);

    useEffect(() => {
      let isSubscribed = true;
      const subscriptions = new Subscription();

      subscriptions.add(
        filterManager.getUpdates$().subscribe({
          next: () => {
            if (isSubscribed) {
              const filters = filterManager.getFilters();

              setSearchBarFilter({ id, filters });
              setTablesActivePageToZero();
            }
          },
        })
      );

      return () => {
        isSubscribed = false;
        subscriptions.unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dataViews: DataView[] | null = useMemo(() => {
      if (dataView != null) {
        return [dataView];
      }
      return null;
    }, [dataView]);

    const onTimeRangeChange = useCallback(
      ({ dateRange }: { dateRange: TimeRange }) => {
        const isQuickSelection = dateRange.from.includes('now') || dateRange.to.includes('now');
        updateSearch({
          end: dateRange.to,
          filterManager,
          id,
          isInvalid: false,
          isQuickSelection,
          setTablesActivePageToZero,
          start: dateRange.from,
          updateTime: true,
        });
      },
      [filterManager, id, setTablesActivePageToZero, updateSearch]
    );
    return dataViews ? (
      <div data-test-subj={`${id}DatePicker`}>
        <SearchBar
          appName="siem"
          isLoading={isLoading}
          indexPatterns={dataViews}
          query={filterQuery}
          onClearSavedQuery={onClearSavedQuery}
          onQuerySubmit={onQuerySubmit}
          onRefresh={onRefresh}
          onSaved={onSaved}
          onTimeRangeChange={onTimeRangeChange}
          onSavedQueryUpdated={onSavedQueryUpdated}
          savedQuery={savedQuery}
          showFilterBar={!hideFilterBar}
          showDatePicker={true}
          showQueryInput={!hideQueryInput}
          showQueryMenu={!hideQueryMenu}
          allowSavingQueries
          dataTestSubj={dataTestSubj}
        />
      </div>
    ) : null;
  },
  (prevProps, nextProps) =>
    prevProps.end === nextProps.end &&
    prevProps.filterQuery === nextProps.filterQuery &&
    prevProps.fromStr === nextProps.fromStr &&
    prevProps.id === nextProps.id &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.savedQuery === nextProps.savedQuery &&
    prevProps.setSavedQuery === nextProps.setSavedQuery &&
    prevProps.setSearchBarFilter === nextProps.setSearchBarFilter &&
    prevProps.start === nextProps.start &&
    prevProps.toStr === nextProps.toStr &&
    prevProps.updateSearch === nextProps.updateSearch &&
    prevProps.dataTestSubj === nextProps.dataTestSubj &&
    deepEqual(prevProps.queries, nextProps.queries)
);

const makeMapStateToProps = () => {
  const getEndSelector = endSelector();
  const getFromStrSelector = fromStrSelector();
  const getIsLoadingSelector = isLoadingSelector();
  const getQueriesSelector = queriesSelector();
  const getStartSelector = startSelector();
  const getToStrSelector = toStrSelector();
  const getFilterQuerySelector = filterQuerySelector();
  const getSavedQuerySelector = savedQuerySelector();
  return (state: State, { id }: SiemSearchBarProps) => {
    const inputsRange: InputsRange = getOr({}, `inputs.${id}`, state);
    return {
      end: getEndSelector(inputsRange),
      fromStr: getFromStrSelector(inputsRange),
      filterQuery: getFilterQuerySelector(inputsRange),
      isLoading: getIsLoadingSelector(inputsRange),
      queries: getQueriesSelector(state, id),
      savedQuery: getSavedQuerySelector(inputsRange),
      start: getStartSelector(inputsRange),
      toStr: getToStrSelector(inputsRange),
    };
  };
};

SearchBarComponent.displayName = 'SiemSearchBar';

interface UpdateReduxSearchBar extends OnTimeChangeProps {
  id: InputsModelId.global | InputsModelId.timeline;
  filters?: Filter[];
  filterManager: FilterManager;
  query?: Query;
  savedQuery?: SavedQuery;
  resetSavedQuery?: boolean;
  timelineId?: string;
  updateTime: boolean;
  setTablesActivePageToZero: () => void;
}

export const dispatchUpdateSearch =
  (dispatch: Dispatch) =>
  ({
    end,
    filters,
    id,
    isQuickSelection,
    query,
    resetSavedQuery,
    savedQuery,
    start,
    timelineId,
    updateTime = false,
    filterManager,
    setTablesActivePageToZero,
  }: UpdateReduxSearchBar): void => {
    if (updateTime) {
      const fromDate = formatDate(start);
      let toDate = formatDate(end, { roundUp: true });
      if (isQuickSelection) {
        if (end === start) {
          dispatch(
            inputsActions.setAbsoluteRangeDatePicker({
              id,
              fromStr: start,
              toStr: end,
              from: fromDate,
              to: toDate,
            })
          );
        } else {
          dispatch(
            inputsActions.setRelativeRangeDatePicker({
              id,
              fromStr: start,
              toStr: end,
              from: fromDate,
              to: toDate,
            })
          );
        }
      } else {
        toDate = formatDate(end);
        dispatch(
          inputsActions.setAbsoluteRangeDatePicker({
            id,
            from: formatDate(start),
            to: formatDate(end),
          })
        );
      }
      if (timelineId != null) {
        dispatch(
          timelineActions.updateRange({
            id: timelineId,
            start: fromDate,
            end: toDate,
          })
        );
      }
    }
    if (query != null) {
      dispatch(
        inputsActions.setFilterQuery({
          id,
          ...query,
        })
      );
    }
    if (filters != null) {
      filterManager.setFilters(filters);
    }

    if (savedQuery != null || resetSavedQuery) {
      dispatch(inputsActions.setSavedQuery({ id, savedQuery }));
    }

    setTablesActivePageToZero();
  };

const mapDispatchToProps = (dispatch: Dispatch) => ({
  updateSearch: dispatchUpdateSearch(dispatch),
  setSavedQuery: ({ id, savedQuery }: { id: InputsModelId; savedQuery: SavedQuery | undefined }) =>
    dispatch(inputsActions.setSavedQuery({ id, savedQuery })),
  setSearchBarFilter: ({ id, filters }: { id: InputsModelId; filters: Filter[] }) =>
    dispatch(inputsActions.setSearchBarFilter({ id, filters })),
});

export const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const SiemSearchBar = connector(SearchBarComponent);
