/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, type FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiSteps, useGeneratedHtmlId } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  ASSET_DETAILS_LOCATOR_ID,
  type AssetDetailsLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';
import { getAutoDetectCommand } from './get_auto_detect_command';
import { useOnboardingFlow } from './use_onboarding_flow';
import { EmptyPrompt } from '../shared/empty_prompt';
import { FeedbackButtons } from '../shared/feedback_buttons';
import type { ObservabilityOnboardingContextValue } from '../../../plugin';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { usePricingFeature } from '../shared/use_pricing_feature';
import { AutoDetectInstallStep, AutoDetectVisualizeStep } from './steps';

export const AutoDetectPanel: FunctionComponent = () => {
  useFlowBreadcrumb(
    i18n.translate('xpack.observability_onboarding.autoDetectPanel.breadcrumbs.autoDetectLabel', {
      defaultMessage: 'Elastic Agent: Logs & Metrics',
    })
  );
  const { status, data, error, refetch, installedIntegrations } = useOnboardingFlow();
  const metricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );

  const command = data
    ? getAutoDetectCommand({
        scriptDownloadUrl: data.scriptDownloadUrl,
        onboardingId: data.onboardingFlow.id,
        kibanaUrl: data.kibanaUrl,
        installApiKey: data.installApiKey,
        ingestApiKey: data.ingestApiKey,
        elasticAgentVersion: data.elasticAgentVersionInfo.agentVersion,
        metricsEnabled: metricsOnboardingEnabled,
      })
    : undefined;
  const accordionId = useGeneratedHtmlId({ prefix: 'accordion' });
  const { onPageReady } = usePerformanceContext();
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingContextValue>();

  useEffect(() => {
    if (data) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Request to create the onboarding flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [data, onPageReady]);

  if (error) {
    return <EmptyPrompt onboardingFlowType="auto-detect" error={error} onRetryClick={refetch} />;
  }

  const logsLocator = share.url.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);
  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const assetDetailsLocator =
    share.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiSteps
        steps={[
          {
            title: i18n.translate(
              'xpack.observability_onboarding.autoDetectPanel.runTheCommandOnLabel',
              { defaultMessage: 'Install standalone Elastic Agent on your host' }
            ),
            status: status === 'notStarted' ? 'current' : 'complete',
            children: (
              <AutoDetectInstallStep
                command={command}
                onboardingFlowId={data?.onboardingFlow.id}
                status={status}
                isMetricsOnboardingEnabled={metricsOnboardingEnabled}
              />
            ),
          },
          {
            title: i18n.translate(
              'xpack.observability_onboarding.autoDetectPanel.visualizeYourDataLabel',
              { defaultMessage: 'Visualize your data' }
            ),
            status:
              status === 'dataReceived'
                ? 'complete'
                : status === 'awaitingData' || status === 'inProgress'
                ? 'current'
                : 'incomplete',
            children: (
              <AutoDetectVisualizeStep
                status={status}
                installedIntegrations={installedIntegrations}
                onboardingFlowId={data?.onboardingFlow?.id}
                isMetricsOnboardingEnabled={metricsOnboardingEnabled}
                accordionId={accordionId}
                logsLocator={logsLocator}
                dashboardLocator={dashboardLocator}
                assetDetailsLocator={assetDetailsLocator}
              />
            ),
          },
        ]}
      />
      <FeedbackButtons flow="auto-detect" />
    </EuiPanel>
  );
};
