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
  getDataViewsService: jest.fn(),
  getSpaceId: jest.fn(),
  core: {
    elasticsearch: {
      client: {
        asInternalUser: {
          count: jest.fn(),
        },
      },
    },
  },
} as unknown as SecuritySolutionApiRequestHandlerContext;

const mockEntityStorePrivileges = {
  has_all_required: true,
  has_read_permissions: true,
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
      (mockSecSolutionContext.getSpaceId as jest.Mock).mockReturnValue('default');
      (
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count as jest.Mock
      ).mockReset();
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

      // Mock that no generic documents exist
      (
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count as jest.Mock
      ).mockResolvedValue({
        count: 0,
      });

      const result = await client.status(mockSecSolutionContext, noPrivileges);

      expect(result).toEqual({
        status: 'insufficient_privileges',
        privileges: noPrivileges,
      });
    });

    it('returns READY when user lacks privileges but generic documents exist', async () => {
      const noPrivileges = {
        ...mockEntityStorePrivileges,
        has_all_required: false,
      };

      // Mock that generic documents exist
      (
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count as jest.Mock
      ).mockResolvedValue({
        count: 5,
      });

      // Mock data view service for installAssetInventoryDataView
      const mockDataViewService = {
        get: jest.fn().mockRejectedValue({ output: { statusCode: 404 } }),
        createAndSave: jest.fn().mockResolvedValue({ id: 'asset-inventory-default' }),
      };
      (mockSecSolutionContext.getDataViewsService as jest.Mock).mockReturnValue(
        mockDataViewService
      );

      const result = await client.status(mockSecSolutionContext, noPrivileges);

      expect(result).toEqual({ status: 'ready' });
      expect(
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count
      ).toHaveBeenCalledWith({
        index: '.entities.v1.latest.security_generic_default',
      });
      // Verify that installAssetInventoryDataView was called
      expect(mockDataViewService.get).toHaveBeenCalledWith('asset-inventory-default', false);
      expect(mockDataViewService.createAndSave).toHaveBeenCalled();
    });

    it('returns READY when user lacks privileges but generic documents exist in custom space', async () => {
      const noPrivileges = {
        ...mockEntityStorePrivileges,
        has_all_required: false,
      };

      // Mock custom space
      (mockSecSolutionContext.getSpaceId as jest.Mock).mockReturnValue('custom-space');

      // Mock that generic documents exist
      (
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count as jest.Mock
      ).mockResolvedValue({
        count: 3,
      });

      // Mock data view service for installAssetInventoryDataView
      const mockDataViewService = {
        get: jest.fn().mockRejectedValue({ output: { statusCode: 404 } }),
        createAndSave: jest.fn().mockResolvedValue({ id: 'asset-inventory-custom-space' }),
      };
      (mockSecSolutionContext.getDataViewsService as jest.Mock).mockReturnValue(
        mockDataViewService
      );

      const result = await client.status(mockSecSolutionContext, noPrivileges);

      expect(result).toEqual({ status: 'ready' });
      expect(
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count
      ).toHaveBeenCalledWith({
        index: '.entities.v1.latest.security_generic_custom-space',
      });
      // Verify that installAssetInventoryDataView was called with custom space
      expect(mockDataViewService.get).toHaveBeenCalledWith('asset-inventory-custom-space', false);
      expect(mockDataViewService.createAndSave).toHaveBeenCalled();
    });

    it('returns READY when user lacks privileges, generic documents exist, but data view installation fails', async () => {
      const noPrivileges = {
        ...mockEntityStorePrivileges,
        has_all_required: false,
      };

      // Mock that generic documents exist
      (
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count as jest.Mock
      ).mockResolvedValue({
        count: 5,
      });

      // Mock data view service that fails during installation
      const mockDataViewService = {
        get: jest.fn().mockRejectedValue({ output: { statusCode: 404 } }),
        createAndSave: jest.fn().mockRejectedValue(new Error('Failed to create data view')),
      };
      (mockSecSolutionContext.getDataViewsService as jest.Mock).mockReturnValue(
        mockDataViewService
      );

      const result = await client.status(mockSecSolutionContext, noPrivileges);

      expect(result).toEqual({ status: 'ready' });
      expect(
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count
      ).toHaveBeenCalledWith({
        index: '.entities.v1.latest.security_generic_default',
      });
      // Verify that installAssetInventoryDataView was attempted but failed
      expect(mockDataViewService.get).toHaveBeenCalledWith('asset-inventory-default', false);
      expect(mockDataViewService.createAndSave).toHaveBeenCalled();
      // Verify error was logged
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error installing asset inventory data view: Failed to create data view'
      );
    });

    it('returns INSUFFICIENT_PRIVILEGES when user lacks privileges and hasGenericDocuments throws error', async () => {
      const noPrivileges = {
        ...mockEntityStorePrivileges,
        has_all_required: false,
      };

      // Mock Elasticsearch count failure
      (
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count as jest.Mock
      ).mockRejectedValue(new Error('Index not found'));

      const result = await client.status(mockSecSolutionContext, noPrivileges);

      expect(result).toEqual({
        status: 'insufficient_privileges',
        privileges: noPrivileges,
      });
      expect(
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count
      ).toHaveBeenCalledWith({
        index: '.entities.v1.latest.security_generic_default',
      });
      // Verify error was logged
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error checking for generic documents: Index not found'
      );
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

    it('returns DISABLED when generic entity engine is missing', async () => {
      (mockSecSolutionContext.getEntityStoreDataClient as unknown as jest.Mock).mockReturnValue({
        status: () => ({
          status: 'ready',
          engines: [{ type: 'other' }],
        }),
      });

      const result = await client.status(mockSecSolutionContext, mockEntityStorePrivileges);

      expect(result).toEqual({ status: 'disabled' });
    });

    it('returns EMPTY when transform has been triggered but no generic documents exist', async () => {
      // Mock that no generic documents exist initially, so we proceed to entity store logic
      (
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count as jest.Mock
      ).mockResolvedValue({
        count: 0,
      });

      (mockSecSolutionContext.getEntityStoreDataClient as unknown as jest.Mock).mockReturnValue({
        status: () => ({
          status: 'ready',
          engines: [
            {
              type: 'generic',
              components: [
                { resource: 'transform', metadata: { documents_processed: 10, trigger_count: 5 } },
              ],
            },
          ],
        }),
      });

      const result = await client.status(mockSecSolutionContext, mockEntityStorePrivileges);

      expect(result).toEqual({ status: 'empty' });
    });

    it('returns READY when generic documents exist and installs data view', async () => {
      // Mock that generic documents exist, so we return READY immediately
      (
        mockSecSolutionContext.core.elasticsearch.client.asInternalUser.count as jest.Mock
      ).mockResolvedValue({
        count: 5,
      });

      // Mock data view service for installAssetInventoryDataView call
      const mockDataViewService = {
        get: jest.fn().mockResolvedValue({ id: 'asset-inventory-default' }), // Data view already exists
      };
      (mockSecSolutionContext.getDataViewsService as jest.Mock).mockReturnValue(
        mockDataViewService
      );

      const result = await client.status(mockSecSolutionContext, mockEntityStorePrivileges);

      expect(result).toEqual({ status: 'ready' });
      expect(mockSecSolutionContext.getDataViewsService).toHaveBeenCalled();
    });

    it('returns EMPTY when no documents are processed after transform is triggered', async () => {
      (mockSecSolutionContext.getEntityStoreDataClient as unknown as jest.Mock).mockReturnValue({
        status: () => ({
          status: 'ready',
          engines: [
            {
              type: 'generic',
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
              type: 'generic',
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

  describe('installAssetInventoryDataView function', () => {
    const mockDataViewService = {
      get: jest.fn(),
      createAndSave: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (mockSecSolutionContext.getDataViewsService as jest.Mock).mockReturnValue(
        mockDataViewService
      );
      (mockSecSolutionContext.getSpaceId as jest.Mock).mockReturnValue('default');
    });

    it('should skip installation when data view already exists', async () => {
      // Mock that the data view exists
      mockDataViewService.get.mockResolvedValue({ id: 'asset-inventory-default' });

      await client.installAssetInventoryDataView(mockSecSolutionContext);

      expect(mockDataViewService.get).toHaveBeenCalledWith('asset-inventory-default', false);
      expect(mockDataViewService.createAndSave).not.toHaveBeenCalled();
      expect(loggerMock.debug).toHaveBeenCalledWith(
        'Checking if data view exists: asset-inventory-default'
      );
      expect(loggerMock.debug).toHaveBeenCalledWith(
        'DataView is already installed. Skipping installation.'
      );
    });

    it('should install data view when it does not exist (404 error)', async () => {
      // Mock 404 error when data view doesn't exist
      const notFoundError = {
        output: { statusCode: 404 },
      };
      mockDataViewService.get.mockRejectedValue(notFoundError);
      mockDataViewService.createAndSave.mockResolvedValue({ id: 'asset-inventory-default' });

      const result = await client.installAssetInventoryDataView(mockSecSolutionContext);

      expect(mockDataViewService.get).toHaveBeenCalledWith('asset-inventory-default', false);
      expect(loggerMock.error).toHaveBeenCalledWith('Error getting data view: [object Object]');
      expect(loggerMock.info).toHaveBeenCalledWith(
        "DataView with ID 'asset-inventory-default' not found. Proceeding with installation."
      );
      expect(loggerMock.debug).toHaveBeenCalledWith('Installing Asset Inventory DataView');
      expect(mockDataViewService.createAndSave).toHaveBeenCalledWith(
        {
          id: 'asset-inventory-default',
          title: '.entities.*.latest.security_*_default',
          name: 'Asset Inventory Data View - default ',
          namespaces: ['default'],
          allowNoIndex: true,
          timeFieldName: '@timestamp',
          allowHidden: true,
        },
        false,
        true
      );
      expect(result).toEqual({ id: 'asset-inventory-default' });
    });

    it('should handle non-404 errors when checking data view existence', async () => {
      // Mock a different error (not 404)
      const serverError = {
        output: { statusCode: 500 },
        message: 'Internal server error',
      };
      mockDataViewService.get.mockRejectedValue(serverError);
      mockDataViewService.createAndSave.mockResolvedValue({ id: 'asset-inventory-default' });

      const result = await client.installAssetInventoryDataView(mockSecSolutionContext);

      expect(mockDataViewService.get).toHaveBeenCalledWith('asset-inventory-default', false);
      expect(loggerMock.error).toHaveBeenCalledWith('Error getting data view: [object Object]');
      expect(loggerMock.error).toHaveBeenCalledWith(
        'An unexpected error occurred while checking data view existence:',
        serverError
      );
      // The function still proceeds to install because dataViewExists remains false
      expect(mockDataViewService.createAndSave).toHaveBeenCalled();
      expect(result).toEqual({ id: 'asset-inventory-default' });
    });

    it('should handle errors without output property', async () => {
      // Mock an error without output property
      const genericError = new Error('Generic error');
      mockDataViewService.get.mockRejectedValue(genericError);
      mockDataViewService.createAndSave.mockResolvedValue({ id: 'asset-inventory-default' });

      const result = await client.installAssetInventoryDataView(mockSecSolutionContext);

      expect(mockDataViewService.get).toHaveBeenCalledWith('asset-inventory-default', false);
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error getting data view: Error: Generic error'
      );
      expect(loggerMock.error).toHaveBeenCalledWith(
        'An unexpected error occurred while checking data view existence:',
        genericError
      );
      // The function still proceeds to install because dataViewExists remains false
      expect(mockDataViewService.createAndSave).toHaveBeenCalled();
      expect(result).toEqual({ id: 'asset-inventory-default' });
    });

    it('should work with different space IDs', async () => {
      // Mock different space ID
      (mockSecSolutionContext.getSpaceId as jest.Mock).mockReturnValue('custom-space');

      const notFoundError = {
        output: { statusCode: 404 },
      };
      mockDataViewService.get.mockRejectedValue(notFoundError);
      mockDataViewService.createAndSave.mockResolvedValue({ id: 'asset-inventory-custom-space' });

      const result = await client.installAssetInventoryDataView(mockSecSolutionContext);

      expect(mockDataViewService.get).toHaveBeenCalledWith('asset-inventory-custom-space', false);
      expect(mockDataViewService.createAndSave).toHaveBeenCalledWith(
        {
          id: 'asset-inventory-custom-space',
          title: '.entities.*.latest.security_*_custom-space',
          name: 'Asset Inventory Data View - custom-space ',
          namespaces: ['custom-space'],
          allowNoIndex: true,
          timeFieldName: '@timestamp',
          allowHidden: true,
        },
        false,
        true
      );
      expect(result).toEqual({ id: 'asset-inventory-custom-space' });
    });

    it('should handle data view creation errors', async () => {
      const notFoundError = {
        output: { statusCode: 404 },
      };
      const creationError = new Error('Failed to create data view');

      mockDataViewService.get.mockRejectedValue(notFoundError);
      mockDataViewService.createAndSave.mockRejectedValue(creationError);

      await expect(client.installAssetInventoryDataView(mockSecSolutionContext)).rejects.toThrow(
        'Failed to create data view'
      );

      expect(mockDataViewService.get).toHaveBeenCalledWith('asset-inventory-default', false);
      expect(mockDataViewService.createAndSave).toHaveBeenCalled();
    });
  });

  describe('enable function', () => {
    const mockEntityStoreDataClient = {
      status: jest.fn(),
      enable: jest.fn(),
      init: jest.fn(),
    };

    const mockDataViewService = {
      get: jest.fn(),
      createAndSave: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      uiSettingsClientMock.get.mockResolvedValue(true);
      (mockSecSolutionContext.getEntityStoreDataClient as jest.Mock).mockReturnValue(
        mockEntityStoreDataClient
      );
      (mockSecSolutionContext.getDataViewsService as jest.Mock).mockReturnValue(
        mockDataViewService
      );
      (mockSecSolutionContext.getSpaceId as jest.Mock).mockReturnValue('default');
    });

    it('throws error when uisetting is disabled', async () => {
      uiSettingsClientMock.get.mockResolvedValue(false);

      await expect(
        client.enable(mockSecSolutionContext, {} as InitEntityStoreRequestBody)
      ).rejects.toThrowError('uiSetting');
    });

    it('enables entity store and generic engine when entity store is not installed', async () => {
      const requestBodyOverrides = {
        filter: JSON.stringify({ range: { '@timestamp': { gte: 'now-1d' } } }),
      } as InitEntityStoreRequestBody;

      mockEntityStoreDataClient.status.mockResolvedValue({
        status: 'not_installed',
        engines: [],
      });

      mockEntityStoreDataClient.enable.mockResolvedValue({ success: true });
      mockEntityStoreDataClient.init.mockResolvedValue({ success: true });

      // Mock data view installation success
      mockDataViewService.createAndSave.mockResolvedValue({ id: 'test-data-view' });

      const result = await client.enable(mockSecSolutionContext, requestBodyOverrides);

      // Verify entity store is enabled with non-generic entity types first
      expect(mockEntityStoreDataClient.enable).toHaveBeenCalledWith({
        filter: JSON.stringify({ range: { '@timestamp': { gte: 'now-1d' } } }),
        entityTypes: ['host', 'user', 'service'],
      });

      // Verify generic engine is initialized with 26h lookback period
      expect(mockEntityStoreDataClient.init).toHaveBeenCalledWith('generic', {
        filter: JSON.stringify({ range: { '@timestamp': { gte: 'now-1d' } } }),
        lookbackPeriod: '26h',
      });

      // Verify data view installation is attempted (installDataView directly calls createAndSave)
      expect(mockDataViewService.createAndSave).toHaveBeenCalledWith(
        {
          id: 'asset-inventory-default',
          title: '.entities.*.latest.security_*_default',
          name: 'Asset Inventory Data View - default',
          namespaces: ['default'],
          allowNoIndex: true,
          timeFieldName: '@timestamp',
          allowHidden: true,
        },
        false,
        true
      );

      expect(result).toEqual({ success: true });
    });

    it('initializes generic engine when entity store is installed but generic engine is missing', async () => {
      const requestBodyOverrides = {
        filter: JSON.stringify({ range: { '@timestamp': { gte: 'now-2d' } } }),
      } as InitEntityStoreRequestBody;

      mockEntityStoreDataClient.status.mockResolvedValue({
        status: 'installed',
        engines: [
          { type: 'host', status: 'started' },
          { type: 'user', status: 'started' },
        ],
      });

      mockEntityStoreDataClient.init.mockResolvedValue({ success: true });

      // Mock data view installation success
      mockDataViewService.createAndSave.mockResolvedValue({ id: 'test-data-view' });

      const result = await client.enable(mockSecSolutionContext, requestBodyOverrides);

      // Verify entity store enable is NOT called since it's already installed
      expect(mockEntityStoreDataClient.enable).not.toHaveBeenCalled();

      // Verify generic engine is initialized with 26h lookback period
      expect(mockEntityStoreDataClient.init).toHaveBeenCalledWith('generic', {
        filter: JSON.stringify({ range: { '@timestamp': { gte: 'now-2d' } } }),
        lookbackPeriod: '26h',
      });

      // Verify data view installation is attempted
      expect(mockDataViewService.createAndSave).toHaveBeenCalled();

      expect(result).toEqual({ success: true });
    });

    it('does not initialize generic engine when it already exists', async () => {
      const requestBodyOverrides = {
        filter: JSON.stringify({ range: { '@timestamp': { gte: 'now-3d' } } }),
      } as InitEntityStoreRequestBody;

      mockEntityStoreDataClient.status.mockResolvedValue({
        status: 'installed',
        engines: [
          { type: 'host', status: 'started' },
          { type: 'user', status: 'started' },
          { type: 'generic', status: 'started' },
        ],
      });

      // Mock data view installation success
      mockDataViewService.createAndSave.mockResolvedValue({ id: 'test-data-view' });

      const result = await client.enable(mockSecSolutionContext, requestBodyOverrides);

      // Verify entity store enable is NOT called since it's already installed
      expect(mockEntityStoreDataClient.enable).not.toHaveBeenCalled();

      // Verify generic engine init is NOT called since it already exists
      expect(mockEntityStoreDataClient.init).not.toHaveBeenCalled();

      // Data view installation should still be attempted
      expect(mockDataViewService.createAndSave).toHaveBeenCalled();

      expect(result).toBeUndefined();
    });

    it('handles data view installation errors gracefully', async () => {
      const requestBodyOverrides = {} as InitEntityStoreRequestBody;

      mockEntityStoreDataClient.status.mockResolvedValue({
        status: 'not_installed',
        engines: [],
      });

      mockEntityStoreDataClient.enable.mockResolvedValue({ success: true });
      mockEntityStoreDataClient.init.mockResolvedValue({ success: true });

      // Mock data view installation failure
      mockDataViewService.createAndSave.mockRejectedValue(new Error('Data view creation failed'));

      const result = await client.enable(mockSecSolutionContext, requestBodyOverrides);

      // Verify entity store operations still proceed despite data view error
      expect(mockEntityStoreDataClient.enable).toHaveBeenCalledWith({
        entityTypes: ['host', 'user', 'service'],
      });

      expect(mockEntityStoreDataClient.init).toHaveBeenCalledWith('generic', {
        lookbackPeriod: '26h',
      });

      // Verify error is logged but doesn't prevent function completion
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Error installing asset inventory data view: Data view creation failed'
      );

      expect(result).toEqual({ success: true });
    });

    it('preserves custom request body overrides while adding lookback period', async () => {
      const requestBodyOverrides = {
        filter: JSON.stringify({ range: { '@timestamp': { gte: 'now-1h' } } }),
        indexPattern: 'custom-pattern-*',
      } as InitEntityStoreRequestBody;

      mockEntityStoreDataClient.status.mockResolvedValue({
        status: 'installed',
        engines: [{ type: 'host', status: 'started' }],
      });

      mockEntityStoreDataClient.init.mockResolvedValue({ success: true });

      // Mock data view installation success
      mockDataViewService.createAndSave.mockResolvedValue({ id: 'test-data-view' });

      await client.enable(mockSecSolutionContext, requestBodyOverrides);

      // Verify generic engine is initialized with both custom overrides and lookback period
      expect(mockEntityStoreDataClient.init).toHaveBeenCalledWith('generic', {
        filter: JSON.stringify({ range: { '@timestamp': { gte: 'now-1h' } } }),
        indexPattern: 'custom-pattern-*',
        lookbackPeriod: '26h',
      });

      // Verify data view installation is attempted
      expect(mockDataViewService.createAndSave).toHaveBeenCalled();
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
