/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { getDevToolsOptions } from '@kbn/xstate-utils';
import equal from 'fast-deep-equal';
import { distinctUntilChanged, from, map, shareReplay, Subject } from 'rxjs';
import { interpret } from 'xstate';
import { AllDatasetSelection } from '../../common';
import { DatasetsService } from '../services/datasets';
import {
  createLogsExplorerControllerStateMachine,
  DEFAULT_CONTEXT,
} from '../state_machines/logs_explorer_controller';
import { LogsExplorerStartDeps } from '../types';
import { LogsExplorerCustomizations } from '../customizations/types';
import { createDataServiceProxy } from './custom_data_service';
import { createUiSettingsServiceProxy } from './custom_ui_settings_service';
import {
  createDiscoverMemoryHistory,
  createMemoryUrlStateStorage,
} from './custom_url_state_storage';
import { getContextFromPublicState, getPublicStateFromContext } from './public_state';
import type {
  LogsExplorerController,
  LogsExplorerDiscoverServices,
  LogsExplorerPublicEvent,
  LogsExplorerPublicStateUpdate,
} from './types';

interface Dependencies {
  core: CoreStart;
  plugins: LogsExplorerStartDeps;
}

type InitialState = LogsExplorerPublicStateUpdate & { allSelection?: AllDatasetSelection };

export const createLogsExplorerControllerFactory =
  ({ core, plugins }: Dependencies) =>
  async ({
    customizations = {},
    initialState,
  }: {
    customizations?: LogsExplorerCustomizations;
    initialState?: InitialState;
  }): Promise<LogsExplorerController> => {
    const { data, dataViews } = plugins;

    const datasetsClient = new DatasetsService().start({
      http: core.http,
    }).client;

    const customMemoryHistory = createDiscoverMemoryHistory();
    const customMemoryUrlStateStorage = createMemoryUrlStateStorage(customMemoryHistory);
    const customUiSettings = createUiSettingsServiceProxy(core.uiSettings);
    const customData = createDataServiceProxy({
      data,
      http: core.http,
      uiSettings: customUiSettings,
    });
    const discoverServices: LogsExplorerDiscoverServices = {
      data: customData,
      history: customMemoryHistory,
      uiSettings: customUiSettings,
      filterManager: customData.query.filterManager,
      timefilter: customData.query.timefilter.timefilter,
      urlStateStorage: customMemoryUrlStateStorage,
    };
    const allSelection = initialState?.allSelection ?? DEFAULT_CONTEXT.allSelection;

    const initialContext = getContextFromPublicState(initialState ?? {}, allSelection);
    const publicEvents$ = new Subject<LogsExplorerPublicEvent>();

    const machine = createLogsExplorerControllerStateMachine({
      datasetsClient,
      dataViews,
      events: customizations.events,
      initialContext: {
        ...initialContext,
        allSelection,
      },
      query: discoverServices.data.query,
      toasts: core.notifications.toasts,
      uiSettings: customUiSettings,
      publicEvents$,
    });

    const service = interpret(machine, {
      devTools: getDevToolsOptions(),
    });

    const logsExplorerState$ = from(service).pipe(
      map(({ context }) => getPublicStateFromContext(context)),
      distinctUntilChanged(equal),
      shareReplay(1)
    );

    return {
      actions: {},
      customizations,
      datasetsClient,
      discoverServices,
      event$: publicEvents$,
      service,
      state$: logsExplorerState$,
      stateMachine: machine,
    };
  };

export type CreateLogsExplorerControllerFactory = typeof createLogsExplorerControllerFactory;
export type CreateLogsExplorerController = ReturnType<typeof createLogsExplorerControllerFactory>;
