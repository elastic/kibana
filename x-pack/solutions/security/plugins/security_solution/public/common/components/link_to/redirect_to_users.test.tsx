/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersTableType } from '../../../explore/users/store/model';
import { parseEntityResolutionFromUrlState } from './entity_resolution_query_params';
import {
  decodeEntityIdentifiersFromUrl,
  encodeEntityIdentifiersForUrl,
  getTabsOnUsersDetailsUrl,
  getTabsOnUsersUrl,
  getUsersDetailsUrl,
  parseEntityIdentifiersFromUrlParam,
} from './redirect_to_users';

const queryFromUrl = (url: string): string | undefined => {
  const i = url.indexOf('?');
  return i === -1 ? undefined : url.slice(i + 1);
};

describe('redirect_to_users', () => {
  describe('encodeEntityIdentifiersForUrl / decodeEntityIdentifiersFromUrl', () => {
    it('round-trips identity fields and entityId', () => {
      const identityFields = { 'user.name': 'domain\\alice' };
      const entityId = 'ent-123';
      const encoded = encodeEntityIdentifiersForUrl(identityFields, entityId);
      expect(decodeEntityIdentifiersFromUrl(encoded)).toEqual({
        ...identityFields,
        entityId,
      });
    });

    it('returns null for empty or invalid encoded payloads', () => {
      expect(decodeEntityIdentifiersFromUrl('')).toBeNull();
      expect(decodeEntityIdentifiersFromUrl('not-valid-base64!!!')).toBeNull();
      expect(decodeEntityIdentifiersFromUrl(encodeURIComponent('["array"]'))).toBeNull();
    });
  });

  describe('parseEntityIdentifiersFromUrlParam', () => {
    it('returns an empty object for missing or empty input', () => {
      expect(parseEntityIdentifiersFromUrlParam(undefined)).toEqual({});
      expect(parseEntityIdentifiersFromUrlParam('')).toEqual({});
    });

    it('returns empty when decoding fails', () => {
      expect(parseEntityIdentifiersFromUrlParam('@@@')).toEqual({});
    });

    it('splits entityId from other identity keys', () => {
      const encoded = encodeEntityIdentifiersForUrl({ 'user.name': 'bob' }, 'e-99');
      expect(parseEntityIdentifiersFromUrlParam(encoded)).toEqual({
        entityId: 'e-99',
        identityFields: { 'user.name': 'bob' },
      });
    });

    it('drops empty entityId string from the result', () => {
      const encoded = encodeEntityIdentifiersForUrl({ 'user.name': 'bob' }, '');
      expect(parseEntityIdentifiersFromUrlParam(encoded)).toEqual({
        identityFields: { 'user.name': 'bob' },
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
