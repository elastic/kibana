/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Automation } from '../hooks/use_automations';
import {
  countFilterValues,
  EMPTY_FILTERS,
  getAutomationFacets,
  hasActiveFilters,
  isAutomationRateLimited,
  matchesFilters,
  STATUS_ORDER,
} from './filter_automations';

const buildAutomation = (overrides: Partial<Automation> = {}): Automation => ({
  id: 'automation-1',
  name: 'Triage alerts',
  automationType: 'custom',
  isEnabled: true,
  tags: ['oncall'],
  trigger: { rows: [{ kind: 'slack', event: 'message' }] },
  execution: {},
  completion: {},
  runtime: { dailyDispatchLimit: 5 },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  author: 'elastic',
  ...overrides,
});

describe('filter automations', () => {
  it('detects automations that reached their daily limit', () => {
    expect(isAutomationRateLimited(buildAutomation(), 5)).toBe(true);
    expect(isAutomationRateLimited(buildAutomation(), 4)).toBe(false);
    expect(isAutomationRateLimited(buildAutomation({ runtime: {} }), 100)).toBe(false);
    expect(isAutomationRateLimited(buildAutomation({ isEnabled: false }), 5)).toBe(false);
  });

  it('describes an automation with statuses, tags, author, and triggers', () => {
    expect(
      getAutomationFacets(buildAutomation(), { isRateLimited: true, currentUsername: 'elastic' })
    ).toEqual({
      statuses: ['Enabled', 'Rate limited'],
      tags: ['oncall'],
      author: 'You',
      triggers: ['New message in channel'],
    });
    expect(
      getAutomationFacets(buildAutomation({ isEnabled: false }), { isRateLimited: false })
    ).toMatchObject({ statuses: ['Paused'], author: 'elastic' });
  });

  it('counts values once per automation and sorts them', () => {
    expect(countFilterValues([['b', 'a', 'a'], ['a']])).toEqual([
      { label: 'a', count: 2 },
      { label: 'b', count: 1 },
    ]);
    expect(countFilterValues([['Rate limited'], ['Paused'], ['Enabled']], STATUS_ORDER)).toEqual([
      { label: 'Enabled', count: 1 },
      { label: 'Paused', count: 1 },
      { label: 'Rate limited', count: 1 },
    ]);
  });

  it('matches search text and selected filters', () => {
    const automation = buildAutomation({ description: 'Pages the on-call engineer' });
    const facets = getAutomationFacets(automation, { isRateLimited: false });

    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(matchesFilters(automation, facets, EMPTY_FILTERS)).toBe(true);
    expect(matchesFilters(automation, facets, { ...EMPTY_FILTERS, search: 'ON-CALL' })).toBe(true);
    expect(matchesFilters(automation, facets, { ...EMPTY_FILTERS, search: 'report' })).toBe(false);
    expect(matchesFilters(automation, facets, { ...EMPTY_FILTERS, statuses: ['Paused'] })).toBe(
      false
    );
    expect(
      matchesFilters(automation, facets, {
        ...EMPTY_FILTERS,
        tags: ['oncall'],
        triggers: ['New message in channel'],
      })
    ).toBe(true);
  });
});
