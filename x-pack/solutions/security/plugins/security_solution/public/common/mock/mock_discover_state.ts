/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionDiscoverState } from '../store/discover/model';

export const getMockDiscoverInTimelineState: () => SecuritySolutionDiscoverState = () => ({
  app: {
    query: {
      language: 'kuery',
      query: '',
    },
    sort: [['@timestamp', 'desc']],
    columns: ['event.module', 'user.name', 'host.name'],
    index: 'security-solution-default',
    interval: 'auto',
    filters: [],
    breakdownField: 'user.name',
  },
  internal: undefined,
  savedSearch: undefined,
});
