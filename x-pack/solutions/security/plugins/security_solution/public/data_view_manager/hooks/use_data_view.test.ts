/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { DataView } from '@kbn/data-views-plugin/public';
import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, PageScope } from '../constants';
import { useDataView } from './use_data_view';
import { useSelector } from 'react-redux';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';

jest.mock('../../common/hooks/use_experimental_features');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockGet = jest.fn();
const mockToastsDanger = jest.fn();

const mockNotifications = {
  toasts: {
    addDanger: mockToastsDanger,
  },
};

const mockDataViews = { get: mockGet };

const fakeDataView = new DataView({
  spec: {
    id: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
  },
  fieldFormats: {} as FieldFormatsStartCommon,
});

jest.mock('../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../common/lib/kibana');
  return {
    ...actual,
    useKibana: () => ({
      services: {
        dataViews: mockDataViews,
        notifications: mockNotifications,
      },
    }),
  };
});

describe('useDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useSelector)
      .mockReturnValue({ dataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, status: 'ready' });
  });

  it('should return DataView instance when data view is available', async () => {
    mockGet.mockResolvedValue(fakeDataView);

    const { result } = renderHook(() => useDataView());

    expect(result.current.dataView).not.toBe(undefined);
    expect(result.current.dataView.id).toBe(undefined);
    expect(result.current.status).toBe('pristine');

    // NOTE: should switch to ready almost immediately
    await waitFor(() => {
      expect(result.current.status).toEqual('ready');
    });

    expect(result.current.dataView.id).toBe(DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID);
  });

  it('should set status to loading on subsequent calls after first load', async () => {
    mockGet.mockResolvedValue(fakeDataView);

    const { result, rerender } = renderHook(() => useDataView());

    // First load, no loading state
    expect(result.current.status).toBe('pristine');
    await waitFor(() => {
      if (result.current.status === 'loading') {
        // if loading is returned here, we have an error. until the first data view is loaded from the service, we want to stay "pristine".
        // this is because there are elements on some pages that depending on this behavior.
        return;
      }

      expect(result.current.status).toEqual('ready');
    });

    jest
      .mocked(useSelector)
      .mockReturnValue({ dataViewId: 'different-data-view', status: 'ready' });

    // Dont await on purpose
    act(() => rerender());

    // Should be loading at some point
    await waitFor(() => {
      expect(result.current.status).toEqual('loading');
    });
  });

  it('should not call get if dataViewId is missing', async () => {
    jest.mocked(useSelector).mockReturnValue({ dataViewId: undefined, status: 'ready' });

    const { result, rerender } = renderHook(() => useDataView(PageScope.default));

    await act(async () => rerender(PageScope.default));
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.status).toBe('pristine');
  });

  it('should not call get if status is not ready', async () => {
    jest
      .mocked(useSelector)
      .mockReturnValue({ dataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID, status: 'loading' });

    const { result, rerender } = renderHook(() => useDataView(PageScope.default));

    await act(async () => rerender(PageScope.default));
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.status).toBe('pristine');
  });

  it('should set status to error and call toasts.addDanger on get error', async () => {
    mockGet.mockRejectedValue(new Error('fail!'));

    const { result, rerender } = renderHook(() => useDataView(PageScope.default));

    await act(async () => rerender(PageScope.default));
    expect(result.current.status).toBe('error');
    expect(mockToastsDanger).toHaveBeenCalledWith({
      title: 'Error retrieving data view',
      text: expect.stringContaining('fail!'),
    });
  });

  it('should handle unknown error shape gracefully', async () => {
    mockGet.mockRejectedValue({});

    const { result, rerender } = renderHook(() => useDataView(PageScope.default));

    await act(async () => rerender(PageScope.default));
    expect(result.current.status).toBe('error');
    expect(mockToastsDanger).toHaveBeenCalledWith({
      title: 'Error retrieving data view',
      text: expect.stringContaining('unknown'),
    });
  });
});
