/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, fireEvent, within } from '@testing-library/react';

import { OverviewHostStats } from '.';
import { mockData } from './mock';
import { TestProviders } from '../../../common/mock/test_providers';

describe('Overview Host Stat Data', () => {
  describe('rendering', () => {
    test('it renders the default OverviewHostStats', () => {
      render(
        <TestProviders>
          <OverviewHostStats data={mockData} loading={false} />
        </TestProviders>
      );
      expect(screen.getByTestId('overview-hosts-stats')).toMatchSnapshot();
    });
  });
  describe('loading', () => {
    test('it does NOT show loading indicator when loading is false', () => {
      const { container } = render(
        <TestProviders>
          <OverviewHostStats data={mockData} loading={false} />
        </TestProviders>
      );

      // click the accordion to expand it
      fireEvent.click(container.querySelector('button')!);

      expect(
        within(screen.getByTestId('host-stat-auditbeatAuditd')).queryByTestId(
          'stat-value-loading-spinner'
        )
      ).not.toBeInTheDocument();
    });

    test('it shows loading indicator when loading is true', () => {
      const { container } = render(
        <TestProviders>
          <OverviewHostStats data={mockData} loading={true} />
        </TestProviders>
      );

      // click the accordion to expand it
      fireEvent.click(container.querySelector('button')!);

      expect(
        within(screen.getByTestId('host-stat-auditbeatAuditd')).getByTestId(
          'stat-value-loading-spinner'
        )
      ).toBeInTheDocument();
    });
  });
});
