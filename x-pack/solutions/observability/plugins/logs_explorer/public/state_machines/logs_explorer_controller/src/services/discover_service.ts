/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ActionFunction, actions, InvokeCallback } from 'xstate';
import { LogsExplorerCustomizations } from '../../../../controller';
import { isDataViewSelection } from '../../../../../common/data_source_selection';
import {
  getChartDisplayOptionsFromDiscoverAppState,
  getDiscoverAppStateFromContext,
  getGridColumnDisplayOptionsFromDiscoverAppState,
  getGridRowsDisplayOptionsFromDiscoverAppState,
  getQueryStateFromDiscoverAppState,
} from '../../../../utils/convert_discover_app_state';
import { LogsExplorerControllerContext, LogsExplorerControllerEvent } from '../types';

export const subscribeToDiscoverState =
  () =>
  (
    context: LogsExplorerControllerContext
  ): InvokeCallback<LogsExplorerControllerEvent, LogsExplorerControllerEvent> =>
  (send, onEvent) => {
    if (!('discoverStateContainer' in context)) {
      throw new Error('Failed to subscribe to the Discover state: no state container in context.');
    }

    const { appState, dataState } = context.discoverStateContainer;

    const appStateSubscription = appState.state$.subscribe({
      next: (newAppState) => {
        if (isEmpty(newAppState)) {
          return;
        }

        send({
          type: 'RECEIVE_DISCOVER_APP_STATE',
          appState: newAppState,
        });
      },
    });

    const dataStateSubscription = dataState.data$.documents$.subscribe({
      next: (newDataState) => {
        if (!isEmpty(newDataState?.result)) {
          send({
            type: 'RECEIVE_DISCOVER_DATA_STATE',
            dataState: newDataState.result,
          });
        }
      },
    });

    return () => {
      appStateSubscription.unsubscribe();
      dataStateSubscription.unsubscribe();
    };
  };

export const updateContextFromDiscoverAppState = actions.assign<
  LogsExplorerControllerContext,
  LogsExplorerControllerEvent
>((context, event) => {
  if ('appState' in event && event.type === 'RECEIVE_DISCOVER_APP_STATE') {
    return {
      chart: {
        ...context.chart,
        ...getChartDisplayOptionsFromDiscoverAppState(event.appState),
      },
      grid: {
        columns:
          getGridColumnDisplayOptionsFromDiscoverAppState(event.appState) ?? context.grid.columns,
        rows: {
          ...context.grid.rows,
          ...getGridRowsDisplayOptionsFromDiscoverAppState(event.appState),
        },
      },
      ...getQueryStateFromDiscoverAppState(event.appState),
    };
  }

  return {};
});

export const updateContextFromDiscoverDataState = actions.assign<
  LogsExplorerControllerContext,
  LogsExplorerControllerEvent
>((context, event) => {
  if ('dataState' in event && event.type === 'RECEIVE_DISCOVER_DATA_STATE') {
    return {
      rows: event.dataState,
    };
  }

  return {};
});

export const updateDiscoverAppStateFromContext: ActionFunction<
  LogsExplorerControllerContext,
  LogsExplorerControllerEvent
> = (context, _event) => {
  if (!('discoverStateContainer' in context)) {
    return;
  }

  context.discoverStateContainer.appState.update(getDiscoverAppStateFromContext(context));
};

export const redirectToDiscover =
  (
    events?: LogsExplorerCustomizations['events']
  ): ActionFunction<LogsExplorerControllerContext, LogsExplorerControllerEvent> =>
  (context, event) => {
    if (event.type === 'UPDATE_DATA_SOURCE_SELECTION' && isDataViewSelection(event.data)) {
      if (events?.onUknownDataViewSelection) {
        return events.onUknownDataViewSelection({ ...context, dataSourceSelection: event.data });
      }
    }
  };
