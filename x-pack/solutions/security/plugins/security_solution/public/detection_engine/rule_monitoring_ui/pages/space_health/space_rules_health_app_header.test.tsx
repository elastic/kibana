/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import {
  HealthIntervalGranularity,
  HealthIntervalType,
} from '../../../../../common/api/detection_engine';
import { TestProviders } from '../../../../common/mock';
import { SpaceRulesHealthAppHeader } from './space_rules_health_app_header';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));
jest.mock('../../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));

const interval = {
  type: HealthIntervalType.last_week,
  granularity: HealthIntervalGranularity.day,
} as const;

const renderHeader = (disabled = false) =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <SpaceRulesHealthAppHeader
            interval={interval}
            onIntervalChange={jest.fn()}
            disabled={disabled}
          />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

const openIntervalFlyout = async () => {
  await openAppMenuOverflow();
  const intervalItems = screen.getAllByTestId('spaceRulesHealthInterval');
  fireEvent.click(intervalItems[intervalItems.length - 1]);
};

describe('SpaceRulesHealthAppHeader', () => {
  it('renders the title and Technical Preview badge without a back link', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Detection Engine Space Rules Health'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.badge)).toHaveTextContent(
      'Technical Preview'
    );
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
  });

  it('opens the controlled interval filter from the app menu', async () => {
    renderHeader();

    await openIntervalFlyout();

    expect(screen.getByTestId('spaceRulesHealthIntervalFlyout')).toBeInTheDocument();
    const [intervalType, granularity] = screen.getAllByRole('combobox');
    expect(intervalType).toHaveValue(HealthIntervalType.last_week);
    expect(granularity).toHaveValue(HealthIntervalGranularity.day);
  });

  it('preserves the interval after closing and reopening the flyout', async () => {
    renderHeader();

    await openIntervalFlyout();
    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    await openIntervalFlyout();

    const [intervalType, granularity] = screen.getAllByRole('combobox');
    expect(intervalType).toHaveValue(HealthIntervalType.last_week);
    expect(granularity).toHaveValue(HealthIntervalGranularity.day);
  });

  it('returns focus to the app menu after the flyout closes', async () => {
    renderHeader();
    const overflowButton = screen.getByTestId('app-menu-overflow-button');

    await openIntervalFlyout();
    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    await waitFor(() => expect(overflowButton).toHaveFocus());
  });

  it('disables the interval controls while health data is loading', async () => {
    renderHeader(true);

    await openIntervalFlyout();

    for (const control of screen.getAllByRole('combobox')) {
      expect(control).toBeDisabled();
    }
  });
});
