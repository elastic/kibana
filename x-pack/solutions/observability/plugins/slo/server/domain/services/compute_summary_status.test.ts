/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createErrorBudget } from '../../services/fixtures/error_budget';
import { computeSummaryStatus } from './compute_summary_status';

describe('ComputeSummaryStatus', () => {
  it("returns 'NO_DATA' when sliValue is -1", () => {
    expect(computeSummaryStatus({ target: 0.9 }, -1, createErrorBudget())).toBe('NO_DATA');
  });

  it("returns 'HEALTHY' when sliValue >= target objective", () => {
    expect(computeSummaryStatus({ target: 0.9 }, 0.9, createErrorBudget())).toBe('HEALTHY');

    expect(computeSummaryStatus({ target: 0.9 }, 0.99, createErrorBudget())).toBe('HEALTHY');
  });

  it("returns 'DEGRADING' when sliValue < target objective with some remaining error budget", () => {
    expect(
      computeSummaryStatus(
        { target: 0.9 },
        0.8,
        createErrorBudget({ remaining: 0.01, consumed: 0.99 })
      )
    ).toBe('DEGRADING');
  });

  it("returns 'VIOLATED' when sliValue < target objective and error budget is consummed", () => {
    expect(
      computeSummaryStatus(
        { target: 0.9 },
        0.8,
        createErrorBudget({ remaining: 0, consumed: 1.34 })
      )
    ).toBe('VIOLATED');
  });
});
