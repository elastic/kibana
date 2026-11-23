/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MigrationReadyPanel } from './migration_ready_panel';
import type { WorkflowMigrationStats } from '../../types';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../common/mock';
import { useKibana } from '../../../../common/lib/kibana';
import type { StartMigrationModalProps } from '../../../common/components/start_migration_modal';

jest.mock('../../../../common/lib/kibana');
// The modal loads the AI connectors over http, it is covered by its own tests
jest.mock('../../../common/components/start_migration_modal', () => ({
  StartMigrationModal: ({ onStartMigrationWithSettings, onClose }: StartMigrationModalProps) => (
    <div data-test-subj="startMigrationModal">
      <button
        type="button"
        data-test-subj="startMigrationModal-Translate"
        onClick={() => onStartMigrationWithSettings({ connectorId: 'connector-1' })}
      />
      <button type="button" data-test-subj="startMigrationModal-Cancel" onClick={onClose} />
    </div>
  ),
}));

const startWorkflowMigration = jest.fn();

const getStats = (overrides: Partial<WorkflowMigrationStats> = {}): WorkflowMigrationStats => ({
  id: 'migration-1',
  name: 'My Tines migration',
  status: SiemMigrationTaskStatus.READY,
  items: { total: 5, pending: 5, processing: 0, completed: 0, failed: 0 },
  created_at: '2024-06-01T12:00:00Z',
  last_updated_at: '2024-06-01T12:30:00Z',
  ...overrides,
});

const renderPanel = (stats = getStats()) =>
  render(<MigrationReadyPanel migrationStats={stats} />, { wrapper: TestProviders });

describe('MigrationReadyPanel (workflows)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    startWorkflowMigration.mockResolvedValue({ started: true });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        siemMigrations: { workflows: { startWorkflowMigration } },
        notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
      },
    });
  });

  it('should show the migration name', () => {
    renderPanel();

    expect(screen.getByText('My Tines migration')).toBeInTheDocument();
  });

  it('should say how many workflows are ready to start', () => {
    renderPanel();

    expect(screen.getByTestId('workflowMigrationDescription')).toHaveTextContent(
      'Migration of 5 workflows is created and ready to start.'
    );
  });

  it('should say the migration was stopped when it is stopped', () => {
    renderPanel(getStats({ status: SiemMigrationTaskStatus.STOPPED }));

    expect(screen.getByTestId('workflowMigrationDescription')).toHaveTextContent(
      'Migration of 5 workflows was stopped, you can resume it any time.'
    );
  });

  it('should say the migration failed and show the last error when the last execution failed', () => {
    renderPanel(
      getStats({
        status: SiemMigrationTaskStatus.INTERRUPTED,
        last_execution: { error: 'Something went wrong' },
      })
    );

    expect(screen.getByTestId('workflowMigrationDescription')).toHaveTextContent(
      'Migration of 5 workflows failed. Please correct the below error and try again.'
    );
    expect(screen.getByTestId('workflowMigrationLastError')).toHaveTextContent(
      'Something went wrong'
    );
  });

  it('should not show an error when the last execution did not fail', () => {
    renderPanel();

    expect(screen.queryByTestId('workflowMigrationLastError')).not.toBeInTheDocument();
  });

  it('should show the start button', () => {
    renderPanel();

    expect(screen.getByTestId('startMigrationButton')).toBeEnabled();
  });

  it('should open the connector modal when the start button is clicked', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('startMigrationButton'));

    expect(screen.getByTestId('startMigrationModal')).toBeInTheDocument();
  });

  it('should start the migration with the chosen connector from the modal', async () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('startMigrationButton'));
    fireEvent.click(screen.getByTestId('startMigrationModal-Translate'));

    await waitFor(() =>
      expect(startWorkflowMigration).toHaveBeenCalledWith({
        migrationId: 'migration-1',
        settings: { connectorId: 'connector-1' },
      })
    );
  });

  it('should close the modal without starting when it is cancelled', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('startMigrationButton'));
    fireEvent.click(screen.getByTestId('startMigrationModal-Cancel'));

    expect(screen.queryByTestId('startMigrationModal')).not.toBeInTheDocument();
  });

  it('should offer to resume a stopped migration', () => {
    renderPanel(getStats({ status: SiemMigrationTaskStatus.STOPPED }));

    expect(screen.getByTestId('startMigrationButton')).toHaveTextContent('Resume');
  });
});
