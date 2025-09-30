/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityStoreCrudClient } from './entity_store_crud_client';
import { entityStoreDataClientMock } from './entity_store_data_client.mock';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  BadCRUDRequestError,
  EngineNotRunningError,
  CapabilityNotEnabledError,
  DocumentVersionConflictError,
} from './errors';
import type { Entity } from '../../../../common/api/entity_analytics/entity_store';
import * as uuid from 'uuid';
import { EntityStoreCapability } from '@kbn/entities-schema';

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

    it('when Entity Store disabled throw error', async () => {
      dataClientMock.isEngineRunning.mockReturnValueOnce(Promise.resolve(false));

      await expect(async () =>
        client.upsertEntity('host', {
          entity: {
            id: 'host-id',
          },
        })
      ).rejects.toThrow(new EngineNotRunningError('host'));

      expect(dataClientMock.isEngineRunning).toBeCalledWith('host');
    });

    it('when Entity Store enabled but CRUD API not in place throw error', async () => {
      dataClientMock.isEngineRunning.mockReturnValueOnce(Promise.resolve(true));
      dataClientMock.isCapabilityEnabled.mockReturnValueOnce(Promise.resolve(false));

      await expect(async () =>
        client.upsertEntity('host', {
          entity: {
            id: 'host-id',
          },
        })
      ).rejects.toThrow(new CapabilityNotEnabledError(EntityStoreCapability.CRUD_API));

      expect(dataClientMock.isEngineRunning).toBeCalledWith('host');
      expect(dataClientMock.isCapabilityEnabled).toBeCalledWith(
        'host',
        EntityStoreCapability.CRUD_API
      );
    });

    it('when not allowed attributes are updated, throw error', async () => {
      dataClientMock.isCapabilityEnabled.mockReturnValueOnce(Promise.resolve(true));
      dataClientMock.isEngineRunning.mockReturnValueOnce(Promise.resolve(true));
      const doc: Entity = {
        user: {
          name: 'not-allowed',
        },
        entity: {
          id: 'host-1',
          type: 'update',
          sub_type: 'updated-sub',
          attributes: {
            privileged: true,
          },
        },
      };

      await expect(async () => client.upsertEntity('user', doc)).rejects.toThrow(
        new BadCRUDRequestError(
          `The following attributes are not allowed to be ` +
            `updated without forcing it (?force=true): entity.type, entity.sub_type`
        )
      );
    });

    it('when conflicts throw', async () => {
      dataClientMock.isCapabilityEnabled.mockReturnValueOnce(Promise.resolve(true));
      dataClientMock.isEngineRunning.mockReturnValueOnce(Promise.resolve(true));
      esClientMock.updateByQuery.mockReturnValueOnce(Promise.resolve({ version_conflicts: 1 }));

      const doc: Entity = {
        entity: {
          id: 'host-1',
          attributes: {
            privileged: true,
          },
        },
      };

      await expect(async () => client.upsertEntity('host', doc)).rejects.toThrow(
        new DocumentVersionConflictError()
      );
    });

    it('when valid update entity', async () => {
      dataClientMock.isCapabilityEnabled.mockReturnValueOnce(Promise.resolve(true));
      dataClientMock.isEngineRunning.mockReturnValueOnce(Promise.resolve(true));
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
            privileged: true,
          },
        },
      };

      await client.upsertEntity('host', doc);

      expect(dataClientMock.isEngineRunning).toBeCalledWith('host');
      expect(dataClientMock.isCapabilityEnabled).toBeCalledWith(
        'host',
        EntityStoreCapability.CRUD_API
      );
      expect(esClientMock.updateByQuery).toBeCalledWith({
        conflicts: 'proceed',
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
            `ctx._source['entity']['attributes']['Privileged'] = true;`,
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
              id: 'host-1',
              attributes: {
                Privileged: true,
              },
            },
          },
        },
      });

      expect(v4Spy).toBeCalledTimes(1);
    });

    it('when valid update entity for generic type', async () => {
      dataClientMock.isCapabilityEnabled.mockReturnValueOnce(Promise.resolve(true));
      dataClientMock.isEngineRunning.mockReturnValueOnce(Promise.resolve(true));
      esClientMock.updateByQuery.mockReturnValueOnce(Promise.resolve({ updated: 1 }));

      const mockedDate = new Date(Date.parse('2025-09-03T07:56:22.038Z'));
      jest.useFakeTimers();
      jest.setSystemTime(mockedDate);

      // overly complex mock implementation to work around type issues
      // https://github.com/uuidjs/uuid/issues/825#issuecomment-2519038887
      const v4Spy = jest.spyOn(uuid, 'v4').mockImplementationOnce((() => '123') as typeof uuid.v4);

      const doc: Entity = {
        entity: {
          id: 'database-1',
          name: 'mysql-db',
          attributes: {
            privileged: false,
          },
          lifecycle: {
            first_seen: '1995-12-17T03:24:00',
          },
        },
      };

      await client.upsertEntity('generic', doc, true);

      expect(dataClientMock.isEngineRunning).toBeCalledWith('generic');
      expect(dataClientMock.isCapabilityEnabled).toBeCalledWith(
        'generic',
        EntityStoreCapability.CRUD_API
      );
      expect(esClientMock.updateByQuery).toBeCalledWith({
        conflicts: 'proceed',
        index: '.entities.v1.latest.security_generic_default',
        query: {
          term: {
            'entity.id': 'database-1',
          },
        },
        script: {
          lang: 'painless',
          source:
            `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
            `ctx._source['entity']['name'] = 'mysql-db';` +
            `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
            `ctx._source['entity']['attributes']['Privileged'] = false;` +
            `ctx._source['entity']['lifecycle'] = ctx._source['entity']['lifecycle'] == null ? [:] : ctx._source['entity']['lifecycle'];` +
            `ctx._source['entity']['lifecycle']['First_seen'] = '1995-12-17T03:24:00';`,
        },
      });

      expect(esClientMock.create).toBeCalledWith({
        index: '.entities.v1.updates.security_generic_default',
        id: '123',
        document: {
          '@timestamp': mockedDate.toISOString(),
          entity: {
            id: 'database-1',
            name: 'mysql-db',
            attributes: {
              Privileged: false,
            },
            lifecycle: {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              First_seen: '1995-12-17T03:24:00',
            },
          },
        },
      });

      expect(v4Spy).toBeCalledTimes(1);
    });

    it('when valid update entity using force', async () => {
      dataClientMock.isCapabilityEnabled.mockReturnValueOnce(Promise.resolve(true));
      dataClientMock.isEngineRunning.mockReturnValueOnce(Promise.resolve(true));
      esClientMock.updateByQuery.mockReturnValueOnce(Promise.resolve({ updated: 1 }));

      const mockedDate = new Date(Date.parse('2025-09-03T07:56:22.038Z'));
      jest.useFakeTimers();
      jest.setSystemTime(mockedDate);

      // overly complex mock implementation to work around type issues
      // https://github.com/uuidjs/uuid/issues/825#issuecomment-2519038887
      const v4Spy = jest.spyOn(uuid, 'v4').mockImplementationOnce((() => '123') as typeof uuid.v4);

      const doc: Entity = {
        host: {
          name: 'should not be there',
          id: ['123'],
        },
        entity: {
          id: 'host-1',
          attributes: {
            privileged: true,
          },
          lifecycle: {
            first_seen: '1995-12-17T03:24:00',
          },
        },
      };

      await client.upsertEntity('host', doc, true);

      expect(dataClientMock.isEngineRunning).toBeCalledWith('host');
      expect(dataClientMock.isCapabilityEnabled).toBeCalledWith(
        'host',
        EntityStoreCapability.CRUD_API
      );
      expect(esClientMock.updateByQuery).toBeCalledWith({
        conflicts: 'proceed',
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
            `def collectMap = [:];` +
            `collectMap['host.id'] = new HashSet();` +
            `collectMap['host.id'].addAll(['123']);` +
            `if (!(ctx?._source['host']['id'] == null || ((ctx._source['host']['id'] instanceof Collection || ctx._source['host']['id'] instanceof String || ctx._source['host']['id'] instanceof Map) && ctx._source['host']['id'].isEmpty()))) {` +
            `  if(ctx._source['host']['id'] instanceof Collection) {` +
            `    collectMap['host.id'].addAll(ctx._source['host']['id']);` +
            `  } else {` +
            `    collectMap['host.id'].add(ctx._source['host']['id']);` +
            `  }` +
            `}` +
            `ctx._source['host']['id'] = new ArrayList(collectMap['host.id']).subList(0, (int) Math.min(10, collectMap['host.id'].size()));` +
            `ctx._source['entity'] = ctx._source['entity'] == null ? [:] : ctx._source['entity'];` +
            `ctx._source['entity']['attributes'] = ctx._source['entity']['attributes'] == null ? [:] : ctx._source['entity']['attributes'];` +
            `ctx._source['entity']['attributes']['Privileged'] = true;` +
            `ctx._source['entity']['lifecycle'] = ctx._source['entity']['lifecycle'] == null ? [:] : ctx._source['entity']['lifecycle'];` +
            `ctx._source['entity']['lifecycle']['First_seen'] = '1995-12-17T03:24:00';`,
        },
      });

      expect(esClientMock.create).toBeCalledWith({
        index: '.entities.v1.updates.security_host_default',
        id: '123',
        document: {
          '@timestamp': mockedDate.toISOString(),
          host: {
            id: ['123'],
            name: 'host-1',
            entity: {
              id: 'host-1',
              attributes: {
                Privileged: true,
              },
              lifecycle: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                First_seen: '1995-12-17T03:24:00',
              },
            },
          },
        },
      });

      expect(v4Spy).toBeCalledTimes(1);
    });

    it('when valid update entity, but no entity found, just create', async () => {
      dataClientMock.isCapabilityEnabled.mockReturnValueOnce(Promise.resolve(true));
      dataClientMock.isEngineRunning.mockReturnValueOnce(Promise.resolve(true));
      esClientMock.updateByQuery.mockReturnValueOnce(Promise.resolve({ updated: 0 }));

      const mockedDate = new Date(Date.parse('2025-09-03T07:56:22.038Z'));
      jest.useFakeTimers();
      jest.setSystemTime(mockedDate);

      const v4Spy = jest.spyOn(uuid, 'v4').mockImplementationOnce((() => '123') as typeof uuid.v4);

      const doc: Entity = {
        entity: {
          id: 'host-1',
          attributes: {
            privileged: true,
          },
          behaviors: {
            new_country_login: false,
          },
        },
      };

      await client.upsertEntity('host', doc);

      expect(dataClientMock.isEngineRunning).toBeCalledWith('host');
      expect(dataClientMock.isCapabilityEnabled).toBeCalledWith(
        'host',
        EntityStoreCapability.CRUD_API
      );
      expect(esClientMock.updateByQuery).toBeCalledTimes(1);
      expect(esClientMock.create).toBeCalledWith({
        index: '.entities.v1.updates.security_host_default',
        id: '123',
        document: {
          '@timestamp': mockedDate.toISOString(),
          host: {
            name: 'host-1',
            entity: {
              id: 'host-1',
              attributes: {
                Privileged: true,
              },
              behaviors: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                New_country_login: false,
              },
            },
          },
        },
      });

      expect(v4Spy).toBeCalledTimes(1);
    });
  });
});
