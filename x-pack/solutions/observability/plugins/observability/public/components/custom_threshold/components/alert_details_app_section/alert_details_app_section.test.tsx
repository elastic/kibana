/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  buildCustomThresholdAlert,
  buildCustomThresholdRule,
} from '../../mocks/custom_threshold_rule';
import type { CustomThresholdAlertFields } from '../../types';
import { RuleConditionChart } from '../../../rule_condition_chart/rule_condition_chart';
import type { CustomThresholdAlert } from '../types';
import AlertDetailsAppSection from './alert_details_app_section';

const mockedChartStartContract = chartPluginMock.createStartContract();

vi.mock('@kbn/observability-alert-details', () => {
  const mocked = {
    AlertAnnotation: () => {},
    AlertActiveTimeRangeAnnotation: () => {},
    useAlertsHistory: () => ({
      data: {
        histogramTriggeredAlerts: [
          { key_as_string: '2023-04-10T00:00:00.000Z', key: 1681084800000, doc_count: 2 },
        ],
        avgTimeToRecoverUS: 0,
        totalTriggeredAlerts: 2,
      },
      isLoading: false,
      isError: false,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/observability-get-padded-alert-time-range-util', () => {
  const mocked = {
    getPaddedAlertTimeRange: () => ({
      from: '2023-03-28T10:43:13.802Z',
      to: '2023-03-29T13:14:09.581Z',
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../rule_condition_chart/rule_condition_chart', () => {
  const mocked = {
    RuleConditionChart: vi.fn(() => <div data-test-subj="RuleConditionChart" />),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./log_rate_analysis', () => {
  const mocked = {
    LogRateAnalysis: vi.fn(() => <div data-test-subj="LogRateAnalysis" />),
  };
  return { ...mocked, default: mocked };
});

const mockServices = {
  ...coreMock.createStart(),
  charts: mockedChartStartContract,
  aiops: {
    EmbeddableChangePointChart: vi.fn(),
  },
  data: {
    search: {
      searchSource: {
        create: vi.fn().mockResolvedValue({
          getField: vi.fn().mockReturnValue({ id: 'test-index' }),
        }),
      },
    },
  },
  share: {
    url: {
      locators: {
        get: vi
          .fn()
          .mockReturnValue({ getRedirectUrl: vi.fn().mockReturnValue('/view-in-app-url') }),
      },
    },
  },
  application: {
    capabilities: {
      aiops: {
        enabled: false,
      },
    },
  },
};

vi.mock('../../../../utils/kibana_react', () => {
  const mocked = {
    useKibana: () => ({
      services: mockServices,
    }),
  };
  return { ...mocked, default: mocked };
});

describe('AlertDetailsAppSection', () => {
  const queryClient = new QueryClient();

  const renderComponent = (
    alert: Partial<CustomThresholdAlert> = {},
    alertFields: Partial<ParsedTechnicalFields & CustomThresholdAlertFields> = {}
  ) => {
    return render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <AlertDetailsAppSection
            alert={buildCustomThresholdAlert(alert, {
              [ALERT_RULE_PARAMETERS]: buildCustomThresholdRule().params,
              ...alertFields,
            })}
          />
        </QueryClientProvider>
      </IntlProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render rule and alert data', async () => {
    const result = renderComponent();

    expect((await result.findByTestId('thresholdAlertOverviewSection')).children.length).toBe(6);
    expect(result.getByTestId('threshold-2000-2500')).toBeTruthy();
  });

  it('should render annotations', async () => {
    const mockedRuleConditionChart = vi.fn(() => <div data-test-subj="RuleConditionChart" />);
    (RuleConditionChart as Mock).mockImplementation(mockedRuleConditionChart);
    const alertDetailsAppSectionComponent = renderComponent(
      {},
      { ['kibana.alert.end']: '2023-03-28T14:40:00.000Z' }
    );

    expect(alertDetailsAppSectionComponent.getAllByTestId('RuleConditionChart').length).toBe(6);
    expect(mockedRuleConditionChart.mock.calls[0]).toMatchSnapshot();
  });

  it('should render title on condition charts', async () => {
    const result = renderComponent();

    expect(result.getByTestId('chartTitle-0').textContent).toBe(
      'Equation result for count (host.name: host-1)'
    );

    expect(result.getByTestId('chartTitle-1').textContent).toBe(
      'Equation result for max (system.cpu.user.pct)'
    );

    expect(result.getByTestId('chartTitle-2').textContent).toBe(
      'Equation result for min (system.memory.used.pct)'
    );

    expect(result.getByTestId('chartTitle-3').textContent).toBe(
      'Equation result for min (system.memory.used.pct) + min (system.memory.used.pct) + min (system.memory.used.pct) + min (system.memory.used.pct...'
    );

    expect(result.getByTestId('chartTitle-4').textContent).toBe(
      'Equation result for min (system.memory.used.pct) + min (system.memory.used.pct)'
    );

    expect(result.getByTestId('chartTitle-5').textContent).toBe(
      'Equation result for min (system.memory.used.pct) + min (system.memory.used.pct) + min (system.memory.used.pct)'
    );
  });

  it('should not render LogRateAnalysis when aiops is disabled', () => {
    const result = renderComponent();
    expect(result.queryByTestId('LogRateAnalysis')).not.toBeInTheDocument();
  });

  it('should not render LogRateAnalysis when aiops is disabled and has evaluation values', () => {
    const result = renderComponent({}, {
      'kibana.alert.evaluation.values': [2500, 5],
    } as Object);
    expect(result.queryByTestId('LogRateAnalysis')).not.toBeInTheDocument();
  });

  it('should render LogRateAnalysis when aiops is enabled and has evaluation values', () => {
    mockServices.application.capabilities.aiops.enabled = true;
    const result = renderComponent({}, {
      'kibana.alert.evaluation.values': [2500, 5],
    } as Object);
    expect(result.getByTestId('LogRateAnalysis')).toBeTruthy();
  });

  it('should not render LogRateAnalysis when hasEvaluationValues is false', () => {
    mockServices.application.capabilities.aiops.enabled = true;
    const result = renderComponent({}, {
      'kibana.alert.evaluation.values': [null, null],
    } as Object);
    expect(result.queryByTestId('LogRateAnalysis')).not.toBeInTheDocument();
  });

  it('should render LogRateAnalysis when hasEvaluationValues has some null but also some values', () => {
    mockServices.application.capabilities.aiops.enabled = true;
    const result = renderComponent({}, {
      'kibana.alert.evaluation.values': [null, 5],
    } as Object);
    expect(result.getByTestId('LogRateAnalysis')).toBeTruthy();
  });

  it('should render LogRateAnalysis even when criteria array is empty if conditions are met', () => {
    mockServices.application.capabilities.aiops.enabled = true;
    const result = renderComponent({}, {
      [ALERT_RULE_PARAMETERS]: {
        ...buildCustomThresholdRule().params,
        criteria: [],
      } as Object,
      'kibana.alert.evaluation.values': [2500, 5],
    } as Object);
    // Even with empty criteria, it renders the container and LogRateAnalysis if aiops is enabled
    expect(result.queryByTestId('thresholdAlertOverviewSection')).toBeInTheDocument();
    expect(result.queryByTestId('LogRateAnalysis')).toBeInTheDocument();
  });
});
