/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoverageOverviewRuleSource,
  CoverageOverviewRuleActivity,
} from './coverage_overview_route';

export const getCoverageOverviewFilterMock = () => ({
  search_term: 'test query',
  activity: [CoverageOverviewRuleActivity.Enabled],
  source: [CoverageOverviewRuleSource.Prebuilt],
});
