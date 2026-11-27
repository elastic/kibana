/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredCompositeSLODefinition } from '../../domain/models';

export interface Usage {
  slo: {
    total: number; // deprecated
    definitions: {
      total: number;
      total_with_ccs: number;
      total_with_groups: number;
    };
    instances: {
      total: number;
    };
    by_status: {
      enabled: number;
      disabled: number;
    };
    by_sli_type: {
      [sli_type: string]: number;
    };
    by_rolling_duration: {
      [duration: string]: number;
    };
    by_calendar_aligned_duration: {
      [duration: string]: number;
    };
    by_budgeting_method: {
      occurrences: number;
      timeslices: number;
    };
  };
  composite: {
    definitions: {
      total: number;
    };
    by_status: {
      enabled: number;
      disabled: number;
    };
    by_budgeting_method: {
      occurrences: number;
    };
    by_composite_method: {
      weightedAverage: number;
    };
    members: {
      min: number;
      avg: number;
      max: number;
      at_max_count: number;
    };
  };
}

/**
 * The telemetry schema parser (`scripts/telemetry_check`) walks the usage type statically and cannot
 * follow types inferred from zod, so the `by_composite_method` and `by_budgeting_method` keys above
 * are written by hand. These checks fail to compile when `compositeMethod` or `budgetingMethod`
 * gain a value the keys do not cover.
 */
type AssertCovered<Enum extends Keys, Keys> = Enum;
export type CompositeBudgetingMethodKeysCheck = AssertCovered<
  StoredCompositeSLODefinition['budgetingMethod'],
  keyof Usage['composite']['by_budgeting_method']
>;
export type CompositeMethodKeysCheck = AssertCovered<
  StoredCompositeSLODefinition['compositeMethod'],
  keyof Usage['composite']['by_composite_method']
>;
