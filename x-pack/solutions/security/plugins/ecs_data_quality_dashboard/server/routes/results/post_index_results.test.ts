/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { POST_INDEX_RESULTS } from '../../../common/constants';

import { serverMock } from '../../__mocks__/server';
import { requestMock } from '../../__mocks__/request';
import { requestContextMock } from '../../__mocks__/request_context';
import { postIndexResultsRoute } from './post_index_results';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { resultDocument } from './results.mock';
import type { CheckIndicesPrivilegesParam } from './privileges';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { API_CURRENT_USER_ERROR_MESSAGE } from '../../translations';

const mockCheckIndicesPrivileges = jest.fn(({ indices }: CheckIndicesPrivilegesParam) =>
  Promise.resolve(Object.fromEntries(indices.map((index) => [index, true])))
);
jest.mock('./privileges', () => ({
  checkIndicesPrivileges: (params: CheckIndicesPrivilegesParam) =>
    mockCheckIndicesPrivileges(params),
}));

const USER_PROFILE_UID = 'mocked_profile_uid';

describe('postIndexResultsRoute route', () => {
  describe('indexation', () => {
    let server: ReturnType<typeof serverMock.create>;
    let { context } = requestContextMock.createTools();
    let logger: MockedLogger;

    const req = requestMock.create({
      method: 'post',
      path: POST_INDEX_RESULTS,
      body: resultDocument,
    });

    beforeEach(() => {
      jest.clearAllMocks();

      server = serverMock.create();
      logger = loggerMock.create();

      ({ context } = requestContextMock.createTools());

      context.core.elasticsearch.client.asInternalUser.indices.get.mockResolvedValue({
        [resultDocument.indexName]: {},
      });
      context.core.security.authc.getCurrentUser.mockReturnValue({
        profile_uid: USER_PROFILE_UID,
      } as AuthenticatedUser);
      postIndexResultsRoute(server.router, logger);
    });

    it('indexes result', async () => {
      const mockIndex = context.core.elasticsearch.client.asInternalUser.index;
      mockIndex.mockResolvedValueOnce({ result: 'created' } as WriteResponseBase);

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockIndex).toHaveBeenCalledWith({
        body: { ...resultDocument, '@timestamp': expect.any(Number), checkedBy: USER_PROFILE_UID },
        index: await context.dataQualityDashboard.getResultsIndexName(),
      });

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ result: 'created' });
    });

    it('handles results data stream error', async () => {
      const errorMessage = 'Installation Error!';
      context.dataQualityDashboard.getResultsIndexName.mockRejectedValueOnce(
        new Error(errorMessage)
      );
      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(response.status).toEqual(503);
      expect(response.body).toEqual({
        message: expect.stringContaining(errorMessage),
        status_code: 503,
      });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });

    it('handles index error', async () => {
      const errorMessage = 'Error!';
      const mockIndex = context.core.elasticsearch.client.asInternalUser.index;
      mockIndex.mockRejectedValueOnce({ message: errorMessage });

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
    });

    it('handles current user retrieval error', async () => {
      context.core.security.authc.getCurrentUser.mockReturnValueOnce(null);

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: API_CURRENT_USER_ERROR_MESSAGE, status_code: 500 });
    });
  });

  describe('request index authorization', () => {
    let server: ReturnType<typeof serverMock.create>;
    let { context } = requestContextMock.createTools();
    let logger: MockedLogger;

    const req = requestMock.create({
      method: 'post',
      path: POST_INDEX_RESULTS,
      body: resultDocument,
    });

    beforeEach(() => {
      jest.clearAllMocks();

      server = serverMock.create();
      logger = loggerMock.create();

      ({ context } = requestContextMock.createTools());

      context.core.security.authc.getCurrentUser.mockReturnValue({
        profile_uid: USER_PROFILE_UID,
      } as AuthenticatedUser);
      context.core.elasticsearch.client.asInternalUser.indices.get.mockResolvedValue({
        [resultDocument.indexName]: {},
      });
      context.core.elasticsearch.client.asInternalUser.index.mockResolvedValueOnce({
        result: 'created',
      } as WriteResponseBase);

      postIndexResultsRoute(server.router, logger);
    });

    it('should authorize index', async () => {
      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockCheckIndicesPrivileges).toHaveBeenCalledWith({
        client: context.core.elasticsearch.client,
        indices: [resultDocument.indexName],
      });
      expect(context.core.elasticsearch.client.asInternalUser.index).toHaveBeenCalled();
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ result: 'created' });
    });

    it('should authorize data stream', async () => {
      const dataStreamName = 'test_data_stream_name';
      context.core.elasticsearch.client.asInternalUser.indices.get.mockResolvedValue({
        [resultDocument.indexName]: { data_stream: dataStreamName },
      });
      mockCheckIndicesPrivileges.mockResolvedValueOnce({ [dataStreamName]: true });

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockCheckIndicesPrivileges).toHaveBeenCalledWith({
        client: context.core.elasticsearch.client,
        indices: [dataStreamName],
      });
      expect(context.core.elasticsearch.client.asInternalUser.index).toHaveBeenCalled();
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ result: 'created' });
    });

    it('should not index unauthorized index', async () => {
      mockCheckIndicesPrivileges.mockResolvedValueOnce({ [resultDocument.indexName]: false });

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(mockCheckIndicesPrivileges).toHaveBeenCalledWith({
        client: context.core.elasticsearch.client,
        indices: [resultDocument.indexName],
      });
      expect(context.core.elasticsearch.client.asInternalUser.index).not.toHaveBeenCalled();

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ result: 'noop' });
    });

    it('handles index authorization error', async () => {
      const errorMessage = 'Error!';
      mockCheckIndicesPrivileges.mockRejectedValueOnce(Error(errorMessage));

      const response = await server.inject(req, requestContextMock.convertContext(context));
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: errorMessage, status_code: 500 });
    });
  });

  describe('request validation', () => {
    let server: ReturnType<typeof serverMock.create>;
    let logger: MockedLogger;
    beforeEach(() => {
      server = serverMock.create();
      logger = loggerMock.create();
      postIndexResultsRoute(server.router, logger);
    });

    test('disallows invalid pattern', () => {
      const req = requestMock.create({
        method: 'post',
        path: POST_INDEX_RESULTS,
        body: { indexName: 'invalid body' },
      });
      const result = server.validate(req);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
