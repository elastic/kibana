/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MigrationProgressPanel } from './migration_progress_panel';
import { useStopMigration } from '../../service/hooks/use_stop_migration';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../common/mock';
import type { RuleMigrationStats } from '../../types';

jest.mock('../../../../common/lib/kibana/use_kibana');

jest.mock('../../service/hooks/use_stop_migration');
const useStopMigrationMock = useStopMigration as jest.Mock;
const mockStopMigration = jest.fn();

const inProgressMigrationStats: RuleMigrationStats = {
  name: 'test-migration',
  status: SiemMigrationTaskStatus.RUNNING,
  id: 'c44d2c7d-0de1-4231-8b82-0dcfd67a9fe3',
  rules: { total: 26, pending: 6, processing: 10, completed: 9, failed: 1 },
  created_at: '2025-05-27T12:12:17.563Z',
  last_updated_at: '2025-05-27T12:12:17.563Z',
};
const preparingMigrationStats: RuleMigrationStats = {
  ...inProgressMigrationStats,
  // status RUNNING and the same number of total and pending rules, means the migration is still preparing the environment
  status: SiemMigrationTaskStatus.RUNNING,
  rules: { total: 6, pending: 6, processing: 0, completed: 0, failed: 0 },
};

const renderMigrationProgressPanel = (migrationStats: RuleMigrationStats) => {
  return render(<MigrationProgressPanel migrationStats={migrationStats} />, {
    wrapper: TestProviders,
  });
};

describe('MigrationProgressPanel', () => {
  beforeEach(() => {
    useStopMigrationMock.mockReturnValue({
      stopMigration: mockStopMigration,
      isLoading: false,
    });
  });

  describe('Preparing migration', () => {
    beforeEach(() => {
      renderMigrationProgressPanel(preparingMigrationStats);
    });

    it('should render description text correctly', () => {
      expect(screen.queryByTestId('ruleMigrationDescription')).toHaveTextContent(
        `Preparing environment for the AI powered translation.`
      );
    });

    it('should render spinner', () => {
      expect(screen.queryByTestId('ruleMigrationSpinner')).toBeInTheDocument();
    });

    it('should not render progress bar', () => {
      expect(screen.queryByTestId('ruleMigrationProgressBar')).not.toBeInTheDocument();
    });
  });

  describe('In progress Migration', () => {
    beforeEach(() => {
      renderMigrationProgressPanel(inProgressMigrationStats);
    });

    it('should render description text correctly', () => {
      expect(screen.getByTestId('ruleMigrationDescription')).toHaveTextContent(`Translating rules`);
    });

    it('should render spinner', () => {
      expect(screen.queryByTestId('ruleMigrationSpinner')).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      expect(screen.queryByTestId('ruleMigrationProgressBar')).toBeInTheDocument();
    });
  });

  describe('Stop Migration', () => {
    it('should render stop migration button', async () => {
      renderMigrationProgressPanel(inProgressMigrationStats);

      expect(screen.getByTestId('stopMigrationButton')).toHaveTextContent('Stop');
    });

    it('should call stopMigration when stop button is clicked', async () => {
      renderMigrationProgressPanel(inProgressMigrationStats);

      screen.getByTestId('stopMigrationButton').click();
      expect(mockStopMigration).toHaveBeenCalledWith(inProgressMigrationStats.id);
    });

    it('should show loading state when stopping migration', async () => {
      useStopMigrationMock.mockReturnValue({
        stopMigration: mockStopMigration,
        isLoading: true,
      });

      renderMigrationProgressPanel(inProgressMigrationStats);

      expect(screen.queryByTestId('ruleMigrationSpinner')).not.toBeInTheDocument();
      expect(screen.getByTestId('stopMigrationButton')).toHaveTextContent('Stopping');
    });
  });
});
