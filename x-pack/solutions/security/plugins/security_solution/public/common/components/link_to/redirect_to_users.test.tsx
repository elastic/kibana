/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUsersDetailsUrl } from './redirect_to_users';

describe('getUserDetailsUrl', () => {
  const TESTS = [
    {
      userId: 'domain\\some_user',
      expectedUrl: '/name/domain%5Csome_user',
    },
    {
      userId: 'user&name',
      expectedUrl: '/name/user%26name',
    },
    {
      userId: 'normaluser',
      expectedUrl: '/name/normaluser',
    },
    {
      userId: 'user?name',
      expectedUrl: '/name/user%3Fname',
    },
  ];

  TESTS.forEach(({ userId, expectedUrl }) => {
    it(`should return the correct URL for user ID: ${userId}`, () => {
      expect(getUsersDetailsUrl(userId)).toBe(expectedUrl);
    });
  });
});
