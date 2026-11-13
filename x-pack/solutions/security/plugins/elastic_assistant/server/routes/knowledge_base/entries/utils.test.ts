/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { getCreateKnowledgeBaseEntrySchemaMock } from '../../../__mocks__/knowledge_base_entry_schema.mock';
import { getKBUserFilter, isGlobalEntry } from './utils';

describe('Utils', () => {
  describe('isGlobalEntry', () => {
    it('returns true when global is true', () => {
      expect(
        isGlobalEntry(
          getCreateKnowledgeBaseEntrySchemaMock({
            global: true,
            users: [{ id: 'u1', name: 'user' }],
          })
        )
      ).toEqual(true);
    });

    it('returns false when global is false and users is undefined', () => {
      expect(isGlobalEntry(getCreateKnowledgeBaseEntrySchemaMock({ global: false }))).toEqual(
        false
      );
    });

    it('returns true when global is false but users is an empty array', () => {
      expect(
        isGlobalEntry(getCreateKnowledgeBaseEntrySchemaMock({ global: false, users: [] }))
      ).toEqual(true);
    });

    it('returns true when global is missing and users is an empty array', () => {
      const entry = getCreateKnowledgeBaseEntrySchemaMock({ users: [] });
      delete entry.global;
      expect(isGlobalEntry(entry)).toEqual(true);
    });

    it('returns false when global is false and users has an owner', () => {
      expect(
        isGlobalEntry(
          getCreateKnowledgeBaseEntrySchemaMock({
            global: false,
            users: [{ id: 'u1', name: 'user' }],
          })
        )
      ).toEqual(false);
    });
  });

  describe('getKBUserFilter', () => {
    it('should return global filter when user is null', () => {
      const filter = getKBUserFilter(null);
      expect(filter).toEqual('(NOT users: {name:* OR id:* })');
    });

    it('should return global filter when `username` and `profile_uid` are undefined', () => {
      const filter = getKBUserFilter({} as AuthenticatedUser);
      expect(filter).toEqual('(NOT users: {name:* OR id:* })');
    });

    it('should include private entries when `profile_uid` is defined', () => {
      const filter = getKBUserFilter({ profile_uid: 'fake_user_id' } as AuthenticatedUser);
      expect(filter).toEqual('(NOT users: {name:* OR id:* } OR users: {id: fake_user_id})');
    });

    it('should return only global entries when `profile_uid` is undefined', () => {
      const filter = getKBUserFilter({ username: 'user1' } as AuthenticatedUser);
      expect(filter).toEqual('(NOT users: {name:* OR id:* })');
    });

    it('should not use the username to filter private entries', () => {
      const filter = getKBUserFilter({
        username: 'user:1',
        profile_uid: 'fake_user_id',
      } as AuthenticatedUser);
      expect(filter).toEqual('(NOT users: {name:* OR id:* } OR users: {id: fake_user_id})');
    });

    it('returns distinct filters for users with the same username in different realms', () => {
      const firstRealmFilter = getKBUserFilter({
        username: 'shared-user',
        profile_uid: 'first_realm_profile',
      } as AuthenticatedUser);
      const secondRealmFilter = getKBUserFilter({
        username: 'shared-user',
        profile_uid: 'second_realm_profile',
      } as AuthenticatedUser);

      expect(firstRealmFilter).toContain('users: {id: first_realm_profile}');
      expect(secondRealmFilter).toContain('users: {id: second_realm_profile}');
      expect(firstRealmFilter).not.toContain('shared-user');
      expect(secondRealmFilter).not.toContain('shared-user');
    });
  });
});
