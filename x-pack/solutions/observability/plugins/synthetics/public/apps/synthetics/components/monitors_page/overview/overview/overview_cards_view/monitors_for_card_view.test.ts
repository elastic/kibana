/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';
import { monitorsForCardView } from './monitors_for_card_view';

const monitor = (
  overrides: Partial<OverviewStatusMetaData> & { configId: string }
): OverviewStatusMetaData =>
  ({
    monitorQueryId: overrides.configId,
    name: 'https://fast.com',
    schedule: '3',
    tags: [],
    isEnabled: true,
    type: 'browser',
    isStatusAlertEnabled: false,
    overallStatus: 'pending',
    locations: [],
    ...overrides,
  } as OverviewStatusMetaData);

const twoLocations = monitor({
  configId: 'fast',
  locations: [
    { id: 'us_central', label: 'North America - US Central', status: 'pending' },
    { id: 'us_central_qa', label: 'US Central QA', status: 'pending' },
  ],
});

describe('monitorsForCardView', () => {
  it('keeps one card per config when grouped by monitor', () => {
    const cards = monitorsForCardView([twoLocations], 'monitor');

    expect(cards).toHaveLength(1);
    expect(cards[0].configId).toBe('fast');
    expect(cards[0].locations).toHaveLength(2);
  });

  it('renders one card per location for the default view', () => {
    const cards = monitorsForCardView([twoLocations], 'none');

    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.locations[0].id)).toEqual(['us_central', 'us_central_qa']);
    expect(cards.every((card) => card.locations.length === 1)).toBe(true);
    expect(cards.every((card) => card.configId === 'fast')).toBe(true);
  });

  it('leaves single-location monitors unchanged', () => {
    const single = monitor({
      configId: 'single',
      locations: [{ id: 'us_east', label: 'US East', status: 'up' }],
    });

    expect(monitorsForCardView([single], 'monitor')).toEqual([single]);
    expect(monitorsForCardView([single], 'none')).toEqual([single]);
  });
});
