/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { OnboardingCardConfig } from '../../../../../../types';
import { OnboardingCardId } from '../../../../../../constants';
import { START_MIGRATION_CARD_TITLE } from './translations';
import type { StartMigrationCardMetadata } from '../common/types';
import { checkStartMigrationCardComplete } from './start_migration_check_complete';
import startMigrationIcon from '../images/start_migration_icon.png';
import startMigrationDarkIcon from '../images/start_migration_icon_dark.png';

export const startRuleMigrationCardConfig: OnboardingCardConfig<StartMigrationCardMetadata> = {
  id: OnboardingCardId.siemMigrationsRules,
  title: START_MIGRATION_CARD_TITLE,
  icon: startMigrationIcon,
  iconDark: startMigrationDarkIcon,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_siem_migrations_start_migration_card" */
        './start_migration_card'
      )
  ),
  checkComplete: checkStartMigrationCardComplete,
};
