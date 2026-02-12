/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
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

jest.mock('../../utils/create_default_data_view', () => ({
  createDefaultDataView: jest.fn(),
}));

const mockDataViewsService = {
  get: jest.fn(),
  create: jest.fn().mockResolvedValue({
    id: 'adhoc_test-*',
    isPersisted: () => false,
    toSpec: () => ({ id: 'adhoc_test-*', title: 'test-*' }),
  }),
  getAllDataViewLazy: jest.fn().mockReturnValue([]),
} as unknown as DataViewsServicePublic;

const http = {} as unknown as CoreStart['http'];
const application = {} as unknown as CoreStart['application'];
const uiSettings = {} as unknown as CoreStart['uiSettings'];
const spaces = { getActiveSpace: async () => ({ id: 'default' }) } as unknown as SpacesPluginStart;

const mockDispatch = jest.fn();
const mockGetState = jest.fn(() => {
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
    jest.clearAllMocks();

    jest.mocked(createDefaultDataView).mockResolvedValue({
      defaultDataView: { id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, title: '' },
      alertDataView: { id: DEFAULT_ALERT_DATA_VIEW_ID, title: '' },
      attackDataView: { id: DEFAULT_ATTACK_DATA_VIEW_ID, title: '' },
      kibanaDataViews: [],
    } as unknown as Awaited<ReturnType<typeof createDefaultDataView>>);

    listener = createInitListener(
      {
        dataViews: mockDataViewsService,
        http,
        application,
        uiSettings,
        spaces,
        storage: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
          clear: jest.fn(),
        } as unknown as Storage,
      },
      false
    );
  });

  it('should load the data views and dispatch further actions', async () => {
    await listener.effect(sharedDataViewManagerSlice.actions.init([]), mockListenerApi);

    expect(jest.mocked(createDefaultDataView)).toHaveBeenCalled();

    expect(jest.mocked(mockDataViewsService.getAllDataViewLazy)).toHaveBeenCalled();

    expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
      sharedDataViewManagerSlice.actions.setDataViews([])
    );
    expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
      sharedDataViewManagerSlice.actions.setDataViewId({
        defaultDataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        alertDataViewId: DEFAULT_ALERT_DATA_VIEW_ID,
      })
    );

    expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: PageScope.default,
      })
    );
    expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: PageScope.timeline,
      })
    );
    expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: PageScope.alerts,
      })
    );
    expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
      selectDataViewAsync({
        id: DEFAULT_ATTACK_DATA_VIEW_ID,
        scope: PageScope.attacks,
      })
    );
    expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: PageScope.analyzer,
      })
    );
  });

  describe('when data views fetch returns an error', () => {
    beforeEach(() => {
      jest
        .mocked(mockDataViewsService.getAllDataViewLazy)
        .mockRejectedValue(new Error('some loading error'));
    });

    it('should dispatch error correctly', async () => {
      await listener.effect(sharedDataViewManagerSlice.actions.init([]), mockListenerApi);

      expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
        sharedDataViewManagerSlice.actions.error()
      );
    });
  });
});
