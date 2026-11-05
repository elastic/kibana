/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaStyledComponentsThemeProvider } from '@kbn/react-kibana-context-styled';

import { Status } from './status';
import { createKibanaContextProviderMock } from '../../../../../../common/lib/kibana/kibana_react.mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';

const MockKibanaContextProvider = createKibanaContextProviderMock();

/**
 * `Status` consumes only these four contexts, and unlike `TestProviders` this builds no redux
 * store or query client per render, which the per-test budget cannot afford on a contended CI worker.
 */
const StatusTestProviders = ({ children }: PropsWithChildren<{}>) => (
  <MockKibanaContextProvider>
    <I18nProvider>
      <KibanaStyledComponentsThemeProvider>
        <EuiProvider highContrastMode={false}>{children}</EuiProvider>
      </KibanaStyledComponentsThemeProvider>
    </I18nProvider>
  </MockKibanaContextProvider>
);

const renderComponent = (schedule = mockAttackDiscoverySchedule) => {
  render(<StatusTestProviders>{<Status schedule={schedule} />}</StatusTestProviders>);
};

describe('Status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render component if schedule does not has last execution set', () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.lastExecution = undefined;
    renderComponent(scheduleWithFilters);

    expect(screen.queryByTestId('executionStatus')).not.toBeInTheDocument();
  });

  it('should render component if schedule has last execution set', () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.lastExecution = { status: 'ok', date: '2025-04-17T11:54:13.531Z' };
    renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('executionStatus')).toBeInTheDocument();
  });

  it('should render `ok` execution status message', () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.lastExecution = { status: 'ok', date: '2025-04-17T11:54:13.531Z' };
    renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('executionStatus')).toHaveTextContent(
      'SuccessatApr 17, 2025 @ 11:54:13.531'
    );
  });

  it('should render `active` execution status message', () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.lastExecution = { status: 'active', date: '2025-04-17T11:54:13.531Z' };
    renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('executionStatus')).toHaveTextContent(
      'SuccessatApr 17, 2025 @ 11:54:13.531'
    );
  });

  it('should render `error` execution status message', () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.lastExecution = {
      status: 'error',
      date: '2025-04-17T11:54:13.531Z',
      message: 'Test error!',
    };
    renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('executionStatus')).toHaveTextContent(
      'FailedatApr 17, 2025 @ 11:54:13.531'
    );
  });

  it('should render `warning` execution status message', () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.lastExecution = {
      status: 'warning',
      date: '2025-04-17T11:54:13.531Z',
      message: 'Test warning!',
    };
    renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('executionStatus')).toHaveTextContent(
      'WarningatApr 17, 2025 @ 11:54:13.531'
    );
  });

  it('should render `unknown` execution status message', () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.lastExecution = { status: 'unknown', date: '2025-04-17T11:54:13.531Z' };
    renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('executionStatus')).toHaveTextContent(
      'UnknownatApr 17, 2025 @ 11:54:13.531'
    );
  });
});
