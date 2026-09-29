/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import { ExtractionAlreadyRunningError } from './extraction_already_running_error';
import { ExtractionCapacityExhaustedError } from './extraction_capacity_exhausted_error';
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

const invoke = (handler: Handler, repository = 'elastic/example') => {
  const response = {
    accepted: jest.fn(),
    badRequest: jest.fn(),
    conflict: jest.fn(),
    customError: jest.fn(),
  };
  const context = { core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: {} } } }) };
  const request = { body: { repository, revision: 'HEAD' } };
  return handler(context, request, response).then(() => response);
};

describe('POST /internal/code_intelligence/extractions', () => {
  it('maps a run this instance tracks to 409 Conflict with its extraction id', async () => {
    const response = await invoke(
      startHandler(() => {
        throw new ExtractionAlreadyRunningError('elastic/example', 'running-id');
      })
    );

    expect(response.conflict).toHaveBeenCalledWith({
      body: {
        message: 'An extraction for elastic/example is already running.',
        attributes: {
          code: 'extraction_already_running',
          repository: 'elastic/example',
          extractionId: 'running-id',
        },
      },
    });
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('omits the extraction id when another instance holds the run', async () => {
    const response = await invoke(
      startHandler(() => {
        throw new ExtractionAlreadyRunningError('elastic/example');
      })
    );

    expect(response.conflict).toHaveBeenCalledWith({
      body: {
        message: 'An extraction for elastic/example is already running.',
        attributes: { code: 'extraction_already_running', repository: 'elastic/example' },
      },
    });
  });

  it('maps a repository missing from the configuration to 400 with its code', async () => {
    const start = jest.fn();
    const response = await invoke(startHandler(start), 'elastic/unknown');

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: 'Repository is not configured.',
        attributes: { code: 'repository_not_configured', repository: 'elastic/unknown' },
      },
    });
    expect(start).not.toHaveBeenCalled();
  });

  it('maps tracking capacity errors to 429 with their code', async () => {
    const response = await invoke(
      startHandler(() => {
        throw new ExtractionCapacityExhaustedError();
      })
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 429,
      body: {
        message: 'Extraction tracking capacity is full.',
        attributes: { code: 'extraction_capacity_exhausted', repository: 'elastic/example' },
      },
    });
    expect(response.conflict).not.toHaveBeenCalled();
  });

  it('leaves unexpected errors to the router instead of reporting them as capacity', async () => {
    const failure = new Error('Elasticsearch is unavailable.');

    await expect(
      invoke(
        startHandler(() => {
          throw failure;
        })
      )
    ).rejects.toBe(failure);
  });
});
