/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, Reducer } from 'redux-v4';
import { combineReducers } from 'redux-v4';

import type { DataTableState } from '@kbn/securitysolution-data-table';
import { dataTableReducer } from '@kbn/securitysolution-data-table';
import { enableMapSet } from 'immer-v9';
import { appReducer, initialAppState } from './app';
import { dragAndDropReducer, initialDragAndDropState } from './drag_and_drop';
import { createInitialInputsState, inputsReducer } from './inputs';

import type { HostsPluginReducer } from '../../explore/hosts/store';
import type { NetworkPluginReducer } from '../../explore/network/store';
import type { UsersPluginReducer } from '../../explore/users/store';
import type { TimelinePluginReducer } from '../../timelines/store';

import type { SecuritySubPlugins } from '../../app/types';
import type { ManagementPluginReducer } from '../../management';
import type { State } from './types';
import type { AppAction } from './actions';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { globalUrlParamReducer, initialGlobalUrlParam } from './global_url_param';
import { groupsReducer } from './grouping/reducer';
import type { GroupState } from './grouping/types';
import { analyzerReducer } from '../../resolver/store/reducer';
import { securitySolutionDiscoverReducer } from './discover/reducer';
import type { AnalyzerState } from '../../resolver/types';
import type { NotesState } from '../../notes/store/notes.slice';
import { notesReducer } from '../../notes/store/notes.slice';
import {
  dataViewManagerReducer,
  initialDataViewManagerState,
} from '../../data_view_manager/redux/reducer';

enableMapSet();

export type SubPluginsInitReducer = HostsPluginReducer &
  UsersPluginReducer &
  NetworkPluginReducer &
  TimelinePluginReducer &
  ManagementPluginReducer;
/**
 * Factory for the 'initialState' that is used to preload state into the Security App's redux store.
 */
export const createInitialState = (
  pluginsInitState: Omit<
    SecuritySubPlugins['store']['initialState'],
    'app' | 'dragAndDrop' | 'inputs' | 'globalUrlParam'
  >,
  {
    enableExperimental,
  }: {
    enableExperimental: ExperimentalFeatures;
  },
  dataTableState: DataTableState,
  groupsState: GroupState,
  analyzerState: AnalyzerState,
  notesState: NotesState
): State => {
  const preloadedState: State = {
    ...pluginsInitState,
    app: { ...initialAppState, enableExperimental },
    dragAndDrop: initialDragAndDropState,
    inputs: createInitialInputsState(),
    globalUrlParam: initialGlobalUrlParam,
    dataTable: dataTableState.dataTable,
    groups: groupsState.groups,
    analyzer: analyzerState.analyzer,
    discover: {
      app: undefined,
      internal: undefined,
      savedSearch: undefined,
    },
    notes: notesState,
    dataViewManager: initialDataViewManagerState.dataViewManager,
  };

  return preloadedState;
};

/**
 * Factory for the Security app's redux reducer.
 */
export const createReducer: (
  pluginsReducer: SubPluginsInitReducer
) => Reducer<State, AppAction | AnyAction> = (pluginsReducer: SubPluginsInitReducer) =>
  combineReducers({
    app: appReducer,
    dragAndDrop: dragAndDropReducer,
    inputs: inputsReducer,
    globalUrlParam: globalUrlParamReducer,
    dataTable: dataTableReducer,
    groups: groupsReducer,
    analyzer: analyzerReducer,
    discover: securitySolutionDiscoverReducer,
    ...pluginsReducer,
    notes: notesReducer,
    dataViewManager: dataViewManagerReducer,
  });
