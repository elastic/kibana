/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { createReactQueryWrapper } from '../../../../../../../common/mock/create_react_query_wrapper';
import { usePrivilegedAccessDetectionAnomaliesQuery } from './pad_query_hooks';

jest.mock('@kbn/esql-utils', () => ({
  prettifyQuery: jest.fn((query) => query),
}));

jest.mock('../../../../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { esql: mockEsql } } } }),
}));

jest.mock('../../../../../../../common/hooks/esql/use_esql_global_filter', () => ({
  useEsqlGlobalFilterQuery: () => undefined,
}));

jest.mock('../../../../../../../common/hooks/use_error_toast', () => ({
  useErrorToast: jest.fn(),
}));

jest.mock('./pad_esql_source_query_hooks', () => ({
  usePadTopAnomalousUsersEsqlSource: () => 'FROM top-users',
  usePadAnomalyDataEsqlSource: () => 'FROM anomaly-data',
}));

const mockEsql = jest.fn();

const pumContext = (id: string) => ({
  child: { type: 'security_solution', name: 'entity_analytics:privileged_user_monitoring', id },
});

describe('usePrivilegedAccessDetectionAnomaliesQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEsql.mockResolvedValue({
      rawResponse: {
        columns: [{ name: 'user.name', type: 'keyword' }],
        values: [['alice']],
      },
    });
  });

  it('labels the top users and anomalies queries with their execution contexts', async () => {
    renderHook(
      () =>
        usePrivilegedAccessDetectionAnomaliesQuery({
          jobIds: ['job-1'],
          spaceId: 'default',
          anomalyBands: [],
        }),
      { wrapper: createReactQueryWrapper() }
    );

    await waitFor(() => expect(mockEsql).toHaveBeenCalledTimes(2));

    expect(mockEsql).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM top-users' }),
      expect.objectContaining({ executionContext: pumContext('pad_chart_top_users') })
    );
    expect(mockEsql).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM anomaly-data' }),
      expect.objectContaining({ executionContext: pumContext('pad_chart_anomalies') })
    );
  });
});
