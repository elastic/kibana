/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository } from '@kbn/core/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
  CDR_MISCONFIGURATIONS_DATA_VIEW_NAME,
  CDR_VULNERABILITIES_INDEX_PATTERN,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
  CDR_VULNERABILITIES_DATA_VIEW_NAME,
} from '@kbn/cloud-security-posture-common';
import { installDataView, migrateCdrDataViewsForAllSpaces, setupCdrDataViews } from './data_views';

describe('data_views', () => {
  let mockSoClient: jest.Mocked<ISavedObjectsRepository>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockSpacesService: jest.Mocked<SpacesServiceStart>;
  let mockDataViewsService: jest.Mocked<DataViewsServerPluginStart>;
  let mockRequest: jest.Mocked<KibanaRequest>;

  beforeEach(() => {
    mockSoClient = {
      get: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      bulkGet: jest.fn(),
    } as any;

    mockEsClient = {} as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockSpacesService = {
      getSpaceId: jest.fn().mockReturnValue(DEFAULT_SPACE_ID),
    } as any;

    const mockDataViewsClient = {
      createAndSave: jest.fn(),
    };

    mockDataViewsService = {
      dataViewsServiceFactory: jest.fn().mockResolvedValue(mockDataViewsClient),
    } as any;

    mockRequest = {} as any;
  });

  describe('installDataView', () => {
    it('should create a new data view when it does not exist', async () => {
      mockSoClient.get.mockRejectedValue(new Error('Not found'));

      const mockDataViewsClient = {
        createAndSave: jest.fn(),
      };
      mockDataViewsService.dataViewsServiceFactory.mockResolvedValue(mockDataViewsClient as any);

      await installDataView(
        mockEsClient,
        mockSoClient,
        mockSpacesService,
        mockDataViewsService,
        mockRequest,
        CDR_MISCONFIGURATIONS_DATA_VIEW_NAME,
        CDR_MISCONFIGURATIONS_INDEX_PATTERN,
        CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
        mockLogger
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Creating and saving data view with ID: ${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${DEFAULT_SPACE_ID}`
      );
      expect(mockDataViewsClient.createAndSave).toHaveBeenCalledWith(
        {
          id: `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${DEFAULT_SPACE_ID}`,
          title: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
          name: `${CDR_MISCONFIGURATIONS_DATA_VIEW_NAME} - ${DEFAULT_SPACE_ID} `,
          namespaces: [DEFAULT_SPACE_ID],
          allowNoIndex: true,
          timeFieldName: '@timestamp',
        },
        true
      );
    });

    it('should not create a data view when it already exists', async () => {
      mockSoClient.get.mockResolvedValue({
        id: `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${DEFAULT_SPACE_ID}`,
        type: 'index-pattern',
        attributes: {},
        references: [],
      });

      const mockDataViewsClient = {
        createAndSave: jest.fn(),
      };
      mockDataViewsService.dataViewsServiceFactory.mockResolvedValue(mockDataViewsClient as any);

      await installDataView(
        mockEsClient,
        mockSoClient,
        mockSpacesService,
        mockDataViewsService,
        mockRequest,
        CDR_MISCONFIGURATIONS_DATA_VIEW_NAME,
        CDR_MISCONFIGURATIONS_INDEX_PATTERN,
        CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
        mockLogger
      );

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockDataViewsClient.createAndSave).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockSoClient.get.mockRejectedValue(new Error('Not found'));
      mockDataViewsService.dataViewsServiceFactory.mockRejectedValue(
        new Error('Service unavailable')
      );

      await installDataView(
        mockEsClient,
        mockSoClient,
        mockSpacesService,
        mockDataViewsService,
        mockRequest,
        CDR_MISCONFIGURATIONS_DATA_VIEW_NAME,
        CDR_MISCONFIGURATIONS_INDEX_PATTERN,
        CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
        mockLogger
      );

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to setup data view', expect.any(Error));
    });

    it('should use custom space ID when spaces service is available', async () => {
      const customSpaceId = 'custom-space';
      mockSpacesService.getSpaceId.mockReturnValue(customSpaceId);
      mockSoClient.get.mockRejectedValue(new Error('Not found'));

      const mockDataViewsClient = {
        createAndSave: jest.fn(),
      };
      mockDataViewsService.dataViewsServiceFactory.mockResolvedValue(mockDataViewsClient as any);

      await installDataView(
        mockEsClient,
        mockSoClient,
        mockSpacesService,
        mockDataViewsService,
        mockRequest,
        CDR_MISCONFIGURATIONS_DATA_VIEW_NAME,
        CDR_MISCONFIGURATIONS_INDEX_PATTERN,
        CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
        mockLogger
      );

      expect(mockDataViewsClient.createAndSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${customSpaceId}`,
          namespaces: [customSpaceId],
        }),
        true
      );
    });
  });

  describe('migrateCdrDataViewsForAllSpaces', () => {
    it('should find and delete old misconfigurations data views', async () => {
      const oldDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${DEFAULT_SPACE_ID}`;
      const newDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${DEFAULT_SPACE_ID}`;

      mockSoClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: oldDataViewId,
            type: 'index-pattern',
            attributes: {},
            references: [],
            score: 1,
            namespaces: [DEFAULT_SPACE_ID],
          },
          {
            id: newDataViewId,
            type: 'index-pattern',
            attributes: {},
            references: [],
            score: 1,
            namespaces: [DEFAULT_SPACE_ID],
          },
        ],
        total: 2,
        per_page: 1000,
        page: 1,
      });

      await migrateCdrDataViewsForAllSpaces(mockSoClient, mockLogger);

      expect(mockSoClient.find).toHaveBeenCalledWith({
        type: 'index-pattern',
        namespaces: ['*'],
        perPage: 1000,
      });

      expect(mockSoClient.delete).toHaveBeenCalledWith('index-pattern', oldDataViewId, {
        namespace: DEFAULT_SPACE_ID,
      });

      expect(mockSoClient.delete).not.toHaveBeenCalledWith('index-pattern', newDataViewId, {
        namespace: DEFAULT_SPACE_ID,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting CDR data views migration across all spaces'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Found old misconfigurations data view: ${oldDataViewId}, migrating...`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'CDR data views migration completed successfully'
      );
    });

    it('should find and delete old vulnerabilities data views', async () => {
      const oldDataViewId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${DEFAULT_SPACE_ID}`;

      mockSoClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: oldDataViewId,
            type: 'index-pattern',
            attributes: {},
            references: [],
            score: 1,
            namespaces: [DEFAULT_SPACE_ID],
          },
        ],
        total: 1,
        per_page: 1000,
        page: 1,
      });

      await migrateCdrDataViewsForAllSpaces(mockSoClient, mockLogger);

      expect(mockSoClient.delete).toHaveBeenCalledWith('index-pattern', oldDataViewId, {
        namespace: DEFAULT_SPACE_ID,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Found old vulnerabilities data view: ${oldDataViewId}, migrating...`
      );
    });

    it('should handle multiple old data views across different spaces', async () => {
      const oldMisconfigId1 = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${DEFAULT_SPACE_ID}`;
      const oldMisconfigId2 = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-custom-space`;
      const oldVulnId = `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${DEFAULT_SPACE_ID}`;

      mockSoClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: oldMisconfigId1,
            type: 'index-pattern',
            attributes: {},
            references: [],
            score: 1,
            namespaces: [DEFAULT_SPACE_ID],
          },
          {
            id: oldMisconfigId2,
            type: 'index-pattern',
            attributes: {},
            references: [],
            score: 1,
            namespaces: ['custom-space'],
          },
          {
            id: oldVulnId,
            type: 'index-pattern',
            attributes: {},
            references: [],
            score: 1,
            namespaces: [DEFAULT_SPACE_ID],
          },
        ],
        total: 3,
        per_page: 1000,
        page: 1,
      });

      await migrateCdrDataViewsForAllSpaces(mockSoClient, mockLogger);

      expect(mockSoClient.delete).toHaveBeenCalledTimes(3);
      expect(mockSoClient.delete).toHaveBeenCalledWith('index-pattern', oldMisconfigId1, {
        namespace: DEFAULT_SPACE_ID,
      });
      expect(mockSoClient.delete).toHaveBeenCalledWith('index-pattern', oldMisconfigId2, {
        namespace: 'custom-space',
      });
      expect(mockSoClient.delete).toHaveBeenCalledWith('index-pattern', oldVulnId, {
        namespace: DEFAULT_SPACE_ID,
      });
    });

    it('should not delete the Current data view', async () => {
      const oldDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${DEFAULT_SPACE_ID}`;
      const currentDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${DEFAULT_SPACE_ID}`;

      mockSoClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: oldDataViewId,
            type: 'index-pattern',
            attributes: {},
            references: [],
            score: 1,
            namespaces: [DEFAULT_SPACE_ID],
          },
          {
            id: currentDataViewId,
            type: 'index-pattern',
            attributes: {},
            references: [],
            score: 1,
            namespaces: [DEFAULT_SPACE_ID],
          },
        ],
        total: 2,
        per_page: 1000,
        page: 1,
      });

      await migrateCdrDataViewsForAllSpaces(mockSoClient, mockLogger);

      // Should only delete the old data view, not the new one
      expect(mockSoClient.delete).toHaveBeenCalledTimes(1);
      expect(mockSoClient.delete).toHaveBeenCalledWith('index-pattern', oldDataViewId, {
        namespace: DEFAULT_SPACE_ID,
      });
    });

    it('should warn when total data views exceeds page limit', async () => {
      mockSoClient.find.mockResolvedValue({
        saved_objects: [],
        total: 1500,
        per_page: 1000,
        page: 1,
      });

      await migrateCdrDataViewsForAllSpaces(mockSoClient, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Total data views (1500) exceeds page limit (1000). Some old data views may not be migrated.'
      );
    });

    it('should handle no old data views gracefully', async () => {
      mockSoClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${DEFAULT_SPACE_ID}`,
            type: 'index-pattern',
            attributes: {},
            references: [],
            score: 1,
            namespaces: [DEFAULT_SPACE_ID],
          },
        ],
        total: 1,
        per_page: 1000,
        page: 1,
      });

      await migrateCdrDataViewsForAllSpaces(mockSoClient, mockLogger);

      expect(mockSoClient.delete).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'CDR data views migration completed successfully'
      );
    });

    it('should handle errors gracefully and not throw', async () => {
      mockSoClient.find.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        migrateCdrDataViewsForAllSpaces(mockSoClient, mockLogger)
      ).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to migrate CDR data views',
        expect.any(Error)
      );
    });

    it('should use default space ID when namespace is not provided', async () => {
      const oldDataViewId = `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS[0]}-${DEFAULT_SPACE_ID}`;

      mockSoClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: oldDataViewId,
            type: 'index-pattern',
            attributes: {},
            references: [],
            score: 1,
            // No namespaces property
          },
        ],
        total: 1,
        per_page: 1000,
        page: 1,
      });

      await migrateCdrDataViewsForAllSpaces(mockSoClient, mockLogger);

      expect(mockSoClient.delete).toHaveBeenCalledWith('index-pattern', oldDataViewId, {
        namespace: DEFAULT_SPACE_ID,
      });
    });
  });

  describe('setupCdrDataViews', () => {
    it('should install both misconfigurations and vulnerabilities data views', async () => {
      mockSoClient.get.mockRejectedValue(new Error('Not found'));

      const mockDataViewsClient = {
        createAndSave: jest.fn(),
      };
      mockDataViewsService.dataViewsServiceFactory.mockResolvedValue(mockDataViewsClient as any);

      await setupCdrDataViews(
        mockEsClient,
        mockSoClient,
        mockSpacesService,
        mockDataViewsService,
        mockRequest,
        mockLogger
      );

      expect(mockDataViewsClient.createAndSave).toHaveBeenCalledTimes(2);

      // Check misconfigurations data view
      expect(mockDataViewsClient.createAndSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX}-${DEFAULT_SPACE_ID}`,
          title: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
          name: `${CDR_MISCONFIGURATIONS_DATA_VIEW_NAME} - ${DEFAULT_SPACE_ID} `,
        }),
        true
      );

      // Check vulnerabilities data view
      expect(mockDataViewsClient.createAndSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX}-${DEFAULT_SPACE_ID}`,
          title: CDR_VULNERABILITIES_INDEX_PATTERN,
          name: `${CDR_VULNERABILITIES_DATA_VIEW_NAME} - ${DEFAULT_SPACE_ID} `,
        }),
        true
      );
    });
  });
});
