/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDataViewSelectedListener } from './data_view_selected';
import { selectDataViewAsync } from '../actions';
import type { DataViewsServicePublic, FieldSpec } from '@kbn/data-views-plugin/public';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
import type { RootState } from '../reducer';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, PageScope } from '../../constants';
import { DEFAULT_ALERT_DATA_VIEW_ID } from '../../../../common/constants';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { CoreStart } from '@kbn/core/public';

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
    alerts: {
      dataViewId: null,
      status: 'pristine',
    },
    attacks: {
      dataViewId: null,
      status: 'pristine',
    },
    explore: {
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
      signalIndex: { name: '', isOutdated: false },
      defaultDataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
      alertDataViewId: DEFAULT_ALERT_DATA_VIEW_ID,
    },
  },
};
const mockLogger = loggingSystemMock.createLogger();

const mockDispatch = jest.fn();
const mockGetState = jest.fn(() => mockedState);
const mockStorage = {
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
} as unknown as Storage;
const mockToastsDanger = jest.fn();

const mockListenerApi = {
  dispatch: mockDispatch,
  getState: mockGetState,
  cancelActiveListeners: jest.fn(),
  signal: { aborted: false },
} as unknown as ListenerEffectAPI<RootState, Dispatch<AnyAction>>;

describe('createDataViewSelectedListener', () => {
  let listener: ReturnType<typeof createDataViewSelectedListener>;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = createDataViewSelectedListener({
      dataViews: mockDataViewsService,
      notifications: {
        toasts: {
          addDanger: mockToastsDanger,
        },
      } as unknown as CoreStart['notifications'],
      logger: mockLogger,
      scope: PageScope.default,
      storage: mockStorage,
    });
  });

  it('should cancel previous effects that would set the data view for given scope', async () => {
    await listener.effect(
      selectDataViewAsync({ id: 'adhoc_test-*', scope: PageScope.default }),
      mockListenerApi
    );

    expect(mockListenerApi.cancelActiveListeners).toHaveBeenCalled();
  });

  it('should return cached adhoc data view first', async () => {
    await listener.effect(
      selectDataViewAsync({ id: 'adhoc_test-*', scope: PageScope.default }),
      mockListenerApi
    );

    expect(mockDataViewsService.getDataViewLazy).not.toHaveBeenCalled();
  });

  it('should try to create data view if not cached', async () => {
    await listener.effect(
      selectDataViewAsync({
        id: 'fetched-id',
        fallbackPatterns: ['test-*'],
        scope: PageScope.default,
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
        scope: PageScope.default,
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

  describe('analyzer scope storage', () => {
    it('should store data view ID in storage when scope is analyzer', async () => {
      const analyzerListener = createDataViewSelectedListener({
        dataViews: mockDataViewsService,
        notifications: {
          toasts: {
            addDanger: mockToastsDanger,
          },
        } as unknown as CoreStart['notifications'],
        scope: PageScope.analyzer,
        logger: mockLogger,
        storage: mockStorage,
      });

      await analyzerListener.effect(
        selectDataViewAsync({ id: 'adhoc_test-*', scope: PageScope.analyzer }),
        mockListenerApi
      );

      expect(mockStorage.set).toHaveBeenCalledWith(
        'securitySolution.dataViewManager.selectedDataView.analyzer',
        'adhoc_test-*'
      );
    });

    it('should not store data view ID in storage when scope is not analyzer', async () => {
      await listener.effect(
        selectDataViewAsync({ id: 'adhoc_test-*', scope: PageScope.default }),
        mockListenerApi
      );

      expect(mockStorage.set).not.toHaveBeenCalled();
    });

    it('should store resolved data view ID from cached view when scope is analyzer', async () => {
      const analyzerListener = createDataViewSelectedListener({
        dataViews: mockDataViewsService,
        notifications: {
          toasts: {
            addDanger: mockToastsDanger,
          },
        } as unknown as CoreStart['notifications'],
        scope: PageScope.analyzer,
        logger: mockLogger,
        storage: mockStorage,
      });

      await analyzerListener.effect(
        selectDataViewAsync({ id: 'persisted_test-*', scope: PageScope.analyzer }),
        mockListenerApi
      );

      expect(mockStorage.set).toHaveBeenCalledWith(
        'securitySolution.dataViewManager.selectedDataView.analyzer',
        'persisted_test-*'
      );
    });
  });

  it('should show toast and fallback to default when getDataViewLazy fails without fallback patterns', async () => {
    jest.mocked(mockDataViewsService.getDataViewLazy).mockRejectedValue(new Error('conflict'));

    await listener.effect(
      selectDataViewAsync({ id: 'conflicted-id', scope: PageScope.default }),
      mockListenerApi
    );

    expect(mockToastsDanger).toHaveBeenCalledWith({
      title: 'Selected data view is unavailable',
      text: 'Unable to load data view "conflicted-id". Using fallback selection when possible.',
    });
    expect(mockDataViewsService.create).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
        type: 'x-pack/security_solution/dataViewManager/default/setSelectedDataView',
      })
    );
  });

  it('should clear stale analyzer storage value when getDataViewLazy fails for analyzer scope', async () => {
    const analyzerListener = createDataViewSelectedListener({
      dataViews: mockDataViewsService,
      notifications: {
        toasts: {
          addDanger: mockToastsDanger,
        },
      } as unknown as CoreStart['notifications'],
      scope: PageScope.analyzer,
      logger: mockLogger,
      storage: mockStorage,
    });
    jest.mocked(mockDataViewsService.getDataViewLazy).mockRejectedValue(new Error('conflict'));

    await analyzerListener.effect(
      selectDataViewAsync({ id: 'conflicted-id', scope: PageScope.analyzer }),
      mockListenerApi
    );

    expect(mockStorage.remove).toHaveBeenCalledWith(
      'securitySolution.dataViewManager.selectedDataView.analyzer'
    );
  });
});
