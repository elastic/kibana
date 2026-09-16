/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useCreateMigration } from './use_create_migration';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

jest.mock('../../../../common/lib/kibana/kibana_react');

const mockedUseKibana = useKibana as jest.Mock;
const mockCreateWorkflowMigration = jest.fn();
const mockGetWorkflowMigrationStats = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

describe('useCreateMigration (workflows)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedUseKibana.mockReturnValue({
      services: {
        siemMigrations: {
          workflows: {
            createWorkflowMigration: mockCreateWorkflowMigration,
            api: {
              getWorkflowMigrationStats: mockGetWorkflowMigrationStats,
            },
          },
        },
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
            addError: mockAddError,
          },
        },
      },
    });
  });

  describe('on success', () => {
    const onSuccess = jest.fn();
    const mockStories = [{ name: 'story', agents: [], diagram_layout: {}, guid: 'g1' }] as never;

    beforeEach(() => {
      mockCreateWorkflowMigration.mockResolvedValue('migration-1');
      mockGetWorkflowMigrationStats.mockResolvedValue({
        id: 'migration-1',
        name: 'My migration',
        status: 'ready',
      });
    });

    it('creates migration and notifies success', async () => {
      const { result } = renderHook(() => useCreateMigration(onSuccess));

      await act(async () => {
        result.current.createMigration('My migration', mockStories);
      });

      expect(mockCreateWorkflowMigration).toHaveBeenCalledWith(mockStories, 'My migration');
      expect(mockGetWorkflowMigrationStats).toHaveBeenCalledWith({ migrationId: 'migration-1' });
      expect(mockAddSuccess).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'migration-1', name: 'My migration' })
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('on error', () => {
    it('notifies error', async () => {
      mockCreateWorkflowMigration.mockRejectedValue({ body: new Error('boom') });
      const { result } = renderHook(() => useCreateMigration());

      await act(async () => {
        result.current.createMigration('My migration', [] as never);
      });

      expect(mockAddError).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
