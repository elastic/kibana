/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createMigrationIndex } from './create_migration_index';

describe('createMigrationIndex', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('creates an index suffixed with the template version', async () => {
    await createMigrationIndex({ esClient, index: 'my-signals-index', version: 4 });

    expect(esClient.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'my-signals-index-r000004' })
    );
  });
});
