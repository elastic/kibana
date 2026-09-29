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
import { coreMock as mockCoreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  buildMetricThresholdAlert,
  buildMetricThresholdRule,
} from '../mocks/metric_threshold_rule';
import { AlertDetailsAppSection } from './alert_details_app_section';
import { RuleConditionChart } from '@kbn/observability-plugin/public';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';

const mockedChartStartContract = chartPluginMock.createStartContract();
const mockedLensStartContract = lensPluginMock.createStartContract();

Date.now = vi.fn(() => new Date('2024-06-13T07:00:33.381Z').getTime());

vi.mock('../../../containers/metrics_source', () => {
  const mocked = {
    useMetricsDataViewContext: () => ({
      metricsView: { dataViewReference: 'index' },
    }),
    withSourceProvider:
      <ComponentProps extends {}>(Component: React.FC<ComponentProps>) =>
      () => {
        return function ComponentWithSourceProvider(props: ComponentProps) {
          return <div />;
        };
      },
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/observability-alert-details', () => {
  const mocked = {
    AlertAnnotation: () => {},
    AlertActiveTimeRangeAnnotation: () => {},
  };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/observability-alert-details', () => {
  const mocked = {
    AlertAnnotation: () => {},
    AlertActiveTimeRangeAnnotation: () => {},
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

vi.mock('@kbn/observability-plugin/public', () => {
  const mocked = {
    RuleConditionChart: vi.fn(() => <div data-test-subj="RuleConditionChart" />),
    getGroupFilters: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_kibana', () => {
  const mocked = {
    useKibanaContextForPlugin: () => ({
      services: {
        ...mockCoreMock.createStart(),
        charts: mockedChartStartContract,
        lens: mockedLensStartContract,
      },
    }),
  };
  return { ...mocked, default: mocked };
});

describe('AlertDetailsAppSection', () => {
  const queryClient = new QueryClient();
  const renderComponent = () => {
    return render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <AlertDetailsAppSection
            alert={buildMetricThresholdAlert()}
            rule={buildMetricThresholdRule()}
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

    expect((await result.findByTestId('metricThresholdAppSection')).children.length).toBe(3);
    expect(result.getByTestId('threshold-2000-2500')).toBeTruthy();
  });

  it('should render annotations', async () => {
    const mockedRuleConditionChart = vi.fn(() => <div data-test-subj="RuleConditionChart" />);
    (RuleConditionChart as Mock).mockImplementation(mockedRuleConditionChart);
    renderComponent();

    expect(mockedRuleConditionChart).toHaveBeenCalledTimes(3);
    expect(mockedRuleConditionChart.mock.calls[0]).toMatchSnapshot();
  });
});
