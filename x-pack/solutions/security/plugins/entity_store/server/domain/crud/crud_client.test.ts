/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { CRUDClient } from './crud_client';
import { EntityStoreNotInstalledError } from '../errors';

describe('CRUDClient', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;
  let client: CRUDClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    client = new CRUDClient({ esClient, logger, namespace: 'default' });
  });

  describe('assertInstalled', () => {
    const entity = { entity: { id: 'test-id' } };

    it('createEntity throws EntityStoreNotInstalledError when index does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);

      await expect(client.createEntity('generic', entity)).rejects.toThrow(
        EntityStoreNotInstalledError
      );
    });

    it('updateEntity throws EntityStoreNotInstalledError when index does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);

      await expect(client.updateEntity('generic', entity, false)).rejects.toThrow(
        EntityStoreNotInstalledError
      );
    });

    it('bulkUpdateEntity throws EntityStoreNotInstalledError when index does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);

      await expect(
        client.bulkUpdateEntity({ objects: [{ type: 'generic', doc: entity }] })
      ).rejects.toThrow(EntityStoreNotInstalledError);
    });
  });
});
