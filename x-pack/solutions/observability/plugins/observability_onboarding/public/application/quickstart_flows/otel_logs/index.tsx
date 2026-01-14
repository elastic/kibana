/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiButtonGroup,
  EuiCopy,
  EuiLink,
  EuiImage,
  EuiCallOut,
  EuiSkeletonText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { FormattedMessage } from '@kbn/i18n-react';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { ObservabilityOnboardingPricingFeature } from '../../../../common/pricing_features';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { useFetcher } from '../../../hooks/use_fetcher';
import { MultiIntegrationInstallBanner } from './multi_integration_install_banner';
import { EmptyPrompt } from '../shared/empty_prompt';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { buildInstallCommand } from './build_install_command';
import { useManagedOtlpServiceAvailability } from '../../shared/use_managed_otlp_service_availability';
import { usePricingFeature } from '../shared/use_pricing_feature';
import { ManagedOtlpCallout } from '../shared/managed_otlp_callout';

const HOST_COMMAND = i18n.translate(
  'xpack.observability_onboarding.otelLogsPanel.p.runTheCommandOnYourHostLabel',
  {
    defaultMessage:
      'Run the following command on your host to download and configure the collector.',
  }
);

export const OtelLogsPanel: React.FC = () => {
  useFlowBreadcrumb({
    text: i18n.translate('xpack.observability_onboarding.autoDetectPanel.breadcrumbs.otelHost', {
      defaultMessage: 'OpenTelemetry: Logs & Metrics',
    }),
  });
  const { onPageReady } = usePerformanceContext();
  const {
    services: { share, http },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const {
    data: setupData,
    error,
    refetch,
  } = useFetcher(
    (callApi) => {
      return callApi('POST /internal/observability_onboarding/otel_host/setup');
    },
    [],
    { showToastOnError: false }
  );

  useEffect(() => {
    if (setupData) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Requests to setup the flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [onPageReady, setupData]);

  const isMetricsOnboardingEnabled = usePricingFeature(
    ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
  );
  const isManagedOtlpServiceAvailable = useManagedOtlpServiceAvailability();

  const logsLocator = share.url.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);
  const hostsLocator = share.url.locators.get('HOSTS_LOCATOR');

  const [{ value: deeplinks }, getDeeplinks] = useAsyncFn(async () => {
    return {
      logs: logsLocator?.getRedirectUrl({}),
      metrics: hostsLocator?.getRedirectUrl({}),
    };
  }, [logsLocator]);

  useEffect(() => {
    getDeeplinks();
  }, [getDeeplinks]);

  const installTabContents = [
    {
      id: 'linux',
      name: 'Linux',
      firstStepTitle: HOST_COMMAND,
      content: setupData
        ? buildInstallCommand({
            platform: 'linux',
            isMetricsOnboardingEnabled,
            isManagedOtlpServiceAvailable,
            managedOtlpServiceUrl: setupData.managedOtlpServiceUrl,
            elasticsearchUrl: setupData.elasticsearchUrl,
            apiKeyEncoded: setupData.apiKeyEncoded,
            agentVersion: setupData.elasticAgentVersionInfo.agentVersion,
          })
        : '',
      start: 'sudo ./otelcol --config otel.yml',
      codeLanguage: 'sh',
    },
    {
      id: 'mac',
      name: 'Mac',
      firstStepTitle: HOST_COMMAND,
      content: setupData
        ? buildInstallCommand({
            platform: 'mac',
            isMetricsOnboardingEnabled,
            isManagedOtlpServiceAvailable,
            managedOtlpServiceUrl: setupData.managedOtlpServiceUrl,
            elasticsearchUrl: setupData.elasticsearchUrl,
            apiKeyEncoded: setupData.apiKeyEncoded,
            agentVersion: setupData.elasticAgentVersionInfo.agentVersion,
          })
        : '',
      start: './otelcol --config otel.yml',
      codeLanguage: 'sh',
    },
    {
      id: 'windows',
      name: 'Windows',
      firstStepTitle: HOST_COMMAND,
      content: setupData
        ? buildInstallCommand({
            platform: 'windows',
            isMetricsOnboardingEnabled,
            isManagedOtlpServiceAvailable,
            managedOtlpServiceUrl: setupData.managedOtlpServiceUrl,
            elasticsearchUrl: setupData.elasticsearchUrl,
            apiKeyEncoded: setupData.apiKeyEncoded,
            agentVersion: setupData.elasticAgentVersionInfo.agentVersion,
          })
        : '',
      start: '.\\otelcol.ps1 --config otel.yml',
      codeLanguage: 'powershell',
    },
  ];

  const [selectedTab, setSelectedTab] = React.useState(installTabContents[0].id);

  const selectedContent = installTabContents.find((tab) => tab.id === selectedTab)!;

  if (error) {
    return <EmptyPrompt onboardingFlowType="otel_logs" error={error} onRetryClick={refetch} />;
  }

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiFlexGroup direction="column" gutterSize="none">
        <MultiIntegrationInstallBanner />
        <ManagedOtlpCallout />
        <EuiSteps
          steps={[
            {
              title: i18n.translate('xpack.observability_onboarding.otelLogsPanel.steps.platform', {
                defaultMessage: 'Select your platform',
              }),

              children: (
                <EuiFlexGroup direction="column">
                  <EuiButtonGroup
                    legend={i18n.translate(
                      'xpack.observability_onboarding.otelLogsPanel.choosePlatform',
                      {
                        defaultMessage: 'Choose platform',
                      }
                    )}
                    options={installTabContents.map(({ id, name }) => ({
                      id,
                      label: name,
                    }))}
                    type="single"
                    idSelected={selectedTab}
                    onChange={(id: string) => {
                      setSelectedTab(id);
                    }}
                  />

                  {!setupData && <EuiSkeletonText lines={6} />}

                  {setupData && (
                    <>
                      <EuiText>
                        <p>{selectedContent.firstStepTitle}</p>
                      </EuiText>
                      <EuiFlexItem>
                        <EuiCodeBlock
                          language={selectedContent.codeLanguage}
                          isCopyable
                          overflowHeight={300}
                        >
                          {selectedContent.content}
                        </EuiCodeBlock>
                      </EuiFlexItem>
                      <EuiFlexItem align="left">
                        <EuiFlexGroup>
                          <EuiCopy textToCopy={selectedContent.content}>
                            {(copy) => (
                              <EuiButton
                                data-test-subj="observabilityOnboardingOtelLogsPanelButton"
                                iconType="copyClipboard"
                                onClick={copy}
                              >
                                {i18n.translate(
                                  'xpack.observability_onboarding.installOtelCollector.configStep.copyCommand',
                                  { defaultMessage: 'Copy to clipboard' }
                                )}
                              </EuiButton>
                            )}
                          </EuiCopy>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </>
                  )}
                </EuiFlexGroup>
              ),
            },
            {
              title: i18n.translate('xpack.observability_onboarding.otelLogsPanel.steps.start', {
                defaultMessage: 'Start the collector',
              }),
              children: (
                <EuiFlexGroup direction="column">
                  <EuiCallOut
                    title={i18n.translate(
                      'xpack.observability_onboarding.otelLogsPanel.limitationTitle',
                      {
                        defaultMessage: 'Configuration Information',
                      }
                    )}
                    color="warning"
                    iconType="info"
                  >
                    <p>
                      {i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.historicalDataDescription',
                        {
                          defaultMessage: 'New log messages are collected from the setup onward.',
                        }
                      )}
                    </p>
                    <p>
                      {selectedTab === 'windows'
                        ? i18n.translate(
                            'xpack.observability_onboarding.otelLogsPanel.windowsLogDescription',
                            {
                              defaultMessage:
                                'On Windows, logs are collected from the Windows Event Log. You can customize this in the otel.yml file.',
                            }
                          )
                        : i18n.translate(
                            'xpack.observability_onboarding.otelLogsPanel.historicalDataDescription2',
                            {
                              defaultMessage:
                                'The default log path is /var/log/*. You can change this path in the otel.yml file if needed.',
                            }
                          )}
                    </p>
                  </EuiCallOut>

                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.p.startTheCollectorLabel',
                        {
                          defaultMessage: 'Run the following command to start the collector',
                        }
                      )}
                    </p>
                  </EuiText>
                  <CopyableCodeBlock content={selectedContent.start} />
                </EuiFlexGroup>
              ),
            },
            {
              title: i18n.translate(
                'xpack.observability_onboarding.otelLogsPanel.steps.visualize',
                {
                  defaultMessage: 'Visualize your data',
                }
              ),
              children: (
                <>
                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.waitForTheDataLabel',
                        {
                          defaultMessage:
                            'After running the previous command, come back and view your data.',
                        }
                      )}
                    </p>
                  </EuiText>
                  <EuiSpacer />
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <EuiImage
                        src={http?.staticAssets.getPluginAssetHref('waterfall_screen.svg')}
                        width={160}
                        alt="Illustration"
                        hasShadow
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow>
                      <EuiFlexGroup direction="column" gutterSize="xs" justifyContent="center">
                        {deeplinks?.logs && (
                          <>
                            <EuiFlexItem grow={false}>
                              <EuiText size="s">
                                {i18n.translate(
                                  'xpack.observability_onboarding.otelLogsPanel.viewAndAnalyzeYourTextLabel',
                                  { defaultMessage: 'View and analyze your logs' }
                                )}
                              </EuiText>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiLink
                                data-test-subj="obltOnboardingExploreLogs"
                                href={deeplinks.logs}
                              >
                                {i18n.translate(
                                  'xpack.observability_onboarding.otelLogsPanel.exploreLogs',
                                  {
                                    defaultMessage: 'Explore logs',
                                  }
                                )}
                              </EuiLink>
                            </EuiFlexItem>
                          </>
                        )}
                        <EuiSpacer size="s" />
                        {isMetricsOnboardingEnabled && deeplinks?.metrics && (
                          <>
                            <EuiFlexItem grow={false}>
                              <EuiText size="s">
                                {i18n.translate(
                                  'xpack.observability_onboarding.otelLogsPanel.viewAndAnalyzeYourMetricsTextLabel',
                                  { defaultMessage: 'View and analyze your metrics' }
                                )}
                              </EuiText>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiLink
                                data-test-subj="obltOnboardingExploreMetrics"
                                href={deeplinks.metrics}
                              >
                                {i18n.translate(
                                  'xpack.observability_onboarding.otelLogsPanel.exploreMetrics',
                                  {
                                    defaultMessage: 'Open Hosts',
                                  }
                                )}
                              </EuiLink>
                            </EuiFlexItem>
                          </>
                        )}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer />
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.observability_onboarding.otelLogsPanel.troubleshooting"
                      defaultMessage="Find more details and troubleshooting solution in our documentation. {link}"
                      values={{
                        link: (
                          <EuiLink
                            data-test-subj="observabilityOnboardingOtelLogsPanelDocumentationLink"
                            href="https://ela.st/elastic-otel"
                            target="_blank"
                            external
                          >
                            {i18n.translate(
                              'xpack.observability_onboarding.otelLogsPanel.documentationLink',
                              {
                                defaultMessage: 'Open documentation',
                              }
                            )}
                          </EuiLink>
                        ),
                      }}
                    />
                  </EuiText>
                </>
              ),
            },
          ]}
        />

        <FeedbackButtons flow="otel_logs" />
      </EuiFlexGroup>
    </EuiPanel>
  );
};

function CopyableCodeBlock({ content }: { content: string }) {
  return (
    <>
      <EuiCodeBlock language="yaml">{content}</EuiCodeBlock>
      <EuiCopy textToCopy={content}>
        {(copy) => (
          <EuiButton
            data-test-subj="observabilityOnboardingCopyableCodeBlockCopyToClipboardButton"
            iconType="copyClipboard"
            onClick={copy}
          >
            {i18n.translate(
              'xpack.observability_onboarding.installOtelCollector.configStep.copyCommand',
              {
                defaultMessage: 'Copy to clipboard',
              }
            )}
          </EuiButton>
        )}
      </EuiCopy>
    </>
  );
}
