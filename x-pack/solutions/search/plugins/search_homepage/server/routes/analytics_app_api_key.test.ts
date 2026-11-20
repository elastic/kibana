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
import { registerAnalyticsAppApiKeyRoutes } from './analytics_app_api_key';

const PATH = '/internal/search_homepage/analytics/app_api_key';

interface IndexInput {
  index: string;
}

describe('registerAnalyticsAppApiKeyRoutes', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let core: ReturnType<typeof coreMock.createRequestHandlerContext>;

  const getClient = () => core.elasticsearch.client.asCurrentUser;
  const getApiKeys = () => core.security.authc.apiKeys;

  const grant = ({
    canManageOwnKeys = true,
    canRead = true,
    index = 'app-events',
  }: { canManageOwnKeys?: boolean; canRead?: boolean; index?: string } = {}): void => {
    getClient().security.hasPrivileges.mockResolvedValue({
      username: 'founder',
      has_all_requested: canManageOwnKeys && canRead,
      cluster: { manage_own_api_key: canManageOwnKeys },
      index: { [index]: { read: canRead } },
      application: {},
    });
  };

  const call = (method: 'get' | 'post', index = 'app-events') => {
    const context = coreMock.createCustomRequestHandlerContext({ core: Promise.resolve(core) });
    const response = httpServerMock.createResponseFactory();
    const result =
      method === 'get'
        ? router.get.mock.calls[0][1](
            context,
            httpServerMock.createKibanaRequest({ query: { index } }),
            response
          )
        : router.post.mock.calls[0][1](
            context,
            httpServerMock.createKibanaRequest({ body: { index } }),
            response
          );

    return { response, result };
  };

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    logger = loggingSystemMock.createLogger();
    core = coreMock.createRequestHandlerContext();
    getApiKeys().areAPIKeysEnabled.mockResolvedValue(true);
    getApiKeys().create.mockResolvedValue({
      id: 'key-id',
      name: 'analytics-app-read-app-events',
      api_key: 'secret',
      encoded: 'a2V5LWlkOnNlY3JldA==',
    });
    grant();
    registerAnalyticsAppApiKeyRoutes(router, logger);
  });

  it.each(['get', 'post'] as const)(
    'registers an internal %s route that delegates authorization to Elasticsearch',
    (method) => {
      expect(router[method].mock.calls[0][0]).toMatchObject({
        path: PATH,
        options: { access: 'internal' },
        security: { authz: { enabled: false, reason: expect.stringContaining('as the caller') } },
      });
    }
  );

  it.each([
    ['get', 'query'],
    ['post', 'body'],
  ] as const)('accepts the name of one index or data stream in the %s %s', (method, part) => {
    const { validate } = router[method].mock.calls[0][0];
    const input = (validate as RouteValidatorConfig<unknown, IndexInput, IndexInput>)[
      part
    ] as Type<IndexInput>;

    expect(input.validate({ index: 'logs-nginx.access-default' })).toEqual({
      index: 'logs-nginx.access-default',
    });
    expect(() => input.validate({})).toThrow();
    expect(() => input.validate({ index: '' })).toThrow();
    expect(() => input.validate({ index: '*' })).toThrow(/one index or data stream/);
    expect(() => input.validate({ index: 'app-*' })).toThrow(/invalidCharacters/);
    expect(() => input.validate({ index: 'events,orders' })).toThrow(/invalidCharacters/);
    expect(() => input.validate({ index: 'remote:events' })).toThrow(/invalidCharacters/);
    expect(() => input.validate({ index: '/regex/' })).toThrow(/invalidCharacters/);
    expect(() => input.validate({ index: '.security' })).toThrow(/invalidStart/);
    expect(() => input.validate({ index: '-events' })).toThrow(/invalidStart/);
    expect(() => input.validate({ index: 'a'.repeat(256) })).toThrow();
    expect(() => input.validate({ index: 'events', privileges: ['all'] })).toThrow();
  });

  describe('GET', () => {
    it('says a key can be created after checking the caller and the source', async () => {
      const { response, result } = call('get');
      await result;

      expect(getClient().security.hasPrivileges).toHaveBeenCalledWith({
        cluster: ['manage_own_api_key'],
        index: [{ names: ['app-events'], privileges: ['read'] }],
      });
      expect(getClient().search).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'app-events', size: 0 })
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { canCreate: true } });
      expect(getApiKeys().create).not.toHaveBeenCalled();
    });

    it.each([
      [
        'API keys are disabled',
        () => getApiKeys().areAPIKeysEnabled.mockResolvedValue(false),
        'apiKeysDisabled',
      ],
      [
        'the caller may not create API keys',
        () => grant({ canManageOwnKeys: false }),
        'missingApiKeyPrivilege',
      ],
      [
        'the caller may not read the source',
        () => grant({ canRead: false }),
        'missingReadPrivilege',
      ],
      [
        'the source is gone',
        () =>
          getClient().search.mockRejectedValue(
            Object.assign(new Error('no such index'), { statusCode: 404 })
          ),
        'sourceNotFound',
      ],
    ])('gives the reason when %s', async (_, arrange, reason) => {
      arrange();

      const { response, result } = call('get');
      await result;

      expect(response.ok).toHaveBeenCalledWith({ body: { canCreate: false, reason } });
    });

    it('logs a failed check and answers with its status', async () => {
      getClient().security.hasPrivileges.mockRejectedValue(
        Object.assign(new Error('boom'), { statusCode: 503 })
      );

      const { response, result } = call('get');
      await result;

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: { message: 'Failed to check whether an API key can be created' },
      });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });
  });

  describe('POST', () => {
    it('creates a key as the caller that can only read the source', async () => {
      const { result } = call('post');
      await result;

      expect(getApiKeys().create).toHaveBeenCalledTimes(1);
      expect(getApiKeys().create).toHaveBeenCalledWith({
        name: 'analytics-app-read-app-events',
        role_descriptors: {
          analytics_app_read: {
            cluster: [],
            indices: [{ names: ['app-events'], privileges: ['read'] }],
          },
        },
        metadata: { created_by: 'search_homepage', source: 'app-events' },
      });
      expect(core.elasticsearch.client.asInternalUser.security.createApiKey).not.toHaveBeenCalled();
    });

    it('answers with the id, the name and the encoded key, and logs none of them', async () => {
      const { response, result } = call('post');
      await result;

      expect(response.ok).toHaveBeenCalledWith({
        body: {
          id: 'key-id',
          name: 'analytics-app-read-app-events',
          encoded: 'a2V5LWlkOnNlY3JldA==',
        },
      });
      expect(loggingSystemMock.collect(logger)).toEqual(
        loggingSystemMock.collect(loggingSystemMock.createLogger())
      );
    });

    it.each([
      [
        'API keys are disabled',
        () => getApiKeys().areAPIKeysEnabled.mockResolvedValue(false),
        400,
        'apiKeysDisabled',
        'API keys are disabled in Elasticsearch',
      ],
      [
        'the caller may not create API keys',
        () => grant({ canManageOwnKeys: false }),
        403,
        'missingApiKeyPrivilege',
        'your role needs the manage_own_api_key cluster privilege',
      ],
      [
        'the caller may not read the source',
        () => grant({ canRead: false }),
        403,
        'missingReadPrivilege',
        'your role needs the read index privilege on the source',
      ],
      [
        'the source is gone',
        () =>
          getClient().search.mockRejectedValue(
            Object.assign(new Error('no such index'), { statusCode: 404 })
          ),
        404,
        'sourceNotFound',
        'the source does not exist',
      ],
    ])('creates nothing when %s', async (_, arrange, statusCode, reason, message) => {
      arrange();

      const { response, result } = call('post');
      await result;

      expect(getApiKeys().create).not.toHaveBeenCalled();
      expect(response.customError).toHaveBeenCalledWith({
        statusCode,
        body: { message: `Failed to create the API key: ${message}`, attributes: { reason } },
      });
    });

    it('answers 403 with the privilege needed when Elasticsearch refuses the key', async () => {
      getApiKeys().create.mockRejectedValue(
        Object.assign(new Error('unauthorized'), { statusCode: 403 })
      );

      const { response, result } = call('post');
      await result;

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 403,
        body: {
          message:
            'Failed to create the API key: your role needs the manage_own_api_key cluster privilege',
          attributes: { reason: 'missingApiKeyPrivilege' },
        },
      });
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('unauthorized'));
    });

    it('answers 400 when the API keys service reports that keys are disabled', async () => {
      getApiKeys().create.mockResolvedValue(null);

      const { response, result } = call('post');
      await result;

      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          body: expect.objectContaining({ attributes: { reason: 'apiKeysDisabled' } }),
        })
      );
    });

    it.each([
      ['a role descriptor Elasticsearch rejects', { statusCode: 400 }, 400],
      ['an Elasticsearch failure', { statusCode: 503 }, 503],
      ['an unexpected error', {}, 500],
    ])('logs %s and answers with its status', async (_, properties, statusCode) => {
      getApiKeys().create.mockRejectedValue(Object.assign(new Error('boom'), properties));

      const { response, result } = call('post');
      await result;

      expect(response.customError).toHaveBeenCalledWith({
        statusCode,
        body: { message: 'Failed to create the API key' },
      });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });

    it('keeps the key name within the length Elasticsearch accepts', async () => {
      const index = 'a'.repeat(255);
      grant({ index });

      const { result } = call('post', index);
      await result;

      const [{ name }] = getApiKeys().create.mock.calls[0];
      expect(name).toHaveLength(256);
      expect(name.startsWith('analytics-app-read-aaa')).toBe(true);
    });
  });
});
