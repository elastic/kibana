/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ValueMetrics } from '../components/ai_value/metrics';
import {
  SAMPLE_ANALYST_HOURLY_RATE,
  SAMPLE_FROM,
  SAMPLE_MINUTES_PER_ALERT,
  SAMPLE_TO,
  SAMPLE_VALUE_METRICS,
  SAMPLE_VALUE_METRICS_COMPARE,
} from '../components/ai_value/sample_data';
import { useValueMetrics } from './use_value_metrics';
import { useHasEverUsedAttackDiscovery } from './use_has_ever_used_attack_discovery';

interface Props {
  from: string;
  to: string;
  minutesPerAlert: number;
  analystHourlyRate: number;
}

export interface ValueReportData {
  isLoading: boolean;
  isSample: boolean;
  hasEverUsedAttackDiscovery: boolean;
  attackAlertIds: string[];
  analystHourlyRate: number;
  minutesPerAlert: number;
  from: string;
  to: string;
  valueMetrics: ValueMetrics;
  valueMetricsCompare: ValueMetrics;
}

/**
 * Resolves the data the AI Value Report should render. Returns either live
 * metrics or the sample/onboarding dataset behind a uniform shape, so consumers
 * don't have to branch on `isSample` to read fields.
 *
 * Sample mode is only entered when the user has never used Attack Discovery
 * AND the current range has zero discoveries. Otherwise we render live data,
 * even when the range happens to be empty.
 */
export const useValueReportData = ({
  from,
  to,
  minutesPerAlert,
  analystHourlyRate,
}: Props): ValueReportData => {
  const {
    attackAlertIds,
    isLoading: isLoadingMetrics,
    valueMetrics,
    valueMetricsCompare,
  } = useValueMetrics({ from, to, minutesPerAlert, analystHourlyRate });

  const { hasEverUsedAttackDiscovery, isLoading: isLoadingHistory } =
    useHasEverUsedAttackDiscovery();

  const isLoading = isLoadingMetrics || isLoadingHistory;

  const isSample =
    !isLoading && valueMetrics.attackDiscoveryCount === 0 && !hasEverUsedAttackDiscovery;

  return useMemo<ValueReportData>(() => {
    if (isSample) {
      return {
        isLoading,
        isSample: true,
        hasEverUsedAttackDiscovery,
        attackAlertIds: [],
        analystHourlyRate: SAMPLE_ANALYST_HOURLY_RATE,
        minutesPerAlert: SAMPLE_MINUTES_PER_ALERT,
        from: SAMPLE_FROM,
        to: SAMPLE_TO,
        valueMetrics: SAMPLE_VALUE_METRICS,
        valueMetricsCompare: SAMPLE_VALUE_METRICS_COMPARE,
      };
    }
    return {
      isLoading,
      isSample: false,
      hasEverUsedAttackDiscovery,
      attackAlertIds,
      analystHourlyRate,
      minutesPerAlert,
      from,
      to,
      valueMetrics,
      valueMetricsCompare,
    };
  }, [
    isLoading,
    isSample,
    hasEverUsedAttackDiscovery,
    attackAlertIds,
    analystHourlyRate,
    minutesPerAlert,
    from,
    to,
    valueMetrics,
    valueMetricsCompare,
  ]);
};
