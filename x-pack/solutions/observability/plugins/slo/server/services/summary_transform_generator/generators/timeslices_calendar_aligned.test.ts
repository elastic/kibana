/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLOWithTimeslicesBudgetingMethod } from '../../fixtures/slo';
import { monthlyCalendarAligned } from '../../fixtures/time_window';
import { generateSummaryTransformForTimeslicesAndCalendarAligned } from './timeslices_calendar_aligned';

describe("Summary Transform Generator for 'Timeslices' and 'CalendarAligned' SLO", () => {
  it('generates the correct transform for a 7 days SLO', async () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      timeWindow: monthlyCalendarAligned(),
    });

    const transform = generateSummaryTransformForTimeslicesAndCalendarAligned(slo);

    expect(transform).toMatchSnapshot();
  });
});
