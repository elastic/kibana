/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiStepProps, EuiStepStatus } from '@elastic/eui';
import {
  EuiSkeletonText,
  EuiSpacer,
  EuiButtonGroup,
  EuiIconTip,
  EuiCodeBlock,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiAccordion,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { DataIngestStatus, type ActionLink } from '../kubernetes/data_ingest_status';
import { CopyToClipboardButton } from '../shared/copy_to_clipboard_button';
import {
  WiredStreamsIngestionSelector,
  type IngestionMode,
} from '../shared/wired_streams_ingestion_selector';
import { OTEL_STACK_NAMESPACE } from './constants';
import type { KubernetesFlowData } from '../kubernetes/use_kubernetes_flow';
import type { FlowType } from '../../../hooks/use_wired_streams_status';

export interface BuildOtelStepsParams {
  data?: KubernetesFlowData;
  isMonitoringStepActive: boolean;
  dataReceived: boolean;
  hasPreExistingDataEarly: boolean;
  isMetricsOnboardingEnabled: boolean;
  isManagedOtlpServiceAvailable: boolean;
  addRepoCommand: string;
  installStackCommand?: string;
  otelKubeStackValuesFileUrl?: string;
  ingestionMode: IngestionMode;
  onIngestionModeChange: (mode: IngestionMode) => void;
  isWiredStreamsLoading: boolean;
  isWiredStreamsEnabled: boolean;
  isEnabling: boolean;
  enableWiredStreams: (flowType: FlowType) => Promise<boolean>;
  streamsDocLink?: string;
  useWiredStreams: boolean;
  idSelected: string;
  onLanguageChange: (optionId: string) => void;
  actionLinks: ActionLink[];
  onDataReceived: () => void;
  theme: UseEuiTheme;
}

export const buildOtelSteps = ({
  data,
  isMonitoringStepActive,
  dataReceived,
  hasPreExistingDataEarly,
  isMetricsOnboardingEnabled,
  addRepoCommand,
  installStackCommand,
  otelKubeStackValuesFileUrl,
  ingestionMode,
  onIngestionModeChange,
  isWiredStreamsLoading,
  isWiredStreamsEnabled,
  isEnabling,
  enableWiredStreams,
  streamsDocLink,
  useWiredStreams,
  idSelected,
  onLanguageChange,
  actionLinks,
  onDataReceived,
  theme,
}: BuildOtelStepsParams): EuiStepProps[] => [
  {
    title: i18n.translate(
      'xpack.observability_onboarding.otelKubernetesPanel.addRepositoryStepTitle',
      {
        defaultMessage: 'Add the OpenTelemetry repository to Helm',
      }
    ),
    children: (
      <>
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.otelKubernetesPanel.addRepositoryDescription"
            defaultMessage="Run this command to add the Helm chart. Refer to the {docsLink} for information on supported Helm versions."
            values={{
              docsLink: (
                <EuiLink
                  data-test-subj="observabilityOnboardingOtelKubernetesPanelQuickstartDocsLink"
                  href="https://www.elastic.co/docs/solutions/observability/get-started/quickstart-unified-kubernetes-observability-with-elastic-distributions-of-opentelemetry-edot"
                  external
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.otelKubernetesPanel.quickstartDocsLinkLabel',
                    { defaultMessage: 'quickstart guide' }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
        <EuiSpacer />
        <EuiCodeBlock paddingSize="m" language="bash">
          {addRepoCommand}
        </EuiCodeBlock>
        <EuiSpacer />
        <CopyToClipboardButton
          textToCopy={addRepoCommand}
          data-test-subj="observabilityOnboardingOtelKubernetesPanelAddRepositoryCopyToClipboard"
        />
      </>
    ),
  },
  {
    title: i18n.translate(
      'xpack.observability_onboarding.otelKubernetesPanel.installStackStepTitle',
      {
        defaultMessage: 'Install the OpenTelemetry Operator',
      }
    ),
    children: installStackCommand ? (
      <>
        {!isWiredStreamsLoading && (
          <>
            <WiredStreamsIngestionSelector
              ingestionMode={ingestionMode}
              onChange={onIngestionModeChange}
              streamsDocLink={streamsDocLink}
              isWiredStreamsEnabled={isWiredStreamsEnabled}
              isEnabling={isEnabling}
              flowType="otel_kubernetes"
              onEnableWiredStreams={enableWiredStreams}
            />
            <EuiSpacer size="xl" />
          </>
        )}
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.otelKubernetesPanel.injectAutoinstrumentationLibrariesForLabel"
            defaultMessage="Install the OpenTelemetry Operator using the kube-stack Helm chart and the provided values file. For automatic certificate renewal, we recommend installing the {link}, and customize the values.yaml file before the installation as described {doc}."
            values={{
              link: (
                <EuiLink
                  href="https://cert-manager.io/docs/installation/"
                  target="_blank"
                  data-test-subj="observabilityOnboardingOtelKubernetesPanelCertManagerLink"
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.otelKubernetesPanel.certmanagerLinkLabel',
                    { defaultMessage: 'cert-manager' }
                  )}
                </EuiLink>
              ),
              doc: (
                <EuiLink
                  href="https://ela.st/8-16-otel-cert-manager"
                  target="_blank"
                  data-test-subj="observabilityOnboardingOtelKubernetesPanelCertManagerDocsLink"
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.otelKubernetesPanel.certmanagerDocsLinkLabel',
                    { defaultMessage: 'in our documentation' }
                  )}
                </EuiLink>
              ),
            }}
          />{' '}
          <EuiIconTip
            content={i18n.translate(
              'xpack.observability_onboarding.otelKubernetesPanel.helmsAutogeneratedTLSCertificatesTextLabel',
              {
                defaultMessage:
                  "Helm's autogenerated TLS certificates have a default expiration period of 365 days. These certificates are not renewed automatically unless the release is manually updated. Enabling cert-manager allows for automatic certificate renewal.",
              }
            )}
            position="top"
            type="info"
          />
        </p>
        <EuiSpacer />
        <EuiCodeBlock paddingSize="m" language="bash">
          {installStackCommand}
        </EuiCodeBlock>
        <EuiSpacer />
        <EuiFlexGroup alignItems="center" justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <CopyToClipboardButton
              textToCopy={installStackCommand}
              data-test-subj="observabilityOnboardingOtelKubernetesPanelInstallStackCopyToClipboard"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="download"
              href={otelKubeStackValuesFileUrl}
              flush="left"
              target="_blank"
              data-test-subj="observabilityOnboardingOtelKubernetesPanelDownloadValuesFileButton"
              aria-label={i18n.translate(
                'xpack.observability_onboarding.otelKubernetesPanel.downloadValuesFileAriaLabel',
                { defaultMessage: 'Download the values file for OpenTelemetry setup' }
              )}
            >
              {i18n.translate(
                'xpack.observability_onboarding.otelKubernetesPanel.downloadValuesFileButtonEmptyLabel',
                { defaultMessage: 'Download values file' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    ) : (
      <EuiSkeletonText lines={6} />
    ),
  },
  ...(isMetricsOnboardingEnabled
    ? [
        {
          title: i18n.translate(
            'xpack.observability_onboarding.otelKubernetesPanel.instrumentApplicationStepTitle',
            {
              defaultMessage: 'Instrument your application (optional)',
            }
          ),
          children: (
            <>
              <p>
                {i18n.translate(
                  'xpack.observability_onboarding.otelKubernetesPanel.theOperatorAutomatesTheLabel',
                  {
                    defaultMessage:
                      'The Operator automates the injection of auto-instrumentation libraries into the annotated pods for some languages.',
                  }
                )}
              </p>
              <EuiSpacer />
              <EuiButtonGroup
                legend={i18n.translate(
                  'xpack.observability_onboarding.otelKubernetesPanel.selectProgrammingLanguageLegend',
                  {
                    defaultMessage: 'Select a programming language',
                  }
                )}
                idSelected={idSelected}
                onChange={onLanguageChange}
                options={[
                  { id: 'nodejs', label: 'Node.js' },
                  { id: 'java', label: 'Java' },
                  { id: 'python', label: 'Python' },
                  { id: 'dotnet', label: '.NET' },
                  { id: 'go', label: 'Go' },
                ]}
              />
              <EuiSpacer />
              <p
                css={css`
                  font-weight: ${theme.euiTheme.font.weight.bold};
                `}
              >
                {i18n.translate('xpack.observability_onboarding.otelKubernetesPanel.step3a.title', {
                  defaultMessage: '3(a) - Start with one of these annotations methods:',
                })}
              </p>
              <EuiSpacer />
              <EuiAccordion
                id={'otelKubernetesAccordionSingleDeployment'}
                paddingSize="s"
                buttonContent={i18n.translate(
                  'xpack.observability_onboarding.otelKubernetesPanel.annotation.deployment',
                  {
                    defaultMessage: 'Annotate specific deployment Pods modifying its manifest',
                  }
                )}
              >
                <EuiCodeBlock paddingSize="m" language="yaml" isCopyable={true}>
                  {`apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  ...
  template:
    metadata:
      annotations:
        instrumentation.opentelemetry.io/inject-${idSelected}: "${OTEL_STACK_NAMESPACE}/elastic-instrumentation"
      ...
    spec:
      containers:
      - image: myapplication-image
        name: app
      ...`}
                </EuiCodeBlock>
              </EuiAccordion>
              <EuiSpacer />
              <EuiAccordion
                id={'otelKubernetesAccordionAllResources'}
                paddingSize="s"
                buttonContent={i18n.translate(
                  'xpack.observability_onboarding.otelKubernetesPanel.annotation.resources',
                  { defaultMessage: 'Annotate all resources in a namespace' }
                )}
              >
                <EuiCodeBlock
                  paddingSize="m"
                  language="bash"
                  isCopyable={true}
                  data-test-subj="observabilityOnboardingOtelKubernetesPanelAnnotateAllResourcesSnippet"
                >
                  {`kubectl annotate namespace my-namespace instrumentation.opentelemetry.io/inject-${idSelected}="${OTEL_STACK_NAMESPACE}/elastic-instrumentation"`}
                </EuiCodeBlock>
              </EuiAccordion>
              <EuiSpacer />
              <p
                css={css`
                  font-weight: ${theme.euiTheme.font.weight.bold};
                `}
              >
                {i18n.translate('xpack.observability_onboarding.otelKubernetesPanel.step3b.title', {
                  defaultMessage:
                    '3(b) - Restart deployment and ensure the annotations are applied and the auto-instrumentation library is injected:',
                })}
              </p>
              <EuiSpacer />
              <EuiCodeBlock
                paddingSize="m"
                language="bash"
                isCopyable={true}
                data-test-subj="observabilityOnboardingOtelKubernetesPanelRestartDeploymentSnippet"
              >
                {`kubectl rollout restart deployment myapp -n my-namespace

kubectl describe pod <myapp-pod-name> -n my-namespace`}
              </EuiCodeBlock>
              <EuiSpacer />
              <p>
                <FormattedMessage
                  id="xpack.observability_onboarding.otelKubernetesPanel.forOtherLanguagesThatLabel"
                  defaultMessage="For other languages where auto-instrumentation is not available, {link}"
                  values={{
                    link: (
                      <EuiLink
                        href="https://ela.st/8-16-otel-apm-instrumentation"
                        data-test-subj="observabilityOnboardingOtelKubernetesPanelReferToTheDocumentationLink"
                        target="_blank"
                      >
                        {i18n.translate(
                          'xpack.observability_onboarding.otelKubernetesPanel.referToTheDocumentationLinkLabel',
                          { defaultMessage: 'refer to the documentation' }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </>
          ),
        },
      ]
    : []),
  {
    title: i18n.translate('xpack.observability_onboarding.otelKubernetesPanel.monitorStepTitle', {
      defaultMessage: 'Visualize your data',
    }),
    status: (dataReceived || hasPreExistingDataEarly
      ? 'complete'
      : isMonitoringStepActive
      ? 'current'
      : 'incomplete') as EuiStepStatus,
    children: isMonitoringStepActive && data && (
      <DataIngestStatus
        onboardingId={data.onboardingId}
        onboardingFlowType="kubernetes_otel"
        dataset="kubernetes"
        integration="kubernetes_otel"
        actionLinks={actionLinks}
        onDataReceived={onDataReceived}
        respectPreExistingData={useWiredStreams}
      />
    ),
  },
];
