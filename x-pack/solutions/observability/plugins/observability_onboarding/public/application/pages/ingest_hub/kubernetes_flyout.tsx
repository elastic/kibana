/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSteps,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { CardLogoIcon } from './ingest_hub_components';

interface KubernetesFlyoutProps {
  logoUrl: string;
  onClose: () => void;
  isChild?: boolean;
  hideCloseButton?: boolean;
  ownFocus?: boolean;
}

const HELM_REPO_COMMAND =
  "helm repo add open-telemetry 'https://open-telemetry.github.io/opentelemetry-helm-charts' --force-update";

const INSTALL_COMMANDS = `kubectl create namespace opentelemetry-operator-system
kubectl create secret generic elastic-secret-otel \\
  --namespace opentelemetry-operator-system \\
  --from-literal=elastic_endpoint='https://192cc798178a4125b83d9a58055b1942.us-west2.gcp.elastic-cloud.com:443' \\
  --from-literal=elastic_api_key='QUx1MUhwd0JLbl9uNnRySGF5c2g6c2daU1lkM0JpVDVQaktxeWhWQmM1QQ=='
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace opentelemetry-operator-system \\
  --values 'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.2.4/deploy/helm/edot-collector/kube-stack/values.yaml' \\
  --version '0.12.4'`;

const COLLECTOR_OPTIONS = [
  {
    id: 'new-collector',
    label: 'New OpenTelemetry Collector',
    description: 'Collect logs, traces and metrics with the Elastic Distro for OTel Collector.',
  },
  {
    id: 'existing-collector',
    label: 'Existing Collector',
    description: 'Choose this if you have an existing Collector configuration.',
  },
  {
    id: 'elastic-agent',
    label: 'Elastic Agent',
    description:
      'Deploy a single, unified agent to collect logs, metrics, and traces from your Kubernetes cluster.',
  },
];

const K8S_DASHBOARDS = [
  '[Kubernetes] Cluster Overview',
  '[Kubernetes] Node Metrics',
  '[Kubernetes] Pod Metrics',
  '[Kubernetes] Deployments',
  '[Kubernetes] DaemonSets',
  '[Kubernetes] StatefulSets',
  '[Kubernetes] Container Logs',
  '[Kubernetes] API Server',
  '[Kubernetes] Controller Manager',
  '[Kubernetes] Scheduler',
  '[Kubernetes] Proxy',
  '[Kubernetes] Volumes',
];

export const KubernetesFlyout: React.FC<KubernetesFlyoutProps> = ({ logoUrl, onClose, isChild, hideCloseButton, ownFocus: ownFocusProp }) => {
  const { euiTheme } = useEuiTheme();
  const [selectedCollector, setSelectedCollector] = useState('new-collector');
  const [instrumentApp, setInstrumentApp] = useState(false);

  const steps = [
    {
      title: 'How do you want to collect data?',
      status: 'current' as const,
      children: (
        <>
          <EuiText size="s" color="subdued">
            <p>
              Monitor your Kubernetes cluster using OpenTelemetry or redirect an existing
              configuration.
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <fieldset>
            <EuiFlexGroup gutterSize="m" responsive={false} css={css`
              .euiCheckableCard {
                height: 100%;
              }
            `}>
              {COLLECTOR_OPTIONS.slice(0, 2).map((option) => (
                <EuiFlexItem key={option.id}>
                  <EuiCheckableCard
                    id={option.id}
                    label={
                      <>
                        <strong>{option.label}</strong>
                        <EuiText size="xs" color="subdued" style={{ marginTop: 2 }}>
                          {option.description}
                        </EuiText>
                      </>
                    }
                    checked={selectedCollector === option.id}
                    onChange={() => setSelectedCollector(option.id)}
                    checkableType="radio"
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </fieldset>
          <EuiSpacer size="xs" />
          <EuiAccordion
            id="otherMethodsAccordion"
            buttonContent="Other methods"
            paddingSize="s"
          >
            <EuiSpacer size="s" />
            <fieldset>
              <EuiCheckableCard
                id="elastic-agent"
                label={
                  <>
                    <strong>Elastic Agent</strong>
                    <EuiText size="xs" color="subdued" style={{ marginTop: 2 }}>
                      Deploy a single, unified agent to collect logs, metrics, and traces from
                      your Kubernetes cluster.
                    </EuiText>
                  </>
                }
                checked={selectedCollector === 'elastic-agent'}
                onChange={() => setSelectedCollector('elastic-agent')}
                checkableType="radio"
              />
            </fieldset>
          </EuiAccordion>
        </>
      ),
    },
    {
      title: 'Add the OpenTelemetry repository to Helm',
      status: 'incomplete' as const,
      children: (
        <>
          <EuiText size="s" color="subdued">
            <p>Run this command to add the OpenTelemetry Helm chart repository.</p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiCodeBlock language="bash" isCopyable paddingSize="m" fontSize="s">
            {HELM_REPO_COMMAND}
          </EuiCodeBlock>
        </>
      ),
    },
    {
      title: 'Install the OpenTelemetry operator',
      status: 'incomplete' as const,
      children: (
        <>
          <EuiText size="s" color="subdued">
            <p>
              Install the OpenTelemetry Operator using the kube-stack Helm chart and the provided
              values file. For automatic certificate renewal, we recommend installing the
              cert-manager, and customize the values.yaml file before the installation as described
              in our documentation.
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiCodeBlock language="bash" isCopyable paddingSize="m" fontSize="s">
            {INSTALL_COMMANDS}
          </EuiCodeBlock>
        </>
      ),
    },
    {
      title: 'Instrument your application',
      status: 'incomplete' as const,
      children: (
        <>
          <EuiText size="s" color="subdued">
            <p>
              The Operator automates the injection of auto-instrumentation libraries into the
              annotated pods for some languages.
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiSwitch
            label="Instrument application (Optional)"
            checked={instrumentApp}
            onChange={(e) => setInstrumentApp(e.target.checked)}
            compressed
          />
        </>
      ),
    },
    {
      title: 'Checking for data',
      status: 'incomplete' as const,
      children: (
        <>
          <EuiText size="s" color="subdued">
            <p>When finished come back and test your connection to see incoming data.</p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiCallOut
            color="primary"
            css={css`
              border-radius: ${euiTheme.border.radius.small};
            `}
            title={
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem>Waiting for connection...</EuiFlexItem>
              </EuiFlexGroup>
            }
          />
          <EuiSpacer size="m" />
          <EuiAccordion
            id="k8sDashboardsAccordion"
            buttonContent={`Dashboards available once installed (${K8S_DASHBOARDS.length})`}
            paddingSize="s"
          >
            <EuiSpacer size="s" />
            <EuiPanel color="plain" hasBorder paddingSize="m">
              <EuiFlexGroup direction="column" gutterSize="xs">
                {K8S_DASHBOARDS.map((name, idx) => (
                  <EuiFlexItem key={`${name}-${idx}`}>
                    <EuiFlexGroup
                      gutterSize="s"
                      alignItems="center"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="dashedCircle" size="s" color="subdued" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="xs">{name}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPanel>
          </EuiAccordion>
        </>
      ),
    },
  ];

  return (
    <EuiFlyout
      ownFocus={ownFocusProp !== undefined ? ownFocusProp : !isChild}
      onClose={onClose}
      hideCloseButton={hideCloseButton}
      aria-labelledby="kubernetesFlyoutTitle"
      {...(isChild
        ? {
            session: 'start' as const,
            flyoutMenuProps: { title: 'Add Kubernetes', hideCloseButton },
          }
        : {})}
      css={css`
        inline-size: ${isChild ? '65vw' : '50vw'} !important;
        ${isChild ? `
          animation-duration: 0s !important;
          transition-duration: 0s !important;
          [class*="euiFlyoutMenu__container"] {
            border-block-end: none !important;
          }
          & .euiFlyoutHeader {
            padding: 32px !important;
          }
          & .euiFlyoutBody__overflowContent {
            padding: 32px !important;
          }
          & .euiFlyoutFooter {
            padding: 32px !important;
          }
        ` : ''}
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <CardLogoIcon src={logoUrl} alt="Kubernetes logo" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="kubernetesFlyoutTitle">Add Kubernetes</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              Monitor your Kubernetes cluster health, pods, and deployments.
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiSteps
          steps={steps}
          headingElement="h3"
          titleSize="xs"
          css={css`
            .euiStep__content {
              margin-block-start: 0 !important;
              padding-block-start: ${euiTheme.size.s} !important;
              padding-block-end: ${euiTheme.size.l};
            }
            .euiStep__title {
              padding-block-start: 0;
            }
          `}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="kubernetesFlyoutSeeMyDataButton"
              fill
              disabled
              onClick={onClose}
            >
              See my data
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
