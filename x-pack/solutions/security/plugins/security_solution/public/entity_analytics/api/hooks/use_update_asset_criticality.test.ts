/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useUpdateAssetCriticality } from './use_update_asset_criticality';
import type { Entity } from '../../../../common/api/entity_analytics';

const mockBulkUpdateEntities = jest.fn();
jest.mock('@kbn/entity-store/public', () => ({
  bulkUpdateEntities: (...args: unknown[]) => mockBulkUpdateEntities(...args),
}));

const mockApplyEntityStoreSearchCachePatch = jest.fn();
jest.mock('../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => ({
  applyEntityStoreSearchCachePatch: (...args: unknown[]) =>
    mockApplyEntityStoreSearchCachePatch(...args),
}));

const mockAddError = jest.fn();
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: (...args: unknown[]) => mockAddError(...args),
  }),
}));

const mockHttp = {};
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { http: mockHttp } }),
}));

const mockOnSuccess = jest.fn();

const hostRecord: Entity = {
  entity: { id: 'host-123' },
  asset: { criticality: 'high_impact' },
} as Entity;

describe('useUpdateAssetCriticality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkUpdateEntities.mockResolvedValue({});
  });

  it('calls bulkUpdateEntities with the correct entity type and body', async () => {
    const { result } = renderHook(
      () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
      { wrapper: TestProviders }
    );

    await act(async () => {
      await result.current(hostRecord);
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
  });

  it('patches the entity store search cache after a successful update', async () => {
    const { result } = renderHook(
      () => useUpdateAssetCriticality('host', { onSuccess: mockOnSuccess }),
      { wrapper: TestProviders }
    );

    await act(async () => {
      await result.current(hostRecord);
    });

    expect(mockApplyEntityStoreSearchCachePatch).toHaveBeenCalledWith(
      expect.anything(),
      'host',
      hostRecord
    );
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
      await result.current(recordWithoutId);
    });

    expect(mockAddError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ title: expect.any(String) })
    );
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
      await result.current(recordWithoutCriticality);
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
  });

  it('works with user entity type', async () => {
    const userRecord: Entity = {
      entity: { id: 'user-789' },
      asset: { criticality: 'extreme_impact' },
    } as Entity;

    const { result } = renderHook(
      () => useUpdateAssetCriticality('user', { onSuccess: mockOnSuccess }),
      { wrapper: TestProviders }
    );

    await act(async () => {
      await result.current(userRecord);
    });

    expect(mockBulkUpdateEntities).toHaveBeenCalledWith(
      mockHttp,
      expect.objectContaining({ entityType: 'user' })
    );
    expect(mockApplyEntityStoreSearchCachePatch).toHaveBeenCalledWith(
      expect.anything(),
      'user',
      userRecord
    );
  });
});
