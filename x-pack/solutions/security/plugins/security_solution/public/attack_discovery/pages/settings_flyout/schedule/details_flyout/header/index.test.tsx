/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaStyledComponentsThemeProvider } from '@kbn/react-kibana-context-styled';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import { Header } from '.';
import { createKibanaContextProviderMock } from '../../../../../../common/lib/kibana/kibana_react.mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';

const MockKibanaContextProvider = createKibanaContextProviderMock();

/**
 * The `Header` subtree consumes only these four contexts, and unlike `TestProviders` this
 * builds no redux store or query client per render, which the per-test budget cannot afford
 * on a contended CI worker.
 */
const HeaderTestProviders = ({ children }: PropsWithChildren<{}>) => (
  <MockKibanaContextProvider>
    <I18nProvider>
      <KibanaStyledComponentsThemeProvider>
        <EuiProvider highContrastMode={false}>{children}</EuiProvider>
      </KibanaStyledComponentsThemeProvider>
    </I18nProvider>
  </MockKibanaContextProvider>
);

const renderComponent = (params?: {
  isEditing?: boolean;
  isLoading?: boolean;
  schedule?: AttackDiscoverySchedule;
}) => {
  const { isEditing = false, isLoading = false, schedule } = params ?? {};
  render(
    <HeaderTestProviders>
      {
        <Header
          schedule={schedule}
          isEditing={isEditing}
          isLoading={isLoading}
          titleId={'test-1'}
        />
      }
    </HeaderTestProviders>
  );
};

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render title container', () => {
    renderComponent();

    expect(screen.getByTestId('scheduleDetailsTitle')).toBeInTheDocument();
  });

  it('should render empty title when editing', () => {
    renderComponent({ isEditing: true });

    expect(screen.getByTestId('scheduleDetailsTitle')).toHaveTextContent('Edit');
  });

  it('should render empty title when not editing', () => {
    renderComponent();

    expect(screen.getByTestId('scheduleDetailsTitle')).toHaveTextContent('');
  });

  it('should render non-empty title when editing', () => {
    renderComponent({ isEditing: true, schedule: mockAttackDiscoverySchedule });

    expect(screen.getByTestId('scheduleDetailsTitle')).toHaveTextContent(
      `Edit ${mockAttackDiscoverySchedule.name}`
    );
  });

  it('should render non-empty title when not editing', () => {
    renderComponent({ schedule: mockAttackDiscoverySchedule });

    expect(screen.getByTestId('scheduleDetailsTitle')).toHaveTextContent(
      mockAttackDiscoverySchedule.name
    );
  });

  it('should render first subtitle container', () => {
    renderComponent();

    expect(screen.getByTestId('header-subtitle')).toBeInTheDocument();
  });

  it('should render create and update info within first subtitle if schedule is specified', () => {
    renderComponent({ schedule: mockAttackDiscoverySchedule });

    expect(screen.getByTestId('header-subtitle')).toHaveTextContent(
      'Created by: elastic on Apr 9, 2025 @ 08:51:04.697Updated by: elastic on Apr 9, 2025 @ 21:10:16.483'
    );
  });

  it('should render loader within first subtitle if schedule is undefined and `isLoading` is true', () => {
    renderComponent({ isLoading: true });

    expect(
      within(screen.getByTestId('header-subtitle')).getByTestId('spinner')
    ).toBeInTheDocument();
  });

  it('should render second subtitle container', () => {
    renderComponent();

    expect(screen.getByTestId('header-subtitle-2')).toBeInTheDocument();
  });

  it('should render loader within second subtitle if `isLoading` is true', () => {
    renderComponent({ isLoading: true });

    expect(
      within(screen.getByTestId('header-subtitle-2')).getByTestId('spinner')
    ).toBeInTheDocument();
  });

  it('should render status message within second subtitle if `isLoading` is false', () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.lastExecution = { status: 'active', date: '2025-04-17T11:54:13.531Z' };
    renderComponent({ schedule: scheduleWithFilters });

    expect(screen.getByTestId('header-subtitle-2')).toHaveTextContent(
      'Last run:SuccessatApr 17, 2025 @ 11:54:13.531'
    );
  });
});
