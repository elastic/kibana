/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityMock } from '@kbn/security-plugin/server/mocks';

import { DETECTION_ENGINE_ALERT_ASSIGNEES_URL } from '../../../../../common/constants';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { getMockUserProfiles } from '../__mocks__/request_responses';
import { suggestUserProfilesRoute } from './suggest_user_profiles_route';

describe('suggestUserProfilesRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();
  let mockSecurityStart: ReturnType<typeof securityMock.createStart>;
  let getStartServicesMock: jest.Mock;

  beforeEach(() => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    mockSecurityStart = securityMock.createStart();
    mockSecurityStart.userProfiles.suggest.mockResolvedValue(getMockUserProfiles());
  });

  const buildRequest = () => {
    return requestMock.create({
      method: 'get',
      path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
      body: { searchTerm: '' },
    });
  };

  describe('normal status codes', () => {
    beforeEach(() => {
      getStartServicesMock = jest.fn().mockResolvedValue([{}, { security: mockSecurityStart }]);
      suggestUserProfilesRoute(server.router, getStartServicesMock);
    });

    it('returns 200 when doing a normal request', async () => {
      const request = buildRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
    });

    test('returns the payload when doing a normal request', async () => {
      const request = buildRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));
      const expectedBody = getMockUserProfiles();
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(expectedBody);
    });

    test('returns 500 if `security.userProfiles.suggest` throws error', async () => {
      mockSecurityStart.userProfiles.suggest.mockRejectedValue(new Error('something went wrong'));
      const request = buildRequest();
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(500);
      expect(response.body.message).toEqual('something went wrong');
    });
  });
});
