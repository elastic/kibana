/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useStartMigration } from './use_start_migration';
import { useKibana } from '../../../../common/lib/kibana';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import type { WorkflowMigrationStats } from '../../types';

jest.mock('../../../../common/lib/kibana');

const mockStartWorkflowMigration = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

const migrationStats = {
  id: 'migration-1',
  status: SiemMigrationTaskStatus.READY,
  name: 'Tines stories',
  items: { total: 3, pending: 3, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-01-01T00:00:00Z',
  last_updated_at: '2025-01-01T01:00:00Z',
} as WorkflowMigrationStats;

describe('useStartMigration (workflows)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        siemMigrations: { workflows: { startWorkflowMigration: mockStartWorkflowMigration } },
        notifications: { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } },
      },
    });
  });

  it('should start the migration with the selected connector', async () => {
    mockStartWorkflowMigration.mockResolvedValue({ started: true });
    const { result } = renderHook(() => useStartMigration());

    await act(async () => {
      result.current.startMigration(migrationStats, { connectorId: 'connector-1' });
    });

    expect(mockStartWorkflowMigration).toHaveBeenCalledWith({
      migrationId: 'migration-1',
      settings: { connectorId: 'connector-1' },
    });
  });

  it('should show a success toast and call onSuccess when the migration started', async () => {
    mockStartWorkflowMigration.mockResolvedValue({ started: true });
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useStartMigration(onSuccess));

    await act(async () => {
      result.current.startMigration(migrationStats, { connectorId: 'connector-1' });
    });

    expect(mockAddSuccess).toHaveBeenCalledWith('Migration started successfully.');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should not call onSuccess when the migration did not start', async () => {
    mockStartWorkflowMigration.mockResolvedValue({ started: false });
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useStartMigration(onSuccess));

    await act(async () => {
      result.current.startMigration(migrationStats, { connectorId: 'connector-1' });
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('should not show a success toast when the migration did not start', async () => {
    mockStartWorkflowMigration.mockResolvedValue({ started: false });
    const { result } = renderHook(() => useStartMigration());

    await act(async () => {
      result.current.startMigration(migrationStats, { connectorId: 'connector-1' });
    });

    expect(mockAddSuccess).not.toHaveBeenCalled();
  });

  it('should show an error toast when starting fails', async () => {
    const error = new Error('API error');
    mockStartWorkflowMigration.mockRejectedValue(error);
    const { result } = renderHook(() => useStartMigration());

    await act(async () => {
      result.current.startMigration(migrationStats, { connectorId: 'connector-1' });
    });

    expect(mockAddError).toHaveBeenCalledWith(error, { title: 'Error starting migration.' });
  });
});
