/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import type { ConnectedProps } from 'react-redux';
import { useDispatch, connect } from 'react-redux';
import type { Dispatch } from 'redux';
import deepEqual from 'fast-deep-equal';
import type { Filter } from '@kbn/es-query';

import type { FilterManager } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useKibana } from '../../../../common/lib/kibana';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import type { State, inputsModel } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../store';
import type { KqlMode, TimelineModel } from '../../../store/model';
import { timelineDefaults } from '../../../store/defaults';
import { dispatchUpdateReduxTime } from '../../../../common/components/super_date_picker';
import { SearchOrFilter } from './search_or_filter';
import { setDataProviderVisibility } from '../../../store/actions';
import { getNonDropAreaFilters } from '../helpers';
import * as i18n from './translations';

interface OwnProps {
  filterManager: FilterManager;
  timelineId: string;
}

type Props = OwnProps & PropsFromRedux;

export const isDataView = (obj: unknown): obj is DataView =>
  obj != null && typeof obj === 'object' && Object.hasOwn(obj, 'getName');

const StatefulSearchOrFilterComponent = React.memo<Props>(
  ({
    dataProviders,
    filters,
    filterManager,
    filterQuery,
    from,
    fromStr,
    isRefreshPaused,
    kqlMode,
    refreshInterval,
    savedQueryId,
    setFilters,
    setSavedQueryId,
    timelineId,
    to,
    toStr,
    updateKqlMode,
    updateReduxTime,
    timelineType,
  }) => {
    const dispatch = useDispatch();

    const { addError } = useAppToasts();

    const [dataView, setDataView] = useState<DataView>();
    const {
      services: { data },
    } = useKibana();

    const { sourcererDataView } = useSourcererDataView(SourcererScopeName.timeline);

    const getIsDataProviderVisible = useMemo(
      () => timelineSelectors.dataProviderVisibilitySelector(),
      []
    );

    const isDataProviderVisible = useDeepEqualSelector((state) =>
      getIsDataProviderVisible(state, timelineId)
    );

    useEffect(() => {
      let dv: DataView;
      const createDataView = async () => {
        try {
          dv = await data.dataViews.create(sourcererDataView);
          setDataView(dv);
        } catch (error) {
          addError(error, { title: i18n.ERROR_PROCESSING_INDEX_PATTERNS });
        }
      };
      createDataView();

      return () => {
        if (dv?.id) {
          data.dataViews.clearInstanceCache(dv?.id);
        }
      };
    }, [data.dataViews, filterQuery, addError, sourcererDataView]);

    const arrDataView = useMemo(() => (dataView != null ? [dataView] : []), [dataView]);

    // Keep filter manager in sync with redux filters
    useEffect(() => {
      if (!deepEqual(filterManager.getFilters(), filters)) {
        filterManager.setFilters(filters);
      }
    }, [filterManager, filters]);

    // When a filter update comes in through the filter manager, update redux
    useEffect(() => {
      const subscription = filterManager.getUpdates$().subscribe(() => {
        const filtersWithoutDropArea = getNonDropAreaFilters(filterManager.getFilters());
        if (!deepEqual(filtersWithoutDropArea, filters)) {
          setFilters({
            id: timelineId,
            filters: filtersWithoutDropArea,
          });
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    }, [filterManager, timelineId, setFilters, filters]);

    // Sync redux filters with updated from <FilterItems />
    const onFiltersUpdated = useCallback(
      (newFilters: Filter[]) => {
        setFilters({
          id: timelineId,
          filters: newFilters,
        });
      },
      [timelineId, setFilters]
    );

    const setSavedQueryInTimeline = useCallback(
      (newSavedQueryId: string | null) =>
        setSavedQueryId({
          id: timelineId,
          savedQueryId: newSavedQueryId,
        }),
      [timelineId, setSavedQueryId]
    );

    const toggleDataProviderVisibility = useCallback(() => {
      dispatch(
        setDataProviderVisibility({ id: timelineId, isDataProviderVisible: !isDataProviderVisible })
      );
    }, [isDataProviderVisible, timelineId, dispatch]);

    useEffect(() => {
      /*
       * If there is a change in data providers
       *    - data provider has some data and it was hidden,
       *        * it must be made visible
       *
       *    - data provider has no data and it was visible,
       *        * it must be hidden
       *
       * */
      if (dataProviders?.length > 0) {
        dispatch(setDataProviderVisibility({ id: timelineId, isDataProviderVisible: true }));
      } else if (dataProviders?.length === 0) {
        dispatch(setDataProviderVisibility({ id: timelineId, isDataProviderVisible: false }));
      }
    }, [dataProviders, dispatch, timelineId]);

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup
            className="eui-scrollBar"
            direction="row"
            alignItems="center"
            gutterSize="xs"
            responsive={false}
          >
            <EuiFlexItem grow={true}>
              <SearchOrFilter
                dataProviders={dataProviders}
                filters={filters}
                filterManager={filterManager}
                filterQuery={filterQuery}
                from={from}
                fromStr={fromStr}
                isRefreshPaused={isRefreshPaused}
                kqlMode={kqlMode}
                refreshInterval={refreshInterval}
                savedQueryId={savedQueryId}
                setSavedQueryId={setSavedQueryInTimeline}
                timelineId={timelineId}
                to={to}
                toStr={toStr}
                updateKqlMode={updateKqlMode}
                updateReduxTime={updateReduxTime}
                toggleDataProviderVisibility={toggleDataProviderVisibility}
                isDataProviderVisible={isDataProviderVisible}
                timelineType={timelineType}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {filters && filters.length > 0 ? (
          <EuiFlexItem>
            <EuiFlexGroup
              data-test-subj="timeline-filters-container"
              direction="row"
              gutterSize="xs"
              wrap={true}
              responsive={false}
            >
              <FilterItems
                filters={filters}
                onFiltersUpdated={onFiltersUpdated}
                indexPatterns={arrDataView}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.filterManager === nextProps.filterManager &&
      prevProps.from === nextProps.from &&
      prevProps.fromStr === nextProps.fromStr &&
      prevProps.to === nextProps.to &&
      prevProps.toStr === nextProps.toStr &&
      prevProps.isRefreshPaused === nextProps.isRefreshPaused &&
      prevProps.refreshInterval === nextProps.refreshInterval &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      deepEqual(prevProps.filters, nextProps.filters) &&
      deepEqual(prevProps.filterQuery, nextProps.filterQuery) &&
      deepEqual(prevProps.kqlMode, nextProps.kqlMode) &&
      deepEqual(prevProps.savedQueryId, nextProps.savedQueryId) &&
      deepEqual(prevProps.timelineId, nextProps.timelineId) &&
      prevProps.timelineType === nextProps.timelineType
    );
  }
);
StatefulSearchOrFilterComponent.displayName = 'StatefulSearchOrFilterComponent';

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlFilterQuery = timelineSelectors.getKqlFilterKuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getInputsPolicy = inputsSelectors.getTimelinePolicySelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const policy: inputsModel.Policy = getInputsPolicy(state);
    return {
      dataProviders: timeline.dataProviders,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      filterQuery: getKqlFilterQuery(state, timelineId)!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      filters: timeline.filters!,
      from: input.timerange.from,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fromStr: input.timerange.fromStr!,
      isRefreshPaused: policy.kind === 'manual',
      kqlMode: getOr('filter', 'kqlMode', timeline),
      refreshInterval: policy.duration,
      savedQueryId: getOr(null, 'savedQueryId', timeline),
      to: input.timerange.to,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      toStr: input.timerange.toStr!,
      timelineType: timeline.timelineType,
    };
  };

  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  updateKqlMode: ({ id, kqlMode }: { id: string; kqlMode: KqlMode }) =>
    dispatch(timelineActions.updateKqlMode({ id, kqlMode })),
  setSavedQueryId: ({ id, savedQueryId }: { id: string; savedQueryId: string | null }) =>
    dispatch(timelineActions.setSavedQueryId({ id, savedQueryId })),
  setFilters: ({ id, filters }: { id: string; filters: Filter[] }) =>
    dispatch(timelineActions.setFilters({ id, filters })),
  updateReduxTime: dispatchUpdateReduxTime(dispatch),
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulSearchOrFilter = connector(StatefulSearchOrFilterComponent);
