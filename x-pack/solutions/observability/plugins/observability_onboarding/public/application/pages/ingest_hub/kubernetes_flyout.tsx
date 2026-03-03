/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiStepNumber,
  EuiSuperSelect,
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
  },
  {
    id: 'existing-collector',
    label: 'Existing Collector',
  },
];

const OTHER_METHODS_OPTIONS = [
  {
    value: 'other-methods',
    inputDisplay: 'Other methods',
    dropdownDisplay: 'Other methods',
  },
  {
    value: 'elastic-agent',
    inputDisplay: 'Elastic Agent',
    dropdownDisplay: 'Elastic Agent',
  },
  {
    value: 'beats',
    inputDisplay: 'Beats',
    dropdownDisplay: 'Beats',
  },
];

const COLLECTOR_DESCRIPTIONS: Record<string, string> = {
  'new-collector':
    'Collect logs, traces and metrics with the Elastic Distro for OTel Collector.',
  'existing-collector':
    'Choose this if you have an existing Collector configuration.',
};

export const KubernetesFlyout: React.FC<KubernetesFlyoutProps> = ({ logoUrl, onClose }) => {
  const { euiTheme } = useEuiTheme();
  const [selectedCollector, setSelectedCollector] = useState('new-collector');
  const [otherMethod, setOtherMethod] = useState('other-methods');
  const [instrumentApp, setInstrumentApp] = useState(false);
  const [assetsExpanded, setAssetsExpanded] = useState(false);

  const stepTitleCss = css`
    gap: 12px;
  `;

  const stepBlockCss = css`
    padding-left: 36px;
  `;

  const radioCardCss = css`
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.m};
    cursor: pointer;
    flex: 1;
    &:hover {
      border-color: ${euiTheme.colors.borderBasePlain};
    }
  `;

  const radioCardSelectedCss = css`
    border-color: ${euiTheme.colors.primary};
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;

  const renderStep = (
    number: number,
    title: string,
    status: 'current' | 'incomplete' | 'complete',
    content: React.ReactNode
  ) => (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} css={stepTitleCss}>
        <EuiFlexItem grow={false}>
          <EuiStepNumber number={number} status={status} titleSize="none" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div css={stepBlockCss}>{content}</div>
    </>
  );

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
        {/* Step 1 */}
        {renderStep(1, 'How do you want to collect data?', 'current', (
          <>
            <EuiText size="s" color="subdued">
              <p>
                Monitor your Kubernetes cluster using OpenTelemetry or redirect an existing
                configuration.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m" responsive={false}>
              {COLLECTOR_OPTIONS.map((option) => (
                <EuiFlexItem key={option.id}>
                  <div
                    css={[radioCardCss, selectedCollector === option.id && radioCardSelectedCss]}
                    onClick={() => setSelectedCollector(option.id)}
                    role="radio"
                    aria-checked={selectedCollector === option.id}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedCollector(option.id);
                    }}
                  >
                    <EuiRadioGroup
                      options={[{ id: option.id, label: '' }]}
                      idSelected={selectedCollector}
                      onChange={setSelectedCollector}
                      css={css`
                        display: none;
                      `}
                    />
                    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          type={selectedCollector === option.id ? 'dotInCircle' : 'circle'}
                          color={selectedCollector === option.id ? 'primary' : 'subdued'}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{option.label}</strong>
                        </EuiText>
                        <EuiText size="xs" color="subdued">
                          {COLLECTOR_DESCRIPTIONS[option.id]}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiSuperSelect
              options={OTHER_METHODS_OPTIONS}
              valueOfSelected={otherMethod}
              onChange={setOtherMethod}
              compressed
              style={{ maxWidth: 180 }}
            />
          </>
        ))}

        <EuiSpacer size="xl" />

        {/* Step 2 */}
        {renderStep(2, 'Add the OpenTelemetry repository to Helm', 'incomplete', (
          <>
            <EuiText size="s" color="subdued">
              <p>Run this command to add the OpenTelemetry Helm chart repository.</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="bash" isCopyable paddingSize="m" fontSize="s">
              {HELM_REPO_COMMAND}
            </EuiCodeBlock>
          </>
        ))}

        <EuiSpacer size="xl" />

        {/* Step 3 */}
        {renderStep(3, 'Install the OpenTelemetry operator', 'incomplete', (
          <>
            <EuiText size="s" color="subdued">
              <p>
                Install the OpenTelemetry Operator using the kube-stack Helm chart and the provided
                values file. For automatic certificate renewal, we recommend installing the
                cert-manager, and customize the values.yaml file before the installation as described
                in our documentation.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="bash" isCopyable paddingSize="m" fontSize="s">
              {INSTALL_COMMANDS}
            </EuiCodeBlock>
          </>
        ))}

        <EuiSpacer size="xl" />

        {/* Step 4 */}
        {renderStep(4, 'Instrument your application', 'incomplete', (
          <>
            <EuiText size="s" color="subdued">
              <p>
                The Operator automates the injection of auto-instrumentation libraries into the
                annotated pods for some languages.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiSwitch
              label="Instrument application (Optional)"
              checked={instrumentApp}
              onChange={(e) => setInstrumentApp(e.target.checked)}
              compressed
            />
          </>
        ))}

        <EuiSpacer size="xl" />

        {/* Step 5 */}
        {renderStep(5, 'Checking for data', 'incomplete', (
          <>
            <EuiText size="s" color="subdued">
              <p>
                When finished come back and test your connection to see incoming data.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
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
        ))}
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
