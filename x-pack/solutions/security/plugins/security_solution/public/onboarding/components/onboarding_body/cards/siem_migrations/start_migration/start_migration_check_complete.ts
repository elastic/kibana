/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECURITY_FEATURE_ID_V2,
  SIEM_MIGRATIONS_FEATURE_ID,
} from '@kbn/security-solution-features/constants';
import { CapabilitiesChecker } from '../../../../../../common/lib/capabilities';
import { SiemMigrationTaskStatus } from '../../../../../../../common/siem_migrations/constants';

import type { OnboardingCardCheckComplete } from '../../../../../types';
import type { StartMigrationCardMetadata } from './types';
import { CAPABILITIES_REQUIRED } from './translations';

export const checkStartMigrationCardComplete: OnboardingCardCheckComplete<
  StartMigrationCardMetadata
> = async ({ siemMigrations, application }) => {
  const capabilities = new CapabilitiesChecker(application.capabilities);

  const missingCapabilities: string[] = [];
  if (!capabilities.has(`${SECURITY_FEATURE_ID_V2}.crud`)) {
    missingCapabilities.push(CAPABILITIES_REQUIRED.securityAll);
  }
  if (!capabilities.has(`${SIEM_MIGRATIONS_FEATURE_ID}.all`)) {
    missingCapabilities.push(CAPABILITIES_REQUIRED.siemMigrationsAll);
  }
  if (!capabilities.has('actions.execute')) {
    missingCapabilities.push(CAPABILITIES_REQUIRED.connectorsRead);
  }

  let isComplete = false;

  if (missingCapabilities.length === 0) {
    const migrationsStats = await siemMigrations.rules.getRuleMigrationsStats();
    isComplete = migrationsStats.some(
      (migrationStats) => migrationStats.status === SiemMigrationTaskStatus.FINISHED
    );
  }

  return { isComplete, metadata: { missingCapabilities } };
};
