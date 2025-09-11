/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityStoreCrudClient } from './entity_store_crud_client';
import { entityStoreDataClientMock } from './entity_store_data_client.mock';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { BadCRUDRequestError, DocumentNotFoundError, EngineNotRunningError } from './errors';
import type {
  Entity,
  EngineDescriptor,
  EntityType,
} from '../../../../common/api/entity_analytics/entity_store';
import type { EntityStoreDataClient } from './entity_store_data_client';
import * as uuid from 'uuid';

describe('EntityStoreCrudClient', () => {
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const esClientMock = clusterClientMock.asCurrentUser;
  const loggerMock = loggingSystemMock.createLogger();
  const dataClientMock = entityStoreDataClientMock.create();

  const client = new EntityStoreCrudClient({
    clusterClient: clusterClientMock,
    namespace: 'default',
    logger: loggerMock,
    dataClient: dataClientMock,
  });

  describe('update single entity', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useRealTimers();
    });

    it('when Entity Store completely disabled throw error', async () => {
      dataClientMock.status.mockReturnValueOnce(
        Promise.resolve({ status: 'not_installed', engines: [] })
      );

      await expect(async () =>
        client.upsertEntity('host', {
          entity: {
            id: 'host-id',
          },
        })
      ).rejects.toThrow(new EngineNotRunningError('host'));

      expect(dataClientMock.status).toBeCalledWith({ include_components: true });
    });

    it('when Entity Store enabled, but engine not started, throw error', async () => {
      dataClientMock.status.mockReturnValueOnce(
        Promise.resolve({
          status: 'running',
          engines: [
            { type: 'host', status: 'started' } as EngineDescriptor,
            { type: 'user', status: 'updating' } as EngineDescriptor,
          ],
        })
      );

      await expect(async () =>
        client.upsertEntity('user', {
          entity: {
            id: 'user-id',
          },
        })
      ).rejects.toThrow(new EngineNotRunningError('user'));

      expect(dataClientMock.status).toBeCalledWith({ include_components: true });
    });

    it('when not allowed attributes are updated, throw error', async () => {
      mockStatusRunning(dataClientMock, 'host');
      const doc: Entity = {
        user: {
          name: 'not-allowed',
          id: ['123'],
        },
        entity: {
          id: 'host-1',
          type: 'update',
          sub_type: 'updated-sub',
          attributes: {
            Privileged: true,
          },
        },
      };

      await expect(async () => client.upsertEntity('host', doc)).rejects.toThrow(
        new BadCRUDRequestError(
          `The following attributes are not allowed to be ` +
            `updated without forcing it (?force=true): user.name, user.id, entity.type, entity.sub_type`
        )
      );
    });

    it('when entity not found throw', async () => {
      mockStatusRunning(dataClientMock, 'host');
      esClientMock.updateByQuery.mockReturnValueOnce(Promise.resolve({ updated: 0 }));

      const doc: Entity = {
        entity: {
          id: 'host-1',
          attributes: {
            Privileged: true,
          },
          lifecycle: {
            FirstSeen: new Date().toISOString(),
          },
        },
      };

      await expect(async () => client.upsertEntity('host', doc)).rejects.toThrow(
        new DocumentNotFoundError()
      );
    });

    it('when valid update entity', async () => {
      mockStatusRunning(dataClientMock, 'host');
      esClientMock.updateByQuery.mockReturnValueOnce(Promise.resolve({ updated: 1 }));

      const mockedDate = new Date(Date.parse('2025-09-03T07:56:22.038Z'));
      jest.useFakeTimers();
      jest.setSystemTime(mockedDate);

      // overly complex mock implementation to work around type issues
      // https://github.com/uuidjs/uuid/issues/825#issuecomment-2519038887
      const v4Spy = jest.spyOn(uuid, 'v4').mockImplementationOnce((() => '123') as typeof uuid.v4);

      const doc: Entity = {
        entity: {
          id: 'host-1',
          attributes: {
            Privileged: true,
          },
          lifecycle: {
            FirstSeen: '1995-12-17T03:24:00',
          },
        },
      };

      await client.upsertEntity('host', doc);

      expect(dataClientMock.status).toBeCalledWith({ include_components: true });
      expect(esClientMock.updateByQuery).toBeCalledWith({
        index: '.entities.v1.latest.security_host_default',
        query: {
          term: {
            'entity.id': 'host-1',
          },
        },
        script: {
          lang: 'painless',
          source:
            `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
            `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
            `ctx._source['entity']['attributes']['Privileged'] = true;` +
            `ctx._source['entity']['lifecycle'] = ctx._source['entity']['lifecycle'] == null ? [:] : ctx._source['entity']['lifecycle'];` +
            `ctx._source['entity']['lifecycle']['FirstSeen'] = '1995-12-17T03:24:00';`,
        },
      });

      expect(esClientMock.create).toBeCalledWith({
        index: '.entities.v1.updates.security_host_default',
        id: '123',
        document: {
          '@timestamp': mockedDate.toISOString(),
          host: {
            name: 'host-1',
            entity: {
              ...doc.entity,
            },
          },
        },
      });

      expect(v4Spy).toBeCalledTimes(1);
    });

    it('when valid update entity using force', async () => {
      mockStatusRunning(dataClientMock, 'host');
      esClientMock.updateByQuery.mockReturnValueOnce(Promise.resolve({ updated: 1 }));

      const mockedDate = new Date(Date.parse('2025-09-03T07:56:22.038Z'));
      jest.useFakeTimers();
      jest.setSystemTime(mockedDate);

      // overly complex mock implementation to work around type issues
      // https://github.com/uuidjs/uuid/issues/825#issuecomment-2519038887
      const v4Spy = jest.spyOn(uuid, 'v4').mockImplementationOnce((() => '123') as typeof uuid.v4);

      const doc: Entity = {
        host: {
          name: 'not-allowed',
          id: ['123'],
        },
        entity: {
          id: 'host-1',
          attributes: {
            Privileged: true,
          },
          lifecycle: {
            FirstSeen: '1995-12-17T03:24:00',
          },
        },
      };

      await client.upsertEntity('host', doc, true);

      expect(dataClientMock.status).toBeCalledWith({ include_components: true });
      expect(esClientMock.updateByQuery).toBeCalledWith({
        index: '.entities.v1.latest.security_host_default',
        query: {
          term: {
            'entity.id': 'host-1',
          },
        },
        script: {
          lang: 'painless',
          source:
            `ctx._source['host'] = ctx._source['host'] == null ? [:] : ctx._source['host'];` +
            `ctx._source['host']['name'] = 'not-allowed';` +
            `ctx._source['host']['id'] = ['123'];` +
            `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
            `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
            `ctx._source['entity']['attributes']['Privileged'] = true;` +
            `ctx._source['entity']['lifecycle'] = ctx._source['entity']['lifecycle'] == null ? [:] : ctx._source['entity']['lifecycle'];` +
            `ctx._source['entity']['lifecycle']['FirstSeen'] = '1995-12-17T03:24:00';`,
        },
      });

      expect(esClientMock.create).toBeCalledWith({
        index: '.entities.v1.updates.security_host_default',
        id: '123',
        document: {
          '@timestamp': mockedDate.toISOString(),
          host: {
            name: 'host-1',
            entity: {
              ...doc.entity,
            },
          },
        },
      });

      expect(v4Spy).toBeCalledTimes(1);
    });
  });
});

const mockStatusRunning = (mock: jest.Mocked<EntityStoreDataClient>, type: EntityType) =>
  mock.status.mockReturnValueOnce(
    Promise.resolve({
      status: 'running',
      engines: [{ type, status: 'started' } as EngineDescriptor],
    })
  );
