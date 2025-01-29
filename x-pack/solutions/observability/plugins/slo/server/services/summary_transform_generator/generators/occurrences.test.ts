/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLO } from '../../fixtures/slo';
import {
  monthlyCalendarAligned,
  thirtyDaysRolling,
  weeklyCalendarAligned,
} from '../../fixtures/time_window';
import { generateSummaryTransformForOccurrences } from './occurrences';

describe("Summary Transform Generator for 'Occurrences' SLO", () => {
  it('generates the correct transform for a weekly calendar aligned SLO', async () => {
    const slo = createSLO({
      id: 'irrelevant',
      budgetingMethod: 'occurrences',
      timeWindow: weeklyCalendarAligned(),
    });

    const transform = generateSummaryTransformForOccurrences(slo);

    expect(transform).toMatchSnapshot();
  });

  it('generates the correct transform for a monthly calendar aligned SLO', async () => {
    const slo = createSLO({
      id: 'irrelevant',
      budgetingMethod: 'occurrences',
      timeWindow: monthlyCalendarAligned(),
    });

    const transform = generateSummaryTransformForOccurrences(slo);

    expect(transform).toMatchSnapshot();
  });

  it('generates the correct transform for a 30days rolling SLO', async () => {
    const slo = createSLO({
      id: 'irrelevant',
      budgetingMethod: 'occurrences',
      timeWindow: thirtyDaysRolling(),
    });

    const transform = generateSummaryTransformForOccurrences(slo);

    expect(transform).toMatchSnapshot();
  });
});
