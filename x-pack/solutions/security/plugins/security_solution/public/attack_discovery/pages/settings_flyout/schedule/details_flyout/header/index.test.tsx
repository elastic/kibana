/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import { Header } from '.';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';

const renderComponent = async (params?: {
  isEditing?: boolean;
  isLoading?: boolean;
  schedule?: AttackDiscoverySchedule;
}) => {
  const { isEditing = false, isLoading = false, schedule } = params ?? {};
  await act(() => {
    render(
      <TestProviders>
        {
          <Header
            schedule={schedule}
            isEditing={isEditing}
            isLoading={isLoading}
            titleId={'test-1'}
          />
        }
      </TestProviders>
    );
  });
};

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render title container', async () => {
    await renderComponent();

    expect(screen.getByTestId('scheduleDetailsTitle')).toBeInTheDocument();
  });

  it('should render empty title when editing', async () => {
    await renderComponent({ isEditing: true });

    expect(screen.getByTestId('scheduleDetailsTitle')).toHaveTextContent('Edit');
  });

  it('should render empty title when not editing', async () => {
    await renderComponent();

    expect(screen.getByTestId('scheduleDetailsTitle')).toHaveTextContent('');
  });

  it('should render non-empty title when editing', async () => {
    await renderComponent({ isEditing: true, schedule: mockAttackDiscoverySchedule });

    expect(screen.getByTestId('scheduleDetailsTitle')).toHaveTextContent(
      `Edit ${mockAttackDiscoverySchedule.name}`
    );
  });

  it('should render non-empty title when not editing', async () => {
    await renderComponent({ schedule: mockAttackDiscoverySchedule });

    expect(screen.getByTestId('scheduleDetailsTitle')).toHaveTextContent(
      mockAttackDiscoverySchedule.name
    );
  });

  it('should render first subtitle container', async () => {
    await renderComponent();

    expect(screen.getByTestId('header-subtitle')).toBeInTheDocument();
  });

  it('should render create and update info within first subtitle if schedule is specified', async () => {
    await renderComponent({ schedule: mockAttackDiscoverySchedule });

    expect(screen.getByTestId('header-subtitle')).toHaveTextContent(
      'Created by: elastic on Apr 9, 2025 @ 08:51:04.697Updated by: elastic on Apr 9, 2025 @ 21:10:16.483'
    );
  });

  it('should render loader within first subtitle if schedule is undefined and `isLoading` is true', async () => {
    await renderComponent({ isLoading: true });

    expect(
      within(screen.getByTestId('header-subtitle')).getByTestId('spinner')
    ).toBeInTheDocument();
  });

  it('should render second subtitle container', async () => {
    await renderComponent();

    expect(screen.getByTestId('header-subtitle-2')).toBeInTheDocument();
  });

  it('should render loader within second subtitle if `isLoading` is true', async () => {
    await renderComponent({ isLoading: true });

    expect(
      within(screen.getByTestId('header-subtitle-2')).getByTestId('spinner')
    ).toBeInTheDocument();
  });

  it('should render status message within second subtitle if `isLoading` is false', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.lastExecution = { status: 'active', date: '2025-04-17T11:54:13.531Z' };
    await renderComponent({ schedule: scheduleWithFilters });

    expect(screen.getByTestId('header-subtitle-2')).toHaveTextContent(
      'Last run:SuccessatApr 17, 2025 @ 11:54:13.531'
    );
  });
});
