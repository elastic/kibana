/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { WATCHLISTS_DATA_SOURCE_URL } from '../../../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../../../detection_engine/routes/__mocks__';

const mockAddEntitySourceReference = jest.fn();
jest.mock('../../watchlist_config', () => ({
  WatchlistConfigClient: jest.fn().mockImplementation(() => ({
    addEntitySourceReference: mockAddEntitySourceReference,
  })),
}));

jest.mock('../../../entity_sources/infra/entity_source_client');
jest.mock('../../../shared/utils', () => ({
  getRequestSavedObjectClient: jest.fn(() => 'mock-so-client'),
}));

const mockCheckIndexReadPrivilege = jest.fn();
const mockGrantEntitySourceApiKey = jest.fn();

jest.mock('../../../entity_sources/entity_source_api_key', () => ({
  checkIndexReadPrivilege: (...args: unknown[]) => mockCheckIndexReadPrivilege(...args),
  grantEntitySourceApiKey: (...args: unknown[]) => mockGrantEntitySourceApiKey(...args),
}));

const { mockCreateEntitySource, mockUpdateApiKeyFields } = jest.requireMock(
  '../../../entity_sources/infra/entity_source_client'
) as {
  mockCreateEntitySource: jest.Mock;
  mockUpdateApiKeyFields: jest.Mock;
};

const mockGetStartServices = jest.fn();

import { createEntitySourceRoute } from './create';

const WATCHLIST_ID = 'wl-1';
const DATA_SOURCE_URL = WATCHLISTS_DATA_SOURCE_URL.replace('{watchlist_id}', WATCHLIST_ID);

describe('POST entity source route - createEntitySourceRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    const { context: ctx } = requestContextMock.createTools();
    context = requestContextMock.convertContext(ctx);

    mockCreateEntitySource.mockReset();
    mockUpdateApiKeyFields.mockReset();
    mockAddEntitySourceReference.mockReset();
    mockCheckIndexReadPrivilege.mockReset().mockResolvedValue(true);
    mockGrantEntitySourceApiKey.mockReset().mockResolvedValue(null);

    const mockSecurity = { authc: { apiKeys: { grantAsInternalUser: jest.fn() } } };
    mockGetStartServices.mockResolvedValue([{ security: mockSecurity }]);

    createEntitySourceRoute(server.router, logger, mockGetStartServices);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildRequest = (body: object) =>
    requestMock.create({
      method: 'post',
      path: DATA_SOURCE_URL,
      params: { watchlist_id: WATCHLIST_ID },
      body,
    });

  describe('index-type source', () => {
    const indexSourceBody = {
      type: 'index' as const,
      name: 'my-index-source',
      indexPattern: 'logs-*',
      enabled: true,
    };

    it('returns 403 when user lacks read access on the index pattern', async () => {
      mockCheckIndexReadPrivilege.mockResolvedValue(false);

      const response = await server.inject(buildRequest(indexSourceBody), context);

      expect(response.status).toEqual(403);
      expect(mockCreateEntitySource).not.toHaveBeenCalled();
    });

    it('creates the source and mints an API key when privilege check passes', async () => {
      const createdSource = { id: 'es-1', ...indexSourceBody };
      const apiKeyResult = { apiKeyId: 'kid-1', apiKey: 'secret-1' };
      mockCreateEntitySource.mockResolvedValue(createdSource);
      mockGrantEntitySourceApiKey.mockResolvedValue(apiKeyResult);

      const response = await server.inject(buildRequest(indexSourceBody), context);

      expect(response.status).toEqual(200);
      expect(mockCheckIndexReadPrivilege).toHaveBeenCalledWith(
        expect.anything(),
        indexSourceBody.indexPattern
      );
      expect(mockGrantEntitySourceApiKey).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { id: createdSource.id, name: createdSource.name }
      );
      expect(mockUpdateApiKeyFields).toHaveBeenCalledWith(createdSource.id, {
        apiKeyId: apiKeyResult.apiKeyId,
        apiKey: apiKeyResult.apiKey,
      });
    });
  });

  describe('non-index source', () => {
    it('does not check privileges or mint an API key for a store-type source', async () => {
      const storeBody = {
        type: 'store' as const,
        name: 'store-source',
        enabled: true,
        queryRule: 'entity.type: user',
      };
      mockCreateEntitySource.mockResolvedValue({ id: 'es-2', ...storeBody });

      const response = await server.inject(buildRequest(storeBody), context);

      expect(response.status).toEqual(200);
      expect(mockCheckIndexReadPrivilege).not.toHaveBeenCalled();
      expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
      expect(mockUpdateApiKeyFields).not.toHaveBeenCalled();
    });
  });
});
