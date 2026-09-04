/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OVERVIEW_STATUS_MAX_PER_PAGE } from '../../../../../common/constants/monitor_management';
import type { OverviewStatusMetaData } from '../../../../../common/runtime_types';
import {
  getCardWindowRefreshPayload,
  getGroupedFillPageState,
  getNextOverviewAppendPage,
  getNextWindowRefreshPage,
  isOverviewGrouped,
  restrictOverviewPageToExistingKeys,
} from './window_refresh';

const meta = (configId: string, name = configId): OverviewStatusMetaData =>
  ({
    configId,
    monitorQueryId: configId,
    name,
    schedule: '3',
    tags: [],
    isEnabled: true,
    type: 'http',
    isStatusAlertEnabled: false,
    overallStatus: 'up',
    locations: [{ id: 'us_east', label: 'US East', status: 'up' }],
  } as OverviewStatusMetaData);

describe('isOverviewGrouped / getGroupedFillPageState', () => {
  it('treats none and monitor as ungrouped', () => {
    expect(isOverviewGrouped('none')).toBe(false);
    expect(isOverviewGrouped('monitor')).toBe(false);
    expect(isOverviewGrouped(undefined)).toBe(false);
    expect(isOverviewGrouped('locationId')).toBe(true);
  });

  it('requests page 1 at the route max so grouped fills do not 400', () => {
    expect(getGroupedFillPageState({ page: 3, perPage: 20, query: 'foo' })).toEqual({
      page: 1,
      perPage: OVERVIEW_STATUS_MAX_PER_PAGE,
      query: 'foo',
    });
  });
});

describe('getCardWindowRefreshPayload', () => {
  const pageState = { page: 3, perPage: 20, query: 'foo' };

  it('refreshes the loaded window from page 1 when it fits in one request', () => {
    expect(getCardWindowRefreshPayload(pageState, 40)).toEqual({
      pageState: { ...pageState, page: 1, perPage: 40 },
    });
  });

  it('clamps perPage to the route max and records refreshThrough for the remainder', () => {
    const loadedCount = OVERVIEW_STATUS_MAX_PER_PAGE + 40;
    expect(getCardWindowRefreshPayload(pageState, loadedCount)).toEqual({
      pageState: { ...pageState, page: 1, perPage: OVERVIEW_STATUS_MAX_PER_PAGE },
      refreshThrough: loadedCount,
    });
  });
});

describe('getNextOverviewAppendPage', () => {
  it('requests the next page after a full window', () => {
    expect(getNextOverviewAppendPage(40, 20, 100)).toBe(3);
  });

  it('does not stall when a refresh drops a monitor and loaded is no longer a multiple of perPage', () => {
    expect(getNextOverviewAppendPage(39, 20, 100)).toBe(3);
  });

  it('returns null when the loaded window already covers total', () => {
    expect(getNextOverviewAppendPage(40, 20, 40)).toBeNull();
    expect(getNextOverviewAppendPage(39, 20, 39)).toBeNull();
  });

  it('returns null when the next page would start past total', () => {
    expect(getNextOverviewAppendPage(39, 20, 40)).toBeNull();
  });
});

describe('getNextWindowRefreshPage', () => {
  it('returns the next page while the window is not yet covered', () => {
    expect(getNextWindowRefreshPage(1, 500, 600)).toEqual({ page: 2, perPage: 500 });
  });

  it('returns null once page * perPage covers refreshThrough', () => {
    expect(getNextWindowRefreshPage(2, 500, 600)).toBeNull();
    expect(getNextWindowRefreshPage(1, 40, 40)).toBeNull();
  });

  it('keeps perPage stable so offsets stay aligned with the first request', () => {
    expect(getNextWindowRefreshPage(1, 500, 1200)).toEqual({ page: 2, perPage: 500 });
    expect(getNextWindowRefreshPage(2, 500, 1200)).toEqual({ page: 3, perPage: 500 });
  });
});

describe('restrictOverviewPageToExistingKeys', () => {
  it('drops incoming configs the loaded window does not already contain', () => {
    const existing = [meta('a'), meta('b'), meta('c')];
    const incoming = {
      configs: [meta('b', 'updated'), meta('c'), meta('d')],
      upConfigs: {
        b: meta('b', 'updated'),
        c: meta('c'),
        d: meta('d'),
      },
      downConfigs: {},
      pendingConfigs: {},
      staleConfigs: {},
      disabledConfigs: {},
    } as any;

    const restricted = restrictOverviewPageToExistingKeys(existing, incoming);

    expect(restricted.configs?.map((config) => config.configId)).toEqual(['b', 'c']);
    expect(restricted.upConfigs).toEqual({
      b: meta('b', 'updated'),
      c: meta('c'),
    });
  });
});
