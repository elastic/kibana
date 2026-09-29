/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { TanstackQueryClient } from '@kbn/react-query';
import { waitFor } from '@testing-library/react';
import { EntityType } from '../../../../common/entity_analytics/types';
import {
  renderMutation,
  renderQuery,
  renderWrappedHook,
} from '../../../management/hooks/test_utils';
import type { Entity } from './use_asset_criticality';
import { useAssetCriticalityPrivileges, useAssetCriticalityData } from './use_asset_criticality';
import { ENTITY_STORE_ENTITIES_LIST } from '../entity_store/hooks/use_entities_list_query';

const mockFetchAssetCriticalityPrivileges = vi.fn().mockResolvedValue({});
const mockFetchEntityStoreV2Privileges = vi.fn().mockResolvedValue({});
const mockFetchAssetCriticality = vi.fn().mockResolvedValue({});
const mockDeleteAssetCriticality = vi.fn().mockResolvedValue({});
const mockCreateAssetCriticality = vi.fn().mockResolvedValue({});
vi.mock('../../api/api', () => {
  const mocked = {
    useEntityAnalyticsRoutes: () => ({
      fetchAssetCriticalityPrivileges: mockFetchAssetCriticalityPrivileges,
      fetchEntityStoreV2Privileges: mockFetchEntityStoreV2Privileges,
      fetchAssetCriticality: mockFetchAssetCriticality,
      deleteAssetCriticality: mockDeleteAssetCriticality,
      createAssetCriticality: mockCreateAssetCriticality,
    }),
  };
  return { ...mocked, default: mocked };
});

const mockUseHasSecurityCapability = vi.fn().mockReturnValue(false);
vi.mock('../../../helper_hooks', () => {
  const mocked = {
    useHasSecurityCapability: () => mockUseHasSecurityCapability(),
  };
  return { ...mocked, default: mocked };
});

describe('useAssetCriticality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAssetCriticalityPrivileges', () => {
    it('does not call any privileges API when hasEntityAnalyticsCapability is false', async () => {
      mockUseHasSecurityCapability.mockReturnValue(false);

      await renderQuery(() => useAssetCriticalityPrivileges('test_entity_name'), 'isSuccess');

      expect(mockFetchEntityStoreV2Privileges).not.toHaveBeenCalled();
      expect(mockFetchAssetCriticalityPrivileges).not.toHaveBeenCalled();
    });

    it('calls entity store v2 privileges API when hasEntityAnalyticsCapability is true', async () => {
      mockUseHasSecurityCapability.mockReturnValue(true);

      await renderQuery(() => useAssetCriticalityPrivileges('test_entity_name'), 'isSuccess');

      expect(mockFetchEntityStoreV2Privileges).toHaveBeenCalled();
      expect(mockFetchAssetCriticalityPrivileges).not.toHaveBeenCalled();
    });
  });

  describe('useAssetCriticalityData', () => {
    it('calls delete api when the mutation is called with unassigned criticality level', async () => {
      mockFetchEntityStoreV2Privileges.mockResolvedValue({ has_all_required: true });
      mockDeleteAssetCriticality.mockResolvedValue({});
      mockCreateAssetCriticality.mockResolvedValue({});
      const entity: Entity = { name: 'test_entity_name', type: EntityType.host };

      const { mutation } = await renderWrappedHook(() => useAssetCriticalityData({ entity }));

      await renderMutation(async () =>
        mutation.mutate({
          idField: 'test_entity_type.name',
          idValue: 'test_entity_name',
          criticalityLevel: 'unassigned',
        })
      );

      expect(mockDeleteAssetCriticality).toHaveBeenCalled();
    });

    it('calls create api when the mutation is called with assigned criticality level', async () => {
      mockFetchEntityStoreV2Privileges.mockResolvedValue({ has_all_required: true });
      mockDeleteAssetCriticality.mockResolvedValue({});
      mockCreateAssetCriticality.mockResolvedValue({});
      const entity: Entity = { name: 'test_entity_name', type: EntityType.host };

      const { mutation } = await renderWrappedHook(() => useAssetCriticalityData({ entity }));

      await renderMutation(async () =>
        mutation.mutate({
          idField: 'test_entity_type.name',
          idValue: 'test_entity_name',
          criticalityLevel: 'critical',
        })
      );

      expect(mockCreateAssetCriticality).toHaveBeenCalled();
    });

    it('invalidates the entity store entities list query on a successful mutation', async () => {
      mockFetchAssetCriticalityPrivileges.mockResolvedValue({ has_all_required: true });
      mockCreateAssetCriticality.mockResolvedValue({});
      const entity: Entity = { name: 'test_entity_name', type: EntityType.host };
      const invalidateQueriesSpy = vi.spyOn(TanstackQueryClient.prototype, 'invalidateQueries');

      const { mutation } = await renderWrappedHook(() => useAssetCriticalityData({ entity }));

      await renderMutation(async () =>
        mutation.mutate({
          idField: 'test_entity_type.name',
          idValue: 'test_entity_name',
          criticalityLevel: 'critical',
        })
      );

      await waitFor(() =>
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: [ENTITY_STORE_ENTITIES_LIST],
        })
      );

      invalidateQueriesSpy.mockRestore();
    });
  });
});
