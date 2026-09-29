/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useUpdateAssetCriticality } from './use_update_asset_criticality';
import type { Entity } from '../../../../common/api/entity_analytics';
import type { EntityStoreRecord } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';

const mockBulkUpdateEntities = vi.fn();
vi.mock('@kbn/entity-store/public', () => {
  const mocked = {
    bulkUpdateEntities: (...args: unknown[]) => mockBulkUpdateEntities(...args),
  };
  return { ...mocked, default: mocked };
});

const mockApplyEntityStoreSearchCachePatch = vi.fn();
vi.mock('../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => {
  const mocked = {
    applyEntityStoreSearchCachePatch: (...args: unknown[]) =>
      mockApplyEntityStoreSearchCachePatch(...args),
  };
  return { ...mocked, default: mocked };
});

const mockAddError = vi.fn();
vi.mock('../../../common/hooks/use_app_toasts', () => {
  const mocked = {
    useAppToasts: vi.fn().mockReturnValue({
      addError: (...args: unknown[]) => mockAddError(...args),
    }),
  };
  return { ...mocked, default: mocked };
});

const mockHttp = {};
vi.mock('../../../common/lib/kibana', () => {
  const mocked = {
    useKibana: () => ({ services: { http: mockHttp } }),
  };
  return { ...mocked, default: mocked };
});

const mockOnSuccess = vi.fn();

const hostRecord: Entity = {
  entity: { id: 'host-123' },
  asset: { criticality: 'high_impact' },
} as Entity;

describe('useUpdateAssetCriticality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBulkUpdateEntities.mockResolvedValue({});
  });

  describe('updateAssetCriticalityRecord', () => {
    it('calls bulkUpdateEntities with the correct entity type and body', async () => {
      const { result } = renderHook(
        () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.updateAssetCriticalityRecord(hostRecord);
      });

      expect(mockBulkUpdateEntities).toHaveBeenCalledWith(
        mockHttp,
        expect.objectContaining({
          entityType: 'host',
          body: {
            entity: { id: 'host-123' },
            asset: { criticality: 'high_impact' },
          },
          force: true,
        })
      );
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('patches the entity store search cache after a successful update', async () => {
      const { result } = renderHook(
        () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.updateAssetCriticalityRecord(hostRecord);
      });

      expect(mockApplyEntityStoreSearchCachePatch).toHaveBeenCalledWith(
        expect.anything(),
        'host',
        hostRecord
      );
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('shows an error toast when entity id is missing', async () => {
      const recordWithoutId: Entity = {
        entity: {},
        asset: { criticality: 'low_impact' },
      } as Entity;

      const { result } = renderHook(
        () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.updateAssetCriticalityRecord(recordWithoutId);
      });

      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ title: expect.any(String) })
      );
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('shows an error toast when bulkUpdateEntities throws', async () => {
      const error = new Error('network failure');
      mockBulkUpdateEntities.mockRejectedValue(error);

      const { result } = renderHook(
        () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.updateAssetCriticalityRecord(hostRecord);
      });

      expect(mockAddError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ title: expect.any(String) })
      );
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('uses null criticality when asset criticality is not set', async () => {
      const recordWithoutCriticality: Entity = {
        entity: { id: 'host-456' },
      } as Entity;

      const { result } = renderHook(
        () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.updateAssetCriticalityRecord(recordWithoutCriticality);
      });

      expect(mockBulkUpdateEntities).toHaveBeenCalledWith(
        mockHttp,
        expect.objectContaining({
          body: {
            entity: { id: 'host-456' },
            asset: { criticality: null },
          },
        })
      );
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateAssetCriticalityLevel', () => {
    const storeRecord: EntityStoreRecord = {
      entity: { id: 'host-123' },
      asset: { criticality: 'low_impact' },
    } as EntityStoreRecord;

    it('calls bulkUpdateEntities with the given criticality level', async () => {
      const { result } = renderHook(
        () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.updateAssetCriticalityLevel('high_impact', storeRecord);
      });

      expect(mockBulkUpdateEntities).toHaveBeenCalledWith(
        mockHttp,
        expect.objectContaining({
          entityType: 'host',
          body: {
            entity: { id: 'host-123' },
            asset: { criticality: 'high_impact' },
          },
          force: true,
        })
      );
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('maps unassigned level to null criticality', async () => {
      const { result } = renderHook(
        () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.updateAssetCriticalityLevel('unassigned', storeRecord);
      });

      expect(mockBulkUpdateEntities).toHaveBeenCalledWith(
        mockHttp,
        expect.objectContaining({
          body: expect.objectContaining({ asset: { criticality: null } }),
        })
      );
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('patches the cache with the updated criticality level', async () => {
      const { result } = renderHook(
        () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.updateAssetCriticalityLevel('extreme_impact', storeRecord);
      });

      expect(mockApplyEntityStoreSearchCachePatch).toHaveBeenCalledWith(
        expect.anything(),
        'host',
        expect.objectContaining({
          asset: expect.objectContaining({ criticality: 'extreme_impact' }),
        })
      );
    });

    it('shows an error toast when record is null', async () => {
      const { result } = renderHook(
        () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.updateAssetCriticalityLevel('high_impact', null);
      });

      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ title: expect.any(String) })
      );
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('shows an error toast when bulkUpdateEntities throws', async () => {
      const error = new Error('network failure');
      mockBulkUpdateEntities.mockRejectedValue(error);

      const { result } = renderHook(
        () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
        { wrapper: TestProviders }
      );

      await act(async () => {
        await result.current.updateAssetCriticalityLevel('high_impact', storeRecord);
      });

      expect(mockAddError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ title: expect.any(String) })
      );
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});
