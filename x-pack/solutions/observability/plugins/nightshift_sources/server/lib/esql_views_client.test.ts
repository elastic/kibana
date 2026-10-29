/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createEsResponseError } from './es_errors.mock';
import { EsqlViewsClient } from './esql_views_client';

const VIEW_NAME = '$.nightshift.sources.default.a';

describe('EsqlViewsClient', () => {
  const setup = () => {
    // Two distinct clients so each test can prove which identity a call ran as.
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const internalEsClient = elasticsearchServiceMock.createElasticsearchClient();
    const client = new EsqlViewsClient({
      userEsClient: esClient,
      internalEsClient,
      retryBaseDelayMs: 1,
    });
    return { esClient, internalEsClient, client };
  };

  describe('getView', () => {
    it('returns the view when ES answers with it', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockResponse({ views: [{ name: VIEW_NAME, query: 'FROM logs-*' }] });

      await expect(client.getView(VIEW_NAME)).resolves.toEqual({
        name: VIEW_NAME,
        query: 'FROM logs-*',
      });
      expect(esClient.esql.getView).toHaveBeenCalledWith({ name: VIEW_NAME }, { ignore: [404] });
    });

    it('reads as the current user and never as the internal user', async () => {
      const { internalEsClient, esClient, client } = setup();
      esClient.esql.getView.mockResponse({ views: [] });

      await client.getView(VIEW_NAME);

      expect(internalEsClient.esql.getView).not.toHaveBeenCalled();
    });

    it('returns undefined when ES answers 200 with no views', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockResponse({ views: [] });

      await expect(client.getView(VIEW_NAME)).resolves.toBeUndefined();
    });

    it('returns undefined when the ignored 404 body comes back instead of a view list', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockResponse({
        error: { type: 'resource_not_found_exception', reason: 'no such view' },
        status: 404,
      } as never);

      await expect(client.getView(VIEW_NAME)).resolves.toBeUndefined();
    });

    it('maps a 403 to a Boom forbidden error', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockRejectedValue(
        createEsResponseError(403, 'security_exception', 'unauthorized for user')
      );

      await expect(client.getView(VIEW_NAME)).rejects.toMatchObject({
        output: { statusCode: 403 },
        message: expect.stringContaining('unauthorized for user'),
      });
    });
  });

  describe('putView', () => {
    it('writes as the internal user and never as the current user', async () => {
      const { esClient, internalEsClient, client } = setup();
      internalEsClient.esql.putView.mockResponse({ acknowledged: true });

      await client.putView(VIEW_NAME, 'FROM logs-*');

      expect(internalEsClient.esql.putView).toHaveBeenCalledTimes(1);
      expect(esClient.esql.putView).not.toHaveBeenCalled();
    });

    it('retries a 409 and succeeds', async () => {
      const { internalEsClient, client } = setup();
      internalEsClient.esql.putView
        .mockRejectedValueOnce(
          createEsResponseError(409, 'concurrent_modification_exception', 'busy')
        )
        .mockResponseOnce({ acknowledged: true });

      await expect(client.putView(VIEW_NAME, 'FROM logs-*')).resolves.toBeUndefined();
      expect(internalEsClient.esql.putView).toHaveBeenCalledTimes(2);
      expect(internalEsClient.esql.putView).toHaveBeenCalledWith({
        name: VIEW_NAME,
        query: 'FROM logs-*',
      });
    });

    it('does not retry a 400 and maps it to Boom badRequest', async () => {
      const { internalEsClient, client } = setup();
      internalEsClient.esql.putView.mockRejectedValue(
        createEsResponseError(400, 'parsing_exception', 'bad query')
      );

      await expect(client.putView(VIEW_NAME, 'FROM |')).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('bad query'),
      });
      expect(internalEsClient.esql.putView).toHaveBeenCalledTimes(1);
    });

    it('gives up after three retryable failures', async () => {
      const { internalEsClient, client } = setup();
      internalEsClient.esql.putView.mockRejectedValue(
        createEsResponseError(409, 'concurrent_modification_exception', 'busy')
      );

      const error = await client.putView(VIEW_NAME, 'FROM logs-*').catch((e) => e);
      expect(isBoom(error)).toBe(true);
      expect(error.output.statusCode).toBe(409);
      expect(internalEsClient.esql.putView).toHaveBeenCalledTimes(3);
    });
  });

  describe('deleteView', () => {
    it('deletes as the internal user and never as the current user', async () => {
      const { esClient, internalEsClient, client } = setup();
      internalEsClient.esql.deleteView.mockResponse({ acknowledged: true });

      await client.deleteView(VIEW_NAME);

      expect(internalEsClient.esql.deleteView).toHaveBeenCalledTimes(1);
      expect(esClient.esql.deleteView).not.toHaveBeenCalled();
    });

    it('ignores a missing view', async () => {
      const { internalEsClient, client } = setup();
      internalEsClient.esql.deleteView.mockResponse({ acknowledged: true });

      await expect(client.deleteView(VIEW_NAME)).resolves.toBeUndefined();
      expect(internalEsClient.esql.deleteView).toHaveBeenCalledWith(
        { name: VIEW_NAME },
        { ignore: [404] }
      );
    });
  });
});
