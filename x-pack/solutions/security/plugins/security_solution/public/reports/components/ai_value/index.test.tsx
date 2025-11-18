/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_MINUTES,
  SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_RATE,
} from '@kbn/management-settings-ids';
import { AIValueMetrics } from '.';
import { useKibana } from '../../../common/lib/kibana';
import { useValueMetrics } from '../../hooks/use_value_metrics';
import { ExecutiveSummary } from './executive_summary';
import { AlertProcessing } from './alert_processing';
import { CostSavingsTrend } from './cost_savings_trend';
import { ValueReportSettings } from './value_report_settings';
import type { StartServices } from '../../../types';

// Mock dependencies
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../hooks/use_value_metrics', () => ({
  useValueMetrics: jest.fn(),
}));

jest.mock('./executive_summary', () => ({
  ExecutiveSummary: jest.fn(() => <div data-test-subj="mock-executive-summary" />),
}));

jest.mock('./alert_processing', () => ({
  AlertProcessing: jest.fn(() => <div data-test-subj="mock-alert-processing" />),
}));

jest.mock('./cost_savings_trend', () => ({
  CostSavingsTrend: jest.fn(() => <div data-test-subj="mock-cost-savings-trend" />),
}));

jest.mock('./value_report_settings', () => ({
  ValueReportSettings: jest.fn(() => <div data-test-subj="mock-value-report-settings" />),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseValueMetrics = useValueMetrics as jest.MockedFunction<typeof useValueMetrics>;

const defaultProps = {
  setHasAttackDiscoveries: jest.fn(),
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
};

const mockValueMetrics = {
  attackDiscoveryCount: 5,
  filteredAlerts: 100,
  totalAlerts: 200,
  filteredAlertsPerc: 50,
  escalatedAlertsPerc: 50,
  hoursSaved: 12,
  costSavings: 12000,
};

const mockValueMetricsCompare = {
  attackDiscoveryCount: 3,
  filteredAlerts: 80,
  totalAlerts: 150,
  filteredAlertsPerc: 53.3,
  escalatedAlertsPerc: 46.7,
  hoursSaved: 12,
  costSavings: 12000,
};

describe('AIValueMetrics', () => {
  const createMockKibanaServices = (overrides: Partial<StartServices> = {}) =>
    ({
      services: {
        uiSettings: {
          get: jest.fn((key: string) => {
            if (key === SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_MINUTES) return 10;
            if (key === SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_RATE) return 50;
            return null;
          }),
        },
        ...overrides,
      },
    } as Partial<StartServices>);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue(createMockKibanaServices());

    mockUseValueMetrics.mockReturnValue({
      attackAlertIds: ['alert-1', 'alert-2'],
      isLoading: false,
      valueMetrics: mockValueMetrics,
      valueMetricsCompare: mockValueMetricsCompare,
    });
  });

  it('renders all components when loaded with attack discoveries', () => {
    mockUseValueMetrics.mockReturnValue({
      attackAlertIds: ['alert-1', 'alert-2'],
      isLoading: false,
      valueMetrics: mockValueMetrics,
      valueMetricsCompare: mockValueMetricsCompare,
    });

    render(<AIValueMetrics {...defaultProps} />);

    expect(ExecutiveSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        attackAlertIds: ['alert-1', 'alert-2'],
        analystHourlyRate: 50,
        hasAttackDiscoveries: true,
        minutesPerAlert: 10,
        from: defaultProps.from,
        to: defaultProps.to,
        valueMetrics: mockValueMetrics,
        valueMetricsCompare: mockValueMetricsCompare,
      }),
      {}
    );

    expect(AlertProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        attackAlertIds: ['alert-1', 'alert-2'],
        valueMetrics: mockValueMetrics,
        from: defaultProps.from,
        to: defaultProps.to,
      }),
      {}
    );

    expect(CostSavingsTrend).toHaveBeenCalledWith(
      expect.objectContaining({
        analystHourlyRate: 50,
        minutesPerAlert: 10,
        from: defaultProps.from,
        to: defaultProps.to,
      }),
      {}
    );

    expect(ValueReportSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        analystHourlyRate: 50,
        minutesPerAlert: 10,
      }),
      {}
    );
  });

  it('handles hook calls and parameter passing correctly', () => {
    render(<AIValueMetrics {...defaultProps} />);

    expect(mockUseValueMetrics).toHaveBeenCalledWith({
      from: defaultProps.from,
      to: defaultProps.to,
      minutesPerAlert: 10,
      analystHourlyRate: 50,
    });

    expect(defaultProps.setHasAttackDiscoveries).toHaveBeenCalledWith(true);
  });

  it('handles no attack discoveries correctly', () => {
    mockUseValueMetrics.mockReturnValue({
      attackAlertIds: [],
      isLoading: false,
      valueMetrics: {
        ...mockValueMetrics,
        attackDiscoveryCount: 0,
      },
      valueMetricsCompare: mockValueMetricsCompare,
    });

    render(<AIValueMetrics {...defaultProps} />);

    expect(defaultProps.setHasAttackDiscoveries).toHaveBeenCalledWith(false);
    expect(AlertProcessing).not.toHaveBeenCalled();
    expect(CostSavingsTrend).not.toHaveBeenCalled();
  });

  it('passes correct parameters to useValueMetrics hook', () => {
    render(<AIValueMetrics {...defaultProps} />);

    expect(mockUseValueMetrics).toHaveBeenCalledWith({
      from: defaultProps.from,
      to: defaultProps.to,
      minutesPerAlert: 10,
      analystHourlyRate: 50,
    });
  });

  it('handles different uiSettings values correctly', () => {
    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        uiSettings: {
          // @ts-ignore
          get: jest.fn((key: string) => {
            if (key === SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_MINUTES) return 5;
            if (key === SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_RATE) return 75;
            return null;
          }),
        },
      })
    );

    render(<AIValueMetrics {...defaultProps} />);

    expect(mockUseValueMetrics).toHaveBeenCalledWith({
      from: defaultProps.from,
      to: defaultProps.to,
      minutesPerAlert: 5,
      analystHourlyRate: 75,
    });
  });
});
