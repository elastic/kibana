/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { getBriefOwner, resolveApiKeyOwnerProfileUid, toStableUserId } from './owner_id';

const responseError = (statusCode: number) =>
  new errors.ResponseError({
    body: {},
    headers: {},
    meta: {},
    statusCode,
    warnings: null,
  } as unknown as ConstructorParameters<typeof errors.ResponseError>[0]);

// base64("key-id:secret")
const apiKeyHeader = `ApiKey ${Buffer.from('key-id:secret').toString('base64')}`;

describe('toStableUserId', () => {
  it('prefers the profile uid', async () => {
    expect(
      await toStableUserId({
        authUser: {
          username: 'alice',
          profile_uid: 'u_profile',
          authentication_realm: { type: 'native', name: 'native1' },
        },
      })
    ).toBe('u_profile');
  });

  it('falls back to realm type, name and username', async () => {
    expect(
      await toStableUserId({
        authUser: { username: 'alice', authentication_realm: { type: 'file', name: 'file1' } },
      })
    ).toBe('realm:["file","file1","alice"]');
  });

  it('resolves the profile uid of an API key', async () => {
    const resolveApiKeyProfileUid = jest.fn().mockResolvedValue('u_key_owner');
    expect(
      await toStableUserId({
        authUser: { username: 'alice', authentication_type: 'api_key' },
        resolveApiKeyProfileUid,
      })
    ).toBe('u_key_owner');
  });

  it('returns undefined for an API key without a profile', async () => {
    expect(
      await toStableUserId({
        authUser: {
          username: 'alice',
          authentication_type: 'api_key',
          authentication_realm: { type: '_es_api_key', name: '_es_api_key' },
        },
        resolveApiKeyProfileUid: async () => undefined,
      })
    ).toBeUndefined();
  });

  it('returns undefined when the realm is unknown', async () => {
    expect(await toStableUserId({ authUser: { username: 'alice' } })).toBeUndefined();
  });
});

describe('resolveApiKeyOwnerProfileUid', () => {
  it('looks up the API key with its profile uid', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.security.getApiKey.mockResolvedValue({
      api_keys: [{ profile_uid: 'u_key_owner' }],
    } as unknown as Awaited<ReturnType<typeof esClient.security.getApiKey>>);
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: apiKeyHeader },
    });

    expect(await resolveApiKeyOwnerProfileUid({ request, esClient })).toBe('u_key_owner');
    expect(esClient.security.getApiKey).toHaveBeenCalledWith({
      with_profile_uid: true,
      id: 'key-id',
    });
  });

  it('returns undefined when the key cannot be read', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.security.getApiKey.mockRejectedValue(responseError(403));
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: apiKeyHeader },
    });

    expect(await resolveApiKeyOwnerProfileUid({ request, esClient })).toBeUndefined();
  });

  it('returns undefined without an API key header', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const request = httpServerMock.createKibanaRequest();
    expect(await resolveApiKeyOwnerProfileUid({ request, esClient })).toBeUndefined();
    expect(esClient.security.getApiKey).not.toHaveBeenCalled();
  });
});

describe('getBriefOwner', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const request = httpServerMock.createKibanaRequest();

  it('returns the stable id and the username for display', async () => {
    expect(
      await getBriefOwner({
        authUser: { username: 'alice', profile_uid: 'u_profile' },
        request,
        esClient,
      })
    ).toEqual({ id: 'u_profile', username: 'alice', profileUid: 'u_profile' });

    expect(
      await getBriefOwner({
        authUser: { username: 'bob', authentication_realm: { type: 'file', name: 'file1' } },
        request,
        esClient,
      })
    ).toEqual({ id: 'realm:["file","file1","bob"]', username: 'bob', profileUid: undefined });
  });

  it('returns undefined without a user or a stable id', async () => {
    expect(await getBriefOwner({ authUser: null, request, esClient })).toBeUndefined();
    expect(
      await getBriefOwner({ authUser: { username: 'carol' }, request, esClient })
    ).toBeUndefined();
  });
});
