/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  RULES_UI_DETECTIONS_PRIVILEGE,
  RULES_UI_EXTERNAL_DETECTIONS_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import { OnboardingTopicId } from './constants';
import {
  defaultBodyConfig,
  defaultExternalDetectionsBodyConfig,
  siemMigrationsBodyConfig,
} from './components/onboarding_body/body_config';
import type { TopicConfig } from './types';

export const onboardingConfig: TopicConfig[] = [
  {
    id: OnboardingTopicId.default,
    title: i18n.translate('xpack.securitySolution.onboarding.topic.default', {
      defaultMessage: 'Set up Security',
    }),
    capabilitiesRequired: RULES_UI_DETECTIONS_PRIVILEGE,
    body: defaultBodyConfig,
  },
  {
    // The "detections" and "external_detections" capabilities are mutually exclusive, so we will always have only one `default` topic enabled at a time
    id: OnboardingTopicId.default,
    title: i18n.translate('xpack.securitySolution.onboarding.topic.externalDetections.default', {
      defaultMessage: 'Set up Security',
    }),
    capabilitiesRequired: RULES_UI_EXTERNAL_DETECTIONS_PRIVILEGE,
    body: defaultExternalDetectionsBodyConfig,
  },
  {
    id: OnboardingTopicId.siemMigrations,
    title: i18n.translate('xpack.securitySolution.onboarding.topic.automaticMigration', {
      defaultMessage: 'Automatic migration',
    }),
    body: siemMigrationsBodyConfig,
    disabledExperimentalFlagRequired: 'siemMigrationsDisabled',
    capabilitiesRequired: [[`dashboard_v2.show`], [RULES_UI_DETECTIONS_PRIVILEGE]],
  },
];
