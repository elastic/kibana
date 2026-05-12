/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { OnboardingCardCheckComplete } from '../../../../../../types';
import type { StartMigrationCardMetadata } from '../common/types';
import { SiemMigrationTaskStatus } from '../../../../../../../../common/siem_migrations/constants';

const COMPLETE_BADGE_TEXT = (migrationsCount: number) =>
  i18n.translate(
    'xpack.securitySolution.onboarding.siemMigrations.dashboards.startMigration.completeBadge',
    {
      defaultMessage:
        '{migrationsCount} {migrationsCount, plural, one {migration} other {migrations}}',
      values: { migrationsCount },
    }
  );

export const checkStartMigrationCardComplete: OnboardingCardCheckComplete<
  StartMigrationCardMetadata
> = async ({ siemMigrations }) => {
  const missingCapabilities = siemMigrations.dashboards
    .getMissingCapabilities('minimum')
    .map(({ description }) => description);

  let isComplete = false;
  let migrationsCount = 0;

  if (siemMigrations.dashboards.isAvailable()) {
    const migrationsStats = await siemMigrations.dashboards.getMigrationsStats();
    isComplete = migrationsStats.some(
      (migrationStats) => migrationStats.status === SiemMigrationTaskStatus.FINISHED
    );
    migrationsCount = migrationsStats.length;
  }

  return {
    isComplete,
    completeBadgeText: COMPLETE_BADGE_TEXT(migrationsCount),
    metadata: { missingCapabilities },
  };
};
