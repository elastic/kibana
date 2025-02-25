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
import { DataViewPickerScopeName } from '../../constants';

const mockDataViewsService = {
  get: jest.fn(),
  create: jest.fn().mockResolvedValue({
    id: 'adhoc_test-*',
    isPersisted: () => false,
    toSpec: () => ({ id: 'adhoc_test-*', title: 'test-*' }),
  }),
} as unknown as DataViewsServicePublic;

const mockedState: RootState = {
  dataViewPicker: {
    analyzer: {
      dataView: null,
      status: 'pristine',
    },
    timeline: {
      dataView: null,
      status: 'pristine',
    },
    default: {
      dataView: null,
      status: 'pristine',
    },
    detections: {
      dataView: null,
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
      selectDataViewAsync({ id: 'adhoc_test-*', scope: [DataViewPickerScopeName.default] }),
      mockListenerApi
    );

    expect(mockDataViewsService.get).not.toHaveBeenCalled();
  });

  it('should try to create data view if not cached', async () => {
    await listener.effect(
      selectDataViewAsync({
        id: 'fetched-id',
        fallbackPatterns: ['test-*'],
        scope: [DataViewPickerScopeName.default],
      }),
      mockListenerApi
    );

    expect(mockDataViewsService.get).toHaveBeenCalledWith('fetched-id');
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ id: 'adhoc_test-*' }) })
    );
  });

  it('should create adhoc data view if fetching fails', async () => {
    await listener.effect(
      selectDataViewAsync({
        fallbackPatterns: ['test-*'],
        scope: [DataViewPickerScopeName.default],
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
        payload: expect.objectContaining({ id: 'adhoc_test-*' }),
      })
    );
  });

  it('should dispatch an error if both fetching and creation fail', async () => {
    jest
      .mocked(mockDataViewsService)
      .get.mockRejectedValueOnce(new Error('some random get data view failure'));

    jest
      .mocked(mockDataViewsService)
      .create.mockRejectedValueOnce(new Error('some random create data view failure'));

    await listener.effect(
      selectDataViewAsync({
        fallbackPatterns: ['test-*'],
        scope: [DataViewPickerScopeName.default],
      }),
      mockListenerApi
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'x-pack/security_solution/dataViewPicker/default/dataViewSelectionError',
      })
    );
  });
});
