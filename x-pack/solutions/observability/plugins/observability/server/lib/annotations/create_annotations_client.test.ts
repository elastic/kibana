/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { DEFAULT_ANNOTATION_INDEX } from '../../../common/annotations';
import { createAnnotationsClient } from './create_annotations_client';

const FORBIDDEN_MESSAGE = 'Annotations require at least a gold license or a trial license.';

const baseAnnotation = {
  annotation: { type: 'deployment' },
  '@timestamp': '2026-05-20T00:00:00.000Z',
  message: 'test message',
  tags: ['apm'],
};

const buildClient = ({
  license,
}: {
  license?: ReturnType<typeof licensingMock.createLicenseMock>;
} = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();

  return {
    esClient,
    client: createAnnotationsClient({
      index: DEFAULT_ANNOTATION_INDEX,
      esClient,
      logger,
      license,
    }),
  };
};

const mockHasPrivileges = (
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>
) => {
  esClient.security.hasPrivileges.mockResponse({
    username: 'elastic',
    has_all_requested: true,
    cluster: {},
    index: {
      [DEFAULT_ANNOTATION_INDEX]: { read: true, write: true },
    },
    application: {},
  });
};

describe('createAnnotationsClient', () => {
  describe('license guard', () => {
    // The license guard throws synchronously before the wrapped async function runs,
    // so we await an already-resolved promise then invoke the call inside the .then,
    // turning the sync throw into a rejection we can inspect.
    const captureError = async (fn: () => unknown) => {
      try {
        await Promise.resolve().then(fn);
      } catch (error) {
        return error;
      }
      throw new Error('Expected the call to throw a forbidden error');
    };

    const expectForbidden = (error: any) => {
      expect(error).toBeDefined();
      expect(error.isBoom).toBe(true);
      expect(error.output.statusCode).toBe(403);
      expect(error.output.payload).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: FORBIDDEN_MESSAGE,
      });
    };

    it.each(['create', 'update', 'getById', 'find', 'delete'] as const)(
      'rejects %s with a forbidden error when the license is missing',
      async (method) => {
        const { client, esClient } = buildClient();

        const error = await captureError(() =>
          (client[method] as (params: unknown) => Promise<unknown>)({})
        );
        expectForbidden(error);

        expect(esClient.index).not.toHaveBeenCalled();
        expect(esClient.search).not.toHaveBeenCalled();
        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      }
    );

    it.each(['create', 'update', 'getById', 'find', 'delete'] as const)(
      'rejects %s with a forbidden error when the license is below gold',
      async (method) => {
        const license = licensingMock.createLicenseMock();
        license.hasAtLeast.mockReturnValue(false);

        const { client } = buildClient({ license });

        const error = await captureError(() =>
          (client[method] as (params: unknown) => Promise<unknown>)({})
        );
        expectForbidden(error);

        expect(license.hasAtLeast).toHaveBeenCalledWith('gold');
      }
    );

    it('lets create proceed past the license guard when the license is gold or higher', async () => {
      const license = licensingMock.createLicenseMock();
      license.hasAtLeast.mockReturnValue(true);

      const { client, esClient } = buildClient({ license });

      esClient.index.mockResponse({
        _id: 'annotation-1',
        _index: DEFAULT_ANNOTATION_INDEX,
        _shards: { total: 1, successful: 1, failed: 0 },
        result: 'created',
        _version: 1,
        _seq_no: 0,
        _primary_term: 1,
      });

      await expect(client.create(baseAnnotation)).resolves.toEqual({
        _id: 'annotation-1',
        _index: DEFAULT_ANNOTATION_INDEX,
        _source: expect.objectContaining({
          message: 'test message',
          annotation: expect.objectContaining({ type: 'deployment', title: 'test message' }),
        }),
      });

      expect(license.hasAtLeast).toHaveBeenCalledWith('gold');
      expect(esClient.index).toHaveBeenCalledTimes(1);
    });
  });

  describe('permissions', () => {
    it('reports hasGoldLicense: false when the license is below gold', async () => {
      const license = licensingMock.createLicenseMock();
      license.hasAtLeast.mockReturnValue(false);

      const { client, esClient } = buildClient({ license });
      mockHasPrivileges(esClient);

      const permissions = await client.permissions();

      expect(permissions).toEqual({
        index: DEFAULT_ANNOTATION_INDEX,
        hasGoldLicense: false,
        read: true,
        write: true,
      });
    });

    it('reports hasGoldLicense: false when no license is provided', async () => {
      const { client, esClient } = buildClient();
      mockHasPrivileges(esClient);

      const permissions = await client.permissions();

      expect(permissions.hasGoldLicense).toBe(false);
    });

    it('reports hasGoldLicense: true when the license is gold or higher', async () => {
      const license = licensingMock.createLicenseMock();
      license.hasAtLeast.mockReturnValue(true);

      const { client, esClient } = buildClient({ license });
      mockHasPrivileges(esClient);

      const permissions = await client.permissions();

      expect(permissions.hasGoldLicense).toBe(true);
    });
  });
});
