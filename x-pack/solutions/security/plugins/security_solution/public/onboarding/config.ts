/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { OnboardingTopicId } from './constants';
import {
  defaultBodyConfig,
  siemMigrationsBodyConfig,
} from './components/onboarding_body/body_config';
import type { TopicConfig } from './types';
import { SECURITY_FEATURE_ID } from '../../common/constants';

export const onboardingConfig: TopicConfig[] = [
  {
    id: OnboardingTopicId.default,
    title: i18n.translate('xpack.securitySolution.onboarding.topic.default', {
      defaultMessage: 'Set up Security',
    }),
    body: defaultBodyConfig,
  },
  {
    id: OnboardingTopicId.siemMigrations,
    title: i18n.translate('xpack.securitySolution.onboarding.topic.siemMigrations', {
      defaultMessage: 'SIEM rule migration',
    }),
    body: siemMigrationsBodyConfig,
    disabledExperimentalFlagRequired: 'siemMigrationsDisabled',
    capabilitiesRequired: `${SECURITY_FEATURE_ID}.advancedInsights`,
  },
];
