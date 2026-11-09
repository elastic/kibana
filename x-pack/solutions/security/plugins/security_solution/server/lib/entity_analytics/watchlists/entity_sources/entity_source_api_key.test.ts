/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { grantEntitySourceApiKey } from './entity_source_api_key';

describe('grantEntitySourceApiKey', () => {
  let mockSecurity: {
    authc: {
      getCurrentUser: jest.Mock;
      apiKeys: {
        grantAsInternalUser: jest.Mock;
        cloneAsInternalUser: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    mockSecurity = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue({ authentication_type: 'realm' }),
        apiKeys: {
          grantAsInternalUser: jest
            .fn()
            .mockResolvedValue({ id: 'granted-id', api_key: 'granted' }),
          cloneAsInternalUser: jest.fn().mockResolvedValue({ id: 'cloned-id', api_key: 'cloned' }),
        },
      },
    };
  });

  it('grants (rather than clones) for a request with a non-API-key Authorization header', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'Bearer some-token' },
    });

    const result = await grantEntitySourceApiKey(mockSecurity as never, request, 'my-source');

    expect(mockSecurity.authc.apiKeys.grantAsInternalUser).toHaveBeenCalled();
    expect(mockSecurity.authc.apiKeys.cloneAsInternalUser).not.toHaveBeenCalled();
    expect(result).toEqual({ apiKeyId: 'granted-id', apiKey: 'granted' });
  });

  it('clones (rather than grants) for a request with an ApiKey Authorization header, even when getCurrentUser does not report api_key auth', async () => {
    mockSecurity.authc.getCurrentUser.mockReturnValue(undefined);
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey some-encoded-credentials' },
    });

    const result = await grantEntitySourceApiKey(mockSecurity as never, request, 'my-source');

    expect(mockSecurity.authc.apiKeys.cloneAsInternalUser).toHaveBeenCalled();
    expect(mockSecurity.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    expect(result).toEqual({ apiKeyId: 'cloned-id', apiKey: 'cloned' });
  });

  it('clones for an ApiKey header regardless of scheme casing (fallback path)', async () => {
    mockSecurity.authc.getCurrentUser.mockReturnValue(undefined);
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'apikey some-encoded-credentials' },
    });

    await grantEntitySourceApiKey(mockSecurity as never, request, 'my-source');

    expect(mockSecurity.authc.apiKeys.cloneAsInternalUser).toHaveBeenCalled();
    expect(mockSecurity.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
  });

  it('prefers getCurrentUser().authentication_type over the raw header when both are present', async () => {
    mockSecurity.authc.getCurrentUser.mockReturnValue({ authentication_type: 'api_key' });
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'Bearer some-token' },
    });

    await grantEntitySourceApiKey(mockSecurity as never, request, 'my-source');

    expect(mockSecurity.authc.apiKeys.cloneAsInternalUser).toHaveBeenCalled();
    expect(mockSecurity.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
  });
});
