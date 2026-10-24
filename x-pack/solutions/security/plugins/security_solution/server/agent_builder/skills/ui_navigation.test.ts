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
  WATCHLISTS_UI_NAVIGATION_CONTENT,
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

// The manage-watchlists UI-navigation section is the reply contract the agent follows when it
// declines and redirects. The eval suite (kbn-evals-suite-entity-analytics, "UI navigation —
// watchlist edit flyout") grades the reply against it, so the contract has to be stated
// explicitly and testably: the three decline parts, the "pick from the list" instruction for
// the bare-tab destination, and the rule that a missing CSV attachment does not change the
// destination. The reply-shape assertions below fail on the pre-fix section text.
describe('WATCHLISTS_UI_NAVIGATION_CONTENT reply-shape contract', () => {
  const flat = WATCHLISTS_UI_NAVIGATION_CONTENT.replace(/\s+/g, ' ');

  it('states the required reply shape as an ordered checklist of decline, why, link', () => {
    const decline = flat.indexOf('**Decline**');
    const why = flat.indexOf('**Why**');
    const link = flat.indexOf('**The link**');

    expect(flat).toContain('**Required reply shape.**');
    expect(decline).toBeGreaterThan(-1);
    expect(why).toBeGreaterThan(decline);
    expect(link).toBeGreaterThan(why);
  });

  it('requires the bare-tab destination reply to tell the user to pick a watchlist from the list', () => {
    const destination = flat.indexOf('**No specific watchlist**');
    const pick = flat.search(/tell the user to pick the watchlist from the list/i);

    expect(destination).toBeGreaterThan(-1);
    expect(pick).toBeGreaterThan(destination);
  });

  it('says a missing CSV attachment does not change the destination', () => {
    expect(flat).toContain('A missing attachment does not change the destination.');
    expect(flat).toMatch(/do \*\*not\*\* ask them to attach it/i);
  });

  it('keeps the CSV-upload intent on the edit-flyout destination', () => {
    const intent = flat.indexOf('**Upload a CSV**');
    expect(intent).toBeGreaterThan(-1);
    expect(flat.slice(intent)).toMatch(/edit flyout/i);
  });
});
