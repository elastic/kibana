/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import { ExtractionAlreadyRunningError } from './extraction_already_running_error';
import type { ExtractionService } from './extraction_service';
import { registerRoutes } from './routes';

type Handler = (context: unknown, request: unknown, response: unknown) => Promise<unknown>;

const startHandler = (start: ExtractionService['start']): Handler => {
  const handlers = new Map<string, Handler>();
  const register = (config: { path: string }, handler: Handler) =>
    handlers.set(config.path, handler);
  registerRoutes({
    catalogIndex: 'catalog',
    getServices: () => ({
      extractionService: { start } as unknown as ExtractionService,
      getSpaceId: () => 'default',
    }),
    repositories: new Set(['elastic/example']),
    router: { get: register, post: register } as unknown as IRouter,
  });
  const handler = handlers.get('/internal/code_intelligence/extractions');
  if (handler === undefined) throw new Error('Extraction route was not registered.');
  return handler;
};

const invoke = (handler: Handler) => {
  const response = {
    accepted: jest.fn(),
    badRequest: jest.fn(),
    conflict: jest.fn(),
    customError: jest.fn(),
  };
  const context = { core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: {} } } }) };
  const request = { body: { repository: 'elastic/example', revision: 'HEAD' } };
  return handler(context, request, response).then(() => response);
};

describe('POST /internal/code_intelligence/extractions', () => {
  it('maps a run already in progress for the repository to 409 Conflict', async () => {
    const response = await invoke(
      startHandler(() => {
        throw new ExtractionAlreadyRunningError('elastic/example');
      })
    );

    expect(response.conflict).toHaveBeenCalledWith({
      body: { message: 'An extraction for elastic/example is already running.' },
    });
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('keeps 429 for tracking capacity errors', async () => {
    const response = await invoke(
      startHandler(() => {
        throw new Error('Extraction tracking capacity is full.');
      })
    );

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));
    expect(response.conflict).not.toHaveBeenCalled();
  });
});
