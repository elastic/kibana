/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { render } from '@testing-library/react';
import { MigrationWorkflowsPage } from '.';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import { useLatestStats } from '../service/hooks/use_latest_stats';
import { useNavigation } from '../../../common/lib/kibana';
import { useInvalidateGetMigrationWorkflows } from '../logic/use_get_migration_workflows';
import { TestProviders } from '../../../common/mock/test_providers';

jest.mock('../components/workflow_table', () => ({
  WorkflowMigrationTable: () => <div data-test-subj="workflowMigrationTable" />,
}));

jest.mock('./empty', () => ({
  EmptyMigrationWorkflowsPage: () => <div data-test-subj="emptyMigrationWorkflows" />,
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

jest.mock('../service/hooks/use_latest_stats');
jest.mock('../../../common/lib/kibana');
jest.mock('../logic/use_get_migration_workflows');

const refreshStats: jest.Mock = jest.fn();
const navigateTo: jest.Mock = jest.fn();
const invalidateGetMigrationWorkflows: jest.Mock = jest.fn();

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
      <MigrationWorkflowsPage match={mockMatch} location={mockLocation} history={mockHistory} />
    </TestProviders>
  );
};

describe('MigrationWorkflowsPage', () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ navigateTo });
    (useInvalidateGetMigrationWorkflows as jest.Mock).mockReturnValue(
      invalidateGetMigrationWorkflows
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      expect(getByTestId('emptyMigrationWorkflows')).toBeInTheDocument();
    });
  });

  describe('when migration is ready', () => {
    beforeEach(() => {
      (useLatestStats as jest.Mock).mockReturnValue({
        data: [
          {
            id: '1',
            name: 'Test Migration',
            status: SiemMigrationTaskStatus.READY,
            created_at: '2021-01-01T00:00:00.000Z',
            last_updated_at: '2021-01-01T00:00:00.000Z',
            items: {
              total: 2,
              pending: 2,
              processing: 0,
              completed: 0,
              failed: 0,
            },
            vendor: 'tines',
          },
        ],
        isLoading: false,
        refreshStats,
      });
    });

    it('renders the ready panel', () => {
      const { getByTestId } = renderComponent('1');
      expect(getByTestId('migrationReadyPanel')).toBeInTheDocument();
    });
  });

  describe('when migration is running', () => {
    beforeEach(() => {
      (useLatestStats as jest.Mock).mockReturnValue({
        data: [
          {
            id: '1',
            name: 'Test Migration',
            status: SiemMigrationTaskStatus.RUNNING,
            created_at: '2021-01-01T00:00:00.000Z',
            last_updated_at: '2021-01-01T00:00:00.000Z',
            items: {
              total: 2,
              pending: 1,
              processing: 1,
              completed: 0,
              failed: 0,
            },
            vendor: 'tines',
          },
        ],
        isLoading: false,
        refreshStats,
      });
    });

    it('renders the progress panel', () => {
      const { getByTestId } = renderComponent('1');
      expect(getByTestId('migrationProgressPanel')).toBeInTheDocument();
    });
  });

  describe('when migration is finished', () => {
    beforeEach(() => {
      (useLatestStats as jest.Mock).mockReturnValue({
        data: [
          {
            id: '1',
            name: 'Test Migration',
            status: SiemMigrationTaskStatus.FINISHED,
            created_at: '2021-01-01T00:00:00.000Z',
            last_updated_at: '2021-01-01T00:00:00.000Z',
            items: {
              total: 2,
              pending: 0,
              processing: 0,
              completed: 2,
              failed: 0,
            },
            vendor: 'tines',
          },
        ],
        isLoading: false,
        refreshStats,
      });
    });

    it('renders the results table', () => {
      const { getByTestId } = renderComponent('1');
      expect(getByTestId('workflowMigrationTable')).toBeInTheDocument();
    });
  });
});
