/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { getESQLResults } from '@kbn/esql-utils';
import { createReactQueryWrapper } from '../../../../../common/mock/create_react_query_wrapper';
import { useRiskScore } from '../../../../api/hooks/use_risk_score';
import { useAssetCriticalityFetchList } from '../../../asset_criticality/use_asset_criticality';
import { usePrivilegedUsersTableData } from './hooks';

jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: jest.fn(),
  prettifyQuery: jest.fn((query) => query),
}));

jest.mock('.', () => ({ DEFAULT_PAGE_SIZE: 10 }));

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { search: jest.fn() } } } }),
}));

jest.mock('../../../../../common/hooks/use_global_filter_query', () => ({
  useGlobalFilterQuery: () => ({ filterQuery: undefined }),
}));

jest.mock('../../../../api/hooks/use_risk_score');
jest.mock('../../../asset_criticality/use_asset_criticality');

const mockGetESQLResults = getESQLResults as jest.Mock;
const mockUseRiskScore = useRiskScore as jest.Mock;
const mockUseAssetCriticalityFetchList = useAssetCriticalityFetchList as jest.Mock;

const pumContext = (id: string) => ({
  child: { type: 'security_solution', name: 'entity_analytics:privileged_user_monitoring', id },
});

describe('usePrivilegedUsersTableData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLResults.mockResolvedValue({
      response: { columns: [{ name: 'user.name', type: 'keyword' }], values: [['alice']] },
    });
    mockUseRiskScore.mockReturnValue({
      data: undefined,
      error: undefined,
      loading: false,
      hasEngineBeenInstalled: true,
    });
    mockUseAssetCriticalityFetchList.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    });
  });

  it('labels the table, risk score and asset criticality requests', async () => {
    renderHook(() => usePrivilegedUsersTableData('default', 1, true), {
      wrapper: createReactQueryWrapper(),
    });

    await waitFor(() => expect(mockGetESQLResults).toHaveBeenCalledTimes(1));

    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({ executionContext: pumContext('privileged_users_table') })
    );
    expect(mockUseRiskScore).toHaveBeenCalledWith(
      expect.objectContaining({ executionContext: pumContext('privileged_users_risk_score') })
    );
    expect(mockUseAssetCriticalityFetchList).toHaveBeenCalledWith(
      expect.objectContaining({
        executionContext: pumContext('privileged_users_asset_criticality'),
      })
    );
  });
});
