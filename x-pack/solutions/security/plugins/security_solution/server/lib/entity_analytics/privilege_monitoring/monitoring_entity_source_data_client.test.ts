/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringEntitySourceDataClient } from './monitoring_entity_source_data_client';
import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { monitoringEntitySourceTypeName } from './saved_objects';
import type {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';

describe('MonitoringEntitySourceDataClient', () => {
  const mockSavedObjectClient = savedObjectsClientMock.create();
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const loggerMock = loggingSystemMock.createLogger();
  const namespace = 'test-namespace';
  loggerMock.debug = jest.fn();

  const defaultOpts = {
    logger: loggerMock,
    clusterClient: clusterClientMock,
    namespace: 'test-namespace',
    soClient: mockSavedObjectClient,
    kibanaVersion: '8.0.0',
  };

  const testDescriptor = {
    type: 'test-type',
    name: 'Test Source',
    indexPattern: 'test-index-pattern',
    managed: false,
    matchers: [
      {
        fields: ['user.role'],
        values: ['admin'],
      },
    ],
    filter: {},
  };

  let dataClient: MonitoringEntitySourceDataClient;
  beforeEach(() => {
    jest.clearAllMocks();
    dataClient = new MonitoringEntitySourceDataClient(defaultOpts);
  });

  describe('init', () => {
    it('should initialize Monitoring Entity Source Sync Config Successfully', async () => {
      defaultOpts.soClient.update.mockImplementation(() => {
        const err = new Error('Not found');
        // Simulate Kibana-style 404 error
        (err as Error & { output?: { statusCode: number } }).output = { statusCode: 404 };
        throw err;
      });
      defaultOpts.soClient.asScopedToNamespace.mockReturnValue({
        find: jest.fn().mockResolvedValue({
          total: 0,
          saved_objects: [],
        }),
      } as unknown as SavedObjectsClientContract);

      defaultOpts.soClient.create.mockResolvedValue({
        id: 'temp-id', // TODO: update to use dynamic ID
        type: monitoringEntitySourceTypeName,
        attributes: testDescriptor,
        references: [],
      });

      const result = await dataClient.init(testDescriptor);
      const id = `entity-analytics-monitoring-entity-source-${namespace}-${testDescriptor.type}-${testDescriptor.indexPattern}`;

      expect(defaultOpts.soClient.create).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        testDescriptor,
        {
          id,
        }
      );

      expect(result).toEqual({ ...testDescriptor, managed: false, id });
    });

    it('should update Monitoring Entity Source Sync Config Successfully when calling init when the SO already exists', async () => {
      const existingDescriptor = {
        total: 1,
        saved_objects: [
          {
            attributes: testDescriptor,
            id: 'entity-analytics-monitoring-entity-source-test-namespace-test-type-test-index-pattern',
          },
        ],
      } as unknown as SavedObjectsFindResponse<unknown, unknown>;

      const testSourceObject = {
        filter: {},
        indexPattern: 'test-index-pattern',
        matchers: [
          {
            fields: ['user.role'],
            values: ['admin'],
          },
        ],
        name: 'Test Source',
        type: 'test-type',
        managed: false,
      };

      defaultOpts.soClient.asScopedToNamespace.mockReturnValue({
        find: jest.fn().mockResolvedValue(existingDescriptor),
      } as unknown as SavedObjectsClientContract);

      defaultOpts.soClient.update.mockResolvedValue({
        id: 'entity-analytics-monitoring-entity-source-test-namespace-test-type-test-index-pattern',
        type: monitoringEntitySourceTypeName,
        attributes: { ...testDescriptor, name: 'Updated Source' },
        references: [],
      });

      const updatedDescriptor = { ...testDescriptor, name: 'Updated Source' };
      const result = await dataClient.init(testDescriptor);

      expect(defaultOpts.soClient.update).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        `entity-analytics-monitoring-entity-source-${namespace}-${testDescriptor.type}-${testDescriptor.indexPattern}`,
        testSourceObject,
        { refresh: 'wait_for' }
      );

      expect(result).toEqual(updatedDescriptor);
    });

    it('should not create Monitoring Entity Source Sync Config when a SO already exist with the same name', async () => {
      const existingSavedObject = {
        id: 'unique-id',
        attributes: testDescriptor,
      } as unknown as SavedObject<unknown>;

      defaultOpts.soClient.asScopedToNamespace.mockReturnValue({
        find: jest.fn().mockResolvedValue({
          total: 1,
          saved_objects: [existingSavedObject],
        }),
      } as unknown as SavedObjectsClientContract);

      await expect(dataClient.init(testDescriptor)).rejects.toThrow(
        `A monitoring entity source with the name "${testDescriptor.name}" already exists.`
      );
    });
  });

  describe('get', () => {
    it('should get Monitoring Entity Source Sync Config Successfully', async () => {
      const getResponse = {
        type: monitoringEntitySourceTypeName,
        attributes: testDescriptor,
        references: [],
      };
      defaultOpts.soClient.get.mockResolvedValue(getResponse as unknown as SavedObject<unknown>);
      const result = await dataClient.get();
      expect(defaultOpts.soClient.get).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        `temp-id` // TODO: https://github.com/elastic/security-team/issues/12851
      );
      expect(result).toEqual(getResponse.attributes);
    });
  });

  describe('update', () => {
    it('should update Monitoring Entity Source Sync Config Successfully', async () => {
      const id = 'temp-id'; // TODO: https://github.com/elastic/security-team/issues/12851
      const updateDescriptor = {
        ...testDescriptor,
        managed: false,
        name: 'Updated Source',
        id, // it preserves the id when updating
      };

      defaultOpts.soClient.asScopedToNamespace.mockReturnValue({
        find: jest.fn().mockResolvedValue({
          total: 0,
          saved_objects: [],
        }),
      } as unknown as SavedObjectsClientContract);

      defaultOpts.soClient.update.mockResolvedValue({
        id,
        type: monitoringEntitySourceTypeName,
        attributes: updateDescriptor,
        references: [],
      });

      const result = await dataClient.update(updateDescriptor);
      expect(defaultOpts.soClient.update).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        id,
        updateDescriptor,

        { refresh: 'wait_for' }
      );
      expect(result).toEqual(updateDescriptor);
    });
  });

  describe('delete', () => {
    it('should delete Monitoring Entity Source Sync Config Successfully', async () => {
      await dataClient.delete();
      expect(mockSavedObjectClient.delete).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        `temp-id` // TODO: https://github.com/elastic/security-team/issues/12851
      );
    });
  });
});
