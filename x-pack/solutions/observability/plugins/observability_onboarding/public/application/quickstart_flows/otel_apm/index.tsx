/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { EuiStepStatus } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSteps,
  EuiText,
  copyToClipboard,
  useEuiTheme,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ValuesType } from 'utility-types';
import { usePerformanceContext } from '@kbn/ebt-tools';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useWindowBlurDataMonitoringTrigger } from '../shared/use_window_blur_data_monitoring_trigger';
import { useTimeWindowDataDetection } from '../shared/use_time_window_data_detection';
import { usePreExistingDataCheck } from '../shared/use_pre_existing_data_check';
import { ProgressIndicator } from '../shared/progress_indicator';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { GetStartedPanel } from '../shared/get_started_panel';
import { ManagedOtlpCallout } from '../shared/managed_otlp_callout';
import { useOtelApmFlow } from './use_otel_apm_flow';
import { EmptyPrompt } from '../shared/empty_prompt';

const FETCH_INTERVAL = 2000;
const SHOW_TROUBLESHOOTING_DELAY = 120_000;

export function OtelApmQuickstartFlow() {
  useFlowBreadcrumb({
    text: i18n.translate('xpack.observability_onboarding.otelApm.breadcrumbs.k8sOtel', {
      defaultMessage: 'Application: OpenTelemetry',
    }),
  });
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const { data, status, error, refetch } = useOtelApmFlow();
  const { onPageReady } = usePerformanceContext();
  const [serviceName, setServiceName] = useState('');

  useEffect(() => {
    if (data) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Request to create the onboarding flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [data, onPageReady]);

  const hasPreExistingDataEarly = usePreExistingDataCheck({ flow: 'otel_apm' });

  const windowBlurred = useWindowBlurDataMonitoringTrigger({
    isActive: status === FETCH_STATUS.SUCCESS,
    onboardingFlowType: 'otel_apm',
    onboardingId: data?.onboardingId,
  });

  const isMonitoringStepActive = windowBlurred || hasPreExistingDataEarly;

  // Set sessionStartTime when monitoring begins (first blur or early
  // pre-existing data detection) rather than on mount, to narrow the
  // time-window and reduce false positives from other APM services
  // already ingesting data on the same cluster.
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  useEffect(() => {
    if (isMonitoringStepActive && sessionStartTime === null) {
      setSessionStartTime(new Date().toISOString());
    }
  }, [isMonitoringStepActive, sessionStartTime]);

  const trimmedServiceName = serviceName.trim();
  const { hasData, hasPreExistingData, isTroubleshootingVisible } = useTimeWindowDataDetection({
    isMonitoringActive: isMonitoringStepActive && sessionStartTime !== null,
    sessionStartTime: sessionStartTime ?? '',
    fetchInterval: FETCH_INTERVAL,
    troubleshootingDelay: SHOW_TROUBLESHOOTING_DELAY,
    flowType: 'otel_apm',
    onboardingId: data?.onboardingId ?? '',
    endpoint: '/internal/observability_onboarding/otel_apm/has-data',
    extraQueryParams: trimmedServiceName ? { serviceName: trimmedServiceName } : undefined,
  });

  const hasPreExistingDataFinal = hasPreExistingData || hasPreExistingDataEarly;

  if (error !== undefined) {
    return <EmptyPrompt onboardingFlowType="otel_apm" error={error} onRetryClick={refetch} />;
  }

  const apmLocator = share.url.locators.get('APM_LOCATOR');

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <ManagedOtlpCallout />
      <EuiSteps
        steps={[
          {
            title: i18n.translate('xpack.observability_onboarding.otelApm.download.title', {
              defaultMessage: 'Install the OpenTelemetry SDK',
            }),
            children: (
              <>
                {status !== FETCH_STATUS.SUCCESS && <EuiSkeletonText lines={2} />}
                {status === FETCH_STATUS.SUCCESS && <InstallSDKInstructions />}
              </>
            ),
          },
          {
            title: i18n.translate('xpack.observability_onboarding.otelApm.configureAgent.title', {
              defaultMessage: 'Configure the OpenTelemetry SDK',
            }),
            children: (
              <>
                {status !== FETCH_STATUS.SUCCESS && (
                  <>
                    <EuiSkeletonText lines={3} />
                    <EuiSpacer />
                    <EuiSkeletonText lines={1} />
                    <EuiSkeletonText lines={1} />
                    <EuiSkeletonText lines={1} />
                  </>
                )}
                {status === FETCH_STATUS.SUCCESS && data !== undefined && (
                  <ConfigureSDKInstructions
                    managedOtlpServiceUrl={data.managedOtlpServiceUrl}
                    apiKeyEncoded={data.apiKeyEncoded}
                    serviceName={serviceName}
                    onServiceNameChange={setServiceName}
                  />
                )}
              </>
            ),
          },
          {
            title: i18n.translate('xpack.observability_onboarding.otelApm.monitorStepTitle', {
              defaultMessage: 'Visualize your data',
            }),
            status: (hasData || hasPreExistingDataFinal
              ? 'complete'
              : isMonitoringStepActive
              ? 'current'
              : 'incomplete') as EuiStepStatus,
            children: isMonitoringStepActive ? (
              <>
                {!hasPreExistingDataFinal && (
                  <ProgressIndicator
                    title={
                      hasData
                        ? i18n.translate('xpack.observability_onboarding.otelApm.monitoringApp', {
                            defaultMessage: 'We are receiving your application data',
                          })
                        : i18n.translate('xpack.observability_onboarding.otelApm.waitingForData', {
                            defaultMessage: 'Waiting for data to be shipped',
                          })
                    }
                    iconType="checkInCircleFilled"
                    isLoading={!hasData}
                    css={css`
                      max-width: 40%;
                    `}
                    data-test-subj="observabilityOnboardingOtelApmDataProgressIndicator"
                  />
                )}

                {isTroubleshootingVisible && (
                  <>
                    <EuiSpacer />
                    <EuiText color="subdued" size="s">
                      <FormattedMessage
                        id="xpack.observability_onboarding.otelApm.troubleshootingTextLabel"
                        defaultMessage="Find more details and troubleshooting solutions in our documentation. {troubleshootingLink}"
                        values={{
                          troubleshootingLink: (
                            <EuiLink
                              data-test-subj="observabilityOnboardingOtelApmTroubleshootingLink"
                              href="https://ela.st/edot-sdks"
                              external
                              target="_blank"
                            >
                              {i18n.translate(
                                'xpack.observability_onboarding.otelApm.troubleshootingLinkText',
                                { defaultMessage: 'Open documentation' }
                              )}
                            </EuiLink>
                          ),
                        }}
                      />
                    </EuiText>
                  </>
                )}

                {(hasData === true || hasPreExistingDataFinal) && (
                  <>
                    <EuiSpacer />
                    <GetStartedPanel
                      onboardingFlowType="otel_apm"
                      onboardingId={data?.onboardingId ?? ''}
                      dataset="otel_apm"
                      newTab={false}
                      isLoading={false}
                      actionLinks={[
                        {
                          id: 'services',
                          title: i18n.translate(
                            'xpack.observability_onboarding.otelApm.servicesTitle',
                            { defaultMessage: 'View and analyze your services' }
                          ),
                          label: i18n.translate(
                            'xpack.observability_onboarding.otelApm.servicesLabel',
                            { defaultMessage: 'Open Service Inventory' }
                          ),
                          href: apmLocator?.getRedirectUrl({ serviceName: undefined }) ?? '',
                        },
                      ]}
                    />
                  </>
                )}
              </>
            ) : null,
          },
        ]}
      />
      <FeedbackButtons flow="otel_apm" />
    </EuiPanel>
  );
}

function InstallSDKInstructions() {
  const { euiTheme } = useEuiTheme();
  const languageList = [
    ['.NET', 'https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/dotnet'],
    ['Java', 'https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/java'],
    ['Node', 'https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/node'],
    ['PHP', 'https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/php'],
    ['Python', 'https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/python'],
    ['Android', 'https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/android'],
    ['iOS', 'https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/ios'],
  ];

  return (
    <EuiText>
      <FormattedMessage
        id="xpack.observability_onboarding.otelApm.download.textPre"
        defaultMessage="To download and install the SDK, refer to the {edotDocLink} for your language:"
        values={{
          edotDocLink: (
            <EuiLink
              data-test-subj="apmCreateOpenTelemetryAgentInstructionsEDOTDocsLink"
              target="_blank"
              href="https://ela.st/edot-sdks"
            >
              {i18n.translate('xpack.observability_onboarding.otelApm.EDOTDocumentationLinkLabel', {
                defaultMessage: 'Elastic Distribution of OpenTelemetry documentation',
              })}
            </EuiLink>
          ),
        }}
      />

      <p>
        {languageList.map(([language, url]) => (
          <div
            key={language}
            css={css`
              margin-top: ${euiTheme.size.m};
            `}
          >
            <EuiLink
              data-test-subj={`apmCreateOpenTelemetryAgentInstructions${language}Link`}
              target="_blank"
              href={url}
            >
              {language}
            </EuiLink>
          </div>
        ))}
      </p>
    </EuiText>
  );
}

function ConfigureSDKInstructions({
  managedOtlpServiceUrl,
  apiKeyEncoded,
  serviceName,
  onServiceNameChange,
}: {
  managedOtlpServiceUrl: string;
  apiKeyEncoded: string;
  serviceName: string;
  onServiceNameChange: (value: string) => void;
}) {
  const serviceNameDisplay = serviceName.trim() || '<app-name>';
  const items = [
    {
      setting: 'OTEL_EXPORTER_OTLP_ENDPOINT',
      value: managedOtlpServiceUrl,
    },
    {
      setting: 'OTEL_EXPORTER_OTLP_HEADERS',
      value: `Authorization=ApiKey ${apiKeyEncoded}`,
    },
    {
      setting: 'OTEL_RESOURCE_ATTRIBUTES',
      value: `service.name=${serviceNameDisplay},service.version=<app-version>,deployment.environment=production`,
    },
  ];

  const columns: Array<EuiBasicTableColumn<ValuesType<typeof items>>> = [
    {
      field: 'setting',
      width: '23%',
      name: i18n.translate('xpack.observability_onboarding.otelApm.configSettings', {
        defaultMessage: 'Configuration setting',
      }),
    },
    {
      field: 'value',
      width: '55%',
      name: i18n.translate('xpack.observability_onboarding.otelApm.configValue', {
        defaultMessage: 'Configuration value',
      }),
      render: (_, { value }) => (
        <>
          <EuiText size="s" color="accent">
            {value}
          </EuiText>
          {value && (
            <EuiButtonIcon
              data-test-subj="apmConfigurationValueColumnButton"
              aria-label={i18n.translate('xpack.observability_onboarding.otelApm.copyIconText', {
                defaultMessage: 'Copy to clipboard',
              })}
              color="text"
              iconType="copy"
              onClick={() => copyToClipboard(value)}
            />
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.observability_onboarding.otelApm.serviceNameLabel', {
          defaultMessage: 'Service name',
        })}
        helpText={i18n.translate('xpack.observability_onboarding.otelApm.serviceNameHelpText', {
          defaultMessage:
            'Enter the name of your application service. This updates the configuration below and helps detect your data.',
        })}
      >
        <EuiFieldText
          data-test-subj="observabilityOnboardingOtelApmServiceNameInput"
          placeholder={i18n.translate(
            'xpack.observability_onboarding.otelApm.serviceNamePlaceholder',
            { defaultMessage: 'my-service' }
          )}
          value={serviceName}
          onChange={(e) => onServiceNameChange(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiMarkdownFormat>
        {i18n.translate('xpack.observability_onboarding.otelApm.configureAgent.textPre', {
          defaultMessage:
            "Set the following variables in your application's environment to configure the SDK:",
        })}
      </EuiMarkdownFormat>
      <EuiSpacer />

      <EuiBasicTable
        items={items}
        columns={columns}
        tableCaption={i18n.translate('xpack.observability_onboarding.otelApm.configTableCaption', {
          defaultMessage: 'OpenTelemetry SDK configuration settings',
        })}
        data-test-subj="otel-instructions-table"
      />
    </>
  );
}
