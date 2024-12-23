/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { OBSERVABILITY_LOGS_EXPLORER_ALLOWED_DATA_VIEWS_ID } from '@kbn/management-settings-ids';
import { DataViewDescriptor } from '../../common/data_views/models/data_view_descriptor';
import { SortOrder } from '../../common/latest';
import { DataViewsFilterParams, createDataViewsStateMachine } from '../state_machines/data_views';
import { LogsExplorerCustomizations } from '../controller';

interface DataViewsContextDeps {
  core: CoreStart;
  dataViewsService: DataViewsPublicPluginStart;
  events: LogsExplorerCustomizations['events'];
}

export interface SearchDataViewsParams {
  name: string;
  sortOrder: SortOrder;
}

export type SearchDataViews = (params: SearchDataViewsParams) => void;
export type FilterDataViews = (params: DataViewsFilterParams) => void;
export type LoadDataViews = () => void;
export type ReloadDataViews = () => void;
export type IsDataViewAllowed = (dataView: DataViewDescriptor) => boolean;
export type IsDataViewAvailable = (dataView: DataViewDescriptor) => boolean;

const useDataViews = ({ core, dataViewsService, events }: DataViewsContextDeps) => {
  const dataViewsStateService = useInterpret(() =>
    createDataViewsStateMachine({
      dataViews: dataViewsService,
    })
  );

  const dataViews = useSelector(dataViewsStateService, (state) => state.context.dataViews);
  const dataViewCount = useSelector(
    dataViewsStateService,
    (state) => state.context.dataViewsSource?.length || 0
  );

  const error = useSelector(dataViewsStateService, (state) => state.context.error);

  const isLoading = useSelector(dataViewsStateService, (state) => state.matches('loading'));

  // Test whether a data view can be explored in Logs Explorer based on the settings
  const isDataViewAllowed: IsDataViewAllowed = useCallback(
    (dataView) =>
      dataView.testAgainstAllowedList(
        core.uiSettings.get(OBSERVABILITY_LOGS_EXPLORER_ALLOWED_DATA_VIEWS_ID)
      ),
    [core.uiSettings]
  );

  // Test whether a data view can be explored in Logs Explorer based on the settings or has fallback handler
  const isDataViewAvailable: IsDataViewAvailable = useCallback(
    (dataView) => {
      const isAllowedDataView = isDataViewAllowed(dataView);

      return (
        isAllowedDataView || (!isAllowedDataView && Boolean(events?.onUknownDataViewSelection))
      );
    },

    [isDataViewAllowed, events?.onUknownDataViewSelection]
  );

  const loadDataViews = useCallback(
    () => dataViewsStateService.send({ type: 'LOAD_DATA_VIEWS' }),
    [dataViewsStateService]
  );

  const reloadDataViews = useCallback(
    () => dataViewsStateService.send({ type: 'RELOAD_DATA_VIEWS' }),
    [dataViewsStateService]
  );

  const searchDataViews: SearchDataViews = useCallback(
    (searchParams) =>
      dataViewsStateService.send({
        type: 'SEARCH_DATA_VIEWS',
        search: searchParams,
      }),
    [dataViewsStateService]
  );

  const filterDataViews: FilterDataViews = useCallback(
    (filterParams) =>
      dataViewsStateService.send({
        type: 'FILTER_DATA_VIEWS',
        filter: filterParams,
      }),
    [dataViewsStateService]
  );

  const sortDataViews: SearchDataViews = useCallback(
    (searchParams) =>
      dataViewsStateService.send({
        type: 'SORT_DATA_VIEWS',
        search: searchParams,
      }),
    [dataViewsStateService]
  );

  return {
    // Underlying state machine
    dataViewsStateService,

    // Failure states
    error,

    // Loading states
    isLoading,

    // Data
    dataViews,
    dataViewCount,

    // Actions
    isDataViewAllowed,
    isDataViewAvailable,
    loadDataViews,
    reloadDataViews,
    searchDataViews,
    filterDataViews,
    sortDataViews,
  };
};

export const [DataViewsProvider, useDataViewsContext] = createContainer(useDataViews);
