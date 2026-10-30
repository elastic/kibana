/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { getESQLResults } from '@kbn/esql-utils';
import { createReactQueryWrapper } from '../../../../common/mock/create_react_query_wrapper';
import { useGetLatestCSVPrivilegedUserUploadQuery } from './manage_data_sources_query_hooks';

jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: jest.fn(),
}));

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { search: jest.fn() } } } }),
}));

const mockGetESQLResults = getESQLResults as jest.Mock;

describe('useGetLatestCSVPrivilegedUserUploadQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLResults.mockResolvedValue({ response: { columns: [], values: [] } });
  });

  it('runs the ES|QL query with the pum_data_sources_latest_csv execution context', async () => {
    renderHook(() => useGetLatestCSVPrivilegedUserUploadQuery('default'), {
      wrapper: createReactQueryWrapper(),
    });

    await waitFor(() => expect(mockGetESQLResults).toHaveBeenCalledTimes(1));

    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        executionContext: {
          child: {
            type: 'security_solution',
            name: 'entity_analytics:privileged_user_monitoring',
            id: 'pum_data_sources_latest_csv',
          },
        },
      })
    );
  });
});
