/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { AlertsByStatus } from './alerts_by_status';
import { parsedMockAlertsData } from './mock_data';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { CASES_FEATURE_ID } from '../../../../../common/constants';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useAlertsByStatus } from './use_alerts_by_status';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

vi.mock('../../../../common/components/user_privileges');
vi.mock('../../../../common/lib/kibana/kibana_react');

vi.mock('../../../../common/components/visualization_actions/visualization_embeddable');
vi.mock('./chart_label', () => {
  return {
    ChartLabel: vi.fn((props) => <span data-test-subj="chart-label" {...props} />),
  };
});
vi.mock('./use_alerts_by_status', () => {
      const mocked = {
      useAlertsByStatus: vi.fn().mockReturnValue({
        items: [],
        isLoading: true,
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../common/containers/use_global_time', () => {
      const mocked = {
      useGlobalTime: vi.fn().mockReturnValue({
        from: '2022-04-08T12:00:00.000Z',
        to: '2022-04-09T12:00:00.000Z',
      }),
    };
      return { ...mocked, default: mocked };
    });
describe('AlertsByStatus', () => {
  const mockCases = mockCasesContract();

  const props = {
    signalIndexName: 'mock-signal-index',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useKibana as Mock).mockReturnValue({
      services: {
        cases: mockCases,
        application: {
          capabilities: { [CASES_FEATURE_ID]: { crud_cases: true, read_cases: true } },
          getUrlForApp: vi.fn(),
        },
        theme: {},
      },
    });
    (useAlertsByStatus as Mock).mockReturnValue({
      items: [],
      isLoading: true,
    });
    (useUserPrivileges as Mock).mockReturnValue({
      timelinePrivileges: { read: true },
    });
  });

  test('render HoverVisibilityContainer', () => {
    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );
    expect(
      container.querySelector(`[data-test-subj="hoverVisibilityContainer"]`)
    ).toBeInTheDocument();
  });
  test('render HistogramPanel', () => {
    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );
    expect(
      container.querySelector(`[data-test-subj="detection-response-alerts-by-status-panel"]`)
    ).toBeInTheDocument();
  });

  test('shows correct names when no entity filter provided', () => {
    const { getByText, getByTestId } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );

    expect(getByText('Alerts')).toBeInTheDocument();
    expect(getByTestId('view-details-button')).toHaveTextContent('View alerts');
  });

  test('shows correct names when entity filter IS provided', () => {
    const { getByText, getByTestId } = render(
      <TestProviders>
        <AlertsByStatus {...props} entityFilter={{ field: 'name', value: 'val' }} />
      </TestProviders>
    );

    expect(getByText('Alerts by Severity')).toBeInTheDocument();
    expect(getByTestId('view-details-button')).toHaveTextContent('Investigate in Timeline');
  });

  test('shows correct names when entity filter IS provided AND user does not have timeline privileges', () => {
    (useUserPrivileges as Mock).mockReturnValue({
      timelinePrivileges: {},
    });
    const { getByText, getByTestId } = render(
      <TestProviders>
        <AlertsByStatus {...props} entityFilter={{ field: 'name', value: 'val' }} />
      </TestProviders>
    );

    expect(getByText('Alerts by Severity')).toBeInTheDocument();
    expect(getByTestId('view-details-button')).toHaveTextContent('View alerts');
  });

  test('render HeaderSection', () => {
    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...props} />
      </TestProviders>
    );
    expect(container.querySelector(`[data-test-subj="header-section"]`)).toBeInTheDocument();
  });

  test('render Legend', () => {
    const testProps = {
      ...props,
      isInitialLoading: false,
    };
    (useAlertsByStatus as Mock).mockReturnValue({
      items: parsedMockAlertsData,
      isLoading: false,
    });

    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...testProps} />
      </TestProviders>
    );
    expect(container.querySelector(`[data-test-subj="legend"]`)).toBeInTheDocument();
  });

  test('render toggle query button', () => {
    const testProps = {
      ...props,
      isInitialLoading: false,
    };

    (useAlertsByStatus as Mock).mockReturnValue({
      items: parsedMockAlertsData,
      isLoading: false,
    });

    const { container } = render(
      <TestProviders>
        <AlertsByStatus {...testProps} />
      </TestProviders>
    );
    expect(container.querySelector(`[data-test-subj="query-toggle-header"]`)).toBeInTheDocument();
  });
});
