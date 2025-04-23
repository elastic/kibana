/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  elasticsearchServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import type { InitEntityStoreRequestBody } from '../../../common/api/entity_analytics/entity_store/enable.gen';
import type { SecuritySolutionApiRequestHandlerContext } from '../..';
import { AssetInventoryDataClient } from './asset_inventory_data_client';

const mockSecSolutionContext = {
  getEntityStoreDataClient: jest.fn(),
} as unknown as SecuritySolutionApiRequestHandlerContext;

const mockEntityStorePrivileges = {
  has_all_required: true,
  privileges: {
    elasticsearch: {
      cluster: {},
      index: {},
    },
  },
};

describe('AssetInventoryDataClient', () => {
  const loggerMock = loggingSystemMock.createLogger();
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const uiSettingsClientMock = uiSettingsServiceMock.createClient();

  const client: AssetInventoryDataClient = new AssetInventoryDataClient({
    logger: loggerMock,
    clusterClient: clusterClientMock,
    uiSettingsClient: uiSettingsClientMock,
  });

  describe('status function', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      uiSettingsClientMock.get.mockResolvedValue(true);
    });

    it('returns INACTIVE_FEATURE when uisetting is disabled', async () => {
      uiSettingsClientMock.get.mockResolvedValue(false);

      const result = await client.status(mockSecSolutionContext, mockEntityStorePrivileges);

      expect(result).toEqual({ status: 'inactive_feature' });
    });

    it('returns INSUFFICIENT_PRIVILEGES with missing privileges when user lacks required privileges', async () => {
      const noPrivileges = {
        ...mockEntityStorePrivileges,
        has_all_required: false,
      };

      const result = await client.status(mockSecSolutionContext, noPrivileges);

      expect(result).toEqual({
        status: 'insufficient_privileges',
        privileges: noPrivileges,
      });
    });

    it('returns DISABLED when entity store is not installed', async () => {
      (mockSecSolutionContext.getEntityStoreDataClient as unknown as jest.Mock).mockReturnValue({
        status: () => ({
          status: 'not_installed',
          engines: [],
        }),
      });

      const result = await client.status(mockSecSolutionContext, mockEntityStorePrivileges);

      expect(result).toEqual({ status: 'disabled' });
    });

    it('returns INITIALIZING when entity store is installing', async () => {
      (mockSecSolutionContext.getEntityStoreDataClient as unknown as jest.Mock).mockReturnValue({
        status: () => ({
          status: 'installing',
          engines: [],
        }),
      });

      const result = await client.status(mockSecSolutionContext, mockEntityStorePrivileges);

      expect(result).toEqual({ status: 'initializing' });
    });

    it('returns DISABLED when host entity engine is missing', async () => {
      (mockSecSolutionContext.getEntityStoreDataClient as unknown as jest.Mock).mockReturnValue({
        status: () => ({
          status: 'ready',
          engines: [{ type: 'other' }],
        }),
      });

      const result = await client.status(mockSecSolutionContext, mockEntityStorePrivileges);

      expect(result).toEqual({ status: 'disabled' });
    });

    it('returns READY when documents have been processed', async () => {
      (mockSecSolutionContext.getEntityStoreDataClient as unknown as jest.Mock).mockReturnValue({
        status: () => ({
          status: 'ready',
          engines: [
            {
              type: 'host',
              components: [
                { resource: 'transform', metadata: { documents_processed: 10, trigger_count: 5 } },
              ],
            },
          ],
        }),
      });

      const result = await client.status(mockSecSolutionContext, mockEntityStorePrivileges);

      expect(result).toEqual({ status: 'ready' });
    });

    it('returns EMPTY when no documents are processed after transform is triggered', async () => {
      (mockSecSolutionContext.getEntityStoreDataClient as unknown as jest.Mock).mockReturnValue({
        status: () => ({
          status: 'ready',
          engines: [
            {
              type: 'host',
              components: [
                { resource: 'transform', metadata: { documents_processed: 0, trigger_count: 1 } },
              ],
            },
          ],
        }),
      });

      const result = await client.status(mockSecSolutionContext, mockEntityStorePrivileges);

      expect(result).toEqual({ status: 'empty' });
    });

    it(`returns INITIALIZING when no documents are processed and the transform haven't triggered`, async () => {
      (mockSecSolutionContext.getEntityStoreDataClient as unknown as jest.Mock).mockReturnValue({
        status: () => ({
          status: 'ready',
          engines: [
            {
              type: 'host',
              components: [
                { resource: 'transform', metadata: { documents_processed: 0, trigger_count: 0 } },
              ],
            },
          ],
        }),
      });

      const result = await client.status(mockSecSolutionContext, mockEntityStorePrivileges);

      expect(result).toEqual({ status: 'initializing' });
    });
  });

  describe('enable function', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      uiSettingsClientMock.get.mockResolvedValue(true);
    });

    it('throws error when uisetting is disabled', async () => {
      uiSettingsClientMock.get.mockResolvedValue(false);

      await expect(
        client.enable(mockSecSolutionContext, {} as InitEntityStoreRequestBody)
      ).rejects.toThrowError('uiSetting');
    });
  });

  describe('delete function', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      uiSettingsClientMock.get.mockResolvedValue(true);
    });

    it('throws error when uisetting is disabled', async () => {
      uiSettingsClientMock.get.mockResolvedValue(false);

      await expect(client.delete()).rejects.toThrowError('uiSetting');
    });
  });
});
