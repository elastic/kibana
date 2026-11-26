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

  describe('when the migration is created', () => {
    const onSuccess = jest.fn();
    const mockStories = [{ name: 'story', agents: [], diagram_layout: {}, guid: 'g1' }] as never;

    beforeEach(() => {
      mockCreateWorkflowMigration.mockResolvedValue('migration-1');
    });

    it('should confirm the creation with the migration id from the create response', async () => {
      const { result } = renderHook(() => useCreateMigration(onSuccess));

      await act(async () => {
        result.current.createMigration('My migration', mockStories);
      });

      expect(onSuccess).toHaveBeenCalledWith('migration-1');
    });

    it('should not fetch the migration stats after creating the migration', async () => {
      const { result } = renderHook(() => useCreateMigration(onSuccess));

      await act(async () => {
        result.current.createMigration('My migration', mockStories);
      });

      expect(mockGetWorkflowMigrationStats).not.toHaveBeenCalled();
    });

    it('should show a success toast when the migration is created', async () => {
      const { result } = renderHook(() => useCreateMigration(onSuccess));

      await act(async () => {
        result.current.createMigration('My migration', mockStories);
      });

      expect(mockAddSuccess).toHaveBeenCalled();
    });

    it('should stop loading when the migration is created', async () => {
      const { result } = renderHook(() => useCreateMigration(onSuccess));

      await act(async () => {
        result.current.createMigration('My migration', mockStories);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('when creating the migration fails', () => {
    beforeEach(() => {
      mockCreateWorkflowMigration.mockRejectedValue({ body: new Error('boom') });
    });

    it('should show an error toast', async () => {
      const { result } = renderHook(() => useCreateMigration());

      await act(async () => {
        result.current.createMigration('My migration', [] as never);
      });

      expect(mockAddError).toHaveBeenCalled();
    });

    it('should not confirm the creation', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useCreateMigration(onSuccess));

      await act(async () => {
        result.current.createMigration('My migration', [] as never);
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
