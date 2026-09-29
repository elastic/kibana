/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_MINUTES,
  SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_RATE,
} from '@kbn/management-settings-ids';
import { AIValueReport } from '.';
import { useKibana } from '../../../common/lib/kibana';
import { useValueMetrics } from './hooks/use_value_metrics';
import { useHasEverUsedAttackDiscovery } from './hooks/use_has_ever_used_attack_discovery';
import { AIValueReportLayout } from './ai_value_report_layout';
import { SAMPLE_VALUE_METRICS, SAMPLE_VALUE_METRICS_COMPARE } from './sample_data';
import type { StartServices } from '../../../types';
import { useAIValueExportContext } from '../../providers/ai_value/export_provider';
import { useIsAlertsAndAttacksAlignmentEnabled } from '../../../common/hooks/use_is_alerts_and_attacks_alignment_enabled';
import { useSecuritySolutionLinkProps } from '../../../common/components/links';

vi.mock('../../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./hooks/use_value_metrics', () => {
  const mocked = {
    useValueMetrics: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./hooks/use_has_ever_used_attack_discovery', () => {
  const mocked = {
    useHasEverUsedAttackDiscovery: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./ai_value_report_layout', () => {
  const mocked = {
    AIValueReportLayout: vi.fn(() => <div data-test-subj="mock-ai-value-report-layout" />),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/components/page_loader', () => {
  const mocked = {
    PageLoader: () => <div data-test-subj="mock-page-loader" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../providers/ai_value/export_provider', () => {
  const mocked = {
    useAIValueExportContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/components/links', () => {
  const mocked = {
    useSecuritySolutionLinkProps: vi.fn(() => ({
      href: '/mock-attack-discovery',
      onClick: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/hooks/use_is_alerts_and_attacks_alignment_enabled', () => {
  const mocked = {
    useIsAlertsAndAttacksAlignmentEnabled: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseKibana = useKibana as Mock;
const mockUseValueMetrics = useValueMetrics as MockedFunction<typeof useValueMetrics>;
const mockuseHasEverUsedAttackDiscovery = useHasEverUsedAttackDiscovery as MockedFunction<
  typeof useHasEverUsedAttackDiscovery
>;
const mockAIValueReportLayout = AIValueReportLayout as MockedFunction<typeof AIValueReportLayout>;
const useAIValueExportContextMock = useAIValueExportContext as Mock;

const defaultProps = {
  setHasReportData: vi.fn(),
  setIsDatePickerDisabled: vi.fn(),
  setIsSampleMode: vi.fn(),
  isSourcererLoading: false,
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

describe('AIValueReport', () => {
  const createMockKibanaServices = (overrides: Partial<StartServices> = {}) =>
    ({
      services: {
        settings: {
          client: {
            get: vi.fn((key: string) => {
              if (key === SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_MINUTES) return 10;
              if (key === SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_RATE) return 50;
              return null;
            }),
            set: vi.fn(),
          },
        },
        ...overrides,
      },
    } as Partial<StartServices>);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAIValueReportLayout.mockImplementation(() => (
      <div data-test-subj="mock-ai-value-report-layout" />
    ));
    useAIValueExportContextMock.mockReturnValue(undefined);
    mockUseKibana.mockReturnValue(createMockKibanaServices());
    (useIsAlertsAndAttacksAlignmentEnabled as Mock).mockReturnValue(false);

    mockUseValueMetrics.mockReturnValue({
      attackAlertIds: ['alert-1', 'alert-2'],
      hasNoCurrentDiscoveries: false,
      isLoading: false,
      valueMetrics: mockValueMetrics,
      valueMetricsCompare: mockValueMetricsCompare,
    });

    mockuseHasEverUsedAttackDiscovery.mockReturnValue({
      hasEverUsedAttackDiscovery: true,
      isLoading: false,
    });
  });

  it('renders the layout with live data when there are attack discoveries', () => {
    render(<AIValueReport {...defaultProps} />);

    expect(screen.getByTestId('mock-ai-value-report-layout')).toBeInTheDocument();
    expect(mockAIValueReportLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        attackAlertIds: ['alert-1', 'alert-2'],
        analystHourlyRate: 50,
        isSample: false,
        minutesPerAlert: 10,
        from: defaultProps.from,
        to: defaultProps.to,
        valueMetrics: mockValueMetrics,
        valueMetricsCompare: mockValueMetricsCompare,
      }),
      {}
    );
    expect(defaultProps.setHasReportData).toHaveBeenCalledWith(true);
    expect(defaultProps.setIsDatePickerDisabled).toHaveBeenCalledWith(false);
    expect(defaultProps.setIsSampleMode).toHaveBeenCalledWith(false);
  });

  it('passes the resolved date range and settings to useValueMetrics', () => {
    render(<AIValueReport {...defaultProps} />);

    expect(mockUseValueMetrics).toHaveBeenCalledWith({
      from: defaultProps.from,
      to: defaultProps.to,
      minutesPerAlert: 10,
      analystHourlyRate: 50,
    });
  });

  it('renders the sample layout when the user has never used Attack Discovery and there are no discoveries', () => {
    mockUseValueMetrics.mockReturnValue({
      attackAlertIds: [],
      hasNoCurrentDiscoveries: true,
      isLoading: false,
      valueMetrics: {
        ...mockValueMetrics,
        attackDiscoveryCount: 0,
      },
      valueMetricsCompare: mockValueMetricsCompare,
    });
    mockuseHasEverUsedAttackDiscovery.mockReturnValue({
      hasEverUsedAttackDiscovery: false,
      isLoading: false,
    });

    render(<AIValueReport {...defaultProps} />);

    expect(screen.getByTestId('aiValueSampleAttackDiscoveryBanner')).toBeInTheDocument();
    expect(mockAIValueReportLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        isSample: true,
        from: defaultProps.from,
        to: defaultProps.to,
        valueMetrics: SAMPLE_VALUE_METRICS,
        valueMetricsCompare: SAMPLE_VALUE_METRICS_COMPARE,
      }),
      {}
    );
    expect(defaultProps.setHasReportData).toHaveBeenCalledWith(false);
    expect(defaultProps.setIsDatePickerDisabled).toHaveBeenCalledWith(true);
    expect(defaultProps.setIsSampleMode).toHaveBeenCalledWith(true);
  });

  it('renders the sample layout with Attacks link when the advanced setting is enabled', () => {
    (useIsAlertsAndAttacksAlignmentEnabled as Mock).mockReturnValue(true);
    mockUseValueMetrics.mockReturnValue({
      attackAlertIds: [],
      hasNoCurrentDiscoveries: true,
      isLoading: false,
      valueMetrics: {
        ...mockValueMetrics,
        attackDiscoveryCount: 0,
      },
      valueMetricsCompare: mockValueMetricsCompare,
    });
    mockuseHasEverUsedAttackDiscovery.mockReturnValue({
      hasEverUsedAttackDiscovery: false,
      isLoading: false,
    });

    render(<AIValueReport {...defaultProps} />);

    expect(screen.getByTestId('aiValueSampleAttackDiscoveryBanner')).toBeInTheDocument();
    expect(screen.getByText('Go to Attacks')).toBeInTheDocument();
    expect(useSecuritySolutionLinkProps).toHaveBeenCalledWith({ deepLinkId: 'attacks' });
  });

  it('renders the empty state when the feature was used before but the window has no discoveries', () => {
    mockUseValueMetrics.mockReturnValue({
      attackAlertIds: [],
      hasNoCurrentDiscoveries: true,
      isLoading: false,
      valueMetrics: {
        ...mockValueMetrics,
        attackDiscoveryCount: 0,
      },
      valueMetricsCompare: mockValueMetricsCompare,
    });
    mockuseHasEverUsedAttackDiscovery.mockReturnValue({
      hasEverUsedAttackDiscovery: true,
      isLoading: false,
    });

    render(<AIValueReport {...defaultProps} />);

    expect(screen.queryByTestId('mock-ai-value-report-layout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('aiValueSampleAttackDiscoveryBanner')).not.toBeInTheDocument();
    expect(screen.getByText('No results for the selected time range')).toBeInTheDocument();
    expect(defaultProps.setHasReportData).toHaveBeenCalledWith(false);
    expect(defaultProps.setIsDatePickerDisabled).toHaveBeenCalledWith(false);
    expect(defaultProps.setIsSampleMode).toHaveBeenCalledWith(false);
  });

  it('renders the page loader while data or sourcerer is loading', () => {
    mockUseValueMetrics.mockReturnValue({
      attackAlertIds: [],
      hasNoCurrentDiscoveries: false,
      isLoading: true,
      valueMetrics: mockValueMetrics,
      valueMetricsCompare: mockValueMetricsCompare,
    });

    render(<AIValueReport {...defaultProps} />);

    expect(screen.getByTestId('mock-page-loader')).toBeInTheDocument();
    expect(mockAIValueReportLayout).not.toHaveBeenCalled();
    expect(defaultProps.setIsDatePickerDisabled).toHaveBeenCalledWith(true);
    expect(defaultProps.setIsSampleMode).toHaveBeenCalledWith(false);
  });

  it('renders the page loader and skips data hooks when sourcerer is still loading', () => {
    render(<AIValueReport {...defaultProps} isSourcererLoading={true} />);

    expect(screen.getByTestId('mock-page-loader')).toBeInTheDocument();
    expect(mockAIValueReportLayout).not.toHaveBeenCalled();
    expect(mockUseValueMetrics).not.toHaveBeenCalled();
    expect(mockuseHasEverUsedAttackDiscovery).not.toHaveBeenCalled();
    expect(defaultProps.setHasReportData).toHaveBeenCalledWith(false);
    expect(defaultProps.setIsDatePickerDisabled).toHaveBeenCalledWith(true);
    expect(defaultProps.setIsSampleMode).toHaveBeenCalledWith(false);
  });

  it('uses the specified timerange when exporting the report', () => {
    const timeRange = {
      to: '2025-11-18T13:18:59.691Z',
      from: '2025-10-18T12:18:59.691Z',
    };
    useAIValueExportContextMock.mockReturnValue({
      forwardedState: {
        timeRange: { kind: 'absolute', ...timeRange },
      },
    });

    render(<AIValueReport {...defaultProps} />);

    expect(mockUseValueMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        ...timeRange,
      })
    );
  });

  describe('when exporting with a relative time range', () => {
    beforeAll(() => {
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    beforeEach(() => {
      vi.setSystemTime(new Date('2025-12-19T00:00:00.000Z'));
      useAIValueExportContextMock.mockReturnValue({
        forwardedState: {
          timeRange: {
            kind: 'relative',
            fromStr: 'now-7d',
            toStr: 'now',
          },
        },
      });
    });

    it('returns an absolute time range for useValueMetrics', () => {
      render(<AIValueReport {...defaultProps} />);

      expect(mockUseValueMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2025-12-12T00:00:00.000Z',
          to: '2025-12-19T00:00:00.000Z',
        })
      );
    });
  });

  it('sets the report input in the export context when live data is loaded', () => {
    const setReportInputMock = vi.fn();
    useAIValueExportContextMock.mockReturnValue({
      setReportInput: setReportInputMock,
    });

    render(<AIValueReport {...defaultProps} />);

    expect(setReportInputMock).toHaveBeenCalledWith({
      attackAlertIds: ['alert-1', 'alert-2'],
      analystHourlyRate: 50,
      minutesPerAlert: 10,
      valueMetrics: mockValueMetrics,
      valueMetricsCompare: mockValueMetricsCompare,
    });
  });

  it('does not set the report input in the export context in sample mode', () => {
    const setReportInputMock = vi.fn();
    useAIValueExportContextMock.mockReturnValue({
      setReportInput: setReportInputMock,
    });
    mockUseValueMetrics.mockReturnValue({
      attackAlertIds: [],
      hasNoCurrentDiscoveries: true,
      isLoading: false,
      valueMetrics: {
        ...mockValueMetrics,
        attackDiscoveryCount: 0,
      },
      valueMetricsCompare: mockValueMetricsCompare,
    });
    mockuseHasEverUsedAttackDiscovery.mockReturnValue({
      hasEverUsedAttackDiscovery: false,
      isLoading: false,
    });

    render(<AIValueReport {...defaultProps} />);

    expect(setReportInputMock).not.toHaveBeenCalled();
  });

  it('handles different settings values correctly', () => {
    mockUseKibana.mockReturnValue(
      createMockKibanaServices({
        settings: {
          client: {
            get: vi.fn((key: string) => {
              if (key === SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_MINUTES) return 5;
              if (key === SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_RATE) return 75;
              return null;
            }),
            set: vi.fn(),
          },
        } as unknown as StartServices['settings'],
      })
    );

    render(<AIValueReport {...defaultProps} />);

    expect(mockUseValueMetrics).toHaveBeenCalledWith({
      from: defaultProps.from,
      to: defaultProps.to,
      minutesPerAlert: 5,
      analystHourlyRate: 75,
    });
  });
});
