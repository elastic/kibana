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
  ensureLocalElasticsearchConnector,
  resolveLocalElasticsearchUrl,
} from './local_elasticsearch_connector';

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

const createActionsClient = (
  connectors: Array<{ id: string; actionTypeId: string; config?: Record<string, unknown> }> = []
) => {
  const actionsClient = actionsClientMock.create();
  actionsClient.getAll.mockResolvedValue(connectors as never);
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

describe('ensureLocalElasticsearchConnector', () => {
  const logger = loggingSystemMock.createLogger();

  it("reuses the space's Elasticsearch connector pointing at the local URL", async () => {
    const { esClient, createApiKey } = createEsClient();
    const actionsClient = createActionsClient([
      { id: 'slack', actionTypeId: '.slack', config: {} },
      { id: 'remote', actionTypeId: '.elasticsearch', config: { url: 'https://other:9243' } },
      { id: 'local', actionTypeId: '.elasticsearch', config: { url: `${URL}/` } },
    ]);

    const connectorId = await ensureLocalElasticsearchConnector({
      esClient,
      actionsClient,
      spaceId: 'space-1',
      url: URL,
      logger,
    });

    expect(connectorId).toBe('local');
    expect(actionsClient.getAll).toHaveBeenCalledWith({
      includeSystemActions: false,
      sandboxCapableOnly: true,
    });
    expect(createApiKey).not.toHaveBeenCalled();
    expect(actionsClient.create).not.toHaveBeenCalled();
  });

  it('creates a read-only, non-expiring key as the current user and stores it in a new connector', async () => {
    const { esClient, createApiKey } = createEsClient();
    // Connectors for other clusters, or without a URL, do not count as the local one.
    const actionsClient = createActionsClient([
      { id: 'remote', actionTypeId: '.elasticsearch', config: { url: 'https://other:9243' } },
      { id: 'broken', actionTypeId: '.elasticsearch', config: {} },
    ]);

    const connectorId = await ensureLocalElasticsearchConnector({
      esClient,
      actionsClient,
      spaceId: 'space-1',
      url: URL,
      logger,
    });

    expect(connectorId).toBe('connector-1');
    expect(createApiKey).toHaveBeenCalledWith({
      name: 'nightshift-local-elasticsearch-space-1',
      role_descriptors: {
        nightshift_local_read: {
          cluster: [],
          indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
        },
      },
      metadata: { managed: true, application: 'nightshift', space_id: 'space-1' },
    });
    expect(createApiKey.mock.calls[0][0]).not.toHaveProperty('expiration');
    expect(actionsClient.create).toHaveBeenCalledWith({
      action: {
        actionTypeId: '.elasticsearch',
        name: 'Local Elasticsearch',
        config: { url: URL },
        secrets: { authType: 'api_key_header', Authorization: 'ApiKey ZW5jb2RlZA==' },
      },
    });
  });

  it('invalidates the key when the connector cannot be created', async () => {
    const { esClient, invalidateApiKey } = createEsClient();
    const actionsClient = createActionsClient();
    actionsClient.create.mockRejectedValue(new Error('license'));

    await expect(
      ensureLocalElasticsearchConnector({ esClient, actionsClient, spaceId: 's', url: URL, logger })
    ).rejects.toThrow('license');
    expect(invalidateApiKey).toHaveBeenCalledWith({ ids: ['key-1'] });
  });

  it('turns an Elasticsearch refusal into a client error with its reason', async () => {
    const { esClient, createApiKey, invalidateApiKey } = createEsClient();
    const reason = 'creating derived api keys requires an explicit role descriptor that is empty';
    createApiKey.mockRejectedValue(responseError(400, reason));
    const actionsClient = createActionsClient();

    await expect(
      ensureLocalElasticsearchConnector({ esClient, actionsClient, spaceId: 's', url: URL, logger })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
      message: expect.stringContaining(reason),
    });

    createApiKey.mockRejectedValue(responseError(403, 'unauthorized'));
    await expect(
      ensureLocalElasticsearchConnector({ esClient, actionsClient, spaceId: 's', url: URL, logger })
    ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 403 } });

    expect(actionsClient.create).not.toHaveBeenCalled();
    expect(invalidateApiKey).not.toHaveBeenCalled();
  });

  it('passes other Elasticsearch errors through', async () => {
    const { esClient, createApiKey } = createEsClient();
    createApiKey.mockRejectedValue(responseError(503, 'unavailable'));

    await expect(
      ensureLocalElasticsearchConnector({
        esClient,
        actionsClient: createActionsClient(),
        spaceId: 's',
        url: URL,
        logger,
      })
    ).rejects.toBeInstanceOf(errors.ResponseError);
  });
});
