/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { OnboardingCardId } from '../../../../../constants';
import type { OnboardingCardConfig } from '../../../../../types';
import { WORKFLOW_MIGRATION_CARD_TITLE } from './translations';

export const workflowMigrationCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.siemMigrationsWorkflows,
  title: WORKFLOW_MIGRATION_CARD_TITLE,
  icon: 'branch',
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_siem_migrations_workflow_migration_card" */
        './workflow_migration_card'
      )
  ),
};
