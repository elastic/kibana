/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { RULES_UI_DETECTIONS_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { IconIntegrations } from '../../../../../common/icons/integrations';
import type { OnboardingCardConfig } from '../../../../types';
import { checkIntegrationsCardComplete } from './integrations_check_complete';
import { OnboardingCardId } from '../../../../constants';
import { SECURITY_FEATURE_ID } from '../../../../../../common/constants';
import type { IntegrationCardMetadata } from '../../../../../common/lib/integrations/types';

export const integrationsCardConfig: OnboardingCardConfig<IntegrationCardMetadata> = {
  id: OnboardingCardId.integrations,
  title: i18n.translate('xpack.securitySolution.onboarding.integrationsCard.title', {
    defaultMessage: 'Add data with integrations',
  }),
  icon: IconIntegrations,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_integrations_card" */
        './integrations_card'
      )
  ),
  checkComplete: checkIntegrationsCardComplete,
  capabilitiesRequired: [
    ['fleet.read', `${SECURITY_FEATURE_ID}.detections`],
    ['fleet.read', RULES_UI_DETECTIONS_PRIVILEGE],
  ],
};
