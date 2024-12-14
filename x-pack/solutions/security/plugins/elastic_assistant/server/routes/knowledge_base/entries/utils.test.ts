/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';
import { getKBUserFilter } from './utils';

describe('Utils', () => {
  describe('getKBUserFilter', () => {
    it('should return global filter when user is null', () => {
      const filter = getKBUserFilter(null);
      expect(filter).toEqual('(NOT users: {name:* OR id:* })');
    });

    it('should return global filter when `username` and `profile_uid` are undefined', () => {
      const filter = getKBUserFilter({} as AuthenticatedUser);
      expect(filter).toEqual('(NOT users: {name:* OR id:* })');
    });

    it('should return global filter when `username` is undefined', () => {
      const filter = getKBUserFilter({ profile_uid: 'fake_user_id' } as AuthenticatedUser);
      expect(filter).toEqual('(NOT users: {name:* OR id:* } OR users: {id: fake_user_id})');
    });

    it('should return global filter when `profile_uid` is undefined', () => {
      const filter = getKBUserFilter({ username: 'user1' } as AuthenticatedUser);
      expect(filter).toEqual('(NOT users: {name:* OR id:* } OR users: {name: "user1"})');
    });

    it('should return global filter when `username` has semicolon', () => {
      const filter = getKBUserFilter({
        username: 'user:1',
        profile_uid: 'fake_user_id',
      } as AuthenticatedUser);
      expect(filter).toEqual(
        '(NOT users: {name:* OR id:* } OR (users: {name: "user:1"} OR users: {id: fake_user_id}))'
      );
    });
  });
});
