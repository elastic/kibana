/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { createSLO, createKQLCustomIndicator } from '../fixtures/slo';
import {
  sevenDaysRolling,
  thirtyDaysRolling,
  monthlyCalendarAligned,
  weeklyCalendarAligned,
} from '../fixtures/time_window';
import { getSloApmLabels } from './get_slo_apm_labels';

describe('getSloApmLabels', () => {
  it('returns all four labels for a rolling SLO with no group-by', () => {
    const slo = createSLO({
      indicator: createKQLCustomIndicator(),
      timeWindow: sevenDaysRolling(),
      budgetingMethod: 'occurrences',
      groupBy: ALL_VALUE,
    });

    expect(getSloApmLabels(slo)).toEqual({
      slo_indicator_type: 'sli.kql.custom',
      slo_budgeting_method: 'occurrences',
      slo_time_window: 'rolling_7d',
      slo_has_group_by: false,
      slo_prevent_initial_backfill: false,
    });
  });

  it('serialises a 30-day rolling window correctly', () => {
    const slo = createSLO({ timeWindow: thirtyDaysRolling() });

    expect(getSloApmLabels(slo).slo_time_window).toBe('rolling_30d');
  });

  it('serialises a monthly calendar-aligned window correctly', () => {
    const slo = createSLO({ timeWindow: monthlyCalendarAligned() });

    expect(getSloApmLabels(slo).slo_time_window).toBe('calendarAligned_1M');
  });

  it('serialises a weekly calendar-aligned window correctly', () => {
    const slo = createSLO({ timeWindow: weeklyCalendarAligned() });

    expect(getSloApmLabels(slo).slo_time_window).toBe('calendarAligned_1w');
  });

  it('returns has_group_by true when groupBy is a real field', () => {
    const slo = createSLO({ groupBy: 'host.name' });

    expect(getSloApmLabels(slo).slo_has_group_by).toBe(true);
  });

  it('returns has_group_by false when groupBy is ALL_VALUE', () => {
    const slo = createSLO({ groupBy: ALL_VALUE });

    expect(getSloApmLabels(slo).slo_has_group_by).toBe(false);
  });

  it('returns timeslices budgeting method', () => {
    const slo = createSLO({
      budgetingMethod: 'timeslices',
      objective: {
        target: 0.99,
        timesliceTarget: 0.95,
        timesliceWindow: sevenDaysRolling().duration,
      },
    });

    expect(getSloApmLabels(slo).slo_budgeting_method).toBe('timeslices');
  });
});
