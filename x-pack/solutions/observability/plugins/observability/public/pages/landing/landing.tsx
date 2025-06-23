/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
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
    application: { navigateToUrl, navigateToApp },
    http: { basePath },
    share: { url },
  } = useKibana().services;

  useEffect(() => {
    if (isAllRequestsComplete) {
      const { apm, infra_logs: logs } = hasDataMap;
      const hasApmData = apm?.hasData;
      const hasLogsData = logs?.hasData;

      if (hasLogsData) {
        const logsLocator = url.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);
        logsLocator?.navigate({});
      } else if (hasApmData) {
        navigateToUrl(basePath.prepend('/app/apm/services'));
      } else {
        navigateToUrl(basePath.prepend('/app/observabilityOnboarding'));
      }
    }
  }, [basePath, hasDataMap, isAllRequestsComplete, navigateToApp, navigateToUrl, url.locators]);

  return <></>;
}

function ObservabilityLogsEssentialsLandingPage() {
  const { hasDataMap, isAllRequestsComplete } = useHasData();
  const {
    application: { navigateToUrl, navigateToApp },
    http: { basePath },
    share: { url },
  } = useKibana().services;

  useEffect(() => {
    if (isAllRequestsComplete) {
      const { infra_logs: logs } = hasDataMap;
      console.log(hasDataMap);

      const hasLogsData = logs?.hasData;

      if (hasLogsData) {
        const logsLocator = url.locators.get(LOGS_LOCATOR_ID);
        logsLocator?.navigate({});
      } else {
        const onboardingLocator = url.locators.get(OBSERVABILITY_ONBOARDING_LOCATOR);
        onboardingLocator?.navigate({});
      }
    }
  }, [basePath, hasDataMap, isAllRequestsComplete, navigateToApp, navigateToUrl, url.locators]);

  return <></>;
}
