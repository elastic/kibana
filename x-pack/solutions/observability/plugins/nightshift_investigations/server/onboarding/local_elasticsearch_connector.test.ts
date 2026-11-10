/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { OnboardingUnavailableError } from './errors';
import {
  createLocalElasticsearchConnector,
  createLocalElasticsearchConnectorLifecycleListener,
  resolveLocalElasticsearchUrl,
} from './local_elasticsearch_connector';

jest.mock('uuid', () => ({ ...jest.requireActual('uuid'), v4: () => 'connector-1' }));

const URL = 'https://es.example.com:9243';

const createEsClient = () => {
  const createApiKey = jest
    .fn()
    .mockResolvedValue({ id: 'key-1', name: 'n', api_key: 'raw', encoded: 'ZW5jb2RlZA==' });
  const invalidateApiKey = jest.fn().mockResolvedValue({});
  return {
    esClient: { security: { createApiKey, invalidateApiKey } } as unknown as ElasticsearchClient,
    createApiKey,
    invalidateApiKey,
  };
};

const createActionsClient = () => {
  const actionsClient = actionsClientMock.create();
  actionsClient.create.mockResolvedValue({ id: 'connector-1' } as never);
  return actionsClient;
};

const responseError = (statusCode: number, reason: string) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type: 'illegal_argument_exception', reason } },
    warnings: null,
    headers: {},
    meta: {} as never,
  });

describe('resolveLocalElasticsearchUrl', () => {
  it('prefers the cloud URL, then the public base URL, then the configured hosts', () => {
    expect(
      resolveLocalElasticsearchUrl({
        cloud: { elasticsearchUrl: 'https://cloud:9243/' },
        elasticsearch: { publicBaseUrl: 'https://public:9243' },
        esHosts: ['http://localhost:9200'],
      })
    ).toBe('https://cloud:9243');
    expect(
      resolveLocalElasticsearchUrl({
        cloud: { elasticsearchUrl: undefined },
        elasticsearch: { publicBaseUrl: 'https://public:9243' },
        esHosts: ['http://localhost:9200'],
      })
    ).toBe('https://public:9243');
    expect(resolveLocalElasticsearchUrl({ esHosts: ['http://localhost:9200'] })).toBe(
      'http://localhost:9200'
    );
  });

  it('strips credentials from the configured hosts', () => {
    expect(
      resolveLocalElasticsearchUrl({ esHosts: ['http://elastic:changeme@localhost:9200'] })
    ).toBe('http://localhost:9200');
  });

  it('fails when no URL is configured', () => {
    expect(() => resolveLocalElasticsearchUrl({})).toThrow(OnboardingUnavailableError);
    expect(() => resolveLocalElasticsearchUrl({ esHosts: ['not a url'] })).toThrow(
      OnboardingUnavailableError
    );
  });
});

describe('createLocalElasticsearchConnector', () => {
  const logger = loggingSystemMock.createLogger();

  it('creates a read-only, non-expiring key as the current user and stores it in a new connector', async () => {
    const { esClient, createApiKey } = createEsClient();
    const actionsClient = createActionsClient();

    const connectorId = await createLocalElasticsearchConnector({
      esClient,
      actionsClient,
      spaceId: 'space-1',
      url: URL,
      logger,
    });

    expect(connectorId).toBe('connector-1');
    expect(createApiKey).toHaveBeenCalledWith({
      name: 'nightshift-local-elasticsearch-connector-1',
      role_descriptors: {
        nightshift_local_read: {
          cluster: ['cluster:monitor/main', 'cluster:monitor/remote/info'],
          indices: [
            {
              names: ['logs-*', 'metrics-*', 'traces-*'],
              privileges: ['read', 'view_index_metadata'],
              allow_restricted_indices: false,
            },
          ],
        },
      },
      metadata: {
        managed: true,
        application: 'nightshift',
        space_id: 'space-1',
        connector_id: 'connector-1',
      },
    });
    expect(createApiKey.mock.calls[0][0]).not.toHaveProperty('expiration');
    expect(actionsClient.create).toHaveBeenCalledWith({
      options: { id: 'connector-1' },
      action: {
        actionTypeId: '.elasticsearch',
        name: 'Local Elasticsearch',
        config: { url: URL, selectedActions: ['_test'] },
        secrets: { authType: 'api_key_header', Authorization: 'ApiKey ZW5jb2RlZA==' },
      },
    });
    expect(actionsClient.getAll).not.toHaveBeenCalled();
  });

  it('invalidates the key when the connector cannot be created', async () => {
    const { esClient, invalidateApiKey } = createEsClient();
    const actionsClient = createActionsClient();
    actionsClient.create.mockRejectedValue(new Error('license'));

    await expect(
      createLocalElasticsearchConnector({ esClient, actionsClient, spaceId: 's', url: URL, logger })
    ).rejects.toThrow('license');
    expect(invalidateApiKey).toHaveBeenCalledWith({ ids: ['key-1'] });
  });

  it('turns an Elasticsearch refusal into a client error with its reason', async () => {
    const { esClient, createApiKey, invalidateApiKey } = createEsClient();
    const reason = 'creating derived api keys requires an explicit role descriptor that is empty';
    createApiKey.mockRejectedValue(responseError(400, reason));
    const actionsClient = createActionsClient();

    await expect(
      createLocalElasticsearchConnector({ esClient, actionsClient, spaceId: 's', url: URL, logger })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      message: expect.stringContaining(reason),
    });

    createApiKey.mockRejectedValue(responseError(403, 'unauthorized'));
    await expect(
      createLocalElasticsearchConnector({ esClient, actionsClient, spaceId: 's', url: URL, logger })
    ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 403 } });

    expect(actionsClient.create).not.toHaveBeenCalled();
    expect(invalidateApiKey).not.toHaveBeenCalled();
  });

  it('passes other Elasticsearch errors through', async () => {
    const { esClient, createApiKey } = createEsClient();
    createApiKey.mockRejectedValue(responseError(503, 'unavailable'));

    await expect(
      createLocalElasticsearchConnector({
        esClient,
        actionsClient: createActionsClient(),
        spaceId: 's',
        url: URL,
        logger,
      })
    ).rejects.toBeInstanceOf(errors.ResponseError);
  });
});

describe('createLocalElasticsearchConnectorLifecycleListener', () => {
  const connectorId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const paramsFor = (id: string) => ({ connectorId: id, connectorType: '.elasticsearch' } as never);
  const deleteParams = paramsFor(connectorId);

  const setup = () => {
    const logger = loggingSystemMock.createLogger();
    const invalidateApiKey = jest
      .fn()
      .mockResolvedValue({ invalidated_api_keys: ['key-1'], error_count: 0 });
    const esClient = { security: { invalidateApiKey } } as unknown as ElasticsearchClient;
    const listener = createLocalElasticsearchConnectorLifecycleListener({
      getInternalEsClient: async () => esClient,
      logger,
    });
    return { listener, invalidateApiKey, logger };
  };

  it('only listens to Elasticsearch connectors', () => {
    expect(setup().listener.connectorTypes).toEqual(['.elasticsearch']);
  });

  it("invalidates the deleted connector's key by name", async () => {
    const { listener, invalidateApiKey, logger } = setup();

    await listener.onPostDelete!(deleteParams);

    expect(invalidateApiKey).toHaveBeenCalledWith({
      name: `nightshift-local-elasticsearch-${connectorId}`,
    });
    expect(logger.info).toHaveBeenCalled();
  });

  it.each(['*', 'nightshift-*', 'my-connector'])(
    'ignores connectors whose id onboarding could not have generated, such as "%s"',
    async (id) => {
      const { listener, invalidateApiKey } = setup();

      await listener.onPostDelete!(paramsFor(id));

      expect(invalidateApiKey).not.toHaveBeenCalled();
    }
  );

  it('does not log an invalidation when the connector had no key', async () => {
    const { listener, invalidateApiKey, logger } = setup();
    invalidateApiKey.mockResolvedValue({ invalidated_api_keys: [], error_count: 0 });

    await listener.onPostDelete!(deleteParams);

    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs the failures Elasticsearch reports in a successful invalidation response', async () => {
    const { listener, invalidateApiKey, logger } = setup();
    invalidateApiKey.mockResolvedValue({
      invalidated_api_keys: [],
      error_count: 1,
      error_details: [{ type: 'exception', reason: 'key is owned by another realm' }],
    });

    await listener.onPostDelete!(deleteParams);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('key is owned by another realm')
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs and does not throw when the key cannot be invalidated', async () => {
    const { listener, invalidateApiKey, logger } = setup();
    invalidateApiKey.mockRejectedValue(new Error('unavailable'));

    await expect(listener.onPostDelete!(deleteParams)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unavailable'));
  });
});
