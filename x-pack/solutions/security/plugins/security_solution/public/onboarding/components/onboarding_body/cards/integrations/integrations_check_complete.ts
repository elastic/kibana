/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_CHECK_COMPLETE_METADATA } from '../../../../../common/lib/integrations/components/integration_card_grid_tabs';
import type { IntegrationCardMetadata } from '../../../../../common/lib/integrations/types';
import type { StartServices } from '../../../../../types';
import type { OnboardingCardCheckComplete } from '../../../../types';
import {
  getAgentsData,
  getCompleteBadgeText,
  getIntegrationList,
} from '../common/integrations/integrations_check_complete';

export const checkIntegrationsCardComplete: OnboardingCardCheckComplete<
  IntegrationCardMetadata
> = async (services: StartServices) => {
  const { isComplete, installedPackages } = await getIntegrationList(services);

  const { isAgentRequired } = await getAgentsData(services, isComplete);

  if (!isComplete) {
    return {
      isComplete,
      metadata: DEFAULT_CHECK_COMPLETE_METADATA,
    };
  }

  return {
    isComplete,
    completeBadgeText: getCompleteBadgeText(installedPackages.length),
    metadata: {
      installedIntegrationsCount: installedPackages.length,
      isAgentRequired,
      installedIntegrations: installedPackages,
    },
  };
};
