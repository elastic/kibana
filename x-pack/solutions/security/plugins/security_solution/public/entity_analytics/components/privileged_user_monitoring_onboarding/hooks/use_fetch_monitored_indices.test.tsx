/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { createReactQueryWrapper } from '../../../../common/mock/create_react_query_wrapper';
import { useFetchMonitoredIndices } from './use_fetch_monitored_indices';

const mockListPrivMonMonitoredIndices = jest.fn();

jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    listPrivMonMonitoredIndices: mockListPrivMonMonitoredIndices,
  }),
}));

describe('useFetchMonitoredIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListPrivMonMonitoredIndices.mockResolvedValue({ indices: [] });
  });

  it('lists monitored indices with the pum_monitored_indices_list execution context', async () => {
    renderHook(() => useFetchMonitoredIndices(), { wrapper: createReactQueryWrapper() });

    await waitFor(() => expect(mockListPrivMonMonitoredIndices).toHaveBeenCalledTimes(1));

    expect(mockListPrivMonMonitoredIndices).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {
          child: {
            type: 'security_solution',
            name: 'entity_analytics:privileged_user_monitoring',
            id: 'pum_monitored_indices_list',
          },
        },
      })
    );
  });
});
