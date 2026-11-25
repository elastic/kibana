/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { right } from 'fp-ts/Either';
import { createReactQueryWrapper } from '../../../../../common/mock/create_react_query_wrapper';
import { useDashboardTableQuery } from './hooks';

jest.mock('@kbn/esql-utils', () => ({
  getIndexPatternFromESQLQuery: jest.fn(() => 'logs-*'),
  prettifyQuery: jest.fn((query) => query),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { esql: mockEsql } } } }),
}));

jest.mock('../../../../../common/hooks/esql/use_esql_global_filter', () => ({
  useEsqlGlobalFilterQuery: () => undefined,
}));

jest.mock('../../../../../common/containers/use_global_time', () => ({
  useGlobalTime: () => ({ deleteQuery: jest.fn(), setQuery: jest.fn() }),
}));

jest.mock('../../../../../common/components/page/manage_query', () => ({
  useQueryInspector: jest.fn(),
}));

const mockEsql = jest.fn();

describe('useDashboardTableQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEsql.mockResolvedValue({ rawResponse: { columns: [], values: [] } });
  });

  it('labels the query with the pum_onboarding_dashboard_panel execution context', async () => {
    renderHook(() => useDashboardTableQuery(right('FROM logs-*')), {
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
            id: 'pum_onboarding_dashboard_panel',
          },
        },
      })
    );
  });
});
