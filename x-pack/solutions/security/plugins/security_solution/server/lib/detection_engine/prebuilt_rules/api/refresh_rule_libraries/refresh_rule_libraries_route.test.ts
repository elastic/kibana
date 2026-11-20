/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import {
  ensureLibraries,
  refreshRuleLibraries,
  type RefreshResult,
} from '@kbn/security-rule-libraries';
import { REFRESH_RULE_LIBRARIES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { requestContextMock, requestMock, serverMock } from '../../../routes/__mocks__';
import { refreshRuleLibrariesRoute } from './refresh_rule_libraries_route';

jest.mock('@kbn/security-rule-libraries', () => ({
  ...jest.requireActual('@kbn/security-rule-libraries'),
  ensureLibraries: jest.fn(),
  refreshRuleLibraries: jest.fn(),
}));

const refreshRequest = (body?: { library_ids?: string[] }) =>
  requestMock.create({
    method: 'post',
    path: REFRESH_RULE_LIBRARIES_URL,
    body,
  });

const communityResult: RefreshResult = {
  id: 'elastic-community',
  outcome: 'refreshed',
  version: '1.0.0',
  item_count: 3,
};

const libraryObject = (id: string, spaceId?: string) => ({
  id,
  type: 'security-rule-library',
  references: [],
  score: 1,
  attributes: {
    name: id,
    title: id,
    provider: { type: 'git' as const },
    ...(spaceId ? { space_id: spaceId } : {}),
  },
});

describe('refreshRuleLibrariesRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    clients.core.savedObjects.getClient = jest.fn(() => savedObjectsClient);
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        libraryObject('elastic'),
        libraryObject('elastic-community'),
        libraryObject('custom-library'),
        libraryObject('their-library', 'other'),
      ],
      total: 4,
      per_page: 1000,
      page: 1,
    });
    refreshRuleLibrariesRoute(server.router, clients.logger);
  });

  it('refreshes the requested libraries', async () => {
    jest.mocked(refreshRuleLibraries).mockResolvedValue({ results: [communityResult] });

    const response = await server.inject(
      refreshRequest({ library_ids: ['elastic-community'] }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ results: [communityResult] });
    const [params] = jest.mocked(refreshRuleLibraries).mock.calls[0];
    expect(params.libraryIds).toEqual(['elastic-community']);
    expect(params.force).toBeUndefined();
  });

  it('refreshes every library when no ids are given', async () => {
    const elasticResult: RefreshResult = { id: 'elastic', outcome: 'up_to_date', version: '9.6.1' };
    jest
      .mocked(refreshRuleLibraries)
      .mockResolvedValue({ results: [elasticResult, communityResult] });

    const response = await server.inject(
      refreshRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ results: [elasticResult, communityResult] });
    expect(jest.mocked(refreshRuleLibraries).mock.calls[0][0].libraryIds).toEqual([
      'elastic',
      'elastic-community',
      'custom-library',
    ]);
  });

  it('refreshes a library that is not one of the built-in ones', async () => {
    jest.mocked(refreshRuleLibraries).mockResolvedValue({
      results: [{ id: 'custom-library', outcome: 'refreshed', version: '2.0.0' }],
    });

    const response = await server.inject(
      refreshRequest({ library_ids: ['custom-library'] }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(jest.mocked(refreshRuleLibraries).mock.calls[0][0].libraryIds).toEqual([
      'custom-library',
    ]);
  });

  it('makes sure the built-in libraries exist before looking libraries up', async () => {
    jest.mocked(refreshRuleLibraries).mockResolvedValue({ results: [] });

    await server.inject(refreshRequest(), requestContextMock.convertContext(context));

    expect(ensureLibraries).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for a library of another space, without refreshing any', async () => {
    const response = await server.inject(
      refreshRequest({ library_ids: ['elastic', 'their-library'] }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(404);
    expect(refreshRuleLibraries).not.toHaveBeenCalled();
  });

  it('reads library secrets only when encrypted saved objects are available', async () => {
    jest.mocked(refreshRuleLibraries).mockResolvedValue({ results: [] });

    await server.inject(refreshRequest(), requestContextMock.convertContext(context));
    expect(jest.mocked(refreshRuleLibraries).mock.calls[0][0].getSecret).toBeUndefined();

    const getDecryptedAsInternalUser = jest
      .fn()
      .mockResolvedValue({ attributes: { secret: 'the-secret' } });
    const withSecrets = requestContextMock.createTools();
    withSecrets.clients.core.savedObjects.getClient = jest.fn(() => savedObjectsClient);
    jest
      .mocked((await withSecrets.context.securitySolution).getEncryptedSavedObjectsClient)
      .mockReturnValue({ getDecryptedAsInternalUser } as never);
    const secretServer = serverMock.create();
    refreshRuleLibrariesRoute(secretServer.router, withSecrets.clients.logger);

    await secretServer.inject(
      refreshRequest(),
      requestContextMock.convertContext(withSecrets.context)
    );

    const { getSecret } = jest.mocked(refreshRuleLibraries).mock.calls[1][0];
    await expect(getSecret?.('custom-library')).resolves.toBe('the-secret');
    expect(getDecryptedAsInternalUser).toHaveBeenCalledWith(
      'security-rule-library',
      'custom-library'
    );
  });

  it('returns 404 for a library that does not exist, without refreshing any', async () => {
    const response = await server.inject(
      refreshRequest({ library_ids: ['elastic', 'nope'] }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(404);
    expect(response.body).toEqual({
      message: 'Rule library "nope" not found',
      status_code: 404,
    });
    expect(refreshRuleLibraries).not.toHaveBeenCalled();
  });
});
