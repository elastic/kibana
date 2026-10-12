/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import type { StableUserIdAuthUser } from './owner_id';
import { getBriefOwner, resolveApiKeyOwnerProfileUid, toStableUserId } from './owner_id';

const responseError = (statusCode: number) =>
  new errors.ResponseError({
    body: {},
    headers: {},
    meta: {},
    statusCode,
    warnings: null,
  } as unknown as ConstructorParameters<typeof errors.ResponseError>[0]);

const apiKeyRequest = () =>
  httpServerMock.createKibanaRequest({
    headers: { authorization: `ApiKey ${Buffer.from('key-id:secret').toString('base64')}` },
  });

describe('toStableUserId', () => {
  it.each<{ name: string; authUser: StableUserIdAuthUser; expected: string | undefined }>([
    {
      name: 'prefers the profile uid',
      authUser: {
        username: 'alice',
        profile_uid: 'u_profile',
        authentication_realm: { type: 'native', name: 'native1' },
      },
      expected: 'u_profile',
    },
    {
      name: 'falls back to realm type, name and username',
      authUser: { username: 'alice', authentication_realm: { type: 'file', name: 'file1' } },
      expected: 'realm:["file","file1","alice"]',
    },
    {
      name: 'returns undefined when the realm is unknown',
      authUser: { username: 'alice' },
      expected: undefined,
    },
  ])('$name', async ({ authUser, expected }) => {
    expect(await toStableUserId({ authUser })).toBe(expected);
  });

  it('resolves the profile uid of an API key', async () => {
    expect(
      await toStableUserId({
        authUser: { username: 'alice', authentication_type: 'api_key' },
        resolveApiKeyProfileUid: async () => 'u_key_owner',
      })
    ).toBe('u_key_owner');
  });

  it('does not fall back to the realm for an API key without a profile', async () => {
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
});

describe('resolveApiKeyOwnerProfileUid', () => {
  it('looks up the API key with its profile uid', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.security.getApiKey.mockResolvedValue({
      api_keys: [{ profile_uid: 'u_key_owner' }],
    } as unknown as Awaited<ReturnType<typeof esClient.security.getApiKey>>);

    expect(await resolveApiKeyOwnerProfileUid({ request: apiKeyRequest(), esClient })).toBe(
      'u_key_owner'
    );
    expect(esClient.security.getApiKey).toHaveBeenCalledWith({
      with_profile_uid: true,
      id: 'key-id',
    });
  });

  it('returns undefined when the key cannot be read', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.security.getApiKey.mockRejectedValue(responseError(403));

    expect(
      await resolveApiKeyOwnerProfileUid({ request: apiKeyRequest(), esClient })
    ).toBeUndefined();
  });
});

describe('getBriefOwner', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const request = httpServerMock.createKibanaRequest();

  it('returns the stable id, keeping the username for display only', async () => {
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
