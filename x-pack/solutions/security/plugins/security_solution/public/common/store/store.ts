/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import thunk from 'redux-thunk';
import type {
  Action,
  AnyAction,
  Dispatch,
  Middleware,
  PreloadedState,
  Reducer,
  Store,
} from 'redux';
import { applyMiddleware, createStore as createReduxStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';
import type { EnhancerOptions } from 'redux-devtools-extension';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import reduceReducers from 'reduce-reducers';
import { TimelineTypeEnum } from '../../../common/api/timeline';
import { TimelineId } from '../../../common/types';
import { initialGroupingState } from './grouping/reducer';
import type { GroupState } from './grouping/types';
import { telemetryMiddleware } from '../lib/telemetry';
import * as timelineActions from '../../timelines/store/actions';
import type { TimelineModel } from '../../timelines/store/model';
import type { SubPluginsInitReducer } from './reducer';
import { createInitialState, createReducer } from './reducer';
import type { AppAction } from './actions';
import type { Immutable } from '../../../common/endpoint/types';
import type { State } from './types';
import type { TimelineState } from '../../timelines/store/types';
import type { SourcererDataView } from '../../sourcerer/store/model';
import type { StartedSubPlugins, StartPlugins } from '../../types';
import { allowedExperimentalValues } from '../../../common/experimental_features';
import type { AnalyzerState } from '../../resolver/types';
import { resolverMiddlewareFactory } from '../../resolver/store/middleware';
import { dataAccessLayerFactory } from '../../resolver/data_access_layer/factory';
import { sourcererActions } from '../../sourcerer/store';
import { createMiddlewares } from './middlewares';
import { addNewTimeline } from '../../timelines/store/helpers';
import { initialNotesState } from '../../notes/store/notes.slice';
import { createDefaultDataView } from '../../data_view_manager/utils/create_default_data_view';

let store: Store<State, Action> | null = null;

export const createStoreFactory = async (
  coreStart: CoreStart,
  startPlugins: StartPlugins,
  subPlugins: StartedSubPlugins,
  storage: Storage
): Promise<Store<State, Action>> => {
  const { kibanaDataViews, defaultDataView, signal } = await createDefaultDataView({
    application: coreStart.application,
    http: coreStart.http,
    dataViewService: startPlugins.data.dataViews,
    uiSettings: coreStart.uiSettings,
    spaces: startPlugins.spaces,
    // TODO: (new data view picker) remove this in cleanup phase https://github.com/elastic/security-team/issues/12665
    skip: allowedExperimentalValues.newDataViewPickerEnabled,
  });

  const timelineInitialState = {
    timeline: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ...subPlugins.timelines.store.initialState.timeline!,
      timelineById: {
        ...subPlugins.timelines.store.initialState.timeline.timelineById,
        ...addNewTimeline({
          id: TimelineId.active,
          timelineById: {},
          show: false,
          timelineType: TimelineTypeEnum.default,
          columns: [],
          dataViewId: null,
          indexNames: [],
        }),
      },
    },
  };

  const dataTableInitialState = {
    dataTable: {
      tableById: {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        ...subPlugins.alerts.storageDataTables!.tableById,
        ...subPlugins.rules.storageDataTables!.tableById,
        ...subPlugins.exceptions.storageDataTables!.tableById,
        ...subPlugins.explore.exploreDataTables!.hosts.tableById,
        ...subPlugins.explore.exploreDataTables!.network.tableById,
        ...subPlugins.explore.exploreDataTables!.users.tableById,
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
      },
    },
  };

  const groupsInitialState: GroupState = {
    groups: initialGroupingState,
  };

  const analyzerInitialState: AnalyzerState = {
    analyzer: {},
  };

  const timelineReducer = reduceReducers(
    timelineInitialState.timeline,
    startPlugins.timelines?.getTimelineReducer() ?? {},
    subPlugins.timelines.store.reducer.timeline
  ) as unknown as Reducer<TimelineState, AnyAction>;

  const initialState = createInitialState(
    {
      ...subPlugins.explore.store.initialState,
      ...timelineInitialState,
      ...subPlugins.management.store.initialState,
    },
    {
      defaultDataView,
      kibanaDataViews,
      signalIndexName: signal.name,
      signalIndexMappingOutdated: signal.index_mapping_outdated,
    },
    dataTableInitialState,
    groupsInitialState,
    analyzerInitialState,
    initialNotesState
  );

  const rootReducer = {
    ...subPlugins.explore.store.reducer,
    timeline: timelineReducer,
    ...subPlugins.management.store.reducer,
  };

  return createStore(initialState, rootReducer, coreStart, storage, [
    ...(subPlugins.management.store.middleware ?? []),
    ...(subPlugins.explore.store.middleware ?? []),
    ...[resolverMiddlewareFactory(dataAccessLayerFactory(coreStart)) ?? []],
  ]);
};

const timelineActionsWithNonserializablePayloads = [
  timelineActions.updateTimeline.type,
  timelineActions.addTimeline.type,
  timelineActions.initializeTimelineSettings.type,
];

const actionSanitizer = (action: AnyAction) => {
  if (action.type === sourcererActions.setDataView.type) {
    return {
      ...action,
      payload: {
        ...action.payload,
        dataView: 'dataView',
        browserFields: 'browserFields',
        indexFields: 'indexFields',
        fields: 'fields',
      },
    };
  } else if (timelineActionsWithNonserializablePayloads.includes(action.type)) {
    const { type, payload } = action;
    if (type === timelineActions.addTimeline.type || type === timelineActions.updateTimeline.type) {
      return {
        ...action,
        payload: {
          ...payload,
          timeline: sanitizeTimelineModel(payload.timeline),
        },
      };
    } else if (type === timelineActions.initializeTimelineSettings.type) {
      return {
        ...action,
        payload: {
          ...payload,
          timeline: sanitizeTimelineModel(payload.timeline),
        },
      };
    }
  }
  return action;
};

const sanitizeDataView = (dataView: SourcererDataView) => {
  return {
    ...dataView,
    browserFields: 'browserFields',
    indexFields: 'indexFields',
    fields: 'fields',
    dataView: 'dataView',
  };
};

const sanitizeTimelineModel = (timeline: TimelineModel) => {
  return {
    ...timeline,
    footerText: 'footerText',
    loadingText: 'loadingText',
  };
};

const stateSanitizer = (state: State) => {
  if (state.sourcerer) {
    return {
      ...state,
      sourcerer: {
        ...state.sourcerer,
        defaultDataView: sanitizeDataView(state.sourcerer.defaultDataView),
        kibanaDataViews: state.sourcerer.kibanaDataViews.map(sanitizeDataView),
      },
    };
  } else {
    return state;
  }
};

/**
 * Factory for Security App's redux store.
 */
export const createStore = (
  state: State,
  pluginsReducer: SubPluginsInitReducer,
  kibana: CoreStart,
  storage: Storage,
  additionalMiddleware?: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>
): Store<State, Action> => {
  const enhancerOptions: EnhancerOptions = {
    name: 'Kibana Security Solution',
    actionsBlacklist: ['USER_MOVED_POINTER', 'USER_SET_RASTER_SIZE'],
    actionSanitizer: actionSanitizer as EnhancerOptions['actionSanitizer'],
    stateSanitizer: stateSanitizer as EnhancerOptions['stateSanitizer'],
    // uncomment the following to enable redux action tracing
    // https://github.com/zalmoxisus/redux-devtools-extension/commit/64717bb9b3534ff616d9db56c2be680627c7b09d#diff-182cb140f8a0fd8bc37bbdcdad07bbadb9aebeb2d1b8ed026acd6132f2c88ce8R10
    // trace: true,
    // traceLimit: 100,
  };

  const composeEnhancers = composeWithDevTools(enhancerOptions);

  const middlewareEnhancer = applyMiddleware(
    ...createMiddlewares(kibana, storage),
    telemetryMiddleware,
    ...(additionalMiddleware ?? []),
    thunk
  );

  store = createReduxStore(
    createReducer(pluginsReducer),
    state as PreloadedState<State>,
    composeEnhancers(middlewareEnhancer)
  );

  return store;
};

export const getStore = (): Store<State, Action> | null => store;
