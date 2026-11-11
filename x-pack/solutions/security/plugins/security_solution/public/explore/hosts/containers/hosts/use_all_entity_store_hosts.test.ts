/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';
import { HostsType } from '../../store/model';
import { useAllEntityStoreHosts } from './use_all_entity_store_hosts';

jest.mock('../../../../entity_analytics/api/api', () => ({
  useEntityAnalyticsRoutes: jest.fn(),
}));

const mockUseEntityAnalyticsRoutes = useEntityAnalyticsRoutes as jest.Mock;

describe('useAllEntityStoreHosts', () => {
  const fetchEntitiesListV2 = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    fetchEntitiesListV2.mockResolvedValue({ records: [], total: 0, page: 1, per_page: 10 });
    mockUseEntityAnalyticsRoutes.mockReturnValue({ fetchEntitiesListV2 });
  });

  it('labels the entity store list request with the hosts page execution context', async () => {
    renderHook(
      () =>
        useAllEntityStoreHosts({
          endDate: '2020-07-08T08:20:18.966Z',
          indexNames: [],
          skip: false,
          startDate: '2020-07-07T08:20:18.966Z',
          type: HostsType.page,
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(fetchEntitiesListV2).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ entityTypes: ['host'] }),
          context: {
            child: {
              type: 'security_solution',
              name: 'entity_analytics:explore-hosts_page',
              id: 'hosts_entity_store_list',
            },
          },
        })
      );
    });
  });
});
