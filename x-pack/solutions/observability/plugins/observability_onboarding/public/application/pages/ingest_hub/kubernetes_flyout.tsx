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
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPanel,
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

export const KubernetesFlyout: React.FC<KubernetesFlyoutProps> = ({ logoUrl, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const [selectedCollector, setSelectedCollector] = useState('new-collector');
  const [instrumentApp, setInstrumentApp] = useState(false);
  const [assetsExpanded, setAssetsExpanded] = useState(false);

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
          <EuiSpacer size="xs" />
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
          <EuiSpacer size="xs" />
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
          <EuiSpacer size="xs" />
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
          <EuiSpacer size="xs" />
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
          <EuiSpacer size="xs" />
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    Establishing connection/Validating data flow/Preparing your assets...
                  </strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              0/24 Kubernetes assets installed.
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiButtonEmpty
              data-test-subj="kubernetesFlyoutViewAssetsButton"
              size="xs"
              flush="left"
              iconType={assetsExpanded ? 'arrowDown' : 'arrowRight'}
              onClick={() => setAssetsExpanded(!assetsExpanded)}
            >
              View assets
            </EuiButtonEmpty>
            {assetsExpanded && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  <p>Assets will appear here as they are installed.</p>
                </EuiText>
              </>
            )}
          </EuiPanel>
        </>
      ),
    },
  ];

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="kubernetesFlyoutTitle"
      css={css`
        inline-size: 50vw !important;
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
              margin-block-start: ${euiTheme.size.xs};
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
