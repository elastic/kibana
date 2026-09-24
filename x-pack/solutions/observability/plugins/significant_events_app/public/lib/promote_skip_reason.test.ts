/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPromoteSkipReason } from './promote_skip_reason';
import {
  NOT_FILTER_ONLY_PROMOTE_DISABLED,
  STATS_PROMOTE_DISABLED_TOOLTIP,
} from '../pages/significant_events/components/queries_table/translations';

describe('getPromoteSkipReason', () => {
  it('returns nothing when every requested query was promoted', () => {
    expect(
      getPromoteSkipReason({ promoted: 3, skipped_stats: 0, skipped_ineligible: 0 })
    ).toBeUndefined();
  });

  it('asks for a filter-only query when a MATCH shape was skipped', () => {
    expect(getPromoteSkipReason({ promoted: 0, skipped_stats: 0, skipped_ineligible: 1 })).toBe(
      NOT_FILTER_ONLY_PROMOTE_DISABLED
    );
  });

  it('explains that STATS is not backable yet when only STATS was skipped', () => {
    expect(getPromoteSkipReason({ promoted: 0, skipped_stats: 2, skipped_ineligible: 0 })).toBe(
      STATS_PROMOTE_DISABLED_TOOLTIP
    );
  });

  it('prefers the actionable reason when a bulk promote hit both', () => {
    expect(getPromoteSkipReason({ promoted: 1, skipped_stats: 1, skipped_ineligible: 1 })).toBe(
      NOT_FILTER_ONLY_PROMOTE_DISABLED
    );
  });
});
