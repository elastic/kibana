/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useEffect, useState } from 'react';
import { useFetchRulesForSlo } from '../../../hooks/use_fetch_rules_for_slo';
import { Duration } from '../../../typings';

export interface BurnRateWindow {
  name: string;
  threshold: number;
  longWindow: Duration;
  shortWindow: Duration;
}

export const DEFAULT_BURN_RATE_WINDOWS: BurnRateWindow[] = [
  {
    name: 'CRITICAL',
    threshold: 14.4,
    longWindow: { value: 1, unit: 'h' },
    shortWindow: { value: 5, unit: 'm' },
  },
  {
    name: 'HIGH',
    threshold: 6,
    longWindow: { value: 6, unit: 'h' },
    shortWindow: { value: 30, unit: 'm' },
  },
  {
    name: 'MEDIUM',
    threshold: 3,
    longWindow: { value: 24, unit: 'h' },
    shortWindow: { value: 2, unit: 'h' },
  },
  {
    name: 'LOW',
    threshold: 1,
    longWindow: { value: 72, unit: 'h' },
    shortWindow: { value: 6, unit: 'h' },
  },
];

export const useFetchBurnRateWindows = (slo: SLOWithSummaryResponse) => {
  const sloId = slo.id;
  const [burnRateWindows, setBurnRateWindows] =
    useState<BurnRateWindow[]>(DEFAULT_BURN_RATE_WINDOWS);
  const { data: rules, isLoading } = useFetchRulesForSlo({ sloIds: [sloId] });

  useEffect(() => {
    if (!isLoading && rules && rules[sloId]) {
      setBurnRateWindows(
        rules[sloId][0]?.params?.windows?.map((window) => ({
          name: window.actionGroup,
          threshold: window.burnRateThreshold,
          longWindow: window.longWindow,
          shortWindow: window.shortWindow,
        })) ?? DEFAULT_BURN_RATE_WINDOWS
      );
    }
  }, [rules, sloId, isLoading]);

  return burnRateWindows;
};
