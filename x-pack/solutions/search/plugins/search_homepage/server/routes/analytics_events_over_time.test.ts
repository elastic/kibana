/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConfigSchema } from '@kbn/config-schema';
import type { Type } from '@kbn/config-schema';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { AnalyticsEventsOverTime } from '../../common/analytics';
import { fetchAnalyticsEventsOverTime } from '../lib/analytics_events_over_time';
import { registerAnalyticsEventsOverTimeRoute } from './analytics_events_over_time';

jest.mock('../lib/analytics_events_over_time');

const mockFetch = fetchAnalyticsEventsOverTime as jest.MockedFunction<
  typeof fetchAnalyticsEventsOverTime
>;

const SOURCES = [{ name: 'clicks', timeField: '@timestamp' }];
const EVENTS: AnalyticsEventsOverTime = {
  from: 0,
  to: 120_000,
  intervalMs: 60_000,
  total: 3,
  buckets: [
    { timestamp: 0, count: 1 },
    { timestamp: 60_000, count: 2 },
  ],
};

describe('registerAnalyticsEventsOverTimeRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const getBodySchema = (): Type<{ sources: typeof SOURCES }> => {
    const { validate } = router.post.mock.calls[0][0];
    if (typeof validate !== 'object' || !isConfigSchema(validate.body)) {
      throw new Error('The route has no body schema');
    }
    return validate.body as Type<{ sources: typeof SOURCES }>;
  };

  const callHandler = () => {
    const core = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: Promise.resolve(core) });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ body: { sources: SOURCES } });

    return { core, response, result: router.post.mock.calls[0][1](context, request, response) };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    logger = loggingSystemMock.createLogger();
    registerAnalyticsEventsOverTimeRoute(router, logger);
  });

  it('registers an internal route that delegates authorization to the scoped client', () => {
    expect(router.post.mock.calls[0][0]).toMatchObject({
      path: '/internal/search_homepage/analytics/events_over_time',
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: expect.stringContaining('as the caller') } },
    });
  });

  it('accepts up to five named sources and rejects unbounded input', () => {
    const body = getBodySchema();
    const source = SOURCES[0];

    expect(body.validate({ sources: SOURCES })).toEqual({ sources: SOURCES });
    expect(() => body.validate({ sources: [] })).toThrow();
    expect(() => body.validate({ sources: Array.from({ length: 6 }, () => source) })).toThrow();
    expect(() => body.validate({ sources: [{ ...source, name: 'a'.repeat(256) }] })).toThrow();
    expect(() =>
      body.validate({ sources: [{ ...source, timeField: 'a'.repeat(1025) }] })
    ).toThrow();
    expect(() => body.validate({ sources: [{ name: 'clicks' }] })).toThrow();
  });

  it('returns the counts read with the scoped client', async () => {
    mockFetch.mockResolvedValue(EVENTS);

    const { core, response, result } = callHandler();
    await result;

    expect(mockFetch).toHaveBeenCalledWith({ client: core.elasticsearch.client, sources: SOURCES });
    expect(response.ok).toHaveBeenCalledWith({ body: EVENTS });
  });

  it('answers 403 without logging an error when Elasticsearch refuses the caller', async () => {
    mockFetch.mockRejectedValue(Object.assign(new Error('unauthorized'), { statusCode: 403 }));

    const { response, result } = callHandler();
    await result;

    expect(response.forbidden).toHaveBeenCalledWith({
      body: { message: 'Insufficient privileges to read the events of these sources' },
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('unauthorized'));
  });

  it('keeps the status code of other failures and logs them', async () => {
    mockFetch.mockRejectedValue(Object.assign(new Error('shards failed'), { statusCode: 503 }));

    const { response, result } = callHandler();
    await result;

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: { message: 'Failed to fetch the analytics events over time' },
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('shards failed'));
  });
});
