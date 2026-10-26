/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import {
  getFakeListId,
  getFakeListDefinition,
  getFakeHttpService,
} from '../../../hooks/test_utils';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { useCreateOrUpdateArtifact } from './use_artifact_update_or_create';

const renderAndWaitForHook = async (apiClient: ExceptionsListApiClient) => {
  let hookResult: ReturnType<typeof renderHook<ReturnType<typeof useCreateOrUpdateArtifact>, void>>;
  await act(async () => {
    hookResult = renderHook(() => useCreateOrUpdateArtifact(apiClient));
  });
  // Re-render to pick up the ref value set by useEffect
  hookResult!.rerender();
  return hookResult!;
};

const createEntry = (field: string, value: string): EntriesArray => [
  {
    field,
    operator: 'included' as const,
    type: 'match' as const,
    value,
  },
];

describe('useCreateOrUpdateArtifact', () => {
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let apiClient: ExceptionsListApiClient;

  beforeEach(() => {
    fakeHttpServices = getFakeHttpService();
    apiClient = new ExceptionsListApiClient(
      fakeHttpServices,
      getFakeListId(),
      getFakeListDefinition()
    );
  });

  it('should return createOrUpdateArtifact function and isLoading as false', async () => {
    const { result } = await renderAndWaitForHook(apiClient);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.createOrUpdateArtifact).not.toBeNull();
  });

  describe('when creating a new item without additional entries groups', () => {
    it('should call create API once', async () => {
      const newItem = {
        ...getExceptionListItemSchemaMock(),
        list_id: getFakeListId(),
      };
      const { id: _, ...createItem } = newItem;

      const createdItem = { ...newItem, id: 'new-id' };
      fakeHttpServices.post.mockResolvedValueOnce(createdItem);

      const { result } = await renderAndWaitForHook(apiClient);

      let items: (typeof createdItem)[];
      await act(async () => {
        items = await result.current.createOrUpdateArtifact!(createItem, undefined);
      });

      expect(items!).toEqual([createdItem]);
      expect(fakeHttpServices.post).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.put).not.toHaveBeenCalled();
    });
  });

  describe('when updating an existing item without additional entries groups', () => {
    it('should call update API once', async () => {
      const existingItem = {
        ...getExceptionListItemSchemaMock(),
        list_id: getFakeListId(),
        id: 'existing-id',
      };

      fakeHttpServices.put.mockResolvedValueOnce(existingItem);

      const { result } = await renderAndWaitForHook(apiClient);

      let items: (typeof existingItem)[];
      await act(async () => {
        items = await result.current.createOrUpdateArtifact!(existingItem, undefined);
      });

      expect(items!).toEqual([existingItem]);
      expect(fakeHttpServices.put).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.post).not.toHaveBeenCalled();
    });
  });

  describe('when creating a new item with additional entries groups (OR operator)', () => {
    it('should call create API for each item', async () => {
      const newItem = {
        ...getExceptionListItemSchemaMock(),
        list_id: getFakeListId(),
      };
      const { id: _, ...createItem } = newItem;

      const additionalEntries: EntriesArray[] = [
        createEntry('file.path', '/bin/bash'),
        createEntry('process.name', 'curl'),
      ];

      const createdItem1 = { ...newItem, id: 'id-1' };
      const createdItem2 = { ...newItem, id: 'id-2' };
      const createdItem3 = { ...newItem, id: 'id-3' };
      fakeHttpServices.post
        .mockResolvedValueOnce(createdItem1)
        .mockResolvedValueOnce(createdItem2)
        .mockResolvedValueOnce(createdItem3);

      const { result } = await renderAndWaitForHook(apiClient);

      let items: (typeof createdItem1)[];
      await act(async () => {
        items = await result.current.createOrUpdateArtifact!(createItem, additionalEntries);
      });

      expect(items!).toEqual([createdItem1, createdItem2, createdItem3]);
      expect(fakeHttpServices.post).toHaveBeenCalledTimes(3);
      expect(fakeHttpServices.put).not.toHaveBeenCalled();
    });

    it('should copy metadata from original item to additional items', async () => {
      const newItem = {
        ...getExceptionListItemSchemaMock(),
        list_id: getFakeListId(),
        name: 'Test Exception',
        description: 'Test description',
        os_types: ['windows' as const],
        tags: ['policy:all'],
      };
      const { id: _, ...createItem } = newItem;

      const additionalEntries: EntriesArray[] = [createEntry('file.path', '/test')];

      fakeHttpServices.post
        .mockResolvedValueOnce({ ...newItem, id: 'id-1' })
        .mockResolvedValueOnce({ ...newItem, id: 'id-2' });

      const { result } = await renderAndWaitForHook(apiClient);

      await act(async () => {
        await result.current.createOrUpdateArtifact!(createItem, additionalEntries);
      });

      // Verify the second POST (additional item) has the same metadata
      const secondCallBody = JSON.parse(
        (fakeHttpServices.post.mock.calls[1] as unknown as [string, { body: string }])[1].body
      );
      expect(secondCallBody.name).toBe('Test Exception');
      expect(secondCallBody.description).toBe('Test description');
      expect(secondCallBody.os_types).toEqual(['windows']);
      expect(secondCallBody.tags).toEqual(['policy:all']);
      expect(secondCallBody.entries).toEqual(additionalEntries[0]);
    });
  });

  describe('when updating an existing item with additional entries groups (edit + OR)', () => {
    it('should call update for the first item and create for additional items', async () => {
      const existingItem = {
        ...getExceptionListItemSchemaMock(),
        list_id: getFakeListId(),
        id: 'existing-id',
      };

      const additionalEntries: EntriesArray[] = [createEntry('file.path', '/new')];

      const updatedItem = { ...existingItem };
      const createdItem = { ...existingItem, id: 'new-id' };
      fakeHttpServices.put.mockResolvedValueOnce(updatedItem);
      fakeHttpServices.post.mockResolvedValueOnce(createdItem);

      const { result } = await renderAndWaitForHook(apiClient);

      let items: (typeof existingItem)[];
      await act(async () => {
        items = await result.current.createOrUpdateArtifact!(existingItem, additionalEntries);
      });

      expect(items!).toEqual([updatedItem, createdItem]);
      expect(fakeHttpServices.put).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('when an empty additional entries array is provided', () => {
    it('should only submit the primary item', async () => {
      const newItem = {
        ...getExceptionListItemSchemaMock(),
        list_id: getFakeListId(),
      };
      const { id: _, ...createItem } = newItem;

      fakeHttpServices.post.mockResolvedValueOnce({ ...newItem, id: 'id-1' });

      const { result } = await renderAndWaitForHook(apiClient);

      await act(async () => {
        await result.current.createOrUpdateArtifact!(createItem, []);
      });

      expect(fakeHttpServices.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should set isLoading back to false on error', async () => {
      const newItem = {
        ...getExceptionListItemSchemaMock(),
        list_id: getFakeListId(),
      };
      const { id: _, ...createItem } = newItem;

      fakeHttpServices.post.mockRejectedValueOnce(new Error('API error'));

      const { result } = await renderAndWaitForHook(apiClient);

      await act(async () => {
        await expect(result.current.createOrUpdateArtifact!(createItem, undefined)).rejects.toThrow(
          'API error'
        );
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
