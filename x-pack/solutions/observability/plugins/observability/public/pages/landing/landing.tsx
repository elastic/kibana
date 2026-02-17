/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { FLEET_LOG_INDICES } from '@kbn/fleet-plugin/common';
import { OBSERVABILITY_COMPLETE_LANDING_PAGE_FEATURE } from '../../../common';
import { useHasData } from '../../hooks/use_has_data';
import { useKibana } from '../../utils/kibana_react';
import { APM_APP_LOCATOR_ID } from '../../components/alert_sources/get_apm_app_url';

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
  const { share, logsDataAccess } = useKibana().services;

  useEffect(() => {
    async function redirectToLanding() {
      if (isAllRequestsComplete) {
        const { hasData: hasLogsData } = await logsDataAccess.services.logDataService.getStatus({
          excludeIndices: FLEET_LOG_INDICES,
        });
        const hasApmData = hasDataMap.apm?.hasData;

        const locators = getLocators(share);

        if (hasLogsData && locators.logs) {
          locators.logs.navigate({});
        } else if (hasApmData && locators.apm) {
          locators.apm.navigate({});
        } else if (locators.onboarding) {
          locators.onboarding.navigate({});
        }
      }
    }

    redirectToLanding();
  }, [hasDataMap, isAllRequestsComplete, logsDataAccess, share]);

  return <></>;
}

function ObservabilityLogsEssentialsLandingPage() {
  const { share, logsDataAccess } = useKibana().services;

  useEffect(() => {
    async function redirectToLanding() {
      const { hasData: hasLogsData } = await logsDataAccess.services.logDataService.getStatus({
        excludeIndices: FLEET_LOG_INDICES,
      });

      const locators = getLocators(share);

      if (hasLogsData && locators.logs) {
        locators.logs.navigate({});
      } else if (locators.onboarding) {
        locators.onboarding.navigate({});
      }
    }

    redirectToLanding();
  }, [logsDataAccess.services.logDataService, share]);

  return <></>;
}

const getLocators = (share: SharePublicStart) => ({
  apm: share.url.locators.get(APM_APP_LOCATOR_ID),
  logs: share.url.locators.get(LOGS_LOCATOR_ID),
  onboarding: share.url.locators.get(OBSERVABILITY_ONBOARDING_LOCATOR),
});
