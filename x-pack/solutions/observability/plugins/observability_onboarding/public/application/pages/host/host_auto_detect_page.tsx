/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useGeneratedHtmlId, type EuiStepsProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocation } from 'react-router-dom';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  ASSET_DETAILS_LOCATOR_ID,
  type AssetDetailsLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { usePerformanceContext } from '@kbn/ebt-tools';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { OnboardingFlowLayout } from '../../shared/onboarding_flow_layout';
import type { HostOs } from './host_os';
import { CollectionMethodSelector } from '../../shared/collection_method_selector';
import type { SupportedLogo } from '../../shared/logo_icon';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';
import { getAutoDetectCommand } from '../../quickstart_flows/auto_detect/get_auto_detect_command';
import { useOnboardingFlow } from '../../quickstart_flows/auto_detect/use_onboarding_flow';
import {
  AutoDetectInstallStep,
  AutoDetectVisualizeStep,
} from '../../quickstart_flows/auto_detect/steps';
import { EmptyPrompt } from '../../quickstart_flows/shared/empty_prompt';
import { FeedbackButtons } from '../../quickstart_flows/shared/feedback_buttons';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { usePricingFeature } from '../../quickstart_flows/shared/use_pricing_feature';
import {
  buildHostCollectionMethodOptions,
  HOST_SELECTOR_LEGEND,
  HOST_SELECTOR_STEP_TITLE,
} from './host_collection_method_options';

export interface HostAutoDetectPageProps {
  os: Extract<HostOs, 'linux' | 'mac'>;
  routePath: string;
  breadcrumbLabel: string;
  title: string;
  subtitle: string;
  logo: SupportedLogo;
}

export const HostAutoDetectPage: React.FC<HostAutoDetectPageProps> = ({
  os,
  routePath,
  breadcrumbLabel,
  title,
  subtitle,
  logo,
}) => {
  useFlowBreadcrumb(breadcrumbLabel);

  const { status, data, error, refetch, installedIntegrations } = useOnboardingFlow();
  const metricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );

  const location = useLocation();

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
  } = useKibana<ObservabilityOnboardingAppServices>();

  useEffect(() => {
    if (data) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Request to create the onboarding flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [data, onPageReady]);

  const logsLocator = share.url.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);
  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const assetDetailsLocator =
    share.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);

  const otelNavigateTo = `${routePath}${location.search}`;
  const eaNavigateTo = `${routePath}/auto-detect${location.search}`;

  const steps: EuiStepsProps['steps'] = useMemo(
    () => [
      {
        title: HOST_SELECTOR_STEP_TITLE,
        children: (
          <CollectionMethodSelector
            legend={HOST_SELECTOR_LEGEND}
            selectedId="auto-detect"
            options={buildHostCollectionMethodOptions({ otelNavigateTo, eaNavigateTo })}
          />
        ),
      },
      ...(error
        ? [
            {
              title: i18n.translate(
                'xpack.observability_onboarding.autoDetectPanel.runTheCommandOnLabel',
                { defaultMessage: 'Install standalone Elastic Agent on your host' }
              ),
              status: 'danger' as const,
              children: (
                <EmptyPrompt
                  inline
                  onboardingFlowType="auto-detect"
                  error={error}
                  onRetryClick={refetch}
                />
              ),
            },
          ]
        : [
            {
              title: i18n.translate(
                'xpack.observability_onboarding.autoDetectPanel.runTheCommandOnLabel',
                { defaultMessage: 'Install standalone Elastic Agent on your host' }
              ),
              status: status === 'notStarted' ? ('current' as const) : ('complete' as const),
              children: (
                <AutoDetectInstallStep
                  command={command}
                  onboardingFlowId={data?.onboardingFlow.id}
                  status={status}
                  isMetricsOnboardingEnabled={metricsOnboardingEnabled}
                  useInlineCopyOnly
                  useColoredSyntax
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
                  ? ('complete' as const)
                  : status === 'awaitingData' || status === 'inProgress'
                  ? ('current' as const)
                  : ('incomplete' as const),
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
          ]),
    ],
    [
      otelNavigateTo,
      eaNavigateTo,
      status,
      error,
      refetch,
      command,
      data?.onboardingFlow?.id,
      metricsOnboardingEnabled,
      installedIntegrations,
      accordionId,
      logsLocator,
      dashboardLocator,
      assetDetailsLocator,
    ]
  );

  return (
    <OnboardingFlowLayout
      title={title}
      subtitle={subtitle}
      logo={logo}
      returnTo="/"
      bodyDataTestSubj={`observabilityOnboardingHostLayout-${os}`}
      returnDataTestSubj="observabilityOnboardingHostReturn"
      steps={steps}
      feedback={<FeedbackButtons flow="auto-detect" />}
    />
  );
};
