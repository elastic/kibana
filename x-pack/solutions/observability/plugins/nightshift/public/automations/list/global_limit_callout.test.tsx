/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunQuotasResponse } from '@kbn/significant-events-plugin/common';
import { isGlobalInvestigationLimitReached } from '../utils/filter_automations';

const quotas = ({
  enabled = true,
  limit = 3,
  used = 3,
}: {
  enabled?: boolean;
  limit?: number;
  used?: number;
}): RunQuotasResponse => ({
  enabled,
  limits: { detection: 0, ki_extraction: 0, investigation: limit },
  counts: { detection: 0, ki_extraction: 0, investigation: used },
  window: {
    start: '2026-09-03T00:00:00.000Z',
    resetsAt: '2026-09-04T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage: true,
});

describe('isGlobalInvestigationLimitReached', () => {
  it.each([
    [undefined, false],
    [quotas({ used: 2 }), false],
    [quotas({ used: 3 }), true],
    [quotas({ limit: 0, used: 5 }), false],
    [quotas({ enabled: false }), false],
  ])('%j -> %s', (input, expected) => {
    expect(isGlobalInvestigationLimitReached(input)).toBe(expected);
  });
});
