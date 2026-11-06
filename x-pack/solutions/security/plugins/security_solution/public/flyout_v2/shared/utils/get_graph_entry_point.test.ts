/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGraphEntryPoint } from './get_graph_entry_point';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../../entity_analytics/components/home/constants';
import { getEntityAnalyticsNewHomeScopeId } from '../../../entity_analytics/common/scope_time_ranges';

describe('getGraphEntryPoint', () => {
  it('returns alert_flyout for an alert in event mode', () => {
    expect(getGraphEntryPoint({ mode: 'event', isAlert: true, scopeId: 'any' })).toBe(
      'alert_flyout'
    );
  });

  it('returns event_flyout for a non-alert event in event mode', () => {
    expect(getGraphEntryPoint({ mode: 'event', isAlert: false, scopeId: 'any' })).toBe(
      'event_flyout'
    );
    expect(getGraphEntryPoint({ mode: 'event', scopeId: 'any' })).toBe('event_flyout');
  });

  it('returns entity_data_grid for an entity opened from the Entity Analytics entities table', () => {
    expect(getGraphEntryPoint({ mode: 'entity', scopeId: ENTITY_ANALYTICS_TABLE_ID })).toBe(
      'entity_data_grid'
    );
  });

  it('returns entity_data_grid for an entity opened from the new Entity Analytics home', () => {
    expect(
      getGraphEntryPoint({ mode: 'entity', scopeId: getEntityAnalyticsNewHomeScopeId('24h') })
    ).toBe('entity_data_grid');
  });

  it('returns entity_flyout for an entity opened from any other scope', () => {
    expect(getGraphEntryPoint({ mode: 'entity', scopeId: 'alerts-page' })).toBe('entity_flyout');
  });
});
