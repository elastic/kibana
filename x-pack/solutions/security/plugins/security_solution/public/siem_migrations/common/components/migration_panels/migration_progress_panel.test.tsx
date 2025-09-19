/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MigrationProgressPanel } from './migration_progress_panel';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../common/mock';
import type { MigrationTaskStats } from '../../../../../common/siem_migrations/model/common.gen';
import { useStopSiemMigration } from '../../hooks/use_stop_siem_migration';

jest.mock('../../../../common/lib/kibana/use_kibana');

jest.mock('../../hooks/use_stop_siem_migration');
const useStopMigrationMock = useStopSiemMigration as jest.Mock;
const mockStopMigration = jest.fn();

const createTestStats = (
  migrationType: 'rule' | 'dashboard',
  isInProgress: boolean = true
): MigrationTaskStats => {
  return {
    name: `test-${migrationType}-migration`,
    status: SiemMigrationTaskStatus.RUNNING,
    id: 'c44d2c7d-0de1-4231-8b82-0dcfd67a9fe3',
    items: isInProgress
      ? { total: 26, pending: 6, processing: 10, completed: 9, failed: 1 }
      : { total: 6, pending: 6, processing: 0, completed: 0, failed: 0 }, // preparing state
    created_at: '2025-05-27T12:12:17.563Z',
    last_updated_at: '2025-05-27T12:12:17.563Z',
  };
};

const renderMigrationProgressPanel = (
  migrationStats: MigrationTaskStats,
  migrationType: 'rule' | 'dashboard'
) => {
  return render(
    <MigrationProgressPanel migrationStats={migrationStats} migrationType={migrationType} />,
    {
      wrapper: TestProviders,
    }
  );
};

describe('MigrationProgressPanel', () => {
  beforeEach(() => {
    useStopMigrationMock.mockReturnValue({
      mutate: mockStopMigration,
      isLoading: false,
    });
  });

  describe('Preparing migration', () => {
    const testTypes = ['rule', 'dashboard'] as const;

    testTypes.forEach((type) => {
      describe(`${type} migration`, () => {
        beforeEach(() => {
          renderMigrationProgressPanel(createTestStats(type, false), type);
        });

        it('should render description text correctly', () => {
          expect(screen.queryByTestId(`${type}MigrationDescription`)).toHaveTextContent(
            'Preparing environment for the AI powered translation.'
          );
        });

        it('should render spinner', () => {
          expect(screen.queryByTestId(`${type}MigrationSpinner`)).toBeInTheDocument();
        });

        it('should not render progress bar', () => {
          expect(screen.queryByTestId(`${type}MigrationProgressBar`)).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('In progress Migration', () => {
    const testTypes = ['rule', 'dashboard'] as const;

    testTypes.forEach((type) => {
      describe(`${type} migration`, () => {
        beforeEach(() => {
          renderMigrationProgressPanel(createTestStats(type, true), type);
        });

        it('should render description text correctly', () => {
          expect(screen.getByTestId(`${type}MigrationDescription`)).toHaveTextContent(
            'Translating items'
          );
        });

        it('should render spinner', () => {
          expect(screen.queryByTestId(`${type}MigrationSpinner`)).toBeInTheDocument();
        });

        it('should render progress bar', () => {
          expect(screen.queryByTestId(`${type}MigrationProgressBar`)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Stop Migration', () => {
    it('should render stop migration button', async () => {
      renderMigrationProgressPanel(createTestStats('rule'), 'rule');
      expect(screen.getByTestId('stopMigrationButton')).toHaveTextContent('Stop');
    });

    it('should call stopMigration when stop button is clicked', async () => {
      const stats = createTestStats('rule');
      renderMigrationProgressPanel(stats, 'rule');

      screen.getByTestId('stopMigrationButton').click();
      expect(mockStopMigration).toHaveBeenCalledWith({ migrationId: stats.id });
    });

    it('should show loading state when stopping migration', async () => {
      useStopMigrationMock.mockReturnValue({
        mutate: mockStopMigration,
        isLoading: true,
      });

      renderMigrationProgressPanel(createTestStats('dashboard'), 'dashboard');

      expect(screen.queryByTestId('dashboardMigrationSpinner')).not.toBeInTheDocument();
      expect(screen.getByTestId('stopMigrationButton')).toHaveTextContent('Stopping');
    });
  });
});
