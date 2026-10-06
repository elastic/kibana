/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  ensureMemoryIndex,
  MEMORY_CONTEXT_MAPPING,
  MEMORY_INDEX_COMPONENT_TEMPLATE_NAME,
} from './ensure_memory_index';

describe('ensureMemoryIndex', () => {
  const logger = loggerMock.create();

  const createEsClient = () => ({
    cluster: { putComponentTemplate: jest.fn().mockResolvedValue({}) },
  });

  it('installs the AI-index component template that adds the task-recall field', async () => {
    const esClient = createEsClient();

    await ensureMemoryIndex({ esClient: esClient as never, logger });

    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledWith({
      name: MEMORY_INDEX_COMPONENT_TEMPLATE_NAME,
      template: { mappings: MEMORY_CONTEXT_MAPPING },
      _meta: expect.objectContaining({ managed: true }),
    });
    expect(MEMORY_CONTEXT_MAPPING.properties.context.fields.semantic.type).toBe('semantic_text');
  });
});
