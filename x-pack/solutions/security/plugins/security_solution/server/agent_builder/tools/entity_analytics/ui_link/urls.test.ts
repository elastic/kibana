/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode } from '@kbn/rison';
import {
  buildUiLinkUrl,
  RESOLUTION_GROUP_TAB,
  WATCHLISTS_FLYOUT_KEY,
  ENTITY_ANALYTICS_HOME_TABLE_SCOPE,
  ENTITY_RESOLUTION_PANEL,
} from './urls';
import {
  HostPanelKey,
  UserPanelKey,
  ServicePanelKey,
  WatchlistsFlyoutKey,
} from '../../../../../public/flyout/entity_details/shared/constants';
import { HostDetailsPanelKey } from '../../../../../public/flyout/entity_details/host_details_left';
import { UserDetailsPanelKey } from '../../../../../public/flyout/entity_details/user_details_left';
import { ServiceDetailsPanelKey } from '../../../../../public/flyout/entity_details/service_details_left';
import { EntityDetailsLeftPanelTab } from '../../../../../public/flyout/entity_details/shared/components/left_panel/left_panel_header';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../../../../public/entity_analytics/components/home/constants';

interface DecodedFlyoutPanel {
  id: string;
  params: Record<string, unknown>;
}
interface DecodedFlyout {
  left?: DecodedFlyoutPanel;
  right?: DecodedFlyoutPanel;
}

const flyoutOf = (url: string): DecodedFlyout => {
  const rison = new URLSearchParams(url.split('?')[1]).get('flyout');
  if (rison == null) throw new Error('no flyout param');
  return decode(rison) as DecodedFlyout;
};

describe('buildUiLinkUrl — app-relative output (default space, empty base path)', () => {
  it('builds the management tab paths', () => {
    expect(buildUiLinkUrl('', 'default', { intent: 'risk_engine_settings' })).toBe(
      '/app/security/entity_analytics_management/risk_score'
    );
    expect(buildUiLinkUrl('', 'default', { intent: 'asset_criticality_bulk' })).toBe(
      '/app/security/entity_analytics_management/asset_criticality'
    );
    expect(buildUiLinkUrl('', 'default', { intent: 'entity_resolution_bulk' })).toBe(
      '/app/security/entity_analytics_management/entity_resolution'
    );
    expect(buildUiLinkUrl('', 'default', { intent: 'engine_status' })).toBe(
      '/app/security/entity_analytics_management/status'
    );
    expect(buildUiLinkUrl('', 'default', { intent: 'watchlists_list' })).toBe(
      '/app/security/entity_analytics_management/watchlists'
    );
  });

  it('builds the bare management page for the global settings intent (no subpath)', () => {
    expect(buildUiLinkUrl('', 'default', { intent: 'entity_analytics_settings' })).toBe(
      '/app/security/entity_analytics_management'
    );
  });

  describe('watchlist_edit', () => {
    const url = buildUiLinkUrl('', 'default', { intent: 'watchlist_edit', watchlistId: 'wl-123' });

    it('targets the watchlists tab', () => {
      expect(url.startsWith('/app/security/entity_analytics_management/watchlists?')).toBe(true);
    });

    it('encodes the watchlists-flyout edit panel with the watchlist id', () => {
      expect(flyoutOf(url)).toEqual({
        right: { id: 'watchlists-flyout', params: { mode: 'edit', watchlistId: 'wl-123' } },
      });
    });
  });

  describe('entity_resolution', () => {
    it('host: opens host_details (left) on the resolution tab + host-panel (right)', () => {
      const url = buildUiLinkUrl('', 'default', {
        intent: 'entity_resolution',
        entityType: 'host',
        entityName: 'myserver',
        entityId: 'host:myserver456',
      });
      expect(url.startsWith('/app/security/entity_analytics_home_page?')).toBe(true);
      const flyout = flyoutOf(url);
      expect(flyout.left?.id).toBe('host_details');
      expect(flyout.left?.params.path).toEqual({ tab: 'resolution_group' });
      expect(flyout.left?.params.hostName).toBe('myserver');
      expect(flyout.left?.params.entityId).toBe('host:myserver456');
      expect(flyout.right?.id).toBe('host-panel');
      expect(flyout.right?.params.hostName).toBe('myserver');
      // scopeId / contextID match the Entity Analytics home page's own table (the surface
      // the flyout opens on), not the agent-builder canvas scope.
      expect(flyout.left?.params.scopeId).toBe('entity-analytics-home-table');
      expect(flyout.right?.params.contextID).toBe('entity-analytics-home-table');
    });

    it('user: opens user_details (left) with identityFields + user-panel (right)', () => {
      const url = buildUiLinkUrl('', 'default', {
        intent: 'entity_resolution',
        entityType: 'user',
        entityName: 'jsmith',
        entityId: 'user:jsmith123',
      });
      const flyout = flyoutOf(url);
      expect(flyout.left?.id).toBe('user_details');
      expect(flyout.left?.params.identityFields).toEqual({ 'user.name': 'jsmith' });
      expect(flyout.left?.params.path).toEqual({ tab: 'resolution_group' });
      expect(flyout.right?.id).toBe('user-panel');
      expect(flyout.right?.params.userName).toBe('jsmith');
    });

    it('service: opens service_details (left) with identityFields + service-panel (right)', () => {
      const url = buildUiLinkUrl('', 'default', {
        intent: 'entity_resolution',
        entityType: 'service',
        entityName: 'payments-api',
        entityId: 'service:payments789',
      });
      const flyout = flyoutOf(url);
      expect(flyout.left?.id).toBe('service_details');
      expect(flyout.left?.params.identityFields).toEqual({ 'service.name': 'payments-api' });
      expect(flyout.left?.params.path).toEqual({ tab: 'resolution_group' });
      expect(flyout.right?.id).toBe('service-panel');
      expect(flyout.right?.params.serviceName).toBe('payments-api');
    });

    it('omits the name params when entityName is not provided (flyout resolves from entityId)', () => {
      const url = buildUiLinkUrl('', 'default', {
        intent: 'entity_resolution',
        entityType: 'user',
        entityId: 'user:jsmith123',
      });
      const flyout = flyoutOf(url);
      // Opens the right panel/tab and carries the EUID...
      expect(flyout.left?.id).toBe('user_details');
      expect(flyout.left?.params.path).toEqual({ tab: 'resolution_group' });
      expect(flyout.left?.params.entityId).toBe('user:jsmith123');
      expect(flyout.right?.params.entityId).toBe('user:jsmith123');
      // ...but no name-derived params (header title only, which we don't have here).
      expect(flyout.left?.params.userName).toBeUndefined();
      expect(flyout.left?.params.identityFields).toBeUndefined();
      expect(flyout.right?.params.userName).toBeUndefined();
    });
  });
});

describe('buildUiLinkUrl (prefixed with server base path + space)', () => {
  it('adds no prefix for the default space with an empty server base path', () => {
    expect(buildUiLinkUrl('', 'default', { intent: 'risk_engine_settings' })).toBe(
      '/app/security/entity_analytics_management/risk_score'
    );
  });

  it('prepends a non-empty server base path', () => {
    expect(buildUiLinkUrl('/kbn', 'default', { intent: 'risk_engine_settings' })).toBe(
      '/kbn/app/security/entity_analytics_management/risk_score'
    );
  });

  it('inserts the /s/<space> segment for a non-default space', () => {
    expect(buildUiLinkUrl('', 'my-space', { intent: 'asset_criticality_bulk' })).toBe(
      '/s/my-space/app/security/entity_analytics_management/asset_criticality'
    );
  });

  it('combines server base path and space segment', () => {
    expect(buildUiLinkUrl('/kbn', 'my-space', { intent: 'watchlists_list' })).toBe(
      '/kbn/s/my-space/app/security/entity_analytics_management/watchlists'
    );
  });

  it('keeps the flyout query string intact after the prefix', () => {
    const url = buildUiLinkUrl('/kbn', 'my-space', {
      intent: 'watchlist_edit',
      watchlistId: 'wl-1',
    });
    expect(
      url.startsWith('/kbn/s/my-space/app/security/entity_analytics_management/watchlists?')
    ).toBe(true);
    expect(flyoutOf(url)).toEqual({
      right: { id: 'watchlists-flyout', params: { mode: 'edit', watchlistId: 'wl-1' } },
    });
  });
});

describe('flyout param encoding (rison + markdown-safe percent-encoding)', () => {
  // The tool's `url` is dropped verbatim into a markdown link `[title](url)`. A raw `(` / `)`
  // breaks the link's paren balance and a raw `'` can start a link title — either makes the
  // markdown renderer emit the URL as plain text. Rison itself uses `(` `)` for structure and
  // single-quotes any value containing `: @ .`, so an entity EUID reliably produces all three.
  const MARKDOWN_BREAKING = /[()']/;

  /** The literal, still-encoded `flyout` value as it appears in the URL (NOT percent-decoded). */
  const rawFlyoutValue = (url: string): string => {
    const query = url.split('?')[1] ?? '';
    const match = /(?:^|&)flyout=([^&]*)/.exec(query);
    if (!match) throw new Error('no flyout param in url');
    return match[1];
  };

  it('leaves no raw markdown-breaking chars in the flyout value for a quoted EUID', () => {
    const url = buildUiLinkUrl('', 'default', {
      intent: 'entity_resolution',
      entityType: 'user',
      entityName: 'idp-user-008',
      // `: @ .` force Rison to single-quote the value → would emit ( ) ' unless we escape them.
      entityId: 'user:idp-user-008@example.com@okta',
    });
    expect(rawFlyoutValue(url)).not.toMatch(MARKDOWN_BREAKING);
    // And the whole URL (path + query) is safe to place inside `[title](url)`.
    expect(url).not.toMatch(MARKDOWN_BREAKING);
  });

  it('escapes parens even for the simple watchlist_edit flyout', () => {
    const url = buildUiLinkUrl('', 'default', { intent: 'watchlist_edit', watchlistId: 'wl-1' });
    expect(rawFlyoutValue(url)).not.toMatch(MARKDOWN_BREAKING);
  });

  it('round-trips: percent-decode then rison-decode reproduces the exact flyout object', () => {
    // Includes spaces, quote, parens, and `@` — the encoding must survive all of them so the
    // in-app flyout reader (URLSearchParams.get -> rison decode) rebuilds the same object.
    const entityId = 'user:idp-user-008@example.com@okta';
    const entityName = "o'brien@corp.com (admin)";
    const url = buildUiLinkUrl('', 'default', {
      intent: 'entity_resolution',
      entityType: 'user',
      entityName,
      entityId,
    });

    // `flyoutOf` mirrors the app: `new URLSearchParams(search).get('flyout')` (percent-decode)
    // then rison `decode`.
    const decoded = flyoutOf(url);
    expect(decoded.left?.params.entityId).toBe(entityId);
    expect(decoded.left?.params.userName).toBe(entityName);
    expect(decoded.left?.params.identityFields).toEqual({ 'user.name': entityName });
    expect(decoded.right?.params.entityId).toBe(entityId);
    expect(decoded.right?.params.userName).toBe(entityName);
  });

  it('round-trips the watchlist_edit flyout exactly', () => {
    const url = buildUiLinkUrl('/kbn', 'my-space', {
      intent: 'watchlist_edit',
      watchlistId: 'wl-with-dashes-123',
    });
    expect(flyoutOf(url)).toEqual({
      right: {
        id: 'watchlists-flyout',
        params: { mode: 'edit', watchlistId: 'wl-with-dashes-123' },
      },
    });
  });

  it('encodes a space in an entity name as %20 (not "+") so it decodes back to a space', () => {
    const entityName = 'my server prod';
    const url = buildUiLinkUrl('', 'default', {
      intent: 'entity_resolution',
      entityType: 'host',
      entityName,
      entityId: 'host:abc',
    });
    // `+` would be decoded back to a space by some parsers but is ambiguous — assert we use %20.
    expect(rawFlyoutValue(url)).toContain('%20');
    expect(rawFlyoutValue(url)).not.toContain('+');
    expect(flyoutOf(url).left?.params.hostName).toBe(entityName);
  });
});

// urls.ts can't import across the server/public boundary, so it hardcodes copies of these
// flyout/panel keys. These checks fail if a client-side rename drifts from the copies.
describe('hardcoded flyout/panel keys stay in sync with their public constants', () => {
  it('flyout/tab/scope keys match the values hardcoded in urls.ts', () => {
    expect(WatchlistsFlyoutKey).toBe(WATCHLISTS_FLYOUT_KEY);
    expect(EntityDetailsLeftPanelTab.RESOLUTION_GROUP).toBe(RESOLUTION_GROUP_TAB);
    expect(ENTITY_ANALYTICS_TABLE_ID).toBe(ENTITY_ANALYTICS_HOME_TABLE_SCOPE);
  });

  it('right (preview) entity panel keys match the values hardcoded in urls.ts', () => {
    expect(HostPanelKey).toBe(ENTITY_RESOLUTION_PANEL.host.right);
    expect(UserPanelKey).toBe(ENTITY_RESOLUTION_PANEL.user.right);
    expect(ServicePanelKey).toBe(ENTITY_RESOLUTION_PANEL.service.right);
  });

  it('left (details) entity panel keys match the values hardcoded in urls.ts', () => {
    expect(HostDetailsPanelKey).toBe(ENTITY_RESOLUTION_PANEL.host.left);
    expect(UserDetailsPanelKey).toBe(ENTITY_RESOLUTION_PANEL.user.left);
    expect(ServiceDetailsPanelKey).toBe(ENTITY_RESOLUTION_PANEL.service.left);
  });
});
