/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StableUserIdAuthUser } from './owner_id';
import { toStableUserId } from './owner_id';

const API_KEY_USER: StableUserIdAuthUser = {
  username: 'alice',
  authentication_type: 'api_key',
  authentication_realm: { type: '_es_api_key', name: '_es_api_key' },
};

describe('toStableUserId', () => {
  it.each<{
    name: string;
    authUser: StableUserIdAuthUser;
    keyOwnerProfileUid?: string;
    expected: string | undefined;
  }>([
    {
      name: 'the profile uid wins',
      authUser: {
        username: 'alice',
        profile_uid: 'u_profile',
        authentication_realm: { type: 'native', name: 'native1' },
      },
      expected: 'u_profile',
    },
    {
      name: 'a user without a profile gets the realm form',
      authUser: { username: 'alice', authentication_realm: { type: 'file', name: 'file1' } },
      expected: 'realm:["file","file1","alice"]',
    },
    {
      name: 'an API key without a profile has no stable id',
      authUser: API_KEY_USER,
      expected: undefined,
    },
    {
      name: "an API key gets its owner's profile uid",
      authUser: API_KEY_USER,
      keyOwnerProfileUid: 'u_key_owner',
      expected: 'u_key_owner',
    },
  ])('$name', async ({ authUser, keyOwnerProfileUid, expected }) => {
    expect(
      await toStableUserId({ authUser, resolveApiKeyProfileUid: async () => keyOwnerProfileUid })
    ).toBe(expected);
  });
});
