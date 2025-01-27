/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

import { useDataView } from '.';
import { useKibana } from '../../../../../common/lib/kibana';

jest.mock('../../../../../common/lib/kibana');

describe('useDataView', () => {
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
    const { result } = renderHook(() => useDataView({ dataViewSpec, loading: true }));

    expect(result.current).toBeUndefined();
  });

  it('returns a DataView when a valid dataViewSpec is provided', async () => {
    const mockDataView = { id: 'mockDataViewId', title: 'test' };
    mockDataViews.create.mockResolvedValue(mockDataView);

    const { result } = renderHook(() => useDataView({ dataViewSpec, loading: false }));
    await waitFor(() => {});

    expect(result.current).toEqual(mockDataView);
  });

  it('returns undefined if dataViews.create throws an error', async () => {
    mockDataViews.create.mockRejectedValue(new Error('simulated error'));

    const { result } = renderHook(() => useDataView({ dataViewSpec, loading: false }));
    await waitFor(() => {});

    expect(result.current).toBeUndefined();
  });
});
