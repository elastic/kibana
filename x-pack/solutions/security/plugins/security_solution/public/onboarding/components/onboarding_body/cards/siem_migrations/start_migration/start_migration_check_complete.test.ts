/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';
import { createStartServicesMock } from '../../../../../../common/lib/kibana/kibana_react.mock';
import type { SiemMigrationsService } from '../../../../../../siem_migrations/service';
import { checkStartMigrationCardComplete } from './start_migration_check_complete';

describe('startMigrationCheckComplete', () => {
  it('should return default values if siem migrations are not available', async () => {
    // Arrange
    const siemMigrations = {
      rules: {
        getMissingCapabilities: jest.fn().mockReturnValue([]),
        isAvailable: jest.fn().mockReturnValue(false),
      },
    } as unknown as SiemMigrationsService;

    const services = {
      ...createStartServicesMock(),
      siemMigrations,
    };
    const result = await checkStartMigrationCardComplete(services);

    expect(result).toEqual({
      completeBadgeText: '0 migrations',
      isComplete: false,
      metadata: { missingCapabilities: [] },
    });
  });

  it('should query Stats if siem migrations are available', async () => {
    const siemMigrations = {
      rules: {
        getMissingCapabilities: jest.fn().mockReturnValue([]),
        isAvailable: jest.fn().mockReturnValue(true),
        getRuleMigrationsStats: jest.fn().mockReturnValue([
          {
            status: SiemMigrationTaskStatus.FINISHED,
          },
        ]),
      },
    } as unknown as SiemMigrationsService;

    const services = {
      ...createStartServicesMock(),
      siemMigrations,
    };

    const result = await checkStartMigrationCardComplete(services);

    expect(siemMigrations.rules.getRuleMigrationsStats).toHaveBeenCalled();

    expect(result).toEqual({
      completeBadgeText: '1 migration',
      isComplete: true,
      metadata: { missingCapabilities: [] },
    });
  });
});
