/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IconIntegrations } from '../../../../../../common/icons/integrations';
import type { IntegrationCardMetadata } from '../../../../../../common/lib/integrations/types';
import type { OnboardingCardConfig } from '../../../../../types';
import { OnboardingCardId } from '../../../../../constants';
import { START_MIGRATION_INTEGRATIONS_CARD_TITLE } from './translations';
import { checkIntegrationsCardComplete } from './integrations_check_complete';

export const siemMigrationIntegrationsCardConfig: OnboardingCardConfig<IntegrationCardMetadata> = {
  id: OnboardingCardId.siemMigrationIntegrations,
  title: START_MIGRATION_INTEGRATIONS_CARD_TITLE,
  icon: IconIntegrations,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_siem_migrations_integrations_card" */
        './integrations_card'
      )
  ),
  checkComplete: checkIntegrationsCardComplete,
  capabilitiesRequired: 'fleet.read',
};
