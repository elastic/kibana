/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsTableType } from '../../../explore/hosts/store/model';
import { HOSTS_PATH } from '../../../../common/constants';
import { parseEntityResolutionFromUrlState } from './entity_resolution_query_params';
import {
  getHostDetailsUrl,
  getHostsUrl,
  getTabsOnHostDetailsUrl,
  getTabsOnHostsUrl,
} from './redirect_to_hosts';

const queryFromUrl = (url: string): string | undefined => {
  const i = url.indexOf('?');
  return i === -1 ? undefined : url.slice(i + 1);
};

describe('redirect_to_hosts', () => {
  describe('getHostsUrl', () => {
    it('returns the hosts path with no search when urlStateQuery is empty', () => {
      expect(getHostsUrl()).toBe(HOSTS_PATH);
      expect(getHostsUrl('')).toBe(HOSTS_PATH);
    });

    it('appends a leading ? when urlStateQuery omits it', () => {
      expect(getHostsUrl('timerange=(from:now-24h,to:now)')).toBe(
        `${HOSTS_PATH}?timerange=(from:now-24h,to:now)`
      );
    });

    it('preserves an existing leading ? on urlStateQuery', () => {
      expect(getHostsUrl('?foo=bar')).toBe(`${HOSTS_PATH}?foo=bar`);
    });
  });

  describe('getTabsOnHostsUrl', () => {
    it('returns a path rooted at the tab segment', () => {
      expect(getTabsOnHostsUrl(HostsTableType.events)).toBe(`/${HostsTableType.events}`);
    });

    it('appends search when provided', () => {
      expect(getTabsOnHostsUrl(HostsTableType.risk, 'page=2')).toBe(
        `/${HostsTableType.risk}?page=2`
      );
    });
  });

  describe('getHostDetailsUrl', () => {
    it('defaults to the events tab and encodes the host name in the path', () => {
      expect(getHostDetailsUrl('host&name')).toBe(
        `/name/${encodeURIComponent('host&name')}/${HostsTableType.events}`
      );
    });

    it('merges entityId into URL state when provided', () => {
      const url = getHostDetailsUrl('my-host', undefined, 'entity-1');
      expect(url.startsWith(`/name/my-host/${HostsTableType.events}?`)).toBe(true);
      expect(parseEntityResolutionFromUrlState(queryFromUrl(url))).toEqual({
        entityId: 'entity-1',
      });
    });

    it('omits default host.name identityFields when entityId matches display name resolution', () => {
      const url = getHostDetailsUrl('my-host', undefined, 'entity-1', {
        'host.name': 'my-host',
      });
      expect(parseEntityResolutionFromUrlState(queryFromUrl(url))).toEqual({
        entityId: 'entity-1',
      });
    });

    it('keeps non-default identityFields in URL state when entityId is absent', () => {
      const url = getHostDetailsUrl('shown-name', undefined, undefined, {
        'host.name': 'canonical-host',
      });
      expect(parseEntityResolutionFromUrlState(queryFromUrl(url))).toEqual({
        identityFields: { 'host.name': 'canonical-host' },
      });
    });
  });

  describe('getTabsOnHostDetailsUrl', () => {
    it('builds path with explicit tab and optional query state', () => {
      const baseOnly = getTabsOnHostDetailsUrl('srv', HostsTableType.authentications);
      expect(baseOnly).toBe(`/name/srv/${HostsTableType.authentications}`);

      const withQuery = getTabsOnHostDetailsUrl(
        'srv',
        HostsTableType.sessions,
        'timerange=(from:now-24h,to:now)'
      );
      expect(withQuery.startsWith(`/name/srv/${HostsTableType.sessions}?`)).toBe(true);
      expect(withQuery).toContain('timerange=');
    });
  });
});
