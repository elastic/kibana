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
  MEMORY_CONTEXT_MAPPING,
  MEMORY_INDEX_TEMPLATE_NAME,
  MEMORY_INDEX_TEMPLATE_PRIORITY,
} from './ensure_memory_index';

describe('ensureMemoryIndex', () => {
  const logger = loggerMock.create();

  const createEsClient = () => ({
    indices: { putIndexTemplate: jest.fn().mockResolvedValue({}) },
  });

  it('installs an index-scoped template that adds the task-recall field on top of the AI index', async () => {
    const esClient = createEsClient();

    await ensureMemoryIndex({ esClient: esClient as never, logger });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith({
      name: MEMORY_INDEX_TEMPLATE_NAME,
      index_patterns: [MEMORY_INDEX],
      // Above the managed `ai-index-idx` template, so `context` wins the merge.
      priority: MEMORY_INDEX_TEMPLATE_PRIORITY,
      create: false,
      _meta: expect.objectContaining({ managed: true }),
      template: { mappings: MEMORY_CONTEXT_MAPPING },
    });
    expect(MEMORY_INDEX.startsWith('ai-index-idx-')).toBe(true);
    expect(MEMORY_CONTEXT_MAPPING.properties.context.fields.semantic.type).toBe('semantic_text');
  });
});
