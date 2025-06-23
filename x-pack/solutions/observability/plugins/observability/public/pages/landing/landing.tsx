/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { OBSERVABILITY_COMPLETE_LANDING_PAGE_FEATURE } from '../../../common';
import { useHasData } from '../../hooks/use_has_data';
import { useKibana } from '../../utils/kibana_react';

export function LandingPage() {
  const { pricing } = useKibana().services;

  const hasCompleteLandingPage = pricing.isFeatureAvailable(
    OBSERVABILITY_COMPLETE_LANDING_PAGE_FEATURE.id
  );

  return hasCompleteLandingPage ? (
    <ObservabilityCompleteLandingPage />
  ) : (
    <ObservabilityLogsEssentialsLandingPage />
  );
}

function ObservabilityCompleteLandingPage() {
  const { hasDataMap, isAllRequestsComplete } = useHasData();
  const {
    application: { navigateToUrl },
    http: { basePath },
    share,
    logsDataAccess,
  } = useKibana().services;

  useEffect(() => {
    async function redirectToLanding() {
      if (isAllRequestsComplete) {
        const { hasData: hasLogsData } = await logsDataAccess.services.logDataService.getStatus();
        const { apm } = hasDataMap;
        const hasApmData = apm?.hasData;

        if (hasLogsData) {
          redirectToDiscoverLogs(share);
        } else if (hasApmData) {
          navigateToUrl(basePath.prepend('/app/apm/services'));
        } else {
          redirectToOnboarding(share);
        }
      }
    }

    redirectToLanding();
  }, [
    basePath,
    hasDataMap,
    isAllRequestsComplete,
    logsDataAccess.services.logDataService,
    navigateToUrl,
    share,
  ]);

  return <></>;
}

function ObservabilityLogsEssentialsLandingPage() {
  const { share, logsDataAccess } = useKibana().services;

  useEffect(() => {
    async function redirectToLanding() {
      const { hasData: hasLogsData } = await logsDataAccess.services.logDataService.getStatus();

      if (hasLogsData) {
        redirectToDiscoverLogs(share);
      } else {
        redirectToOnboarding(share);
      }
    }

    redirectToLanding();
  }, [logsDataAccess.services.logDataService, share]);

  return <></>;
}

const redirectToDiscoverLogs = (share: SharePublicStart) => {
  const logsLocator = share.url.locators.get(LOGS_LOCATOR_ID);
  logsLocator?.navigate({});
};

const redirectToOnboarding = (share: SharePublicStart) => {
  const onboardingLocator = share.url.locators.get(OBSERVABILITY_ONBOARDING_LOCATOR);
  onboardingLocator?.navigate({});
};
