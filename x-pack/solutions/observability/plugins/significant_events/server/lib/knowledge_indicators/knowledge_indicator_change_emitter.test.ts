/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { createKnowledgeIndicatorChangeEmitter } from './knowledge_indicator_change_emitter';

const EVENT = { request: {} as KibanaRequest, spaceId: 'default', sourceIds: ['logs-app'] };

describe('createKnowledgeIndicatorChangeEmitter', () => {
  it('logs a failing listener and still calls the others', async () => {
    const logger = loggerMock.create();
    const emitter = createKnowledgeIndicatorChangeEmitter(logger);
    const listener = jest.fn();
    emitter.subscribe(() => {
      throw new Error('boom');
    });
    emitter.subscribe(listener);

    await expect(emitter.emit(EVENT)).resolves.toBeUndefined();

    expect(listener).toHaveBeenCalledWith(EVENT);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
