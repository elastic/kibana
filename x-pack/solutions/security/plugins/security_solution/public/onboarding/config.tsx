/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { OnboardingTopicId } from './constants';
import {
  defaultBodyConfig,
  siemMigrationsBodyConfig,
} from './components/onboarding_body/body_config';
import type { TopicConfig } from './types';
import { SiemMigrationSetupTour } from '../siem_migrations/rules/components/tours/setup_guide';

export const onboardingConfig: TopicConfig[] = [
  {
    id: OnboardingTopicId.default,
    title: i18n.translate('xpack.securitySolution.onboarding.topic.default', {
      defaultMessage: 'Set up security',
    }),
    body: defaultBodyConfig,
  },
  {
    id: OnboardingTopicId.siemMigrations,
    title: (
      <SiemMigrationSetupTour>
        <>
          {i18n.translate('xpack.securitySolution.onboarding.topic.siemMigrations', {
            defaultMessage: 'SIEM Rule migration',
          })}
        </>
      </SiemMigrationSetupTour>
    ),
    body: siemMigrationsBodyConfig,
    licenseTypeRequired: 'enterprise',
    experimentalFlagRequired: 'siemMigrationsEnabled',
  },
];
