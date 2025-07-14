/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dataset, PartialConfig } from '@kbn/data-forge/src/types';

export const DATA_FORGE_CONFIG: PartialConfig = {
  schedule: [
    {
      template: 'good',
      start: 'now-15m',
      end: 'now+5m',
      metrics: [
        { name: 'system.cpu.user.pct', method: 'linear', start: 2.5, end: 2.5 },
        { name: 'system.cpu.total.pct', method: 'linear', start: 0.5, end: 0.5 },
        { name: 'system.cpu.total.norm.pct', method: 'linear', start: 0.8, end: 0.8 },
      ],
    },
  ],
  indexing: { dataset: 'fake_hosts' as Dataset, eventsPerCycle: 1 },
};
