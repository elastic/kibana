/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import { useEntitiesListQuery } from './use_entities_list_query';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useUiSetting } from '../../../../common/lib/kibana';
import React from 'react';

jest.mock('../../../api/api');
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { http: {} } }),
  useUiSetting: jest.fn(),
}));
jest.mock('@kbn/entity-store/public', () => ({
  FF_ENABLE_ENTITY_STORE_V2: 'securitySolution:entityStoreEnableV2',
}));

describe('useEntitiesListQuery', () => {
  const fetchEntitiesListMock = jest.fn();
  const fetchEntitiesListV2Mock = jest.fn();
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (useUiSetting as jest.Mock).mockReturnValue(false);
    (useEntityAnalyticsRoutes as jest.Mock).mockReturnValue({
      fetchEntitiesList: fetchEntitiesListMock,
      fetchEntitiesListV2: fetchEntitiesListV2Mock,
    });
  });

  it('should call fetchEntitiesList with correct parameters', async () => {
    const searchParams = { entityTypes: [], page: 7 };

    fetchEntitiesListMock.mockResolvedValueOnce({ data: 'test data' });

    const { result } = renderHook(() => useEntitiesListQuery({ ...searchParams, skip: false }), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(fetchEntitiesListMock).toHaveBeenCalledWith({
        params: searchParams,
        signal: expect.any(AbortSignal),
      });
      expect(result.current.data).toEqual({ data: 'test data' });
    });
  });

  it('should call fetchEntitiesListV2 when Entity Store v2 is enabled', async () => {
    (useUiSetting as jest.Mock).mockReturnValue(true);
    const searchParams = {
      entityTypes: ['host'] as EntityType[],
      page: 2,
      perPage: 20,
      sortField: '@timestamp',
      sortOrder: 'desc' as const,
      filterQuery: '{"match_all":{}}',
    };
    const v2Response = { records: [], total: 0, page: 2, per_page: 20 };
    fetchEntitiesListV2Mock.mockResolvedValueOnce(v2Response);

    const { result } = renderHook(() => useEntitiesListQuery({ ...searchParams, skip: false }), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(fetchEntitiesListV2Mock).toHaveBeenCalledWith({
        params: {
          entityTypes: ['host'],
          filterQuery: '{"match_all":{}}',
          page: 2,
          perPage: 20,
          sortField: '@timestamp',
          sortOrder: 'desc',
        },
        signal: expect.any(AbortSignal),
      });
      expect(fetchEntitiesListMock).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(v2Response);
    });
  });

  it('should not call fetchEntitiesList if skip is true', async () => {
    const searchParams = { entityTypes: [], page: 7 };

    const { result } = renderHook(() => useEntitiesListQuery({ ...searchParams, skip: true }), {
      wrapper: TestWrapper,
    });

    expect(fetchEntitiesListMock).not.toHaveBeenCalled();
    expect(fetchEntitiesListV2Mock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});
