/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { KnowledgeBaseEntryCreateProps } from '@kbn/elastic-assistant-common';
import { getKBUserFilter, isGlobalEntry } from './utils';

describe('Utils', () => {
  describe('isGlobalEntry', () => {
    it('returns true when global is true', () => {
      expect(
        isGlobalEntry({
          global: true,
          users: [{ id: 'u1', name: 'user' }],
        } as KnowledgeBaseEntryCreateProps)
      ).toEqual(true);
    });

    it('returns false when global is false and users is undefined', () => {
      expect(isGlobalEntry({ global: false } as KnowledgeBaseEntryCreateProps)).toEqual(false);
    });

    it('returns true when global is false but users is an empty array', () => {
      expect(isGlobalEntry({ global: false, users: [] } as KnowledgeBaseEntryCreateProps)).toEqual(
        true
      );
    });

    it('returns true when global is missing and users is an empty array', () => {
      expect(isGlobalEntry({ users: [] } as KnowledgeBaseEntryCreateProps)).toEqual(true);
    });

    it('returns false when global is false and users has an owner', () => {
      expect(
        isGlobalEntry({
          global: false,
          users: [{ id: 'u1', name: 'user' }],
        } as KnowledgeBaseEntryCreateProps)
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
