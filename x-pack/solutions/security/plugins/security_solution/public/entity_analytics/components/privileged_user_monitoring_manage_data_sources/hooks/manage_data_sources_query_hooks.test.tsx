/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { createReactQueryWrapper } from '../../../../common/mock/create_react_query_wrapper';
import { useGetLatestCSVPrivilegedUserUploadQuery } from './manage_data_sources_query_hooks';

const mockEsql = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { esql: mockEsql } } } }),
}));

describe('useGetLatestCSVPrivilegedUserUploadQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEsql.mockResolvedValue({ rawResponse: { columns: [], values: [] } });
  });

  it('runs the ES|QL query with the pum_data_sources_latest_csv execution context', async () => {
    renderHook(() => useGetLatestCSVPrivilegedUserUploadQuery('default'), {
      wrapper: createReactQueryWrapper(),
    });

    await waitFor(() => expect(mockEsql).toHaveBeenCalledTimes(1));

    expect(mockEsql).toHaveBeenCalledWith(
      expect.anything(),
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
