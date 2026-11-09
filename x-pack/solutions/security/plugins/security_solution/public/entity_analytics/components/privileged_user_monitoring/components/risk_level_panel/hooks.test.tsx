/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { getESQLResults } from '@kbn/esql-utils';
import { createReactQueryWrapper } from '../../../../../common/mock/create_react_query_wrapper';
import { useRiskLevelsPrivilegedUserQuery } from './hooks';

jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: jest.fn(),
  prettifyQuery: jest.fn((query) => query),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { search: jest.fn() } } } }),
}));

jest.mock('../../../../../common/hooks/esql/use_esql_global_filter', () => ({
  useEsqlGlobalFilterQuery: () => undefined,
}));

jest.mock('../../../../../common/hooks/use_error_toast', () => ({
  useErrorToast: jest.fn(),
}));

jest.mock('../../../../hooks/use_get_default_risk_index', () => ({
  useGetDefaultRiskIndex: () => 'risk-score.risk-score-latest-default',
}));

jest.mock('../../../../api/hooks/use_risk_engine_status', () => ({
  useRiskEngineStatus: () => ({
    data: { risk_engine_status: 'ENABLED' },
    isFetching: false,
    refetch: jest.fn(),
  }),
}));

const mockGetESQLResults = getESQLResults as jest.Mock;

describe('useRiskLevelsPrivilegedUserQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLResults.mockResolvedValue({ response: { columns: [], values: [] } });
  });

  it('labels the query with the pum_risk_level_panel execution context', async () => {
    renderHook(() => useRiskLevelsPrivilegedUserQuery({ skip: false, spaceId: 'default' }), {
      wrapper: createReactQueryWrapper(),
    });

    await waitFor(() => expect(mockGetESQLResults).toHaveBeenCalledTimes(1));

    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        executionContext: {
          child: {
            type: 'security_solution',
            name: 'entity_analytics:privileged_user_monitoring',
            id: 'pum_risk_level_panel',
          },
        },
      })
    );
  });
});
