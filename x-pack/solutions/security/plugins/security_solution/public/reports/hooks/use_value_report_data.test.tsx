/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useValueReportData } from './use_value_report_data';
import { useValueMetrics } from '../components/ai_value/hooks/use_value_metrics';
import { useHasEverUsedAttackDiscovery } from '../components/ai_value/hooks/use_has_ever_used_attack_discovery';
import {
  SAMPLE_ANALYST_HOURLY_RATE,
  SAMPLE_FROM,
  SAMPLE_MINUTES_PER_ALERT,
  SAMPLE_TO,
  SAMPLE_VALUE_METRICS,
  SAMPLE_VALUE_METRICS_COMPARE,
} from '../components/ai_value/sample_data';
import type { ValueMetrics } from '../components/ai_value/metrics';

jest.mock('../components/ai_value/hooks/use_value_metrics');
jest.mock('../components/ai_value/hooks/use_has_ever_used_attack_discovery');

const mockUseValueMetrics = useValueMetrics as jest.MockedFunction<typeof useValueMetrics>;
const mockUseHasEverUsedAttackDiscovery = useHasEverUsedAttackDiscovery as jest.MockedFunction<
  typeof useHasEverUsedAttackDiscovery
>;

const LIVE_METRICS: ValueMetrics = {
  attackDiscoveryCount: 3,
  filteredAlerts: 100,
  filteredAlertsPerc: 90,
  escalatedAlertsPerc: 10,
  hoursSaved: 12,
  totalAlerts: 110,
  costSavings: 900,
};

const LIVE_METRICS_COMPARE: ValueMetrics = {
  attackDiscoveryCount: 1,
  filteredAlerts: 50,
  filteredAlertsPerc: 80,
  escalatedAlertsPerc: 20,
  hoursSaved: 6,
  totalAlerts: 60,
  costSavings: 400,
};

const EMPTY_LIVE_METRICS: ValueMetrics = { ...LIVE_METRICS, attackDiscoveryCount: 0 };

const LIVE_ALERT_IDS = ['live-alert-1', 'live-alert-2'];

const PROPS = {
  from: '2026-04-01T00:00:00.000Z',
  to: '2026-05-01T00:00:00.000Z',
  minutesPerAlert: 12,
  analystHourlyRate: 100,
};

const mockMetrics = ({
  isLoading = false,
  valueMetrics = LIVE_METRICS,
  valueMetricsCompare = LIVE_METRICS_COMPARE,
  attackAlertIds = LIVE_ALERT_IDS,
}: Partial<ReturnType<typeof useValueMetrics>> = {}) => {
  mockUseValueMetrics.mockReturnValue({
    isLoading,
    valueMetrics,
    valueMetricsCompare,
    attackAlertIds,
  });
};

const mockHistory = ({
  hasEverUsedAttackDiscovery = false,
  isLoading = false,
}: Partial<ReturnType<typeof useHasEverUsedAttackDiscovery>> = {}) => {
  mockUseHasEverUsedAttackDiscovery.mockReturnValue({
    hasEverUsedAttackDiscovery,
    isLoading,
  });
};

describe('useValueReportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sample vs live mode', () => {
    it('enters sample mode when the feature was never used and the range is empty, overriding props with sample constants', () => {
      mockMetrics({ valueMetrics: EMPTY_LIVE_METRICS });
      mockHistory({ hasEverUsedAttackDiscovery: false });

      const { result } = renderHook(() => useValueReportData(PROPS));

      expect(result.current).toEqual({
        isLoading: false,
        isSample: true,
        hasEverUsedAttackDiscovery: false,
        attackAlertIds: [],
        analystHourlyRate: SAMPLE_ANALYST_HOURLY_RATE,
        minutesPerAlert: SAMPLE_MINUTES_PER_ALERT,
        from: SAMPLE_FROM,
        to: SAMPLE_TO,
        valueMetrics: SAMPLE_VALUE_METRICS,
        valueMetricsCompare: SAMPLE_VALUE_METRICS_COMPARE,
      });
    });

    it('stays in live mode when the feature was ever used, even if the current range has zero discoveries', () => {
      mockMetrics({ valueMetrics: EMPTY_LIVE_METRICS });
      mockHistory({ hasEverUsedAttackDiscovery: true });

      const { result } = renderHook(() => useValueReportData(PROPS));

      expect(result.current.isSample).toBe(false);
      expect(result.current.from).toBe(PROPS.from);
      expect(result.current.to).toBe(PROPS.to);
      expect(result.current.minutesPerAlert).toBe(PROPS.minutesPerAlert);
      expect(result.current.analystHourlyRate).toBe(PROPS.analystHourlyRate);
      expect(result.current.valueMetrics).toBe(EMPTY_LIVE_METRICS);
    });

    it.each([
      ['feature never used', false],
      ['feature ever used', true],
    ])(
      'stays in live mode when the current range has discoveries (%s)',
      (_label, hasEverUsedAttackDiscovery) => {
        mockMetrics({ valueMetrics: LIVE_METRICS });
        mockHistory({ hasEverUsedAttackDiscovery });

        const { result } = renderHook(() => useValueReportData(PROPS));

        expect(result.current.isSample).toBe(false);
        expect(result.current.valueMetrics).toBe(LIVE_METRICS);
      }
    );

    it('passes attackAlertIds and both metric objects through unchanged in live mode', () => {
      mockMetrics();
      mockHistory({ hasEverUsedAttackDiscovery: true });

      const { result } = renderHook(() => useValueReportData(PROPS));

      expect(result.current.attackAlertIds).toBe(LIVE_ALERT_IDS);
      expect(result.current.valueMetrics).toBe(LIVE_METRICS);
      expect(result.current.valueMetricsCompare).toBe(LIVE_METRICS_COMPARE);
    });
  });

  describe('loading behavior', () => {
    it.each([
      ['only metrics loading', true, false],
      ['only history loading', false, true],
    ])(
      'suppresses sample mode while loading (%s) so the report does not flash sample data during fetch',
      (_label, metricsLoading, historyLoading) => {
        mockMetrics({ isLoading: metricsLoading, valueMetrics: EMPTY_LIVE_METRICS });
        mockHistory({ isLoading: historyLoading, hasEverUsedAttackDiscovery: false });

        const { result } = renderHook(() => useValueReportData(PROPS));

        expect(result.current.isLoading).toBe(true);
        expect(result.current.isSample).toBe(false);
        expect(result.current.from).toBe(PROPS.from);
      }
    );

    it.each([
      [false, false, false],
      [true, false, true],
      [false, true, true],
      [true, true, true],
    ])(
      'reports isLoading as the OR of metrics (%s) and history (%s) loading → %s',
      (metricsLoading, historyLoading, expected) => {
        mockMetrics({ isLoading: metricsLoading });
        mockHistory({ isLoading: historyLoading, hasEverUsedAttackDiscovery: true });

        const { result } = renderHook(() => useValueReportData(PROPS));

        expect(result.current.isLoading).toBe(expected);
      }
    );
  });
});
