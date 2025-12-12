/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { render } from '@testing-library/react';
import { MigrationDashboardsPage } from '.';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { useLatestStats } from '../service/hooks/use_latest_stats';
import { useNavigation } from '../../../common/lib/kibana';
import { useInvalidateGetMigrationDashboards } from '../logic/use_get_migration_dashboards';
import { useInvalidateGetMigrationTranslationStats } from '../logic/use_get_migration_translation_stats';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('../components/dashboard_table', () => ({
  MigrationDashboardsTable: () => <div data-test-subj="migrationDashboardsTable" />,
}));

jest.mock('./empty', () => ({
  EmptyMigrationDashboardsPage: () => <div data-test-subj="emptyMigrationDashboards" />,
}));

jest.mock('../../../common/components/header_page', () => ({
  HeaderPage: () => <div data-test-subj="headerPage" />,
}));

jest.mock('../../common/components/migration_panels/migration_progress_panel', () => ({
  MigrationProgressPanel: () => <div data-test-subj="migrationProgressPanel" />,
}));

jest.mock('../components/migration_status_panels/migration_ready_panel', () => ({
  MigrationReadyPanel: () => <div data-test-subj="migrationReadyPanel" />,
}));

jest.mock('../components/migration_status_panels/upload_missing_panel', () => ({
  DashboardMigrationsUploadMissingPanel: () => (
    <div data-test-subj="dashboardMigrationsUploadMissingPanel" />
  ),
}));

jest.mock('../service/hooks/use_latest_stats');
jest.mock('../../../common/lib/kibana');
jest.mock('../logic/use_get_migration_dashboards');
jest.mock('../logic/use_get_migration_translation_stats');

const refreshStats: jest.Mock = jest.fn();
const navigateTo: jest.Mock = jest.fn();
const invalidateGetMigrationDashboards: jest.Mock = jest.fn();
const invalidateGetMigrationTranslationStats: jest.Mock = jest.fn();

const renderComponent = (migrationId?: string) => {
  const mockMatch: RouteComponentProps<{ migrationId?: string }>['match'] = {
    params: { migrationId },
    isExact: true,
    path: '',
    url: '',
  };
  const mockLocation: RouteComponentProps['location'] = {
    pathname: '',
    search: '',
    state: '',
    hash: '',
  };
  const mockHistory: RouteComponentProps['history'] = {
    length: 0,
    action: 'PUSH',
    location: mockLocation,
    push: jest.fn(),
    replace: jest.fn(),
    go: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    block: jest.fn(),
    listen: jest.fn(),
    createHref: jest.fn(),
  };

  return render(
    <TestProviders>
      <MigrationDashboardsPage match={mockMatch} location={mockLocation} history={mockHistory} />
    </TestProviders>
  );
};

describe('MigrationDashboardsPage', () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ navigateTo });
    (useInvalidateGetMigrationDashboards as jest.Mock).mockReturnValue(
      invalidateGetMigrationDashboards
    );
    (useInvalidateGetMigrationTranslationStats as jest.Mock).mockReturnValue(
      invalidateGetMigrationTranslationStats
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when loading', () => {
    beforeEach(() => {
      (useLatestStats as jest.Mock).mockReturnValue({
        data: [],
        isLoading: true,
        refreshStats,
      });
    });

    it('renders loading skeletons', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('loadingSkeletonTitle')).toBeInTheDocument();
      expect(getByTestId('loadingSkeletonText')).toBeInTheDocument();
    });
  });

  describe('when not loading', () => {
    beforeEach(() => {
      (useLatestStats as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        refreshStats,
      });
    });

    it('does not render loading skeletons', () => {
      const { queryByTestId } = renderComponent();
      expect(queryByTestId('loadingSkeletonTitle')).not.toBeInTheDocument();
      expect(queryByTestId('loadingSkeletonText')).not.toBeInTheDocument();
    });
  });

  describe('when there are no migrations', () => {
    beforeEach(() => {
      (useLatestStats as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        refreshStats,
      });
    });

    it('renders the empty page', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('emptyMigrationDashboards')).toBeInTheDocument();
    });
  });

  describe('when there are migrations', () => {
    const migrations = [
      {
        id: '1',
        name: 'Test Migration',
        status: SiemMigrationTaskStatus.FINISHED,
        created_at: '2021-01-01T00:00:00.000Z',
        last_updated_at: '2021-01-01T00:00:00.000Z',
        items: {
          total: 10,
          pending: 0,
          processing: 0,
          completed: 5,
          failed: 5,
        },
      },
    ];

    beforeEach(() => {
      (useLatestStats as jest.Mock).mockReturnValue({
        data: migrations,
        isLoading: false,
        refreshStats,
      });
    });

    it('renders the migration dashboards table', () => {
      const { getByTestId } = renderComponent('1');
      expect(getByTestId('migrationDashboardsTable')).toBeInTheDocument();
    });

    it('navigates to the most recent migration if no migration is selected', () => {
      renderComponent();
      expect(navigateTo).toHaveBeenCalledWith({
        deepLinkId: 'siem_migrations-dashboards',
        path: '1',
      });
    });

    describe('when migration status is RUNNING', () => {
      const runningMigrations = [
        {
          ...migrations[0],
          status: SiemMigrationTaskStatus.RUNNING,
        },
      ];

      beforeEach(() => {
        (useLatestStats as jest.Mock).mockReturnValue({
          data: runningMigrations,
          isLoading: false,
          refreshStats,
        });
      });

      it('renders the migration progress panel', () => {
        const { getByTestId } = renderComponent('1');
        expect(getByTestId('migrationProgressPanel')).toBeInTheDocument();
      });
    });

    describe('when migration status is READY', () => {
      const pendingMigrations = [
        {
          ...migrations[0],
          status: SiemMigrationTaskStatus.READY,
        },
      ];

      beforeEach(() => {
        (useLatestStats as jest.Mock).mockReturnValue({
          data: pendingMigrations,
          isLoading: false,
          refreshStats,
        });
      });

      it('renders the migration ready panel', () => {
        const { getByTestId } = renderComponent('1');
        expect(getByTestId('migrationReadyPanel')).toBeInTheDocument();
      });
    });

    describe('when migration status is INTERRUPTED', () => {
      const interruptedMigrations = [
        {
          ...migrations[0],
          status: SiemMigrationTaskStatus.INTERRUPTED,
        },
      ];

      beforeEach(() => {
        (useLatestStats as jest.Mock).mockReturnValue({
          data: interruptedMigrations,
          isLoading: false,
          refreshStats,
        });
      });

      it('renders the migration ready panel', () => {
        const { getByTestId } = renderComponent('1');
        expect(getByTestId('migrationReadyPanel')).toBeInTheDocument();
      });
    });

    describe('when migration status is STOPPED', () => {
      const stoppedMigrations = [
        {
          ...migrations[0],
          status: SiemMigrationTaskStatus.STOPPED,
        },
      ];

      beforeEach(() => {
        (useLatestStats as jest.Mock).mockReturnValue({
          data: stoppedMigrations,
          isLoading: false,
          refreshStats,
        });
      });

      it('renders the migration ready panel', () => {
        const { getByTestId } = renderComponent('1');
        expect(getByTestId('migrationReadyPanel')).toBeInTheDocument();
      });
    });

    describe('when migration status is FINISHED', () => {
      const finishedMigrations = [
        {
          ...migrations[0],
          status: SiemMigrationTaskStatus.FINISHED,
        },
      ];

      beforeEach(() => {
        (useLatestStats as jest.Mock).mockReturnValue({
          data: finishedMigrations,
          isLoading: false,
          refreshStats,
        });
      });

      it('renders the upload missing panel and dashboards table', () => {
        const { getByTestId } = renderComponent('1');
        expect(getByTestId('dashboardMigrationsUploadMissingPanel')).toBeInTheDocument();
        expect(getByTestId('migrationDashboardsTable')).toBeInTheDocument();
      });
    });
  });
});
