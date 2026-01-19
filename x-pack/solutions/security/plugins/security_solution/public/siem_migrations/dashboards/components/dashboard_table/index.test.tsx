/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { MigrationDashboardsTableProps } from '.';
import { MigrationDashboardsTable } from '.';
import * as useGetMigrationDashboardsModule from '../../logic/use_get_migration_dashboards';
import * as useGetMigrationTranslationStatsModule from '../../logic/use_get_migration_translation_stats';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { DashboardMigrationStats } from '../../types';
import { createSiemMigrationsMock, TestProviders } from '../../../../common/mock';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import * as useInstallMigrationDashboardsModule from '../../logic/use_install_migration_dashboards';
import type { SiemMigrationsService } from '../../../service';

const getTranslatedDashboard = () =>
  ({
    id: '1',
    migration_id: 'mig-1',
    original_dashboard: {
      id: 'orig-1',
      vendor: 'splunk',
      title: 'Original Dashboard',
      description: 'desc',
      data: '{}',
      format: 'json',
    },
    elastic_dashboard: {
      title: 'Elastic Dashboard',
      description: 'Elastic desc',
      data: '{}',
    },
    comments: [
      {
        message: 'This dashboard has been successfully migrated from Splunk to Elastic.',
        created_at: '2024-06-01T12:30:00Z',
        created_by: 'assistant',
      },
      {
        message: 'User review: The migration looks good.',
        created_at: '2024-06-01T13:00:00Z',
        created_by: 'user1',
      },
    ],
    created_by: 'user1',
    '@timestamp': '2024-06-01T12:00:00Z',
    status: 'completed',
    translation_result: 'full',
  } as DashboardMigrationDashboard);

const getInstalledDashboard = () =>
  ({
    id: '3',
    migration_id: 'mig-1',
    original_dashboard: {
      id: 'orig-3',
      vendor: 'splunk',
      title: 'Original Dashboard 3',
      description: 'desc3',
      data: '{}',
      format: 'json',
    },
    elastic_dashboard: {
      id: 'elastic-3',
      title: 'Elastic Dashboard 3',
      description: 'Elastic desc 3',
      data: '{}',
    },
    comments: [
      {
        message: 'This dashboard has been successfully migrated from Splunk to Elastic.',
        created_at: '2024-06-01T12:30:00Z',
        created_by: 'assistant',
      },
      {
        message: 'User review: The migration looks good.',
        created_at: '2024-06-01T13:00:00Z',
        created_by: 'user1',
      },
      {
        message: 'Dashboard installed successfully.',
        created_at: '2024-06-01T14:00:00Z',
        created_by: 'system',
      },
    ],
    created_by: 'user1',
    '@timestamp': '2024-06-01T12:00:00Z',
    status: 'completed',
    translation_result: 'full',
  } as DashboardMigrationDashboard);

const mockDashboards: DashboardMigrationDashboard[] = [
  getTranslatedDashboard(),
  {
    id: '2',
    migration_id: 'mig-1',
    original_dashboard: {
      id: 'orig-2',
      vendor: 'splunk',
      title: 'Original Dashboard 2',
      description: 'desc2',
      data: '{}',
      format: 'json',
    },
    created_by: 'user2',
    '@timestamp': '2024-06-01T12:00:00Z',
    status: 'pending',
  },
  getInstalledDashboard(),
];

const mockStats = {
  id: 'mig-1',
  last_execution: { connector_id: 'conn-1' },
} as DashboardMigrationStats;

const mockTranslationStats = {
  dashboards: {
    total: 2,
    failed: 1,
    success: { total: 1, result: { full: 1, partial: 0, untranslatable: 0 }, installable: 1 },
  },
};

const mockServices = {
  ...createStartServicesMock(),
  siemMigrations: {
    ...createSiemMigrationsMock(),
    rules: createSiemMigrationsMock().rules,
    dashboards: {
      ...createSiemMigrationsMock().dashboards,
      hasMissingCapabilities: jest.fn().mockReturnValue(false),
      getMissingCapabilities: jest.fn().mockReturnValue([]),
    },
  } as unknown as SiemMigrationsService,
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders startServices={mockServices}>{children}</TestProviders>
);

const renderTestComponent = (partialProps: Partial<MigrationDashboardsTableProps> = {}) => {
  const defaultProps: MigrationDashboardsTableProps = {
    migrationStats: mockStats,
    refetchData: jest.fn(),
  };

  const props = { ...defaultProps, ...partialProps };
  return render(<MigrationDashboardsTable {...props} />, { wrapper: Wrapper });
};

jest.spyOn(useGetMigrationDashboardsModule, 'useGetMigrationDashboards').mockReturnValue({
  data: { migrationDashboards: mockDashboards, total: 2 },
  isLoading: false,
} as unknown as ReturnType<typeof useGetMigrationDashboardsModule.useGetMigrationDashboards>);

jest
  .spyOn(useGetMigrationTranslationStatsModule, 'useGetMigrationTranslationStats')
  .mockReturnValue({
    data: mockTranslationStats,
    isLoading: false,
  } as unknown as ReturnType<typeof useGetMigrationTranslationStatsModule.useGetMigrationTranslationStats>);

const mockInstallMigrationDashboard = jest.fn();

jest.spyOn(useInstallMigrationDashboardsModule, 'useInstallMigrationDashboards').mockReturnValue({
  mutateAsync: mockInstallMigrationDashboard,
  isLoading: false,
} as unknown as ReturnType<typeof useInstallMigrationDashboardsModule.useInstallMigrationDashboards>);

describe('MigrationDashboardsTable', () => {
  it('should render table and dashboards', () => {
    renderTestComponent();
    expect(screen.getByTestId('siemMigrationsDashboardsTable')).toBeInTheDocument();
    expect(screen.getByText('Elastic Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Original Dashboard 2')).toBeInTheDocument();
  });

  describe('Actions', () => {
    describe('Install', () => {
      it('should be able to Install dashboard by clicking on Actions Button for a fully translated dashboard', async () => {
        renderTestComponent();

        expect(await screen.findByTestId('siemMigrationsDashboardsTable')).toBeInTheDocument();
        const installButton = screen.getByTestId('installDashboard');
        fireEvent.click(installButton);
        expect(screen.getByTestId('installDashboard')).toBeDisabled();
        await waitFor(() => {
          expect(mockInstallMigrationDashboard).toHaveBeenCalledWith({ ids: ['1'] });
        });
      });

      it('should show `View` in actions for already installed dashboards', async () => {
        renderTestComponent();
        expect(await screen.findByTestId('siemMigrationsDashboardsTable')).toBeInTheDocument();

        const viewButton = screen.getAllByTestId('viewDashboard')[0];
        expect(viewButton).toBeVisible();
      });
    });
  });

  describe('Dashboard Details Flyout', () => {
    it('should show dashboard details flyout with comments when dashboard row is clicked', async () => {
      renderTestComponent();
      // Find and click on the dashboard title to open details flyout
      const dashboardCell = screen.getByText('Elastic Dashboard');
      fireEvent.click(dashboardCell);

      // The flyout should appear
      await waitFor(() => {
        expect(screen.getByTestId('dashboardDetailsFlyout')).toBeVisible();
      });

      // Check that comments are displayed in the flyout
      await waitFor(() => {
        expect(
          screen.getByText('This dashboard has been successfully migrated from Splunk to Elastic.')
        ).toBeInTheDocument();
        expect(screen.getByText('User review: The migration looks good.')).toBeInTheDocument();
      });
    });
  });
});
