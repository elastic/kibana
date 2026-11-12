/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGraphEntryPoint, getGraphEntryPointFromOrigin } from './get_graph_entry_point';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../../entity_analytics/components/home/constants';
import { getEntityAnalyticsNewHomeScopeId } from '../../../entity_analytics/common/scope_time_ranges';

describe('getGraphEntryPoint', () => {
  it('returns alert_flyout for an alert in event mode', () => {
    expect(getGraphEntryPoint({ mode: 'event', isAlert: true })).toBe('alert_flyout');
  });

  it('returns event_flyout for a non-alert event in event mode', () => {
    expect(getGraphEntryPoint({ mode: 'event', isAlert: false })).toBe('event_flyout');
    expect(getGraphEntryPoint({ mode: 'event' })).toBe('event_flyout');
  });

  it('returns entity_flyout in entity mode', () => {
    expect(getGraphEntryPoint({ mode: 'entity' })).toBe('entity_flyout');
  });

  it('ignores isAlert in entity mode', () => {
    expect(getGraphEntryPoint({ mode: 'entity', isAlert: true })).toBe('entity_flyout');
  });

  it.each([ENTITY_ANALYTICS_TABLE_ID, getEntityAnalyticsNewHomeScopeId('24h')])(
    'does not derive the entry point from a scope id such as %s',
    (scopeId) => {
      // A scope id cannot tell a flyout opened from the entities table from the grid row action,
      // so the function takes none; a stray one must not change the outcome.
      const params = { mode: 'entity' as const, scopeId };

      expect(getGraphEntryPoint(params)).toBe('entity_flyout');
    }
  );
});

describe('getGraphEntryPointFromOrigin', () => {
  it('returns ai_chat_attachment for the AI chat entity attachment origin', () => {
    expect(getGraphEntryPointFromOrigin(FLYOUT_ORIGIN.AI_CHAT_ENTITY_ATTACHMENT)).toBe(
      'ai_chat_attachment'
    );
  });

  it.each([
    FLYOUT_ORIGIN.URL_RESTORE,
    FLYOUT_ORIGIN.ENTITIES_TABLE,
    FLYOUT_ORIGIN.VISUALIZATIONS_GRAPH,
    undefined,
  ])('returns undefined for origin %s', (origin) => {
    expect(getGraphEntryPointFromOrigin(origin)).toBeUndefined();
  });
});
