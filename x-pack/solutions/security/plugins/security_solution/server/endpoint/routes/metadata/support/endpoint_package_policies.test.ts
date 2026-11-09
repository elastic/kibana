/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { createPackagePolicyServiceMock } from '@kbn/fleet-plugin/server/mocks';
import type { PackagePolicy } from '@kbn/fleet-plugin/common/types/models';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { getAllEndpointPackagePolicies } from './endpoint_package_policies';

describe('endpoint_package_policies', () => {
  describe('getAllEndpointPackagePolicies', () => {
    let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
    let mockPackagePolicyService: jest.Mocked<PackagePolicyClient>;

    beforeEach(() => {
      mockSavedObjectClient = savedObjectsClientMock.create();
      mockPackagePolicyService = createPackagePolicyServiceMock();
    });

    it.each([true, false])(
      'stops paging when aborted before the next read (initially aborted: %s)',
      async (initiallyAborted) => {
        const controller = new AbortController();
        if (initiallyAborted) {
          controller.abort();
        }
        mockPackagePolicyService.list.mockImplementation(async () => {
          controller.abort();
          return { items: [{ id: '1' } as PackagePolicy], total: 1, perPage: 1000, page: 1 };
        });
        await expect(
          getAllEndpointPackagePolicies(
            mockPackagePolicyService,
            mockSavedObjectClient,
            controller.signal
          )
        ).rejects.toThrow();
        expect(mockPackagePolicyService.list).toHaveBeenCalledTimes(initiallyAborted ? 0 : 1);
      }
    );

    it('gets all endpoint package policies', async () => {
      const mockPolicy: PackagePolicy = {
        id: '1',
        policy_id: 'test-id-1',
      } as PackagePolicy;
      mockPackagePolicyService.list
        .mockResolvedValueOnce({
          items: [mockPolicy],
          total: 1,
          perPage: 10,
          page: 1,
        })
        .mockResolvedValueOnce({
          items: [],
          total: 1,
          perPage: 10,
          page: 1,
        });

      const endpointPackagePolicies = await getAllEndpointPackagePolicies(
        mockPackagePolicyService,
        mockSavedObjectClient
      );
      const expected: PackagePolicy[] = [mockPolicy];
      expect(endpointPackagePolicies).toEqual(expected);
    });
  });
});
