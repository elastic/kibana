/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDataViewSelectedListener } from './data_view_selected';
import { selectDataViewAsync } from '../actions';
import type { DataViewsServicePublic, FieldSpec } from '@kbn/data-views-plugin/public';
import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
import type { RootState } from '../reducer';
import { DataViewManagerScopeName } from '../../constants';

const mockDataViewsService = {
  getDataViewLazy: jest.fn(),
  create: jest.fn().mockResolvedValue({
    id: 'adhoc_test-*',
    isPersisted: () => false,
    toSpec: () => ({ id: 'adhoc_test-*', title: 'test-*' }),
  }),
} as unknown as DataViewsServicePublic;

const mockedState: RootState = {
  dataViewManager: {
    analyzer: {
      dataViewId: null,
      status: 'pristine',
    },
    timeline: {
      dataViewId: null,
      status: 'pristine',
    },
    default: {
      dataViewId: null,
      status: 'pristine',
    },
    detections: {
      dataViewId: null,
      status: 'pristine',
    },
    shared: {
      adhocDataViews: [
        {
          id: 'adhoc_test-*',
          title: 'test-*',
          fields: {
            '@timestamp': {
              name: '@timestamp',
              type: 'date',
            } as unknown as FieldSpec,
          },
        },
      ],
      dataViews: [
        {
          id: 'persisted_test-*',
          title: 'test-*',
          fields: {
            '@timestamp': {
              name: '@timestamp',
              type: 'date',
            } as unknown as FieldSpec,
          },
        },
      ],
      status: 'pristine',
    },
  },
};

const mockDispatch = jest.fn();
const mockGetState = jest.fn(() => mockedState);

const mockListenerApi = {
  dispatch: mockDispatch,
  getState: mockGetState,
} as unknown as ListenerEffectAPI<RootState, Dispatch<AnyAction>>;

describe('createDataViewSelectedListener', () => {
  let listener: ReturnType<typeof createDataViewSelectedListener>;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = createDataViewSelectedListener({ dataViews: mockDataViewsService });
  });

  it('should return cached adhoc data view first', async () => {
    await listener.effect(
      selectDataViewAsync({ id: 'adhoc_test-*', scope: [DataViewManagerScopeName.default] }),
      mockListenerApi
    );

    expect(mockDataViewsService.getDataViewLazy).not.toHaveBeenCalled();
  });

  it('should try to create data view if not cached', async () => {
    await listener.effect(
      selectDataViewAsync({
        id: 'fetched-id',
        fallbackPatterns: ['test-*'],
        scope: [DataViewManagerScopeName.default],
      }),
      mockListenerApi
    );

    // NOTE: we should check if the data view existence is checked
    expect(mockDataViewsService.getDataViewLazy).toHaveBeenCalledWith('fetched-id');

    expect(mockDataViewsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'adhoc_test-*',
        title: 'test-*',
      })
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: 'adhoc_test-*',
        type: 'x-pack/security_solution/dataViewManager/default/setSelectedDataView',
      })
    );
  });

  it('should create adhoc data view if fetching fails', async () => {
    await listener.effect(
      selectDataViewAsync({
        fallbackPatterns: ['test-*'],
        scope: [DataViewManagerScopeName.default],
      }),
      mockListenerApi
    );

    expect(mockDataViewsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'adhoc_test-*',
        title: 'test-*',
      })
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: 'adhoc_test-*',
      })
    );
  });

  it('should dispatch an error if both fetching and creation fail', async () => {
    jest
      .mocked(mockDataViewsService)
      .getDataViewLazy.mockRejectedValueOnce(new Error('some random get data view failure'));

    jest
      .mocked(mockDataViewsService)
      .create.mockRejectedValueOnce(new Error('some random create data view failure'));

    await listener.effect(
      selectDataViewAsync({
        fallbackPatterns: ['test-*'],
        scope: [DataViewManagerScopeName.default],
      }),
      mockListenerApi
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'x-pack/security_solution/dataViewManager/default/dataViewSelectionError',
      })
    );
  });
});
