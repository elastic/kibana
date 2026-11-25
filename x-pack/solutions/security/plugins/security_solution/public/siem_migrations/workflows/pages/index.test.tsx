/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { MigrationWorkflowsPage } from '.';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { useLatestStats } from '../service/hooks/use_latest_stats';
import { useNavigation } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('./empty', () => ({
  EmptyMigrationWorkflowsPage: () => <div data-test-subj="emptyMigrationWorkflows" />,
}));

jest.mock('../components/migration_status_panels/migration_ready_panel', () => ({
  MigrationReadyPanel: () => <div data-test-subj="workflowMigrationReadyPanel" />,
}));

jest.mock('../service/hooks/use_latest_stats');
jest.mock('../../../common/lib/kibana');

const refreshStats = jest.fn();
const navigateTo = jest.fn();
const getAppUrl = jest.fn();

const renderComponent = (migrationId?: string) => {
  const match: RouteComponentProps<{ migrationId?: string }>['match'] = {
    params: { migrationId },
    isExact: true,
    path: '',
    url: '',
  };
  const location: RouteComponentProps['location'] = {
    pathname: '',
    search: '',
    state: '',
    hash: '',
  };
  const history: RouteComponentProps['history'] = {
    length: 0,
    action: 'PUSH',
    location,
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
    <MockAppHeaderProvider>
      <TestProviders>
        <MigrationWorkflowsPage match={match} location={location} history={history} />
      </TestProviders>
    </MockAppHeaderProvider>
  );
};

const getMigration = (id: string, status: SiemMigrationTaskStatus) => ({
  id,
  name: `Migration ${id}`,
  status,
  created_at: '2021-01-01T00:00:00.000Z',
  last_updated_at: '2021-01-01T00:00:00.000Z',
  items: { total: 10, pending: 10, processing: 0, completed: 0, failed: 0 },
});

const mockLatestStats = (data: unknown[], isLoading = false) =>
  (useLatestStats as jest.Mock).mockReturnValue({ data, isLoading, refreshStats });

describe('MigrationWorkflowsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigateTo, getAppUrl });
  });

  describe('when loading', () => {
    it('should render loading skeletons', () => {
      mockLatestStats([], true);

      renderComponent();

      expect(screen.getByTestId('loadingSkeletonTitle')).toBeInTheDocument();
      expect(screen.getByTestId('loadingSkeletonText')).toBeInTheDocument();
    });
  });

  describe('when there are no migrations', () => {
    beforeEach(() => mockLatestStats([]));

    it('should not render loading skeletons', () => {
      renderComponent();

      expect(screen.queryByTestId('loadingSkeletonTitle')).not.toBeInTheDocument();
    });

    it('should render the empty page', () => {
      renderComponent();

      expect(screen.getByTestId('emptyMigrationWorkflows')).toBeInTheDocument();
    });

    it('should render the page title', () => {
      renderComponent();

      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
        'Translated workflows'
      );
    });

    it('should not render the migration selector', () => {
      renderComponent();

      expect(screen.queryByTestId('siemMigrationsSelectMigrationButton')).not.toBeInTheDocument();
    });

    it('should offer integrations and documentation without adding another migration', async () => {
      renderComponent();

      await openAppMenuOverflow();

      expect(await screen.findByTestId('addIntegrationsButton')).toBeInTheDocument();
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toBeInTheDocument();
      expect(screen.queryByTestId('addAnotherMigrationButton')).not.toBeInTheDocument();
    });
  });

  describe('when there are migrations', () => {
    beforeEach(() => mockLatestStats([getMigration('1', SiemMigrationTaskStatus.READY)]));

    it('should navigate to the most recent migration when none is selected', () => {
      renderComponent();

      expect(navigateTo).toHaveBeenCalledWith({
        deepLinkId: 'siem_migrations-workflows',
        path: '1',
      });
    });

    it('should not navigate when a migration is selected', () => {
      renderComponent('1');

      expect(navigateTo).not.toHaveBeenCalled();
    });

    it('should render the migration selector', () => {
      renderComponent('1');

      expect(screen.getByTestId('siemMigrationsSelectMigrationButton')).toBeInTheDocument();
    });

    it('should offer adding another migration', async () => {
      renderComponent('1');

      await openAppMenuOverflow();

      expect(await screen.findByTestId('addAnotherMigrationButton')).toBeInTheDocument();
    });

    it('should render the unknown migration page for an unknown migration id', () => {
      renderComponent('does-not-exist');

      expect(screen.getByTestId('siemMigrationsUnknown')).toBeInTheDocument();
    });
  });

  describe.each([
    SiemMigrationTaskStatus.READY,
    SiemMigrationTaskStatus.INTERRUPTED,
    SiemMigrationTaskStatus.STOPPED,
  ])('when the migration status is %s', (status) => {
    it('should render the migration ready panel', () => {
      mockLatestStats([getMigration('1', status)]);

      renderComponent('1');

      expect(screen.getByTestId('workflowMigrationReadyPanel')).toBeInTheDocument();
    });
  });

  it('should show the most recent migration first in the selector', () => {
    mockLatestStats([
      getMigration('1', SiemMigrationTaskStatus.READY),
      getMigration('2', SiemMigrationTaskStatus.READY),
    ]);

    renderComponent();

    expect(navigateTo).toHaveBeenCalledWith({
      deepLinkId: 'siem_migrations-workflows',
      path: '2',
    });
  });
});
