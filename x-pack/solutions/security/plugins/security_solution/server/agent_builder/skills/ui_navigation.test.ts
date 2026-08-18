/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_RESOLUTION_GROUP_TAB,
  WATCHLISTS_FLYOUT_KEY,
  ENTITY_ANALYTICS_HOME_TABLE_SCOPE,
  ENTITY_RESOLUTION_PANEL,
  buildResolutionFlyoutTemplate,
  buildWatchlistEditFlyoutTemplate,
} from './ui_navigation';
import {
  HostPanelKey,
  UserPanelKey,
  ServicePanelKey,
  WatchlistsFlyoutKey,
} from '../../../public/flyout/entity_details/shared/constants';
import { HostDetailsPanelKey } from '../../../public/flyout/entity_details/host_details_left';
import { UserDetailsPanelKey } from '../../../public/flyout/entity_details/user_details_left';
import { ServiceDetailsPanelKey } from '../../../public/flyout/entity_details/service_details_left';
import { EntityDetailsLeftPanelTab } from '../../../public/flyout/entity_details/shared/components/left_panel/left_panel_header';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../../public/entity_analytics/components/home/constants';

// ui_navigation.ts can't import across the server/public boundary, so it hardcodes copies of these
// flyout/panel keys. These checks fail if a client-side rename drifts from the copies.
describe('hardcoded flyout/panel keys stay in sync with their public constants', () => {
  it('flyout/tab/scope keys match the values hardcoded in ui_navigation.ts', () => {
    expect(WatchlistsFlyoutKey).toBe(WATCHLISTS_FLYOUT_KEY);
    expect(EntityDetailsLeftPanelTab.RESOLUTION_GROUP).toBe(ENTITY_RESOLUTION_GROUP_TAB);
    expect(ENTITY_ANALYTICS_TABLE_ID).toBe(ENTITY_ANALYTICS_HOME_TABLE_SCOPE);
  });

  it('right (preview) entity panel keys match the values hardcoded in ui_navigation.ts', () => {
    expect(HostPanelKey).toBe(ENTITY_RESOLUTION_PANEL.host.right);
    expect(UserPanelKey).toBe(ENTITY_RESOLUTION_PANEL.user.right);
    expect(ServicePanelKey).toBe(ENTITY_RESOLUTION_PANEL.service.right);
  });

  it('left (details) entity panel keys match the values hardcoded in ui_navigation.ts', () => {
    expect(HostDetailsPanelKey).toBe(ENTITY_RESOLUTION_PANEL.host.left);
    expect(UserDetailsPanelKey).toBe(ENTITY_RESOLUTION_PANEL.user.left);
    expect(ServiceDetailsPanelKey).toBe(ENTITY_RESOLUTION_PANEL.service.left);
  });
});

describe('buildResolutionFlyoutTemplate', () => {
  it('host: builds a template targeting host_details (left) on the resolution tab + host-panel (right)', () => {
    const flyout = buildResolutionFlyoutTemplate('host');
    expect(flyout.left.id).toBe('host_details');
    expect(flyout.left.params.path).toEqual({ tab: 'resolution_group' });
    expect(flyout.left.params.scopeId).toBe('entity-analytics-home-table');
    expect(flyout.right.id).toBe('host-panel');
    expect(flyout.right.params.contextID).toBe('entity-analytics-home-table');
  });

  it('user/service: carry identityFields keyed on the type-specific field', () => {
    expect(buildResolutionFlyoutTemplate('user').left.params.identityFields).toEqual({
      'user.name': '<ENTITY_NAME>',
    });
    expect(buildResolutionFlyoutTemplate('service').left.params.identityFields).toEqual({
      'service.name': '<ENTITY_NAME>',
    });
  });

  it('uses placeholder tokens for the runtime entity id', () => {
    const flyout = buildResolutionFlyoutTemplate('host');
    expect(flyout.left.params.entityId).toBe('<ENTITY_ID>');
    expect(flyout.right.params.entityId).toBe('<ENTITY_ID>');
  });
});

describe('buildWatchlistEditFlyoutTemplate', () => {
  it('builds the watchlists-flyout edit template with a placeholder id', () => {
    expect(buildWatchlistEditFlyoutTemplate()).toEqual({
      right: {
        id: 'watchlists-flyout',
        params: { mode: 'edit', watchlistId: '<WATCHLIST_ID>' },
      },
    });
  });
});
