/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IconDashboards } from '../../../../../../../common/icons/dashboards';
import { START_DASHBOARD_MIGRATION_CARD_TITLE } from '../../../../../../../siem_migrations/dashboards/components/status_panels/translations';
import { OnboardingCardId } from '../../../../../../constants';
import type { OnboardingCardConfig } from '../../../../../../types';
import { checkStartMigrationCardComplete } from './start_migration_check_complete';
import type { StartMigrationCardMetadata } from '../common/types';

export const startDashboardMigrationCardConfig: OnboardingCardConfig<StartMigrationCardMetadata> = {
  id: OnboardingCardId.siemMigrationsDashboards,
  title: START_DASHBOARD_MIGRATION_CARD_TITLE,
  icon: IconDashboards,
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
