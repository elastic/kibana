/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core/server';
import {
  ALERT_ATTACK_DISCOVERY_USERS_NOT_EXISTS_KQL,
  EMPTY_ALERT_ATTACK_DISCOVERY_USERS_KQL,
  getAdditionalFilter,
  getCombinedFilter,
  getSharedFilter,
  getUserFilter,
  getUserNameOrId,
} from '.';

import { ALERT_ATTACK_DISCOVERY_USERS } from '../../schedules/fields';

describe('getCombinedFilter', () => {
  describe('getSharedFilter', () => {
    it('returns the shared filter with a leading OR when shared is undefined', () => {
      const result = getSharedFilter(undefined);

      expect(result).toBe(
        ` OR ${EMPTY_ALERT_ATTACK_DISCOVERY_USERS_KQL} OR ${ALERT_ATTACK_DISCOVERY_USERS_NOT_EXISTS_KQL}`
      );
    });

    it('returns an empty string when shared is false', () => {
      const result = getSharedFilter(false);

      expect(result).toBe('');
    });

    it('returns the shared filter without a leading OR when shared is true', () => {
      const result = getSharedFilter(true);

      expect(result).toBe(
        `${EMPTY_ALERT_ATTACK_DISCOVERY_USERS_KQL} OR ${ALERT_ATTACK_DISCOVERY_USERS_NOT_EXISTS_KQL}`
      );
    });
  });

  describe('getUserNameOrId', () => {
    it('returns the username when username is provided', () => {
      const authenticatedUser = { username: 'test_user', profile_uid: '123' } as AuthenticatedUser;

      const result = getUserNameOrId(authenticatedUser);

      expect(result).toBe('name: "test_user"');
    });

    it('returns the profile_uid when username is null', () => {
      const authenticatedUser = {
        username: null, // <-- null
        profile_uid: '123',
      } as unknown as AuthenticatedUser;

      const result = getUserNameOrId(authenticatedUser);

      expect(result).toBe('id: "123"');
    });

    it('returns the profile_uid when username is empty', () => {
      const authenticatedUser = {
        username: '', // <-- empty string
        profile_uid: '123',
      } as unknown as AuthenticatedUser;

      const result = getUserNameOrId(authenticatedUser);

      expect(result).toBe('id: "123"');
    });
  });

  describe('getUserFilter', () => {
    it('returns the user filter with username when shared is undefined', () => {
      const shared = undefined;

      const authenticatedUser = {
        username: 'test_user',
        profile_uid: '123',
      } as AuthenticatedUser;

      const result = getUserFilter({ authenticatedUser, shared });

      expect(result).toBe(`${ALERT_ATTACK_DISCOVERY_USERS}: { name: "test_user" }`);
    });

    it('returns the user filter with profile_uid when shared is false', () => {
      const shared = false;

      const authenticatedUser = {
        username: null,
        profile_uid: '123',
      } as unknown as AuthenticatedUser;

      const result = getUserFilter({ authenticatedUser, shared });

      expect(result).toBe(`${ALERT_ATTACK_DISCOVERY_USERS}: { id: "123" }`);
    });

    it('returns an empty string when shared is true', () => {
      const shared = true;

      const authenticatedUser = {
        username: 'test_user',
        profile_uid: '123',
      } as AuthenticatedUser;

      const result = getUserFilter({ authenticatedUser, shared });

      expect(result).toBe('');
    });
  });

  describe('getAdditionalFilter', () => {
    it('returns the additional filter joined with an AND when filter is defined', () => {
      const result = getAdditionalFilter('foo: "bar"');
      expect(result).toBe(' AND foo: "bar"');
    });

    it('returns an empty string when filter is undefined', () => {
      const result = getAdditionalFilter(undefined);
      expect(result).toBe('');
    });
  });

  describe('getCombinedFilter', () => {
    describe('when shared is undefined', () => {
      const shared = undefined;

      it('returns the combined filter with user and shared filters when shared is undefined and filter is undefined', () => {
        const filter = undefined;

        const authenticatedUser = {
          username: 'test_user',
          profile_uid: '123',
        } as AuthenticatedUser;

        const result = getCombinedFilter({
          authenticatedUser,
          filter,
          shared,
        });

        expect(result).toBe(
          `(${ALERT_ATTACK_DISCOVERY_USERS}: { name: "test_user" } OR ${EMPTY_ALERT_ATTACK_DISCOVERY_USERS_KQL} OR ${ALERT_ATTACK_DISCOVERY_USERS_NOT_EXISTS_KQL})`
        );
      });

      it('returns the combined filter with user, shared, and additional filters when shared is undefined and filter is defined', () => {
        const filter = 'foo: "bar"';

        const authenticatedUser = {
          username: 'test_user',
          profile_uid: '123',
        } as AuthenticatedUser;

        const result = getCombinedFilter({
          authenticatedUser,
          filter,
          shared,
        });

        expect(result).toBe(
          `(${ALERT_ATTACK_DISCOVERY_USERS}: { name: "test_user" } OR ${EMPTY_ALERT_ATTACK_DISCOVERY_USERS_KQL} OR ${ALERT_ATTACK_DISCOVERY_USERS_NOT_EXISTS_KQL}) AND foo: "bar"`
        );
      });
    });

    describe('when shared is false', () => {
      const shared = false;

      it('returns the combined filter with user filter only when shared is false and filter is undefined', () => {
        const filter = undefined;

        const authenticatedUser = {
          username: 'test_user',
          profile_uid: '123',
        } as AuthenticatedUser;

        const result = getCombinedFilter({ authenticatedUser, filter, shared });

        expect(result).toBe(`(${ALERT_ATTACK_DISCOVERY_USERS}: { name: "test_user" })`);
      });

      it('returns the combined filter with user and additional filters when shared is false and filter is defined', () => {
        const filter = 'foo: "bar"';

        const authenticatedUser = {
          username: 'test_user',
          profile_uid: '123',
        } as AuthenticatedUser;

        const result = getCombinedFilter({
          authenticatedUser,
          filter,
          shared,
        });

        expect(result).toBe(
          `(${ALERT_ATTACK_DISCOVERY_USERS}: { name: "test_user" }) AND foo: "bar"`
        );
      });
    });

    describe('when shared is true', () => {
      const shared = true;

      it('returns the combined filter with shared filter only when shared is true and filter is undefined', () => {
        const filter = undefined;

        const authenticatedUser = {
          username: 'test_user',
          profile_uid: '123',
        } as AuthenticatedUser;

        const result = getCombinedFilter({ authenticatedUser, filter, shared });

        expect(result).toBe(
          `(${EMPTY_ALERT_ATTACK_DISCOVERY_USERS_KQL} OR ${ALERT_ATTACK_DISCOVERY_USERS_NOT_EXISTS_KQL})`
        );
      });

      it('returns the combined filter with shared and additional filters when shared is true and filter is defined', () => {
        const filter = 'foo: "bar"';

        const authenticatedUser = {
          username: 'test_user',
          profile_uid: '123',
        } as AuthenticatedUser;

        const result = getCombinedFilter({
          authenticatedUser,
          filter,
          shared,
        });

        expect(result).toBe(
          `(${EMPTY_ALERT_ATTACK_DISCOVERY_USERS_KQL} OR ${ALERT_ATTACK_DISCOVERY_USERS_NOT_EXISTS_KQL}) AND foo: "bar"`
        );
      });
    });
  });
});
