/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { refreshRuleLibraries, type RefreshResult } from '@kbn/security-rule-libraries';
import { REFRESH_RULE_LIBRARIES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { requestContextMock, requestMock, serverMock } from '../../../routes/__mocks__';
import { refreshRuleLibrariesRoute } from './refresh_rule_libraries_route';

jest.mock('@kbn/security-rule-libraries', () => ({
  ...jest.requireActual('@kbn/security-rule-libraries'),
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

describe('refreshRuleLibrariesRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
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
    expect(jest.mocked(refreshRuleLibraries).mock.calls[0][0].libraryIds).toBeUndefined();
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
