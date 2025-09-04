/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { START_DASHBOARD_MIGRATION_CARD_TITLE } from '../../../../../../../siem_migrations/dashboards/components/status_panels/translations';
import { OnboardingCardId } from '../../../../../../constants';
import type { OnboardingCardConfig } from '../../../../../../types';
import { checkStartMigrationCardComplete } from './start_migration_check_complete';
import startDashboardMigrationIcon from '../images/start_dashboard_migration.png';
import startDashboardMigrationDarkIcon from '../images/start_dashboard_migration_dark.png';
import type { StartMigrationCardMetadata } from '../common/types';

export const startDashboardMigrationCardConfig: OnboardingCardConfig<StartMigrationCardMetadata> = {
  id: OnboardingCardId.siemMigrationDashboards,
  title: START_DASHBOARD_MIGRATION_CARD_TITLE,
  icon: startDashboardMigrationIcon,
  iconDark: startDashboardMigrationDarkIcon,
  experimentalFlagRequired: 'automaticDashboardsMigration',
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_siem_migrations_start_migration_card" */
        './start_migration_card'
      )
  ),
  checkComplete: checkStartMigrationCardComplete,
};
