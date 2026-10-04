/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IconAgent } from '../../../../../../../common/icons/agent';
import { START_WORKFLOW_MIGRATION_CARD_TITLE } from '../../../../../../../siem_migrations/workflows/components/status_panels/translations';
import { OnboardingCardId } from '../../../../../../constants';
import type { OnboardingCardConfig } from '../../../../../../types';
import { checkStartMigrationCardComplete } from './start_migration_check_complete';
import type { StartMigrationCardMetadata } from '../common/types';

export const startWorkflowMigrationCardConfig: OnboardingCardConfig<StartMigrationCardMetadata> = {
  id: OnboardingCardId.siemMigrationsWorkflows,
  title: START_WORKFLOW_MIGRATION_CARD_TITLE,
  icon: IconAgent,
  experimentalFlagRequired: 'tinesWorkflowsMigration',
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_siem_migrations_start_workflow_migration_card" */
        './start_migration_card'
      )
  ),
  checkComplete: checkStartMigrationCardComplete,
};
