/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { AnyAction, Dispatch, ListenerEffectAPI } from 'redux-toolkit-v1';
import { mockDataViewManagerState } from '../mock';
import { createInitListener } from './init_listener';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { RootState } from '../reducer';
import { sharedDataViewManagerSlice } from '../slices';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, PageScope } from '../../constants';
import {
  DEFAULT_ALERT_DATA_VIEW_ID,
  DEFAULT_ATTACK_DATA_VIEW_ID,
} from '../../../../common/constants';
import { selectDataViewAsync } from '../actions';
import type { CoreStart } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { createDefaultDataView } from '../../utils/create_default_data_view';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

vi.mock('../../utils/create_default_data_view', () => {
  const mocked = {
    createDefaultDataView: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockDataViewsService = {
  get: vi.fn(),
  create: vi.fn().mockResolvedValue({
    id: 'adhoc_test-*',
    isPersisted: () => false,
    toSpec: () => ({ id: 'adhoc_test-*', title: 'test-*' }),
  }),
  getIdsWithTitle: vi.fn().mockReturnValue([]),
} as unknown as DataViewsServicePublic;

const http = {} as unknown as CoreStart['http'];
const application = {} as unknown as CoreStart['application'];
const uiSettings = {} as unknown as CoreStart['uiSettings'];
const spaces = { getActiveSpace: async () => ({ id: 'default' }) } as unknown as SpacesPluginStart;
const mockToastsDanger = vi.fn();

const mockDispatch = vi.fn();
const mockGetState = vi.fn(() => {
  const state = structuredClone(mockDataViewManagerState);

  state.dataViewManager.default.dataViewId = null;
  state.dataViewManager.alerts = structuredClone(state.dataViewManager.default);
  state.dataViewManager.attacks = structuredClone(state.dataViewManager.default);
  state.dataViewManager.timeline = structuredClone(state.dataViewManager.default);
  state.dataViewManager.analyzer = structuredClone(state.dataViewManager.default);
  state.dataViewManager.explore = structuredClone(state.dataViewManager.default);

  return state;
});

const mockListenerApi = {
  dispatch: mockDispatch,
  getState: mockGetState,
} as unknown as ListenerEffectAPI<RootState, Dispatch<AnyAction>>;

describe('createInitListener', () => {
  let listener: ReturnType<typeof createInitListener>;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(createDefaultDataView).mockResolvedValue({
      defaultDataView: { id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, title: '' },
      alertDataView: { id: DEFAULT_ALERT_DATA_VIEW_ID, title: '' },
      attackDataView: { id: DEFAULT_ATTACK_DATA_VIEW_ID, title: '' },
      kibanaDataViews: [],
    } as unknown as Awaited<ReturnType<typeof createDefaultDataView>>);

    listener = createInitListener({
      dataViews: mockDataViewsService,
      http,
      application,
      uiSettings,
      notifications: {
        toasts: {
          addDanger: mockToastsDanger,
        },
      } as unknown as CoreStart['notifications'],
      spaces,
      storage: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
      } as unknown as Storage,
    });
  });

  it('should load the data views from getIdsWithTitle and dispatch further actions', async () => {
    vi.mocked(mockDataViewsService.getIdsWithTitle).mockResolvedValue([
      {
        id: 'logs-*',
        title: 'logs-*',
        name: 'logs',
        managed: false,
      },
    ]);

    await listener.effect(sharedDataViewManagerSlice.actions.init([]), mockListenerApi);

    expect(vi.mocked(createDefaultDataView)).toHaveBeenCalled();

    expect(vi.mocked(mockDataViewsService.getIdsWithTitle)).toHaveBeenCalled();

    expect(vi.mocked(mockListenerApi.dispatch)).toHaveBeenCalledWith(
      sharedDataViewManagerSlice.actions.setDataViews([
        {
          id: 'logs-*',
          title: 'logs-*',
          name: 'logs',
          managed: false,
          timeFieldName: undefined,
          type: undefined,
          typeMeta: undefined,
        },
      ])
    );
    expect(vi.mocked(mockListenerApi.dispatch)).toHaveBeenCalledWith(
      sharedDataViewManagerSlice.actions.setDataViewId({
        defaultDataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        alertDataViewId: DEFAULT_ALERT_DATA_VIEW_ID,
      })
    );

    expect(vi.mocked(mockListenerApi.dispatch)).toHaveBeenCalledWith(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: PageScope.default,
      })
    );
    expect(vi.mocked(mockListenerApi.dispatch)).toHaveBeenCalledWith(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: PageScope.timeline,
      })
    );
    expect(vi.mocked(mockListenerApi.dispatch)).toHaveBeenCalledWith(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: PageScope.alerts,
      })
    );
    expect(vi.mocked(mockListenerApi.dispatch)).toHaveBeenCalledWith(
      selectDataViewAsync({
        id: DEFAULT_ATTACK_DATA_VIEW_ID,
        scope: PageScope.attacks,
      })
    );
    expect(vi.mocked(mockListenerApi.dispatch)).toHaveBeenCalledWith(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: PageScope.analyzer,
      })
    );
    expect(mockToastsDanger).not.toHaveBeenCalled();
  });

  describe('when getIdsWithTitle fetch returns an error', () => {
    beforeEach(() => {
      vi.mocked(mockDataViewsService.getIdsWithTitle).mockRejectedValue(
        new Error('some loading error')
      );
    });

    it('should dispatch error correctly', async () => {
      await listener.effect(sharedDataViewManagerSlice.actions.init([]), mockListenerApi);

      expect(vi.mocked(mockListenerApi.dispatch)).toHaveBeenCalledWith(
        sharedDataViewManagerSlice.actions.error()
      );
      expect(mockToastsDanger).toHaveBeenCalledWith({
        title: 'Error initializing data views',
        text: 'Error: some loading error',
      });
    });
  });
});
