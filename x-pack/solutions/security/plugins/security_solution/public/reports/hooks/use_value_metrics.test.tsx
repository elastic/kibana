/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useValueMetrics } from './use_value_metrics';

import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useFindAttackDiscoveries } from '../../attack_discovery/pages/use_find_attack_discoveries';
import { useKibana as mockUseKibana } from '../../common/lib/kibana/__mocks__';
import { useAlertCountQuery } from './use_alert_count_query';

const mockedUseKibana = {
  ...mockUseKibana(),
};

jest.mock('./use_alert_count_query');
jest.mock('../../attack_discovery/pages/use_find_attack_discoveries');
jest.mock('../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../../common/lib/kibana', () => {
  return {
    useKibana: () => mockedUseKibana,
  };
});
const mockAssistantAvailability = jest.fn(() => ({
  hasAssistantPrivilege: true,
}));
jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: () => ({
    alertsIndexPattern: 'alerts-index-pattern',
    assistantAvailability: mockAssistantAvailability(),
    knowledgeBase: {
      latestAlerts: 20,
    },
  }),
}));
describe('useValueMetrics', () => {
  const mockSignalIndexName = 'mock-signal-index';
  const mockUniqueAlertIds = ['id1', 'id2'];
  const mockTotal = 2;
  const mockAlertCount = 10;
  const mockFilteredAlertsCount = 5;
  const mockIsLoading = false;

  beforeEach(() => {
    (useSignalIndex as jest.Mock).mockReturnValue({ signalIndexName: mockSignalIndexName });
    (useFindAttackDiscoveries as jest.Mock).mockImplementation(({ start }) => {
      if (start === 'compareFrom') {
        return {
          data: { unique_alert_ids: ['id3'], total: 1 },
          isLoading: mockIsLoading,
        };
      }
      return {
        data: { unique_alert_ids: mockUniqueAlertIds, total: mockTotal },
        isLoading: mockIsLoading,
      };
    });
    (useAlertCountQuery as jest.Mock).mockImplementation(({ filters }) => {
      if (filters && filters[0]?.query?.bool?.must_not?.length) {
        return { alertCount: mockFilteredAlertsCount };
      }
      return { alertCount: mockAlertCount, isLoading: mockIsLoading };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return correct value metrics and loading state', () => {
    const { result } = renderHook(() =>
      useValueMetrics({
        analystHourlyRate: 100,
        from: '2025-07-22T15:16:31.006Z',
        to: '2025-07-23T15:16:31.006Z',
        minutesPerAlert: 10,
      })
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.attackAlertIds).toEqual(mockUniqueAlertIds);
    expect(result.current.valueMetrics).toEqual({
      attackDiscoveryCount: 2,
      filteredAlerts: 5,
      filteredAlertsPerc: 50,
      escalatedAlertsPerc: 50,
      hoursSaved: 1.6666666666666667,
      totalAlerts: 10,
      costSavings: 166.66666666666669,
    });
    expect(result.current.valueMetricsCompare).toEqual({
      attackDiscoveryCount: 2,
      filteredAlerts: 5,
      filteredAlertsPerc: 50,
      escalatedAlertsPerc: 50,
      hoursSaved: 1.6666666666666667,
      totalAlerts: 10,
      costSavings: 166.66666666666669,
    });
  });
});
