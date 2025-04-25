/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AI_FOR_SOC_INTEGRATIONS } from '../../../../../../../common/constants';
import { DEFAULT_CHECK_COMPLETE_METADATA } from '../../../../../../common/lib/integrations/components/integration_card_grid_tabs';
import type { IntegrationCardMetadata } from '../../../../../../common/lib/integrations/types';
import type { StartServices } from '../../../../../../types';
import type { OnboardingCardCheckComplete } from '../../../../../types';
import {
  getCompleteBadgeText,
  getInstalledIntegrationList,
} from '../../common/integrations/integrations_check_complete_helpers';

export const checkIntegrationsCardComplete: OnboardingCardCheckComplete<
  IntegrationCardMetadata
> = async (services: StartServices) => {
  const { isComplete, installedPackages: installedIntegrations } =
    await getInstalledIntegrationList(services, AI_FOR_SOC_INTEGRATIONS);

  const installedIntegrationsCount = installedIntegrations.length;

  if (!isComplete) {
    return {
      isComplete,
      metadata: { ...DEFAULT_CHECK_COMPLETE_METADATA },
    };
  }

  return {
    isComplete,
    completeBadgeText: getCompleteBadgeText(installedIntegrationsCount),
    metadata: {
      installedIntegrations,
    },
  };
};
