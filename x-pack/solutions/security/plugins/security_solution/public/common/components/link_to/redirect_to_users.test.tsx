/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersTableType } from '../../../explore/users/store/model';
import { parseEntityResolutionFromUrlState } from './entity_resolution_query_params';
import {
  getTabsOnUsersDetailsUrl,
  getTabsOnUsersUrl,
  getUsersDetailsUrl,
  parseEntityIdentifiersFromUrlParam,
} from './redirect_to_users';

/** Inverse of decodeEntityIdentifiersFromUrl — builds a base64url segment for tests. */
const encodeJsonForLegacyEntitySegment = (value: unknown): string => {
  const json = JSON.stringify(value);
  const binary = unescape(encodeURIComponent(json));
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const queryFromUrl = (url: string): string | undefined => {
  const i = url.indexOf('?');
  return i === -1 ? undefined : url.slice(i + 1);
};

describe('redirect_to_users', () => {
  describe('parseEntityIdentifiersFromUrlParam', () => {
    it('returns an empty object when the param is undefined or empty', () => {
      expect(parseEntityIdentifiersFromUrlParam(undefined)).toEqual({});
      expect(parseEntityIdentifiersFromUrlParam('')).toEqual({});
    });

    it('returns an empty object when the segment cannot be decoded', () => {
      expect(parseEntityIdentifiersFromUrlParam('not-valid-base64!!!')).toEqual({});
      // Valid base64 but invalid JSON
      expect(parseEntityIdentifiersFromUrlParam('e30')).toEqual({}); // base64url for "{"
    });

    it('returns undefined entityId and identityFields when decoded JSON is an empty object', () => {
      expect(parseEntityIdentifiersFromUrlParam(encodeJsonForLegacyEntitySegment({}))).toEqual({
        entityId: undefined,
        identityFields: undefined,
      });
    });

    it('returns an empty object when JSON is not a plain object', () => {
      expect(parseEntityIdentifiersFromUrlParam(encodeJsonForLegacyEntitySegment([]))).toEqual({});
      expect(parseEntityIdentifiersFromUrlParam(encodeJsonForLegacyEntitySegment('x'))).toEqual({});
    });

    it('extracts entityId when it is a non-empty string', () => {
      expect(
        parseEntityIdentifiersFromUrlParam(encodeJsonForLegacyEntitySegment({ entityId: 'ent-1' }))
      ).toEqual({ entityId: 'ent-1' });
    });

    it('omits entityId when it is empty or not a string', () => {
      expect(
        parseEntityIdentifiersFromUrlParam(encodeJsonForLegacyEntitySegment({ entityId: '' }))
      ).toEqual({ entityId: undefined, identityFields: undefined });
      expect(
        parseEntityIdentifiersFromUrlParam(encodeJsonForLegacyEntitySegment({ entityId: 99 }))
      ).toEqual({ entityId: undefined, identityFields: undefined });
    });

    it('extracts identityFields from keys other than entityId', () => {
      expect(
        parseEntityIdentifiersFromUrlParam(
          encodeJsonForLegacyEntitySegment({ 'user.name': 'alice', 'user.domain': 'corp' })
        )
      ).toEqual({
        identityFields: { 'user.name': 'alice', 'user.domain': 'corp' },
      });
    });

    it('returns both entityId and identityFields when both are present', () => {
      expect(
        parseEntityIdentifiersFromUrlParam(
          encodeJsonForLegacyEntitySegment({
            entityId: 'id-1',
            'user.name': 'alice',
          })
        )
      ).toEqual({
        entityId: 'id-1',
        identityFields: { 'user.name': 'alice' },
      });
    });
  });

  describe('getUsersDetailsUrl', () => {
    const detailNameCases = [
      { userId: 'domain\\some_user', expectedPathSegment: 'domain%5Csome_user' },
      { userId: 'user&name', expectedPathSegment: 'user%26name' },
      { userId: 'normaluser', expectedPathSegment: 'normaluser' },
      { userId: 'user?name', expectedPathSegment: 'user%3Fname' },
    ];

    it.each(detailNameCases)(
      'encodes the user name in the path for $userId',
      ({ userId, expectedPathSegment }) => {
        expect(getUsersDetailsUrl(userId)).toBe(`/name/${expectedPathSegment}`);
      }
    );

    it('merges entityId when passed after urlStateQuery (parameter order)', () => {
      const url = getUsersDetailsUrl('alice', undefined, undefined, 'user-entity-1');
      expect(url.startsWith('/name/alice?')).toBe(true);
      expect(parseEntityResolutionFromUrlState(queryFromUrl(url))).toEqual({
        entityId: 'user-entity-1',
      });
    });

    it('merges identityFields when entityId is absent', () => {
      const url = getUsersDetailsUrl('alice', undefined, { 'user.name': 'canonical' });
      expect(parseEntityResolutionFromUrlState(queryFromUrl(url))).toEqual({
        identityFields: { 'user.name': 'canonical' },
      });
    });

    it('omits default user.name identityFields when entityId is present', () => {
      const url = getUsersDetailsUrl('alice', undefined, { 'user.name': 'alice' }, 'id-1');
      expect(parseEntityResolutionFromUrlState(queryFromUrl(url))).toEqual({ entityId: 'id-1' });
    });

    it('preserves existing URL state keys alongside entity resolution', () => {
      const url = getUsersDetailsUrl('alice', 'timerange=(from:now-24h,to:now)', undefined, 'e1');
      expect(url).toContain('timerange=');
      expect(parseEntityResolutionFromUrlState(queryFromUrl(url))).toEqual({ entityId: 'e1' });
    });
  });

  describe('getTabsOnUsersDetailsUrl', () => {
    it('includes tab in the path and merges resolution params', () => {
      const url = getTabsOnUsersDetailsUrl('u1', UsersTableType.risk, undefined, 'ent', {
        'user.name': 'other',
      });
      expect(url.startsWith(`/name/u1/${UsersTableType.risk}?`)).toBe(true);
      expect(parseEntityResolutionFromUrlState(queryFromUrl(url))).toEqual({
        entityId: 'ent',
        identityFields: { 'user.name': 'other' },
      });
    });
  });

  describe('getTabsOnUsersUrl', () => {
    it('uses string entityIdentifiers as entityId', () => {
      const url = getTabsOnUsersUrl(UsersTableType.allUsers, undefined, 'single-id');
      expect(url.startsWith(`/${UsersTableType.allUsers}?`)).toBe(true);
      expect(parseEntityResolutionFromUrlState(queryFromUrl(url))).toEqual({
        entityId: 'single-id',
      });
    });

    it('uses object entityIdentifiers as identityFields', () => {
      const url = getTabsOnUsersUrl(UsersTableType.events, undefined, {
        'user.name': 'x',
      });
      expect(url.startsWith(`/${UsersTableType.events}?`)).toBe(true);
      expect(parseEntityResolutionFromUrlState(queryFromUrl(url))).toEqual({
        identityFields: { 'user.name': 'x' },
      });
    });

    it('returns only the tab path when resolution and url state add nothing', () => {
      expect(getTabsOnUsersUrl(UsersTableType.authentications)).toBe(
        `/${UsersTableType.authentications}`
      );
    });
  });
});
