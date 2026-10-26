/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoverageOverviewRuleActivity } from '../../../../../common/api/detection_engine';
import type { CoverageOverviewDashboardState, Action } from './coverage_overview_dashboard_reducer';
import {
  SET_FRAMEWORK,
  SET_RULE_ACTIVITY_FILTER,
  SET_RULE_SEARCH_FILTER,
  SET_RULE_SOURCE_FILTER,
  SET_SHOW_EXPANDED_CELLS,
  createCoverageOverviewDashboardReducer,
} from './coverage_overview_dashboard_reducer';

const reducer = createCoverageOverviewDashboardReducer();

const baseState: CoverageOverviewDashboardState = {
  showExpandedCells: false,
  filter: { activity: [CoverageOverviewRuleActivity.Enabled] },
  framework: 'enterprise',
  frameworkVersion: undefined,
  isLoading: false,
  isMitreError: false,
  data: undefined,
};

describe('coverage overview dashboard reducer', () => {
  it('SET_FRAMEWORK sets framework and leaves the filter untouched', () => {
    const next = reducer(baseState, { type: SET_FRAMEWORK, value: 'atlas' });

    expect(next.framework).toBe('atlas');
    expect(next.filter).toBe(baseState.filter);
  });

  const otherActions: Action[] = [
    { type: SET_RULE_ACTIVITY_FILTER, value: [CoverageOverviewRuleActivity.Disabled] },
    { type: SET_RULE_SOURCE_FILTER, value: [] },
    { type: SET_RULE_SEARCH_FILTER, value: 'foo' },
    { type: SET_SHOW_EXPANDED_CELLS, value: true },
  ];

  it.each(otherActions)('$type leaves framework unchanged', (action) => {
    const state = { ...baseState, framework: 'atlas' as const };

    expect(reducer(state, action).framework).toBe('atlas');
  });
});
