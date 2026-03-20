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

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { monitoringEntitySourceTypeName } from '../saved_objects';
import type { MonitoringEntitySourceAttributes } from '../../../../../common/api/entity_analytics';
import type { PartialMonitoringEntitySource } from '../types';

describe('MonitoringEntitySourceDataClient', () => {
  const mockSavedObjectClient = savedObjectsClientMock.create();
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const loggerMock = loggingSystemMock.createLogger();
  loggerMock.debug = jest.fn();

  const defaultOpts = {
    logger: loggerMock,
    clusterClient: clusterClientMock,
    namespace: 'test-namespace',
    soClient: mockSavedObjectClient,
    kibanaVersion: '8.0.0',
  };

  const testSource: MonitoringEntitySourceAttributes = {
    type: 'index',
    name: 'Test Source',
    indexPattern: 'test-index-pattern',
    enabled: true,
    matchers: [
      {
        fields: ['user.role'],
        values: ['admin'],
      },
    ],
    matchersModifiedByUser: false,
    filter: {},
  };

  let dataClient: MonitoringEntitySourceDataClient;
  beforeEach(() => {
    jest.clearAllMocks();
    dataClient = new MonitoringEntitySourceDataClient(defaultOpts);
  });

  describe('create', () => {
    it('should create a Monitoring Entity Source successfully ', async () => {
      const testSourceWithManaged = { ...testSource, managed: false };
      defaultOpts.soClient.update.mockImplementation(() => {
        const err = new Error('Not found');
        // Simulate Kibana-style 404 error
        (err as Error & { output?: { statusCode: number } }).output = { statusCode: 404 };
        throw err;
      });

      defaultOpts.soClient.find.mockResolvedValue({
        total: 0,
        saved_objects: [],
      } as unknown as SavedObjectsFindResponse<unknown>);

      defaultOpts.soClient.create.mockResolvedValue({
        id: 'abcdefg',
        type: monitoringEntitySourceTypeName,
        attributes: testSourceWithManaged,
        references: [],
      });

      const result = await dataClient.create(testSource);

      expect(defaultOpts.soClient.create).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        testSourceWithManaged,
        { refresh: 'wait_for' }
      );

      expect(result).toEqual({ ...testSourceWithManaged, id: 'abcdefg' });
    });

    it('should not create Monitoring Entity Source Sync Config when a SO already exist with the same name', async () => {
      const existingSavedObject = {
        id: 'unique-id',
        attributes: testSource,
      } as unknown as SavedObject<unknown>;

      defaultOpts.soClient.find.mockResolvedValue({
        total: 0,
        saved_objects: [existingSavedObject],
      } as unknown as SavedObjectsFindResponse<unknown>);

      await expect(dataClient.create(testSource)).rejects.toThrow(
        `A monitoring entity source with the name "${testSource.name}" already exists.`
      );
    });
  });

  describe('get', () => {
    it('should get Monitoring Entity Source Sync Config Successfully', async () => {
      const getResponse = {
        type: monitoringEntitySourceTypeName,
        attributes: testSource,
        references: [],
      };
      defaultOpts.soClient.get.mockResolvedValue(getResponse as unknown as SavedObject<unknown>);
      const result = await dataClient.get('abcdefg');
      expect(defaultOpts.soClient.get).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        `abcdefg`
      );
      expect(result).toEqual(getResponse.attributes);
    });
  });

  describe('update', () => {
    const mockGet = (id: string, attributes: MonitoringEntitySourceAttributes) => {
      defaultOpts.soClient.get.mockResolvedValue({
        id,
        type: monitoringEntitySourceTypeName,
        attributes,
        references: [],
      });
    };

    const mockUpdate = (id: string, attributes: PartialMonitoringEntitySource) => {
      defaultOpts.soClient.update.mockResolvedValue({
        id,
        type: monitoringEntitySourceTypeName,
        attributes,
        references: [],
      });
    };

    const expectUpdateCall = (id: string, updateBody: PartialMonitoringEntitySource) => {
      expect(defaultOpts.soClient.update).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        id,
        updateBody,
        { refresh: 'wait_for' }
      );
    };
    it('should update Monitoring Entity Source Successfully', async () => {
      const id = 'abcdefg';
      const updateDescriptor: PartialMonitoringEntitySource = {
        ...testSource,
        name: 'Updated Source',
        id,
      };

      defaultOpts.soClient.find.mockResolvedValue({
        total: 0,
        saved_objects: [],
      } as unknown as SavedObjectsFindResponse<unknown>);

      mockGet(id, testSource);
      mockUpdate(id, updateDescriptor);

      const result = await dataClient.update(updateDescriptor);
      expectUpdateCall(id, updateDescriptor);
      expect(result).toEqual(updateDescriptor);
    });

    it('should not update matchersModifiedByUser when matchers are not provided', async () => {
      const id = 'no-matchers-update';
      const updateDescriptor: PartialMonitoringEntitySource = {
        id,
        name: 'Updated Source Without Matchers',
      };

      defaultOpts.soClient.find.mockResolvedValue({
        total: 0,
        saved_objects: [],
      } as unknown as SavedObjectsFindResponse<unknown>);

      mockUpdate(id, updateDescriptor);

      const result = await dataClient.update(updateDescriptor);

      expect(defaultOpts.soClient.get).not.toHaveBeenCalled();
      expectUpdateCall(id, {
        ...updateDescriptor,
        matchers: undefined,
      });
      expect(result).toEqual(updateDescriptor);
    });

    it('should set matchersModifiedByUser to true for managed index sources with custom matchers', async () => {
      const id = 'index-source';
      const existingSource: MonitoringEntitySourceAttributes = {
        type: 'index',
        name: 'Index Source',
        indexPattern: 'entity_analytics.privileged_monitoring.default',
        managed: true,
        matchers: [],
        matchersModifiedByUser: false,
      };
      const updateDescriptor: PartialMonitoringEntitySource = {
        id,
        matchers: [
          {
            fields: ['someWildMatcherHere'],
            values: [true],
          },
        ],
      };

      mockGet(id, existingSource);
      mockUpdate(id, { ...existingSource, ...updateDescriptor, matchersModifiedByUser: true });

      await dataClient.update(updateDescriptor);

      expectUpdateCall(id, {
        ...updateDescriptor,
        matchers: [
          {
            fields: ['someWildMatcherHere'],
            values: [true],
          },
        ],
        matchersModifiedByUser: true,
      });
    });

    it('should set matchersModifiedByUser to false for managed index sources with empty matchers', async () => {
      const id = 'index-source-empty';
      const existingSource: MonitoringEntitySourceAttributes = {
        type: 'index',
        name: 'Index Source',
        indexPattern: 'entity_analytics.privileged_monitoring.default',
        managed: true,
        matchers: [],
        matchersModifiedByUser: false,
      };
      const updateDescriptor: PartialMonitoringEntitySource = {
        id,
        matchers: [],
      };

      mockGet(id, existingSource);
      mockUpdate(id, { ...existingSource, ...updateDescriptor, matchersModifiedByUser: false });

      await dataClient.update(updateDescriptor);

      expectUpdateCall(id, {
        ...updateDescriptor,
        matchers: [],
        matchersModifiedByUser: false,
      });
    });
  });

  describe('delete', () => {
    it('should delete Monitoring Entity Source Successfully', async () => {
      await dataClient.delete('abcdefg');
      expect(mockSavedObjectClient.delete).toHaveBeenCalledWith(
        monitoringEntitySourceTypeName,
        'abcdefg'
      );
    });
  });
});
