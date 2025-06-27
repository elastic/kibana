/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetInstalledPackagesResponse } from '@kbn/fleet-plugin/common/types';
import { AI_FOR_SOC_INTEGRATIONS } from '../../../../../../common/constants';
import type { StartServices } from '../../../../../types';
import type { OnboardingCardCheckComplete } from '../../../../types';
import {
  getActiveIntegrationList,
  getCompleteBadgeText,
} from '../common/integrations/integrations_check_complete_helpers';

export interface ExternalIntegrationCardMetadata {
  activeIntegrations: GetInstalledPackagesResponse['items'];
}

export const checkIntegrationsCardComplete: OnboardingCardCheckComplete<
  ExternalIntegrationCardMetadata
> = async (services: StartServices) => {
  const { isComplete, activePackages: activeIntegrations } = await getActiveIntegrationList(
    services,
    AI_FOR_SOC_INTEGRATIONS
  );

  const activeIntegrationsCount = activeIntegrations.length;

  if (!isComplete) {
    return {
      isComplete,
      metadata: {
        activeIntegrations,
      },
    };
  }

  return {
    isComplete,
    completeBadgeText: getCompleteBadgeText(activeIntegrationsCount),
    metadata: {
      activeIntegrations,
    },
  };
};
