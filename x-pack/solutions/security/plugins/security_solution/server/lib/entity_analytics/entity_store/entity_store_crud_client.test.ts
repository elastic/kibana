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
  EngineDescriptor,
  EntityType,
} from '../../../../common/api/entity_analytics/entity_store';
import type { EntityStoreDataClient } from './entity_store_data_client';

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
    });

    it('when Entity Store completely disabled throw error', async () => {
      dataClientMock.status.mockReturnValueOnce(
        Promise.resolve({ status: 'not_installed', engines: [] })
      );

      expect(async () =>
        client.singleUpdateEntity('host', 'host-id', {
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

      expect(async () =>
        client.singleUpdateEntity('user', 'user-id', {
          entity: {
            id: 'user-id',
          },
        })
      ).rejects.toThrow(new EngineNotRunningError('user'));

      expect(dataClientMock.status).toBeCalledWith({ include_components: true });
    });

    it('when not id different in body and path throw error', async () => {
      mockStatusRunning(dataClientMock, 'generic');
      const entity = {
        entity: {
          id: 'db-1',
        },
      };

      expect(async () => client.singleUpdateEntity('generic', 'db-2', entity)).rejects.toThrow(
        new BadCRUDRequestError(
          `The id provided in the path, and the id provided in the body doesn't match`
        )
      );
    });

    it('when not allowed attributes are updated, throw error', async () => {
      mockStatusRunning(dataClientMock, 'host');
      const entity = {
        entity: {
          id: 'host-1',
          type: 'update',
          sub_type: 'updated-sub',
          attributes: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Storage_class: 'cold',
          },
        },
      };

      expect(async () => client.singleUpdateEntity('host', 'host-1', entity)).rejects.toThrow(
        new BadCRUDRequestError(
          `The following attributes are not allowed to be ` +
            `updated without forcing it (?force=true): type, sub_type`
        )
      );
    });

    it('when entity not found throw', async () => {
      mockStatusRunning(dataClientMock, 'host');
      esClientMock.updateByQuery.mockReturnValueOnce(Promise.resolve({ updated: 0 }));

      const entity = {
        entity: {
          id: 'host-1',
          attributes: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Storage_class: 'cold',
            Managed: true,
          },
          behavior: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Brute_force_victim: false,
          },
        },
      };

      expect(async () => client.singleUpdateEntity('host', 'host-1', entity)).rejects.toThrow(
        new DocumentNotFoundError()
      );
    });

    it('when valid update entity', async () => {
      mockStatusRunning(dataClientMock, 'host');
      esClientMock.updateByQuery.mockReturnValueOnce(Promise.resolve({ updated: 1 }));

      const entity = {
        entity: {
          id: 'host-1',
          attributes: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Storage_class: 'cold',
            Managed: true,
          },
          behavior: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            Brute_force_victim: false,
          },
        },
      };

      await client.singleUpdateEntity('host', 'host-1', entity);

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
            "ctx._source.entity['attributes'] = ctx._source.entity['attributes'] == null ? [:] : ctx._source.entity['attributes'];ctx._source.entity['attributes']['Storage_class'] = 'cold';ctx._source.entity['attributes']['Managed'] = true;ctx._source.entity['behavior'] = ctx._source.entity['behavior'] == null ? [:] : ctx._source.entity['behavior'];ctx._source.entity['behavior']['Brute_force_victim'] = false;",
        },
      });
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
