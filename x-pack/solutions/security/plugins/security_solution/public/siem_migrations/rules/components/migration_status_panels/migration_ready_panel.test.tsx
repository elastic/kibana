/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MigrationReadyPanel } from './migration_ready_panel';
import { useGetMissingResources } from '../../service/hooks/use_get_missing_resources';
import { useStartMigration } from '../../service/hooks/use_start_migration';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import type { RuleMigrationResourceBase } from '../../../../../common/siem_migrations/model/rule_migration.gen';

jest.mock('../data_input_flyout/context', () => ({
  useRuleMigrationDataInputContext: () => ({
    openFlyout: jest.fn(),
  }),
}));

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(() => ({
    services: {
      siemMigrations: {
        rules: {
          telemetry: jest.fn(),
        },
      },
    },
  })),
}));

jest.mock('../../service/hooks/use_start_migration');
const useStartMigrationMock = useStartMigration as jest.Mock;
const mockStartMigration = jest.fn();

const mockMigrationStateWithError = {
  status: SiemMigrationTaskStatus.READY,
  last_error:
    'Failed to populate ELSER indices. Make sure the ELSER model is deployed and running at Machine Learning > Trained Models. Error: Exception when running inference id [.elser-2-elasticsearch] on field [elser_embedding]',
  id: 'c44d2c7d-0de1-4231-8b82-0dcfd67a9fe3',
  rules: { total: 6, pending: 6, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-05-27T12:12:17.563Z',
  last_updated_at: '2025-05-27T12:12:17.563Z',
  number: 1,
};

const mockMigrationStatsAborted = {
  status: SiemMigrationTaskStatus.ABORTED,
  id: 'c44d2c7d-0de1-4231-8b82-0dcfd67a9fe3',
  rules: { total: 6, pending: 6, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-05-27T12:12:17.563Z',
  last_updated_at: '2025-05-27T12:12:17.563Z',
  number: 1,
};

const mockMigrationStatsReady = {
  status: SiemMigrationTaskStatus.READY,
  id: 'c44d2c7d-0de1-4231-8b82-0dcfd67a9fe3',
  rules: { total: 6, pending: 6, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-05-27T12:12:17.563Z',
  last_updated_at: '2025-05-27T12:12:17.563Z',
  number: 1,
};

const missingMacro: RuleMigrationResourceBase = {
  type: 'macro',
  name: 'macro1',
};
const missingLookup: RuleMigrationResourceBase = {
  type: 'lookup',
  name: 'lookup1',
};

jest.mock('../../service/hooks/use_get_missing_resources');
const useGetMissingResourcesMock = useGetMissingResources as jest.Mock;

describe('MigrationReadyPanel', () => {
  beforeEach(() => {
    useGetMissingResourcesMock.mockReturnValue({
      getMissingResources: jest.fn().mockResolvedValue([]),
      isLoading: false,
    });

    useStartMigrationMock.mockReturnValue({
      startMigration: mockStartMigration,
      isLoading: false,
      error: null,
    });
  });

  describe('Ready Migration', () => {
    it('should render description text correctly', () => {
      render(<MigrationReadyPanel migrationStats={mockMigrationStatsReady} />);
      expect(screen.getByTestId('ruleMigrationDescription')).toHaveTextContent(
        `Migration of 6 rules is created but the translation has not started yet.`
      );
    });

    it('should render start migration button', () => {
      render(<MigrationReadyPanel migrationStats={mockMigrationStatsReady} />);
      expect(screen.getByTestId('startMigrationButton')).toBeVisible();
      expect(screen.getByTestId('startMigrationButton')).toHaveTextContent('Start translation');
    });
  });

  describe('Migration with Error', () => {
    it('should render error message when migration has an error', () => {
      render(<MigrationReadyPanel migrationStats={mockMigrationStateWithError} />);
      expect(screen.getByTestId('ruleMigrationDescription')).toHaveTextContent(
        'Migration of 6 rules failed. Please correct the below error and try again.'
      );
      expect(screen.getByTestId('ruleMigrationLastError')).toHaveTextContent(
        'Failed to populate ELSER indices. Make sure the ELSER model is deployed and running at Machine Learning > Trained Models. Error: Exception when running inference id [.elser-2-elasticsearch] on field [elser_embedding]'
      );
    });

    it('should render start migration button when there is an error', () => {
      render(<MigrationReadyPanel migrationStats={mockMigrationStateWithError} />);
      expect(screen.queryByTestId('startMigrationButton')).toHaveTextContent('Start translation');
    });
  });

  describe('Aborted Migration', () => {
    it('should render aborted migration message', () => {
      render(<MigrationReadyPanel migrationStats={mockMigrationStatsAborted} />);
      expect(screen.getByTestId('ruleMigrationDescription')).toHaveTextContent(
        'Migration of 6 rules was stopped. You can resume it any time.'
      );
    });

    it('should render correct start migration button for aborted migration', () => {
      render(<MigrationReadyPanel migrationStats={mockMigrationStatsAborted} />);
      expect(screen.getByTestId('startMigrationButton')).toHaveTextContent('Resume translation');
    });
  });

  describe('Missing Resources', () => {
    const missingResources = [missingMacro, missingLookup];

    beforeEach(() => {
      useGetMissingResourcesMock.mockImplementation((setterFn: Function) => {
        return {
          getMissingResources: jest.fn().mockImplementation(() => {
            setterFn(missingResources);
          }),
          isLoading: false,
        };
      });
    });

    it('should render missing resources warning when there are missing resources', async () => {
      render(<MigrationReadyPanel migrationStats={mockMigrationStatsReady} />);
      await waitFor(() => {
        expect(screen.getByTestId('ruleMigrationDescription')).toHaveTextContent(
          'Migration of 6 rules is created but the translation has not started yet. Upload macros & lookups and start the translation process.'
        );
      });
    });

    it('should render missing resources button', async () => {
      render(<MigrationReadyPanel migrationStats={mockMigrationStatsReady} />);
      expect(screen.getByTestId('ruleMigrationMissingResourcesButton')).toBeVisible();
    });
  });
});
