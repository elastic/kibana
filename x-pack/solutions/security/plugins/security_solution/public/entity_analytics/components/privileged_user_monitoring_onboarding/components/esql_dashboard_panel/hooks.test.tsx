/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { right } from 'fp-ts/Either';
import { getESQLResults } from '@kbn/esql-utils';
import { createReactQueryWrapper } from '../../../../../common/mock/create_react_query_wrapper';
import { useDashboardTableQuery } from './hooks';

jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: jest.fn(),
  getIndexPatternFromESQLQuery: jest.fn(() => 'logs-*'),
  prettifyQuery: jest.fn((query) => query),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { search: jest.fn() } } } }),
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

const mockGetESQLResults = getESQLResults as jest.Mock;

describe('useDashboardTableQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLResults.mockResolvedValue({ response: { columns: [], values: [] } });
  });

  it('labels the query with the pum_onboarding_dashboard_panel execution context', async () => {
    renderHook(() => useDashboardTableQuery(right('FROM logs-*')), {
      wrapper: createReactQueryWrapper(),
    });

    await waitFor(() => expect(mockGetESQLResults).toHaveBeenCalledTimes(1));

    expect(mockGetESQLResults).toHaveBeenCalledWith(
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
