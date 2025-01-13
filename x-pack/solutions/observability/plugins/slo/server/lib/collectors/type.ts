/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Usage {
  slo: {
    total: number;
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
}
