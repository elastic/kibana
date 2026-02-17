/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MigrationPanelTitle as MigrationTitle } from './migration_title';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../common/mock';
import * as i18n from './translations';
import { useDeleteMigration } from '../../hooks/use_delete_migrations';
import type { RuleMigrationStats } from '../../../rules/types';
import { useKibana } from '../../../../common/lib/kibana';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { MigrationSource } from '../../types';

jest.mock('../../../../common/lib/kibana/use_kibana');

const mockUpdateMigrationApi = jest.fn();

jest.mock('../../hooks/use_delete_migrations');
const useDeleteMigrationMock = useDeleteMigration as jest.Mock;
const mockDeleteMigration = jest.fn();

const mockMigrationStatsReady: RuleMigrationStats = {
  id: 'test-migration-id',
  name: 'Test Migration',
  status: SiemMigrationTaskStatus.READY,
  items: { total: 6, pending: 6, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-05-27T12:12:17.563Z',
  last_updated_at: '2025-05-27T12:12:17.563Z',
  vendor: MigrationSource.SPLUNK,
};

const mockMigrationStatsRunning: RuleMigrationStats = {
  ...mockMigrationStatsReady,
  status: SiemMigrationTaskStatus.RUNNING,
};

const renderMigrationPanelTitle = (migrationStats: RuleMigrationStats) => {
  return render(<MigrationTitle migrationStats={migrationStats} migrationType="rule" />, {
    wrapper: TestProviders,
  });
};

describe('MigrationPanelTitle', () => {
  beforeEach(() => {
    useDeleteMigrationMock.mockReturnValue({
      mutate: mockDeleteMigration,
      isLoading: false,
    });

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...createStartServicesMock(),
        siemMigrations: {
          rules: {
            api: {
              updateMigration: mockUpdateMigrationApi,
            },
          },
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render migration name correctly', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);
      expect(screen.getByText('Test Migration')).toBeInTheDocument();
    });

    it('should render options button', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);
      expect(screen.getByTestId('openMigrationOptionsButton')).toBeInTheDocument();
    });

    it('should have correct aria-label for options button', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);
      expect(screen.getByLabelText(i18n.OPEN_MIGRATION_OPTIONS_BUTTON)).toBeInTheDocument();
    });
  });

  describe('Options menu', () => {
    it('should open options menu when button is clicked', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      expect(screen.getByTestId('renameMigrationItem')).toBeInTheDocument();
      expect(screen.getByTestId('deleteMigrationItem')).toBeInTheDocument();
    });

    it('should show rename option in menu', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      expect(screen.getByTestId('renameMigrationItem')).toHaveTextContent(
        i18n.RENAME_MIGRATION_TEXT
      );
    });

    it('should show delete option in menu', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      expect(screen.getByTestId('deleteMigrationItem')).toHaveTextContent(i18n.DELETE_BUTTON_TEXT);
    });
  });

  describe('Rename functionality', () => {
    it('should enter edit mode when rename is clicked', async () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      const renameButton = screen.getByTestId('renameMigrationItem');
      fireEvent.click(renameButton);

      const input = screen.getByLabelText('Migration name');
      expect(input).toBeInTheDocument();
      await waitFor(() => expect(input).toHaveFocus());
    });

    it('should save new name when edit is confirmed', async () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      const renameButton = screen.getByTestId('renameMigrationItem');
      fireEvent.click(renameButton);

      const input = screen.getByLabelText('Migration name');
      fireEvent.change(input, { target: { value: 'New Migration Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockUpdateMigrationApi).toHaveBeenCalledWith({
          migrationId: 'test-migration-id',
          body: { name: 'New Migration Name' },
        });
      });
    });

    it('should cancel edit when escape is pressed', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      const renameButton = screen.getByTestId('renameMigrationItem');
      fireEvent.click(renameButton);

      const input = screen.getByLabelText('Migration name');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByLabelText('Migration name')).not.toBeInTheDocument();
      expect(screen.getByText('Test Migration')).toBeInTheDocument();
    });

    it('should revert name on update error', async () => {
      mockUpdateMigrationApi.mockRejectedValue(new Error('Update failed'));

      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      const renameButton = screen.getByTestId('renameMigrationItem');
      fireEvent.click(renameButton);

      const input = screen.getByLabelText('Migration name');
      fireEvent.change(input, { target: { value: 'New Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockUpdateMigrationApi).toHaveBeenCalledWith({
          migrationId: 'test-migration-id',
          body: { name: 'New Name' },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Test Migration')).toBeInTheDocument();
      });
    });
  });

  describe('Delete functionality', () => {
    it('should show delete confirmation modal when delete is clicked', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      const deleteButton = screen.getByTestId('deleteMigrationItem');
      fireEvent.click(deleteButton);

      expect(screen.getByText(i18n.DELETE_MIGRATION_TITLE)).toBeInTheDocument();
      expect(screen.getByText(i18n.DELETE_MIGRATION_DESCRIPTION)).toBeInTheDocument();
    });

    it('should call delete migration when confirmed', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      const deleteButton = screen.getByTestId('deleteMigrationItem');
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByText(i18n.DELETE_MIGRATION_TEXT);
      fireEvent.click(confirmButton);

      expect(mockDeleteMigration).toHaveBeenCalled();
    });

    it('should close modal when cancel is clicked', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      const deleteButton = screen.getByTestId('deleteMigrationItem');
      fireEvent.click(deleteButton);

      const cancelButton = screen.getByText(i18n.CANCEL_DELETE_MIGRATION_TEXT);
      fireEvent.click(cancelButton);

      expect(screen.queryByText(i18n.DELETE_MIGRATION_TITLE)).not.toBeInTheDocument();
    });
  });

  describe('Delete button state based on migration status', () => {
    it('should enable delete button for ready migration', () => {
      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      const deleteButton = screen.getByTestId('deleteMigrationItem');
      expect(deleteButton).not.toBeDisabled();
    });

    it('should disable delete button for running migration', () => {
      renderMigrationPanelTitle(mockMigrationStatsRunning);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      const deleteButton = screen.getByTestId('deleteMigrationItem');
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Event handling', () => {
    it('should prevent event propagation on options button click', () => {
      const mockStopPropagation = jest.fn();
      const originalStopPropagation = Event.prototype.stopPropagation;
      Event.prototype.stopPropagation = mockStopPropagation;

      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      expect(mockStopPropagation).toHaveBeenCalled();

      Event.prototype.stopPropagation = originalStopPropagation;
    });

    it('should prevent event propagation on inline edit click', () => {
      const mockStopPropagation = jest.fn();
      const originalStopPropagation = Event.prototype.stopPropagation;
      Event.prototype.stopPropagation = mockStopPropagation;

      renderMigrationPanelTitle(mockMigrationStatsReady);

      const optionsButton = screen.getByTestId('openMigrationOptionsButton');
      fireEvent.click(optionsButton);

      const renameButton = screen.getByTestId('renameMigrationItem');
      fireEvent.click(renameButton);

      const input = screen.getByLabelText('Migration name');
      fireEvent.click(input);

      expect(mockStopPropagation).toHaveBeenCalled();

      Event.prototype.stopPropagation = originalStopPropagation;
    });
  });
});
