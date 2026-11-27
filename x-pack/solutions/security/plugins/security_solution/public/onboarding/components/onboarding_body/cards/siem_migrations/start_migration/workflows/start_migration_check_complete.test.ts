/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationTaskStatus } from '../../../../../../../../common/siem_migrations/constants';
import { checkStartMigrationCardComplete } from './start_migration_check_complete';

describe('checkStartMigrationCardComplete (workflows)', () => {
  const getMissingCapabilities = jest.fn();
  const isAvailable = jest.fn();
  const getMigrationsStats = jest.fn();
  const isWorkflowsUiEnabled = jest.fn();

  const siemMigrations = {
    workflows: { getMissingCapabilities, isAvailable, getMigrationsStats, isWorkflowsUiEnabled },
  };

  const check = () => checkStartMigrationCardComplete({ siemMigrations } as never);

  beforeEach(() => {
    jest.resetAllMocks();
    getMissingCapabilities.mockReturnValue([]);
    isAvailable.mockReturnValue(true);
    isWorkflowsUiEnabled.mockReturnValue(true);
  });

  it('should check the minimum capabilities level', async () => {
    getMigrationsStats.mockResolvedValue([]);

    await check();

    expect(getMissingCapabilities).toHaveBeenCalledWith('minimum');
  });

  it('should be complete when any migration is finished', async () => {
    getMigrationsStats.mockResolvedValue([
      { id: '1', status: SiemMigrationTaskStatus.READY },
      { id: '2', status: SiemMigrationTaskStatus.FINISHED },
    ]);

    expect(await check()).toEqual(expect.objectContaining({ isComplete: true }));
  });

  it('should count the migrations in the complete badge', async () => {
    getMigrationsStats.mockResolvedValue([
      { id: '1', status: SiemMigrationTaskStatus.READY },
      { id: '2', status: SiemMigrationTaskStatus.FINISHED },
    ]);

    expect(await check()).toEqual(expect.objectContaining({ completeBadgeText: '2 migrations' }));
  });

  it('should not be complete when no migration is finished', async () => {
    getMigrationsStats.mockResolvedValue([{ id: '1', status: SiemMigrationTaskStatus.READY }]);

    expect(await check()).toEqual(expect.objectContaining({ isComplete: false }));
  });

  it('should report the missing capabilities descriptions without fetching migrations when unavailable', async () => {
    getMissingCapabilities.mockReturnValue([{ description: 'Workflows: Read' }]);
    isAvailable.mockReturnValue(false);

    expect(await check()).toEqual(
      expect.objectContaining({
        isComplete: false,
        metadata: { missingCapabilities: ['Workflows: Read'], isWorkflowsUiDisabled: false },
      })
    );
    expect(getMigrationsStats).not.toHaveBeenCalled();
  });

  it('should flag the workflows ui as disabled when it is turned off', async () => {
    isWorkflowsUiEnabled.mockReturnValue(false);
    isAvailable.mockReturnValue(false);

    expect(await check()).toEqual(
      expect.objectContaining({
        isComplete: false,
        metadata: { missingCapabilities: [], isWorkflowsUiDisabled: true },
      })
    );
    expect(getMigrationsStats).not.toHaveBeenCalled();
  });

  it('should not flag the workflows ui as disabled when it is turned on', async () => {
    getMigrationsStats.mockResolvedValue([]);

    expect(await check()).toEqual(
      expect.objectContaining({
        metadata: { missingCapabilities: [], isWorkflowsUiDisabled: false },
      })
    );
  });
});
