/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFeature } from '@kbn/significant-events-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createFeatureKnowledgeIndicatorToolHandler } from './handler';

describe('createFeatureKnowledgeIndicatorToolHandler', () => {
  const logger = loggingSystemMock.createLogger();

  const featureInput: BaseFeature = {
    id: 'feature-1',
    type: 'custom',
    description: 'Feature description',
    properties: { field: 'value' },
    confidence: 85,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and stores feature KI with server-managed fields', async () => {
    const kiClient = {
      bulk: jest.fn().mockResolvedValue({ applied: 1, skipped: 0 }),
    };

    const result = await createFeatureKnowledgeIndicatorToolHandler({
      kiClient: kiClient as never,
      sourceId: 'logs.test',
      featureInput,
      logger,
    });

    expect(result).toEqual({ id: 'feature-1' });
    expect(kiClient.bulk).toHaveBeenCalledTimes(1);

    const [sourceIdArg, operationsArg] = kiClient.bulk.mock.calls[0];
    expect(sourceIdArg).toBe('logs.test');
    expect(operationsArg).toHaveLength(1);
    // The source is routed through `bulk(sourceId, ...)`, never stored on the payload itself.
    expect(operationsArg[0].index.feature).toEqual(expect.objectContaining(featureInput));
    expect(operationsArg[0].index.feature).not.toHaveProperty('source_id');
  });

  it('throws when feature storage fails', async () => {
    const kiClient = {
      bulk: jest.fn().mockRejectedValue(new Error('bulk failed')),
    };

    await expect(
      createFeatureKnowledgeIndicatorToolHandler({
        kiClient: kiClient as never,
        sourceId: 'logs.test',
        featureInput,
        logger,
      })
    ).rejects.toThrow('bulk failed');
  });
});
