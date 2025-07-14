/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

import { useCreateDataView } from './use_create_data_view';
import { useKibana } from '../lib/kibana';

jest.mock('../lib/kibana');
jest.mock('./use_experimental_features');

describe('useCreateDataView', () => {
  const dataViewSpec = { title: 'test' };
  const mockDataViews = {
    create: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        dataViews: mockDataViews,
      },
    });
  });

  it('returns undefined on initial render', () => {
    const { result } = renderHook(() =>
      useCreateDataView({ dataViewSpec, loading: true, skip: false })
    );

    expect(result.current.dataView).toBeUndefined();
    expect(result.current.loading).toBe(true);
  });

  it('returns a DataView when a valid dataViewSpec is provided', async () => {
    const mockDataView = { id: 'mockDataViewId', title: 'test' };
    mockDataViews.create.mockResolvedValue(mockDataView);

    const { result } = renderHook(() =>
      useCreateDataView({ dataViewSpec, loading: false, skip: false })
    );
    await waitFor(() => {});

    expect(result.current.dataView).toEqual(mockDataView);
    expect(result.current.loading).toBe(false);
  });

  it('returns undefined if dataViews.create throws an error', async () => {
    mockDataViews.create.mockRejectedValue(new Error('simulated error'));

    const { result } = renderHook(() =>
      useCreateDataView({ dataViewSpec, loading: false, skip: false })
    );
    await waitFor(() => {});

    expect(result.current.dataView).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it('skips data view creation if skip is true', async () => {
    const { result } = renderHook(() =>
      useCreateDataView({ dataViewSpec, loading: false, skip: true })
    );

    expect(mockDataViews.create).not.toHaveBeenCalled();
    expect(result.current.dataView).toBeUndefined();
  });
});
