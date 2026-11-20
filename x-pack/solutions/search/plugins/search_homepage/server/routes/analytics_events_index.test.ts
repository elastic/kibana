/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { RouteValidatorConfig } from '@kbn/core/server';
import type { Type } from '@kbn/config-schema';
import { EventsIndexCreateError, createEventsIndex } from '../lib/analytics_events_index';
import { registerAnalyticsEventsIndexRoute } from './analytics_events_index';

jest.mock('../lib/analytics_events_index', () => ({
  ...jest.requireActual('../lib/analytics_events_index'),
  createEventsIndex: jest.fn(),
}));

const mockCreate = createEventsIndex as jest.MockedFunction<typeof createEventsIndex>;

describe('registerAnalyticsEventsIndexRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const callHandler = (name = 'events') => {
    const core = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: Promise.resolve(core) });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ body: { name } });

    return { core, response, result: router.post.mock.calls[0][1](context, request, response) };
  };

  const getBodySchema = (): Type<{ name: string }> => {
    const { validate } = router.post.mock.calls[0][0];
    return (validate as RouteValidatorConfig<unknown, unknown, { name: string }>).body as Type<{
      name: string;
    }>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    logger = loggingSystemMock.createLogger();
    registerAnalyticsEventsIndexRoute(router, logger);
  });

  it('registers an internal route that delegates authorization to Elasticsearch', () => {
    expect(router.post.mock.calls[0][0]).toMatchObject({
      path: '/internal/search_homepage/analytics/events_index',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: expect.stringContaining('as the caller') } },
    });
  });

  it('accepts a valid index name and nothing else', () => {
    const body = getBodySchema();

    expect(body.validate({ name: 'app-events' })).toEqual({ name: 'app-events' });
    expect(() => body.validate({})).toThrow();
    expect(() => body.validate({ name: '' })).toThrow();
    expect(() => body.validate({ name: 'Events' })).toThrow(/not a valid index name \(uppercase\)/);
    expect(() => body.validate({ name: 'a,b' })).toThrow(/invalidCharacters/);
    expect(() => body.validate({ name: '.events' })).toThrow(/invalidStart/);
    expect(() => body.validate({ name: 'a'.repeat(256) })).toThrow();
    expect(() => body.validate({ name: 'events', mode: 'standard' })).toThrow();
  });

  it('creates the index with the scoped client', async () => {
    mockCreate.mockResolvedValue({ index: 'events' });

    const { core, response, result } = callHandler();
    await result;

    expect(mockCreate).toHaveBeenCalledWith({ client: core.elasticsearch.client, name: 'events' });
    expect(response.ok).toHaveBeenCalledWith({ body: { index: 'events' } });
  });

  it('answers 409 when the index exists', async () => {
    mockCreate.mockRejectedValue(
      new EventsIndexCreateError('An index named events already exists', 409)
    );

    const { response, result } = callHandler();
    await result;

    expect(response.conflict).toHaveBeenCalledWith({
      body: { message: 'An index named events already exists' },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('answers 400 with the reason when Elasticsearch does not take the name', async () => {
    mockCreate.mockRejectedValue(new EventsIndexCreateError('already exists as alias', 400));

    const { response, result } = callHandler();
    await result;

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'already exists as alias' },
    });
  });

  it('answers 403 with the privilege needed when Elasticsearch refuses the caller', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('unauthorized'), { statusCode: 403 }));

    const { response, result } = callHandler('app-events');
    await result;

    expect(response.forbidden).toHaveBeenCalledWith({
      body: {
        message:
          'Failed to create the events index: your role needs the create_index index privilege on app-events',
      },
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('unauthorized'));
  });

  it.each([
    ['settings Elasticsearch rejects', { statusCode: 400 }, 400],
    ['an Elasticsearch failure', { statusCode: 503 }, 503],
    ['an unexpected error', {}, 500],
  ])('logs %s and answers with its status', async (_, properties, statusCode) => {
    mockCreate.mockRejectedValue(Object.assign(new Error('boom'), properties));

    const { response, result } = callHandler();
    await result;

    expect(response.customError).toHaveBeenCalledWith({
      statusCode,
      body: { message: 'Failed to create the events index' },
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
