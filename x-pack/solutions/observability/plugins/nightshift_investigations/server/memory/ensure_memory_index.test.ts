/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { MEMORY_INDEX } from '../../common/memory';
import {
  ensureMemoryIndex,
  MEMORY_INDEX_MAPPINGS,
  MEMORY_INDEX_TEMPLATE_NAME,
} from './ensure_memory_index';

describe('ensureMemoryIndex', () => {
  const logger = loggerMock.create();

  const createEsClient = (exists: boolean) => ({
    indices: {
      putIndexTemplate: jest.fn().mockResolvedValue({}),
      exists: jest.fn().mockResolvedValue(exists),
      create: jest.fn().mockResolvedValue({}),
      putSettings: jest.fn().mockResolvedValue({}),
      putMapping: jest.fn().mockResolvedValue({}),
    },
  });

  it('installs a plugin-owned template and creates the index when missing', async () => {
    const esClient = createEsClient(false);

    await ensureMemoryIndex({ esClient: esClient as never, logger });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MEMORY_INDEX_TEMPLATE_NAME,
        index_patterns: [MEMORY_INDEX],
        template: expect.objectContaining({
          settings: expect.objectContaining({ 'index.hidden': true }),
          mappings: MEMORY_INDEX_MAPPINGS,
        }),
      })
    );
    expect(esClient.indices.create).toHaveBeenCalledWith({
      index: MEMORY_INDEX,
      settings: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
        'index.hidden': true,
      },
      mappings: MEMORY_INDEX_MAPPINGS,
    });
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
    expect(MEMORY_INDEX.startsWith('ai-index-')).toBe(false);
    expect(MEMORY_INDEX_MAPPINGS.properties.context.fields.semantic.type).toBe('semantic_text');
  });

  it('puts the mapping when the index already exists', async () => {
    const esClient = createEsClient(true);

    await ensureMemoryIndex({ esClient: esClient as never, logger });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalled();
    expect(esClient.indices.create).not.toHaveBeenCalled();
    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: MEMORY_INDEX,
      settings: { 'index.hidden': true },
    });
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: MEMORY_INDEX,
      dynamic: MEMORY_INDEX_MAPPINGS.dynamic,
      properties: MEMORY_INDEX_MAPPINGS.properties,
    });
  });
});
