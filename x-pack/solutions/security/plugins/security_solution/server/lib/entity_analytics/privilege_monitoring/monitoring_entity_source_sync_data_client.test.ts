/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringEntitySourceSyncDataClient } from './monitoring_entity_source_sync_data_client';
import {
    savedObjectsClientMock,
    elasticsearchServiceMock,
    loggingSystemMock,
} from '@kbn/core/server/mocks';

describe('MonitoringEntitySourceSyncDataClient', () => {
    const mockSavedObjectClient = savedObjectsClientMock.create();
    const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
    const loggerMock = loggingSystemMock.createLogger();
    loggerMock.debug = jest.fn();

    const defaultOpts = {
        logger: loggerMock,
        clusterClient: clusterClientMock,
        namespace: 'default',
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

    let dataClient: MonitoringEntitySourceSyncDataClient;
    beforeEach(() => {
        jest.clearAllMocks();
        dataClient = new MonitoringEntitySourceSyncDataClient(defaultOpts);
    });

    describe('init', () => {
        it('should initialize Monitoring Entity Source Sync Config Successfully', async () => {
            const result = await dataClient.init(testDescriptor);
            expect(result).toEqual(testDescriptor);
        });
    });

    describe('get', () => {
        it('should get Monitoring Entity Source Sync Config Successfully', async () => {
            const result = await dataClient.get();
            expect(result).toEqual(testDescriptor);
        });
    });

    describe('update', () => {
        it('should update Monitoring Entity Source Sync Config Successfully', async () => {
            const updatedDescriptor = { ...testDescriptor, name: 'Updated Source' };
            const result = await dataClient.update(updatedDescriptor);
            expect(result).toEqual(updatedDescriptor);
        });
    });

    describe('delete', () => {
        it('should delete Monitoring Entity Source Sync Config Successfully', async () => {
            await dataClient.delete();
            expect(mockSavedObjectClient.delete).toHaveBeenCalledWith(
                'monitoring-entity-source-sync',
                'default'
            );
        });
    }
    );

});
