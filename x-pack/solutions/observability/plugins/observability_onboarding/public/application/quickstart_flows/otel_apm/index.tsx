/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCallOut,
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
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { GetStartedPanel } from '../shared/get_started_panel';
import { useOtelApmFlow } from './use_otel_apm_flow';
import { EmptyPrompt } from '../shared/empty_prompt';

export function OtelApmQuickstartFlow() {
  useFlowBreadcrumb({
    text: i18n.translate('xpack.observability_onboarding.otelApm.breadcrumbs.k8sOtel', {
      defaultMessage: 'Application: OpenTelemetry',
    }),
  });
  const {
    services: {
      share,
      context: { isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const { data, status, error, refetch } = useOtelApmFlow();
  const { onPageReady } = usePerformanceContext();

  useEffect(() => {
    if (data) {
      onPageReady({
        meta: {
          description: `[ttfmp_onboarding] Request to create the onboarding flow succeeded and the flow's UI has rendered`,
        },
      });
    }
  }, [data, onPageReady]);

  if (error !== undefined) {
    return <EmptyPrompt onboardingFlowType="otel_apm" error={error} onRetryClick={refetch} />;
  }

  const apmLocator = share.url.locators.get('APM_LOCATOR');

  return (
    <EuiPanel hasBorder paddingSize="xl">
      {!isServerless && (
        <EuiCallOut
          announceOnMount
          title={i18n.translate(
            'xpack.observability_onboarding.otelApmQuickstartFlow.euiCallOut.calloutTitleLabel',
            {
              defaultMessage: 'Managed OTLP Endpoint is in Tech Preview for Elastic Cloud Hosted',
            }
          )}
          iconType="info"
          color="warning"
        >
          <p>
            <FormattedMessage
              id="xpack.observability_onboarding.otelApmQuickstartFlow.p.descriptionTextGoesHereLabel"
              defaultMessage="Managed OTLP Endpoint should not be used in production yet for Elastic Cloud Hosted deployments. For more details, refer to the {motlpDocumentation}."
              values={{
                motlpDocumentation: (
                  <EuiLink
                    data-test-subj="apmCreateOpenTelemetryAgentInstructionsMOTLPDocsLink"
                    target="_blank"
                    href="https://www.elastic.co/docs/reference/opentelemetry/motlp"
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.otelApmQuickstartFlow.motlpDocumentationLinkLabel',
                      {
                        defaultMessage: 'Managed OTLP Endpoint documentation',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      )}

      <EuiSpacer size="l" />

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
                  />
                )}
              </>
            ),
          },
          {
            title: i18n.translate('xpack.observability_onboarding.otelApm.monitorStepTitle', {
              defaultMessage: 'Visualize your data',
            }),
            children: (
              <>
                <p>
                  <FormattedMessage
                    id="xpack.observability_onboarding.otelApm.onceYourKubernetesInfrastructureLabel"
                    defaultMessage="Go to the Service Inventory to explore your traces, logs, and metrics."
                  />
                </p>
                <EuiSpacer />
                <GetStartedPanel
                  onboardingFlowType="otel_apm"
                  onboardingId={data?.onboardingId}
                  dataset="otel_apm"
                  newTab={false}
                  isLoading={status !== FETCH_STATUS.SUCCESS}
                  actionLinks={[
                    {
                      id: 'services',
                      title: i18n.translate(
                        'xpack.observability_onboarding.otelApm.servicesTitle',
                        {
                          defaultMessage: 'View and analyze your services',
                        }
                      ),
                      label: i18n.translate(
                        'xpack.observability_onboarding.otelApm.servicesLabel',
                        {
                          defaultMessage: 'Open Service Inventory',
                        }
                      ),
                      href: apmLocator?.getRedirectUrl({ serviceName: undefined }) ?? '',
                    },
                  ]}
                />
              </>
            ),
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
              href="http://ela.st/edot-sdks"
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
}: {
  managedOtlpServiceUrl: string;
  apiKeyEncoded: string;
}) {
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
      value:
        'service.name=<app-name>,service.version=<app-version>,deployment.environment=production',
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
      <EuiMarkdownFormat>
        {i18n.translate('xpack.observability_onboarding.otelApm.configureAgent.textPre', {
          defaultMessage:
            'Set the following variables in your application’s environment to configure the SDK:',
        })}
      </EuiMarkdownFormat>
      <EuiSpacer />

      <EuiBasicTable items={items} columns={columns} data-test-subj="otel-instructions-table" />
    </>
  );
}
