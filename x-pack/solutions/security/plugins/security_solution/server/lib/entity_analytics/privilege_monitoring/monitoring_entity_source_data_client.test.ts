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
import { monitoringEntitySourceTypeName } from './saved_object/monitoring_entity_source_type';
import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';

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
      defaultOpts.soClient.find.mockResolvedValue({
        total: 0,
        saved_objects: [],
      } as unknown as SavedObjectsFindResponse<unknown, unknown>);

      defaultOpts.soClient.create.mockResolvedValue({
        id: `entity-analytics-monitoring-entity-source-${namespace}`,
        type: monitoringEntitySourceTypeName,
        attributes: testDescriptor,
        references: [],
      });

      const result = await dataClient.init(testDescriptor);

      expect(defaultOpts.soClient.create).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        testDescriptor,
        { id: `entity-analytics-monitoring-entity-source-${namespace}` }
      );

      expect(result).toEqual(testDescriptor);
    });
  });

  describe('get', () => {
    it('should get Monitoring Entity Source Sync Config Successfully', async () => {
      const getResponse = {
        id: `entity-analytics-monitoring-entity-source-${namespace}`,
        type: monitoringEntitySourceTypeName,
        attributes: testDescriptor,
        references: [],
      };
      defaultOpts.soClient.get.mockResolvedValue(getResponse as unknown as SavedObject<unknown>);
      const result = await dataClient.get();
      expect(defaultOpts.soClient.get).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        `entity-analytics-monitoring-entity-source-${namespace}`
      );
      expect(result).toEqual(getResponse.attributes);
    });
  });

  describe('update', () => {
    it('should update Monitoring Entity Source Sync Config Successfully', async () => {
      const existingDescriptor = {
        total: 1,
        saved_objects: [{ attributes: testDescriptor }],
      } as unknown as SavedObjectsFindResponse<unknown, unknown>;

      defaultOpts.soClient.find.mockResolvedValue(
        existingDescriptor as unknown as SavedObjectsFindResponse<unknown, unknown>
      );

      defaultOpts.soClient.update.mockResolvedValue({
        id: `entity-analytics-monitoring-entity-source-${namespace}`,
        type: monitoringEntitySourceTypeName,
        attributes: { ...testDescriptor, name: 'Updated Source' },
        references: [],
      });

      const updatedDescriptor = { ...testDescriptor, name: 'Updated Source' };
      const result = await dataClient.init(testDescriptor);

      expect(defaultOpts.soClient.update).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        `entity-analytics-monitoring-entity-source-${namespace}`,
        testDescriptor,
        { refresh: 'wait_for' }
      );

      expect(result).toEqual(updatedDescriptor);
    });
  });

  describe('delete', () => {
    it('should delete Monitoring Entity Source Sync Config Successfully', async () => {
      await dataClient.delete();
      expect(mockSavedObjectClient.delete).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        `entity-analytics-monitoring-entity-source-${namespace}`
      );
    });
  });
});
