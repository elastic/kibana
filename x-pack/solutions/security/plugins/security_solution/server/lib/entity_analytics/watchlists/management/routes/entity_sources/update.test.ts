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

jest.mock('../../../entity_sources/infra/entity_source_client');
jest.mock('../../../shared/utils', () => ({
  getRequestSavedObjectClient: jest.fn(() => 'mock-so-client'),
}));

const mockCheckIndexReadPrivilege = jest.fn();
const mockGrantEntitySourceApiKey = jest.fn();
const mockInvalidateEntitySourceApiKey = jest.fn();

jest.mock('../../../entity_sources/entity_source_api_key', () => ({
  checkIndexReadPrivilege: (...args: unknown[]) => mockCheckIndexReadPrivilege(...args),
  grantEntitySourceApiKey: (...args: unknown[]) => mockGrantEntitySourceApiKey(...args),
  invalidateEntitySourceApiKey: (...args: unknown[]) => mockInvalidateEntitySourceApiKey(...args),
}));

const { mockGetEntitySource, mockUpdateEntitySource, mockUpdateApiKeyFields } = jest.requireMock(
  '../../../entity_sources/infra/entity_source_client'
) as {
  mockGetEntitySource: jest.Mock;
  mockUpdateEntitySource: jest.Mock;
  mockUpdateApiKeyFields: jest.Mock;
};

const mockGetStartServices = jest.fn();

import { updateEntitySourceRoute } from './update';

const WATCHLIST_ID = 'wl-1';
const SOURCE_ID = 'src-1';
const DATA_SOURCE_URL = WATCHLISTS_DATA_SOURCE_URL.replace('{watchlist_id}', WATCHLIST_ID);

describe('PUT entity source route - updateEntitySourceRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    const { context: ctx } = requestContextMock.createTools();
    context = requestContextMock.convertContext(ctx);

    mockGetEntitySource.mockReset();
    mockUpdateEntitySource.mockReset();
    mockUpdateApiKeyFields.mockReset();
    mockCheckIndexReadPrivilege.mockReset().mockResolvedValue(true);
    mockGrantEntitySourceApiKey.mockReset().mockResolvedValue(null);
    mockInvalidateEntitySourceApiKey.mockReset().mockResolvedValue(undefined);

    const mockSecurity = { authc: { apiKeys: { invalidateAsInternalUser: jest.fn() } } };
    mockGetStartServices.mockResolvedValue([{ security: mockSecurity }]);

    updateEntitySourceRoute(server.router, logger, mockGetStartServices);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildRequest = (body: object, id = SOURCE_ID) =>
    requestMock.create({
      method: 'put',
      path: `${DATA_SOURCE_URL}/${id}`,
      params: { watchlist_id: WATCHLIST_ID, id },
      body,
    });

  describe('index → index update', () => {
    it('returns 403 when user lacks read access on the new index pattern', async () => {
      mockGetEntitySource.mockResolvedValue({ id: SOURCE_ID, type: 'index', apiKeyId: 'old-kid' });
      mockCheckIndexReadPrivilege.mockResolvedValue(false);

      const response = await server.inject(buildRequest({ indexPattern: 'new-logs-*' }), context);

      expect(response.status).toEqual(403);
      expect(mockUpdateEntitySource).not.toHaveBeenCalled();
    });

    it('invalidates old API key and mints a new one', async () => {
      mockGetEntitySource.mockResolvedValue({ id: SOURCE_ID, type: 'index', apiKeyId: 'old-kid' });
      mockUpdateEntitySource.mockResolvedValue({ id: SOURCE_ID, name: 'updated', type: 'index' });
      mockGrantEntitySourceApiKey.mockResolvedValue({ apiKeyId: 'new-kid', apiKey: 'new-secret' });

      const response = await server.inject(buildRequest({ indexPattern: 'logs-*' }), context);

      expect(response.status).toEqual(200);
      expect(mockInvalidateEntitySourceApiKey).toHaveBeenCalledWith(
        expect.anything(),
        'old-kid',
        logger
      );
      expect(mockGrantEntitySourceApiKey).toHaveBeenCalled();
      expect(mockUpdateApiKeyFields).toHaveBeenCalledWith(SOURCE_ID, {
        apiKeyId: 'new-kid',
        apiKey: 'new-secret',
      });
    });
  });

  describe('index → non-index transition', () => {
    it('invalidates old API key and clears key fields', async () => {
      mockGetEntitySource.mockResolvedValue({ id: SOURCE_ID, type: 'index', apiKeyId: 'old-kid' });
      mockUpdateEntitySource.mockResolvedValue({ id: SOURCE_ID, name: 'updated', type: 'store' });

      const response = await server.inject(buildRequest({ type: 'store' }), context);

      expect(response.status).toEqual(200);
      expect(mockInvalidateEntitySourceApiKey).toHaveBeenCalledWith(
        expect.anything(),
        'old-kid',
        logger
      );
      expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
      expect(mockUpdateApiKeyFields).toHaveBeenCalledWith(SOURCE_ID, {
        apiKeyId: null,
        apiKey: null,
      });
    });
  });

  describe('non-index → index transition', () => {
    it('mints a new API key without trying to invalidate a previous one', async () => {
      mockGetEntitySource.mockResolvedValue({ id: SOURCE_ID, type: 'store' });
      mockUpdateEntitySource.mockResolvedValue({ id: SOURCE_ID, name: 'updated', type: 'index' });
      mockGrantEntitySourceApiKey.mockResolvedValue({ apiKeyId: 'kid-1', apiKey: 'secret-1' });

      const response = await server.inject(
        buildRequest({ type: 'index', indexPattern: 'logs-*' }),
        context
      );

      expect(response.status).toEqual(200);
      expect(mockInvalidateEntitySourceApiKey).not.toHaveBeenCalled();
      expect(mockGrantEntitySourceApiKey).toHaveBeenCalled();
      expect(mockUpdateApiKeyFields).toHaveBeenCalledWith(SOURCE_ID, {
        apiKeyId: 'kid-1',
        apiKey: 'secret-1',
      });
    });
  });

  describe('non-index → non-index update', () => {
    it('performs no key operations', async () => {
      mockGetEntitySource.mockResolvedValue({ id: SOURCE_ID, type: 'store' });
      mockUpdateEntitySource.mockResolvedValue({ id: SOURCE_ID, name: 'updated', type: 'store' });

      const response = await server.inject(buildRequest({ name: 'new-name' }), context);

      expect(response.status).toEqual(200);
      expect(mockCheckIndexReadPrivilege).not.toHaveBeenCalled();
      expect(mockInvalidateEntitySourceApiKey).not.toHaveBeenCalled();
      expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
      expect(mockUpdateApiKeyFields).not.toHaveBeenCalled();
    });
  });
});
