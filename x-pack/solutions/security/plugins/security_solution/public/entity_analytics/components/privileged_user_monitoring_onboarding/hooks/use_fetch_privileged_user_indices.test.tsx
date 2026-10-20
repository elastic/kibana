/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { createReactQueryWrapper } from '../../../../common/mock/create_react_query_wrapper';
import { useFetchPrivilegedUserIndices } from './use_fetch_privileged_user_indices';

const mockSearchPrivMonIndices = jest.fn();

jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    searchPrivMonIndices: mockSearchPrivMonIndices,
  }),
}));

describe('useFetchPrivilegedUserIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchPrivMonIndices.mockResolvedValue([]);
  });

  it('searches indices with the pum_indices_search execution context', async () => {
    renderHook(() => useFetchPrivilegedUserIndices('logs-*'), {
      wrapper: createReactQueryWrapper(),
    });

    await waitFor(() => expect(mockSearchPrivMonIndices).toHaveBeenCalledTimes(1));

    expect(mockSearchPrivMonIndices).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'logs-*',
        context: {
          child: {
            type: 'security_solution',
            name: 'entity_analytics:privileged_user_monitoring',
            id: 'pum_indices_search',
          },
        },
      })
    );
  });
});
