/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLOInput } from '@kbn/slo-schema';

export const DEFAULT_SLO: CreateSLOInput = {
  name: 'Test SLO for api integration',
  description: 'Fixture for api integration tests',
  indicator: {
    type: 'sli.kql.custom',
    params: {
      index: 'kbn-data-forge*',
      filter: 'system.network.name: eth1',
      good: 'container.cpu.user.pct < 1',
      total: 'container.cpu.user.pct: *',
      timestampField: '@timestamp',
    },
  },
  budgetingMethod: 'occurrences',
  timeWindow: {
    duration: '7d',
    type: 'rolling',
  },
  objective: {
    target: 0.99,
  },
  tags: ['test'],
  groupBy: 'tags',
};
