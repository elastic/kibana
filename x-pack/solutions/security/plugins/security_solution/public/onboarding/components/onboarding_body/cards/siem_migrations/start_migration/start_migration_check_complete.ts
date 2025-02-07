/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';

import type { OnboardingCardCheckComplete } from '../../../../../types';
import type { StartMigrationCardMetadata } from './types';

export const checkStartMigrationCardComplete: OnboardingCardCheckComplete<
  StartMigrationCardMetadata
> = async ({ siemMigrations }) => {
  const missingCapabilities = siemMigrations.rules
    .getMissingCapabilities('all')
    .map(({ description }) => description);

  let isComplete = false;

  if (missingCapabilities.length === 0) {
    const migrationsStats = await siemMigrations.rules.getRuleMigrationsStats();
    isComplete = migrationsStats.some(
      (migrationStats) => migrationStats.status === SiemMigrationTaskStatus.FINISHED
    );
  }

  return { isComplete, metadata: { missingCapabilities } };
};
