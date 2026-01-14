/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { MigrationReadyPanelProps } from './migration_ready_panel';
import { MigrationReadyPanel } from './migration_ready_panel';
import type { DashboardMigrationStats } from '../../types';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import * as useGetMissingResourcesModule from '../../../common/hooks/use_get_missing_resources';
import * as useStartMigrationModule from '../../logic/use_start_migration';
import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import { TestProviders } from '../../../../common/mock';
import { MigrationDataInputContextProvider } from '../../../common/components';
import { MigrationSource } from '../../../common/types';

const mockMigrationStats: DashboardMigrationStats = {
  id: 'mig-1',
  name: 'Test Migration',
  status: SiemMigrationTaskStatus.READY,
  items: {
    total: 5,
    failed: 0,
    pending: 5,
    processing: 0,
    completed: 0,
  },
  vendor: MigrationSource.SPLUNK,
  created_at: '2024-06-01T12:00:00Z',
  last_updated_at: '2024-06-01T12:30:00Z',
  last_execution: {
    connector_id: 'conn-1',
  },
};

const mockMissingResources: SiemMigrationResourceBase[] = [
  {
    type: 'macro',
    name: 'test_macro',
  },
  {
    type: 'lookup',
    name: 'test_lookup',
  },
];

const mockEmptyMissingResources: SiemMigrationResourceBase[] = [];

const mockGetMissingResources = jest.fn();
const mockStartMigration = jest.fn();

const mockUseGetMissingResources = jest.spyOn(
  useGetMissingResourcesModule,
  'useGetMissingResources'
);
mockUseGetMissingResources.mockImplementation(() => {
  return {
    getMissingResources: mockGetMissingResources,
    isLoading: false,
    error: null,
  };
});

jest.spyOn(useStartMigrationModule, 'useStartMigration').mockReturnValue({
  startMigration: mockStartMigration,
  isLoading: false,
  error: null,
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>
    <MigrationDataInputContextProvider
      openFlyout={jest.fn()}
      closeFlyout={jest.fn()}
      isFlyoutOpen={false}
    >
      {children}
    </MigrationDataInputContextProvider>
  </TestProviders>
);

const renderTestComponent = (partialProps: Partial<MigrationReadyPanelProps> = {}) => {
  const defaultProps: MigrationReadyPanelProps = {
    migrationStats: mockMigrationStats,
  };

  const props = { ...defaultProps, ...partialProps };
  return render(<MigrationReadyPanel {...props} />, { wrapper: Wrapper });
};

describe('MigrationReadyPanel', () => {
  beforeEach(() => {
    mockGetMissingResources.mockReturnValue([]);
    jest.clearAllMocks();
  });

  it('should render migration panel with ready description', () => {
    renderTestComponent();
    expect(screen.getByTestId('dashboardMigrationDescription')).toHaveTextContent(/5 dashboards/);
  });

  it('should show stopped description when migration is stopped', () => {
    renderTestComponent({
      migrationStats: {
        ...mockMigrationStats,
        status: SiemMigrationTaskStatus.STOPPED,
      },
    });
    expect(screen.getByTestId('dashboardMigrationDescription')).toHaveTextContent(/stopped/i);
  });

  it('should show error description when there is an execution error', () => {
    renderTestComponent({
      migrationStats: {
        ...mockMigrationStats,
        last_execution: {
          connector_id: 'conn-1',
          error: 'Migration failed due to network error',
        },
      },
    });
    expect(screen.getByTestId('dashboardMigrationDescription')).toHaveTextContent(/error/i);
    expect(screen.getByText('Migration failed due to network error')).toBeInTheDocument();
  });

  it('should call getMissingResources on component mount', () => {
    renderTestComponent();
    expect(mockGetMissingResources).toHaveBeenCalledWith('mig-1');
  });

  it('should show missing resources button and text when resources are missing', async () => {
    mockUseGetMissingResources.mockImplementation((_, setMissingResources) => {
      mockGetMissingResources.mockImplementation(() => setMissingResources(mockMissingResources));
      return {
        getMissingResources: mockGetMissingResources,
        isLoading: false,
        error: null,
      };
    });

    renderTestComponent();

    await waitFor(() => {
      expect(screen.getByTestId('dashboardMigrationMissingResourcesButton')).toBeInTheDocument();
      expect(
        screen.getByText(
          /You can also upload the missing macros & lookups for more accurate results/i
        )
      ).toBeInTheDocument();
    });
  });

  it('should show loading spinner when fetching missing resources', () => {
    mockUseGetMissingResources.mockImplementation((_, setMissingResources) => {
      mockGetMissingResources.mockImplementation(() => setMissingResources(mockMissingResources));
      return {
        getMissingResources: mockGetMissingResources,
        isLoading: true,
        error: null,
      };
    });

    const { container } = renderTestComponent();
    expect(
      container.querySelector(
        '[data-test-subj="dashboardMigrationMissingResourcesButton"] [role="progressbar"]'
      )
    ).toBeVisible();
  });

  it('should show start translation button', () => {
    mockUseGetMissingResources.mockImplementation((_, setMissingResources) => {
      mockGetMissingResources.mockImplementation(() =>
        setMissingResources(mockEmptyMissingResources)
      );
      return {
        getMissingResources: mockGetMissingResources,
        isLoading: false,
        error: null,
      };
    });
    renderTestComponent();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('should handle different migration item totals', () => {
    renderTestComponent({
      migrationStats: {
        ...mockMigrationStats,
        items: {
          failed: 0,
          pending: 1,
          processing: 0,
          completed: 0,
          total: 1,
        },
      },
    });
    expect(screen.getByTestId('dashboardMigrationDescription')).toHaveTextContent(/1 dashboard/);
  });

  it('should not show missing resources text when no resources are missing', () => {
    renderTestComponent();
    expect(screen.queryByText(/missing resources/i)).not.toBeInTheDocument();
  });
});
