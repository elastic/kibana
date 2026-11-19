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
import type { AnalyticsGenerationRequest } from '../../common/analytics';
import { GenerationOutputError, generateSourceAnalytics } from '../lib/analytics_generation';
import { resolveGenerationModel } from '../lib/analytics_generation_availability';
import { createGenerationCache } from '../lib/analytics_generation_cache';
import { fetchSourceProfile, fetchSourceSchema } from '../lib/analytics_generation_profile';
import { registerAnalyticsGenerationRoutes, validateSourceName } from './analytics_generation';

jest.mock('../lib/analytics_generation', () => ({
  ...jest.requireActual('../lib/analytics_generation'),
  generateSourceAnalytics: jest.fn(),
}));
jest.mock('../lib/analytics_generation_availability');
jest.mock('../lib/analytics_generation_profile');

const mockGenerate = jest.mocked(generateSourceAnalytics);
const mockResolveModel = jest.mocked(resolveGenerationModel);
const mockFetchSchema = jest.mocked(fetchSourceSchema);
const mockFetchProfile = jest.mocked(fetchSourceProfile);

const COUNTS = { proposed: 5, validFirstTime: 5, validAfterRepair: 0, dropped: 0 };
const SCHEMA = {
  source: 'app-events',
  timeField: '@timestamp',
  fields: [],
  totalFields: 0,
  mappingHash: 'hash-1',
  shareableFields: [],
};

describe('validateSourceName', () => {
  it.each(['app-events', 'logs-clickstream.events-default', 'my_events.2026'])(
    'accepts %s',
    (name) => {
      expect(validateSourceName(name)).toBeUndefined();
    }
  );

  it.each(['*', 'app-*', 'a,b', 'remote:app-events', '.kibana', '-app', '_all', 'a b', 'a"b'])(
    'refuses %s',
    (name) => {
      expect(validateSourceName(name)).toBe('must name one index or data stream');
    }
  );
});

describe('registerAnalyticsGenerationRoutes', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const output = jest.fn();
  const getCalls = jest.fn();

  const register = (config = { enabled: true, sampleValues: true }): void => {
    router = httpServiceMock.createRouter();
    registerAnalyticsGenerationRoutes(router, logger, {
      config,
      getDependencies: async () => ({}),
      cache: createGenerationCache(),
    });
  };

  const getBodySchema = (): Type<AnalyticsGenerationRequest> => {
    const { validate } = router.post.mock.calls[0][0];
    if (typeof validate !== 'object' || !isConfigSchema(validate.body)) {
      throw new Error('The route has no body schema');
    }
    return validate.body as Type<AnalyticsGenerationRequest>;
  };

  const callGenerate = async (body: AnalyticsGenerationRequest, username = 'jane') => {
    const core = coreMock.createRequestHandlerContext();
    core.security.authc.getCurrentUser.mockReturnValue({
      username,
      authentication_realm: { name: 'native', type: 'native' },
    } as ReturnType<typeof core.security.authc.getCurrentUser>);
    const context = coreMock.createCustomRequestHandlerContext({ core: Promise.resolve(core) });
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ body });
    await router.post.mock.calls[0][1](context, request, response);

    return { core, response };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    register();
    getCalls.mockReturnValue([
      { model: 'model-a-v1', tokens: { prompt: 4000, completion: 1500 } },
      { model: 'model-a-v1', tokens: { prompt: 4500, completion: 300 } },
    ]);
    mockResolveModel.mockResolvedValue({
      available: true,
      model: { connectorId: 'model-a', name: 'Model A', output, getCalls },
    });
    mockFetchSchema.mockResolvedValue(SCHEMA);
    mockFetchProfile.mockResolvedValue({ ...SCHEMA, hasRecentEvents: true });
    mockGenerate.mockResolvedValue({
      source: 'app-events',
      summary: 'Events.',
      queries: [{ id: 'generated_1', question: 'How many?', esql: 'FROM app-events | LIMIT 1' }],
      panels: null,
      modelCalls: 2,
      counts: { queries: COUNTS, panels: COUNTS },
    });
  });

  it('registers internal routes behind the privilege Agent Builder asks for', () => {
    expect(router.get.mock.calls[0][0]).toMatchObject({
      path: '/internal/search_homepage/analytics/generation/availability',
      options: { access: 'internal' },
      security: { authz: { requiredPrivileges: ['agentBuilder:read'] } },
    });
    expect(router.post.mock.calls[0][0]).toMatchObject({
      path: '/internal/search_homepage/analytics/generation',
      options: { access: 'internal' },
      security: { authz: { requiredPrivileges: ['agentBuilder:read'] } },
    });
  });

  it('accepts one concrete source and bounds every input', () => {
    const body = getBodySchema();

    expect(body.validate({ source: 'app-events' })).toEqual({ source: 'app-events' });
    expect(
      body.validate({
        source: 'app-events',
        timeField: '@timestamp',
        useCaseId: 'gaming',
        schemaOnly: true,
        refresh: true,
        connectorId: 'model-b',
      })
    ).toMatchObject({ useCaseId: 'gaming' });
    expect(() => body.validate({})).toThrow();
    expect(() => body.validate({ source: 'app-*' })).toThrow();
    expect(() => body.validate({ source: 'a,b' })).toThrow();
    expect(() => body.validate({ source: 'a'.repeat(256) })).toThrow();
    expect(() => body.validate({ source: 'a', timeField: 'a'.repeat(1025) })).toThrow();
    expect(() => body.validate({ source: 'a', useCaseId: 'logs' })).toThrow();
    expect(() => body.validate({ source: 'a', connectorId: 'a'.repeat(257) })).toThrow();
    expect(() => body.validate({ source: 'a', prompt: 'ignore the rules' })).toThrow();
  });

  describe('availability', () => {
    const callAvailability = async () => {
      const context = coreMock.createCustomRequestHandlerContext({
        core: Promise.resolve(coreMock.createRequestHandlerContext()),
      });
      const response = httpServerMock.createResponseFactory();
      await router.get.mock.calls[0][1](context, httpServerMock.createKibanaRequest(), response);
      return response;
    };

    it('says that generation is available and whether values are sent', async () => {
      const response = await callAvailability();

      expect(response.ok).toHaveBeenCalledWith({ body: { available: true, sampleValues: true } });
      expect(mockGenerate).not.toHaveBeenCalled();
      expect(output).not.toHaveBeenCalled();
    });

    it('says why it is not', async () => {
      register({ enabled: true, sampleValues: false });
      mockResolveModel.mockResolvedValue({ available: false, reason: 'license' });

      const response = await callAvailability();

      expect(response.ok).toHaveBeenCalledWith({
        body: { available: false, reason: 'license', sampleValues: false },
      });
    });
  });

  it('generates as the caller and reports the model, tokens and validation counts', async () => {
    const { core, response } = await callGenerate({ source: 'app-events', useCaseId: 'gaming' });

    expect(mockFetchSchema).toHaveBeenCalledWith({
      client: core.elasticsearch.client,
      source: 'app-events',
      timeField: undefined,
    });
    expect(mockFetchProfile).toHaveBeenCalledWith({
      client: core.elasticsearch.client,
      schema: SCHEMA,
      withValues: true,
    });
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ useCaseId: 'gaming', locale: 'en' })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        source: 'app-events',
        model: 'model-a-v1',
        schemaOnly: false,
        cached: false,
        queries: [expect.objectContaining({ id: 'generated_1' })],
        stats: expect.objectContaining({
          modelCalls: 2,
          inputTokens: 8500,
          outputTokens: 1800,
          queries: COUNTS,
        }),
      }),
    });
  });

  it('runs validation queries and the model call through the caller-scoped clients', async () => {
    const { core } = await callGenerate({ source: 'app-events' });
    const { model, run } = mockGenerate.mock.calls[0][0];
    core.elasticsearch.client.asCurrentUser.esql.query.mockResolvedValue({
      columns: [{ name: 'events', type: 'long' }],
      values: [[3]],
    });
    output.mockResolvedValue({ output: { questions: [] } });

    await expect(run({ query: 'FROM app-events | STATS events = COUNT(*)' })).resolves.toEqual({
      columns: [{ name: 'events', type: 'long' }],
      rowCount: 1,
    });
    await expect(
      model({
        id: 'analytics_source_generation',
        system: 's',
        input: 'i',
        schema: { type: 'object', properties: {} },
      })
    ).resolves.toEqual({ questions: [] });
    expect(core.elasticsearch.client.asInternalUser.esql.query).not.toHaveBeenCalled();
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'analytics_source_generation', system: 's', input: 'i' })
    );
  });

  it('withholds values when asked to, and always when the configuration says so', async () => {
    await callGenerate({ source: 'app-events', schemaOnly: true });
    expect(mockFetchProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ withValues: false })
    );

    register({ enabled: true, sampleValues: false });
    const { response } = await callGenerate({ source: 'app-events', schemaOnly: false });
    expect(mockFetchProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ withValues: false })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({ schemaOnly: true }),
    });
  });

  it('serves the kept answer to the same user, and generates anew for another user, mapping or mode', async () => {
    await callGenerate({ source: 'app-events' });
    const { response } = await callGenerate({ source: 'app-events' });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(response.ok).toHaveBeenCalledWith({ body: expect.objectContaining({ cached: true }) });
    // The source is still read as the caller before a kept answer is served.
    expect(mockFetchSchema).toHaveBeenCalledTimes(2);

    await callGenerate({ source: 'app-events' }, 'joe');
    expect(mockGenerate).toHaveBeenCalledTimes(2);

    mockFetchSchema.mockResolvedValue({ ...SCHEMA, mappingHash: 'hash-2' });
    await callGenerate({ source: 'app-events' });
    expect(mockGenerate).toHaveBeenCalledTimes(3);

    await callGenerate({ source: 'app-events', schemaOnly: true });
    await callGenerate({ source: 'app-events', useCaseId: 'iot' });
    expect(mockGenerate).toHaveBeenCalledTimes(5);
  });

  it('generates again when asked to refresh', async () => {
    await callGenerate({ source: 'app-events' });
    await callGenerate({ source: 'app-events', refresh: true });

    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['license', 403],
    ['noModel', 503],
    ['disabled', 503],
    ['agentBuilderMissing', 503],
  ] as const)(
    'refuses with the reason when generation is unavailable: %s',
    async (reason, statusCode) => {
      mockResolveModel.mockResolvedValue({ available: false, reason });

      const { response } = await callGenerate({ source: 'app-events' });

      expect(response.customError).toHaveBeenCalledWith({
        statusCode,
        body: { message: `Analytics cannot be generated: ${reason}`, attributes: { reason } },
      });
      expect(mockFetchSchema).not.toHaveBeenCalled();
      expect(mockGenerate).not.toHaveBeenCalled();
    }
  );

  it('answers 403 and 404 for a source the caller cannot read or that does not exist', async () => {
    mockFetchSchema.mockRejectedValueOnce(
      Object.assign(new Error('unauthorized'), { statusCode: 403 })
    );
    const forbidden = await callGenerate({ source: 'app-events' });
    mockFetchSchema.mockRejectedValueOnce(
      Object.assign(new Error('no such index'), { statusCode: 404 })
    );
    const missing = await callGenerate({ source: 'app-events' });

    expect(forbidden.response.forbidden).toHaveBeenCalledWith({
      body: { message: 'Insufficient privileges to read this event source' },
    });
    expect(missing.response.notFound).toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('answers 502 and logs when the model does not return the requested structure', async () => {
    mockGenerate.mockRejectedValue(new GenerationOutputError('not the structure'));

    const { response } = await callGenerate({ source: 'app-events' });

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 502,
      body: { message: 'Failed to generate analytics for the event source' },
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not the structure'));
  });

  it('logs other failures and keeps nothing of them', async () => {
    mockGenerate.mockRejectedValueOnce(
      Object.assign(new Error('rate limited'), { statusCode: 429 })
    );

    const failed = await callGenerate({ source: 'app-events' });
    const retried = await callGenerate({ source: 'app-events' });

    expect(failed.response.customError).toHaveBeenCalledWith({
      statusCode: 429,
      body: { message: 'Failed to generate analytics for the event source' },
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('rate limited'));
    expect(retried.response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({ cached: false }),
    });
  });
});
