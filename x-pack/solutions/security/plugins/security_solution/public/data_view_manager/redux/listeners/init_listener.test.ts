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
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, DataViewManagerScopeName } from '../../constants';
import { selectDataViewAsync } from '../actions';

const mockDataViewsService = {
  get: jest.fn(),
  create: jest.fn().mockResolvedValue({
    id: 'adhoc_test-*',
    isPersisted: () => false,
    toSpec: () => ({ id: 'adhoc_test-*', title: 'test-*' }),
  }),
  getAllDataViewLazy: jest.fn().mockReturnValue([]),
} as unknown as DataViewsServicePublic;

const mockDispatch = jest.fn();
const mockGetState = jest.fn(() => mockDataViewManagerState);

const mockListenerApi = {
  dispatch: mockDispatch,
  getState: mockGetState,
} as unknown as ListenerEffectAPI<RootState, Dispatch<AnyAction>>;

describe('createInitListener', () => {
  let listener: ReturnType<typeof createInitListener>;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = createInitListener({ dataViews: mockDataViewsService });
  });

  it('should load the data views and dispatch further actions', async () => {
    await listener.effect(sharedDataViewManagerSlice.actions.init(), mockListenerApi);

    expect(jest.mocked(mockDataViewsService.getAllDataViewLazy)).toHaveBeenCalled();

    expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
      sharedDataViewManagerSlice.actions.setDataViews([])
    );
    expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
      selectDataViewAsync({
        id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        scope: [
          DataViewManagerScopeName.default,
          DataViewManagerScopeName.detections,
          DataViewManagerScopeName.timeline,
          DataViewManagerScopeName.analyzer,
        ],
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
      await listener.effect(sharedDataViewManagerSlice.actions.init(), mockListenerApi);

      expect(jest.mocked(mockListenerApi.dispatch)).toBeCalledWith(
        sharedDataViewManagerSlice.actions.error()
      );
    });
  });
});
