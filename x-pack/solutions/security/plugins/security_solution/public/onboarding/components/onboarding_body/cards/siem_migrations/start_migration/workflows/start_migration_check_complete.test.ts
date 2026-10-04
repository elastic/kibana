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

  const siemMigrations = {
    workflows: {
      getMissingCapabilities,
      isAvailable,
      getMigrationsStats,
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    getMissingCapabilities.mockReturnValue([]);
    isAvailable.mockReturnValue(true);
  });

  it('marks complete when any migration is FINISHED', async () => {
    getMigrationsStats.mockResolvedValue([
      { id: '1', status: SiemMigrationTaskStatus.READY },
      { id: '2', status: SiemMigrationTaskStatus.FINISHED },
    ]);

    const result = await checkStartMigrationCardComplete({
      siemMigrations,
    } as never);

    expect(result).toEqual(
      expect.objectContaining({
        isComplete: true,
        completeBadgeText: expect.stringContaining('2'),
      })
    );
  });

  it('is incomplete when no migration is finished', async () => {
    getMigrationsStats.mockResolvedValue([{ id: '1', status: SiemMigrationTaskStatus.READY }]);

    const result = await checkStartMigrationCardComplete({
      siemMigrations,
    } as never);

    expect(result).toEqual(expect.objectContaining({ isComplete: false }));
  });

  it('returns missing capabilities descriptions', async () => {
    getMissingCapabilities.mockReturnValue([{ description: 'Missing priv' }]);
    isAvailable.mockReturnValue(false);

    const result = await checkStartMigrationCardComplete({
      siemMigrations,
    } as never);

    expect(result).toEqual(
      expect.objectContaining({
        isComplete: false,
        metadata: { missingCapabilities: ['Missing priv'] },
      })
    );
  });
});
