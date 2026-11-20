/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createRulesStaleNotifier } from './rules_stale_notifier';

const REQUEST = httpServerMock.createKibanaRequest();
const EVENT = { reason: 'knowledge_indicators' as const, source_ids: ['source-1'] };

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('createRulesStaleNotifier', () => {
  it('emits the trigger with the request that made the change', async () => {
    const emitEvent = jest.fn().mockResolvedValue(undefined);
    const getWorkflowsClient = jest.fn().mockResolvedValue({ emitEvent });
    const notify = createRulesStaleNotifier({
      getWorkflowsClient,
      logger: loggingSystemMock.createLogger(),
    });

    notify({ request: REQUEST, event: EVENT });
    await flushPromises();

    expect(getWorkflowsClient).toHaveBeenCalledWith(REQUEST);
    expect(emitEvent).toHaveBeenCalledWith('nightshift-detection.rulesStale', EVENT);
  });

  // The write already committed: a failing emit is logged, never thrown into the writer.
  it('logs a failing emit instead of throwing', async () => {
    const logger = loggingSystemMock.createLogger();
    const notify = createRulesStaleNotifier({
      getWorkflowsClient: async () => ({
        emitEvent: jest.fn().mockRejectedValue(new Error('workflows unavailable')),
      }),
      logger,
    });

    expect(() => notify({ request: REQUEST, event: EVENT })).not.toThrow();
    await flushPromises();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('workflows unavailable'));
  });
});
