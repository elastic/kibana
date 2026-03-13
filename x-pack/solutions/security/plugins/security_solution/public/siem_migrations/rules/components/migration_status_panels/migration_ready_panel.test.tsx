/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MigrationReadyPanel } from './migration_ready_panel';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../common/mock';
import type { RuleMigrationStats } from '../../types';
import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';
import { useGetMissingResources } from '../../../common/hooks/use_get_missing_resources';
import { useStartMigration } from '../../logic/use_start_migration';
import { MigrationDataInputContextProvider } from '../../../common/components';
import { MigrationSource } from '../../../common/types';

jest.mock('../../../../common/lib/kibana/use_kibana');

jest.mock('../../logic/use_start_migration');
const useStartMigrationMock = useStartMigration as jest.Mock;
const mockStartMigration = jest.fn();

const mockMigrationStateWithError: RuleMigrationStats = {
  status: SiemMigrationTaskStatus.READY,
  last_execution: {
    error:
      'Failed to populate ELSER indices. Make sure the ELSER model is deployed and running at Machine Learning > Trained Models. Error: Exception when running inference id [.elser-2-elasticsearch] on field [elser_embedding]',
  },
  id: 'c44d2c7d-0de1-4231-8b82-0dcfd67a9fe3',
  name: 'Migration 1',
  items: { total: 6, pending: 6, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-05-27T12:12:17.563Z',
  last_updated_at: '2025-05-27T12:12:17.563Z',
  vendor: MigrationSource.SPLUNK,
};

const mockMigrationStatsStopped: RuleMigrationStats = {
  status: SiemMigrationTaskStatus.STOPPED,
  id: 'c44d2c7d-0de1-4231-8b82-0dcfd67a9fe3',
  name: 'Migration 1',
  items: { total: 6, pending: 6, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-05-27T12:12:17.563Z',
  last_updated_at: '2025-05-27T12:12:17.563Z',

  vendor: MigrationSource.SPLUNK,
};

const mockMigrationStatsReady: RuleMigrationStats = {
  status: SiemMigrationTaskStatus.READY,
  id: 'c44d2c7d-0de1-4231-8b82-0dcfd67a9fe3',
  name: 'Migration 1',
  items: { total: 6, pending: 6, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-05-27T12:12:17.563Z',
  last_updated_at: '2025-05-27T12:12:17.563Z',
  vendor: MigrationSource.SPLUNK,
};

const missingMacro: SiemMigrationResourceBase = {
  type: 'macro',
  name: 'macro1',
};
const missingLookup: SiemMigrationResourceBase = {
  type: 'lookup',
  name: 'lookup1',
};

jest.mock('../../../common/hooks/use_get_missing_resources');
const useGetMissingResourcesMock = useGetMissingResources as jest.Mock;

const renderReadyPanel = (migrationStats: RuleMigrationStats) => {
  return render(<MigrationReadyPanel migrationStats={migrationStats} />, {
    wrapper: ({ children }) => (
      <TestProviders>
        <MigrationDataInputContextProvider
          openFlyout={jest.fn()}
          closeFlyout={jest.fn()}
          isFlyoutOpen={false}
        >
          {children}
        </MigrationDataInputContextProvider>
      </TestProviders>
    ),
  });
};

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
      renderReadyPanel(mockMigrationStatsReady);
      expect(screen.getByTestId('ruleMigrationDescription')).toHaveTextContent(
        `Migration of 6 rules is created and ready to start.`
      );
    });

    it('should render start migration button', () => {
      renderReadyPanel(mockMigrationStatsReady);
      expect(screen.getByTestId('startMigrationButton')).toBeVisible();
      expect(screen.getByTestId('startMigrationButton')).toHaveTextContent('Start');
    });

    it('should render starting migration button while loading', () => {
      useStartMigrationMock.mockReturnValue({
        startMigration: mockStartMigration,
        isLoading: true,
        isFlyoutOpen: false,
      });
      render(<MigrationReadyPanel migrationStats={mockMigrationStatsReady} />, {
        wrapper: ({ children }) => (
          <TestProviders>
            <MigrationDataInputContextProvider
              openFlyout={jest.fn()}
              closeFlyout={jest.fn()}
              isFlyoutOpen={false}
            >
              {children}
            </MigrationDataInputContextProvider>
          </TestProviders>
        ),
      });
      expect(screen.getByTestId('startMigrationButton')).toBeVisible();
      expect(screen.getByTestId('startMigrationButton')).toHaveTextContent('Starting');
    });
  });

  describe('Migration with Error', () => {
    it('should render error message when migration has an error', () => {
      renderReadyPanel(mockMigrationStateWithError);
      expect(screen.getByTestId('ruleMigrationDescription')).toHaveTextContent(
        'Migration of 6 rules failed. Please correct the below error and try again.'
      );
      expect(screen.getByTestId('ruleMigrationLastError')).toHaveTextContent(
        'Failed to populate ELSER indices. Make sure the ELSER model is deployed and running at Machine Learning > Trained Models. Error: Exception when running inference id [.elser-2-elasticsearch] on field [elser_embedding]'
      );
    });

    it('should render start migration button when there is an error', () => {
      renderReadyPanel(mockMigrationStateWithError);
      expect(screen.queryByTestId('startMigrationButton')).toHaveTextContent('Start');
    });
  });

  describe('Stopped Migration', () => {
    it('should render stopped migration message', () => {
      renderReadyPanel(mockMigrationStatsStopped);
      expect(screen.getByTestId('ruleMigrationDescription')).toHaveTextContent(
        'Migration of 6 rules was stopped, you can resume it any time.'
      );
    });

    it('should render correct start migration button for stopped migration', () => {
      renderReadyPanel(mockMigrationStatsStopped);
      expect(screen.getByTestId('startMigrationButton')).toHaveTextContent('Resume');
    });
  });

  describe('Missing Resources', () => {
    const missingResources = [missingMacro, missingLookup];
    const mockGetMissingResources = jest.fn();

    beforeEach(() => {
      mockGetMissingResources.mockReset();
      useGetMissingResourcesMock.mockImplementation((type, setterFn: Function) => {
        mockGetMissingResources.mockImplementation(() => {
          setterFn(missingResources);
        });
        return {
          getMissingResources: mockGetMissingResources,
          isLoading: false,
        };
      });
    });

    it('should render missing resources warning when there are missing resources', async () => {
      renderReadyPanel(mockMigrationStatsReady);
      await waitFor(() => {
        expect(screen.getByTestId('ruleMigrationDescription')).toHaveTextContent(
          'Migration of 6 rules is created and ready to start. You can also upload the missing macros & lookups for more accurate results.'
        );
      });
    });

    it('should render missing resources button', async () => {
      renderReadyPanel(mockMigrationStatsReady);
      expect(screen.getByTestId('ruleMigrationMissingResourcesButton')).toBeVisible();
    });
  });
});
