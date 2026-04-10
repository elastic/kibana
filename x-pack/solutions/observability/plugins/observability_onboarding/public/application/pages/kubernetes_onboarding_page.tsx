/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiSteps,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { PageTemplate } from './template';
import { useFlowBreadcrumb } from '../shared/use_flow_breadcrumbs';
import { IntegrationHeader } from '../header/integration_header';

const ELASTIC_LOGOS = 'https://raw.githubusercontent.com/elastic/integrations/main/packages';

type InstallMethod = 'otel' | 'elastic-agent';
type YesNo = 'yes' | 'no';
type EaMode = 'fleet' | 'standalone';
type Language = 'nodejs' | 'java' | 'python' | 'dotnet' | 'go';

// ─── Shared sub-components ───────────────────────────────────────────────────

const LogoBadge: React.FC<{ src: string; alt: string; size?: number }> = ({
  src,
  alt,
  size = 32,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain' }}
      />
    </div>
  );
};

const checkableCardCss = css`
  & [class*='euiCheckableCard__label'] {
    margin-bottom: -16px !important;
  }
  p {
    margin: 0;
  }
`;

interface ChoiceCardProps {
  id: string;
  checked: boolean;
  onChange: () => void;
  logoSrc?: string;
  logoAlt?: string;
  title: string;
  badge?: string;
  description: string;
}

const ChoiceCard: React.FC<ChoiceCardProps> = ({
  id,
  checked,
  onChange,
  logoSrc,
  logoAlt,
  title,
  badge,
  description,
}) => (
  <EuiCheckableCard
    id={id}
    checkableType="radio"
    checked={checked}
    onChange={onChange}
    css={checkableCardCss}
    label={
      <div>
        <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false} style={{ gap: 8 }}>
          {logoSrc && logoAlt && (
            <EuiFlexItem grow={false}>
              <LogoBadge src={logoSrc} alt={logoAlt} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <strong>{title}</strong>
          </EuiFlexItem>
          {badge && (
            <EuiFlexItem grow={false} style={{ marginLeft: 4 }}>
              <EuiBadge color="success">{badge}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiText size="s" color="subdued" style={{ marginTop: 8 }}>
          <p style={{ margin: 0 }}>{description}</p>
        </EuiText>
      </div>
    }
  />
);

const WaitingForData: React.FC = () => (
  <EuiCallOut
    title={
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>Waiting for data…</EuiFlexItem>
      </EuiFlexGroup>
    }
    color="primary"
  >
    <EuiText size="s">
      <p>
        Once your Kubernetes cluster starts sending data, your dashboards and
        visualizations will be ready to explore.
      </p>
    </EuiText>
  </EuiCallOut>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export const KubernetesOnboardingPage: React.FC = () => {
  useFlowBreadcrumb({ text: 'Kubernetes' });

  // Step 1
  const [method, setMethod] = useState<InstallMethod>('otel');

  // OTel-specific
  const [collectorMode, setCollectorMode] = useState<'new' | 'existing'>('new');
  const [ingestionMode, setIngestionMode] = useState<'classic' | 'streams'>('classic');
  const [otelInstrEnabled, setOtelInstrEnabled] = useState(false);
  const [otelAnnotationMode, setOtelAnnotationMode] = useState<'pods' | 'namespace'>('pods');
  const [otelLanguage, setOtelLanguage] = useState<Language>('nodejs');

  // EA-specific
  const [eaMode, setEaMode] = useState<EaMode>('fleet');
  const [fleetServerUrl, setFleetServerUrl] = useState('');
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [eaIngestionMode, setEaIngestionMode] = useState<'ea-classic' | 'ea-streams'>('ea-classic');
  const [eaHasAppInstr, setEaHasAppInstr] = useState<YesNo | null>(null);
  const [eaLanguage, setEaLanguage] = useState<Language>('nodejs');

  const fleetHelmCommand = `helm install elastic-agent elastic/elastic-agent \\
  -n kube-system \\
  --set agent.fleet.enabled=true \\
  --set agent.fleet.url="${fleetServerUrl || '<YOUR_FLEET_SERVER_URL>'}" \\
  --set agent.fleet.token="${enrollmentToken || '<YOUR_ENROLLMENT_TOKEN>'}"`;

  const standaloneHelmCommand = `helm install elastic-agent elastic/elastic-agent \\
  -n kube-system \\
  --set outputs.default.type=elasticsearch \\
  --set outputs.default.hosts[0]="<YOUR_ELASTICSEARCH_URL>" \\
  --set outputs.default.api_key="<YOUR_API_KEY>"`;

  // ─── Step sets ──────────────────────────────────────────────────────────────

  const otelSteps = [
    {
      title: 'Set up the OpenTelemetry Collector',
      children: (
        <>
          <EuiTabs>
            <EuiTab
              isSelected={collectorMode === 'new'}
              onClick={() => setCollectorMode('new')}
            >
              Elastic Distribution for OTel Collector
            </EuiTab>
            <EuiTab
              isSelected={collectorMode === 'existing'}
              onClick={() => setCollectorMode('existing')}
            >
              Use existing collector
            </EuiTab>
          </EuiTabs>

          <EuiSpacer size="l" />

          {collectorMode === 'new' && (
            <>
              <EuiTitle size="xs">
                <h3>Add the OpenTelemetry Helm repository</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>
                  Run this command to add the Helm chart. Refer to the{' '}
                  <EuiLink href="https://github.com/open-telemetry/opentelemetry-helm-charts" target="_blank">
                    quickstart guide
                  </EuiLink>{' '}
                  for information on supported Helm versions.
                </p>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiCodeBlock language="bash" paddingSize="m" isCopyable>
                {`helm repo add open-telemetry 'https://open-telemetry.github.io/opentelemetry-helm-charts' --force-update`}
              </EuiCodeBlock>
              <EuiSpacer size="l" />
              <EuiTitle size="xs">
                <h3>Ingestion selector</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiButtonGroup
                legend="Ingestion selector"
                idSelected={ingestionMode}
                onChange={(id) => setIngestionMode(id as 'classic' | 'streams')}
                options={[
                  { id: 'classic', label: 'Classic ingestion' },
                  {
                    id: 'streams',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Wired Streams
                        <EuiBadge color="hollow" style={{ fontSize: 9, padding: '0 4px' }}>
                          TECH PREVIEW
                        </EuiBadge>
                      </span>
                    ) as unknown as string,
                  },
                ]}
              />
              <EuiSpacer size="l" />
              {ingestionMode === 'streams' && (
                <>
                  <EuiText size="s" color="subdued">
                    <p>
                      Streams provide our next-generation log ingestion model with a managed
                      hierarchy. Wired Streams is currently in tech preview, and some features may
                      not yet be fully supported. Logs will be routed to root streams (
                      <code>logs.otel</code> or <code>logs.ecs</code>) based on their format, while
                      other signals continue through standard data streams.
                    </p>
                    <p>
                      <EuiLink href="https://www.elastic.co/guide/en/observability/current/streams.html" target="_blank">
                        Read more about Streams
                      </EuiLink>
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                </>
              )}

              <EuiTitle size="xs">
                <h3>Install the Elastic Distribution for OTel Collector</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>
                  Install the OpenTelemetry Operator using the kube-stack Helm chart and the
                  provided values file. For automatic certificate renewal, we recommend installing
                  the{' '}
                  <EuiLink href="https://cert-manager.io/docs/installation/" target="_blank">
                    cert-manager
                  </EuiLink>
                  , and customize the values.yaml file before the installation as described in{' '}
                  <EuiLink href="https://www.elastic.co/guide/en/observability/current/kubernetes-otel.html" target="_blank">
                    our documentation
                  </EuiLink>
                  .{' '}
                  <EuiIconTip
                    type="iInCircle"
                    color="subdued"
                    content="Customizing values.yaml before installation allows you to configure receivers, processors, and exporters for your specific environment."
                    position="right"
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiCodeBlock language="bash" paddingSize="m" isCopyable overflowHeight={300}>
                {ingestionMode === 'classic'
                  ? `kubectl create namespace opentelemetry-operator-system
kubectl create secret generic elastic-secret-otel \\
  --namespace opentelemetry-operator-system \\
  --from-literal=elastic_otlp_endpoint='<YOUR_ELASTIC_ENDPOINT>' \\
  --from-literal=elastic_api_key='<YOUR_API_KEY>'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace opentelemetry-operator-system \\
  --values 'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.3.3/deploy/helm/edot-collector/kube-stack/managed_otlp/values.yaml' \\
  --version '0.12.4'`
                  : `kubectl create namespace opentelemetry-operator-system
kubectl create secret generic elastic-secret-otel \\
  --namespace opentelemetry-operator-system \\
  --from-literal=elastic_otlp_endpoint='<YOUR_ELASTIC_ENDPOINT>' \\
  --from-literal=elastic_api_key='<YOUR_API_KEY>'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace opentelemetry-operator-system \\
  --values 'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.3.3/deploy/helm/edot-collector/kube-stack/managed_otlp/values.yaml' \\
  --version '0.12.4' \\
  --set 'collectors.daemon.config.processors.resource/wired_streams.attributes[0].action=upsert' \\
  --set 'collectors.daemon.config.processors.resource/wired_streams.attributes[0].key=elasticsearch.index' \\
  --set 'collectors.daemon.config.processors.resource/wired_streams.attributes[0].value=logs.otel' \\
  --set 'collectors.daemon.config.service.pipelines.logs/node.processors[8]=resource/wired_streams'`}
              </EuiCodeBlock>
            </>
          )}

          {collectorMode === 'existing' && (
            <>
              <EuiTitle size="xs">
                <h3>Add an OTLP exporter</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>
                  Add the following exporter to your collector config. Ensure your receivers
                  include <code>k8s_cluster</code>, <code>kubeletstats</code>, and{' '}
                  <code>prometheus</code> for full infrastructure coverage.
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiCodeBlock language="yaml" paddingSize="m" isCopyable>
                {`exporters:
  otlp/elastic:
    endpoint: "<YOUR_ELASTIC_ENDPOINT>"
    headers:
      Authorization: "ApiKey <YOUR_API_KEY>"

service:
  pipelines:
    traces:
      exporters: [otlp/elastic]
    metrics:
      exporters: [otlp/elastic]
    logs:
      exporters: [otlp/elastic]`}
              </EuiCodeBlock>
            </>
          )}
        </>
      ),
    },
    {
      title: 'Instrument your application',
      children: (
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
            checked={otelInstrEnabled}
            onChange={(e) => setOtelInstrEnabled(e.target.checked)}
          />
          {otelInstrEnabled && (
            <>
              <EuiSpacer size="l" />
              <EuiFlexGroup gutterSize="m" responsive={false}>
                <EuiFlexItem>
                  <ChoiceCard
                    id="otel-annotate-pods"
                    checked={otelAnnotationMode === 'pods'}
                    onChange={() => setOtelAnnotationMode('pods')}
                    title="Annotate specific pods"
                    description="Add annotations to individual deployment manifests for precise control over which pods are instrumented."
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <ChoiceCard
                    id="otel-annotate-namespace"
                    checked={otelAnnotationMode === 'namespace'}
                    onChange={() => setOtelAnnotationMode('namespace')}
                    title="Annotate entire namespace"
                    description="Apply annotations at the namespace level to instrument all pods automatically."
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="l" />
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonGroup
                    legend="Programming language"
                    idSelected={otelLanguage}
                    onChange={(id) => setOtelLanguage(id as Language)}
                    options={[
                      { id: 'nodejs', label: 'Node.js' },
                      { id: 'java', label: 'Java' },
                      { id: 'python', label: 'Python' },
                      { id: 'dotnet', label: '.NET' },
                      { id: 'go', label: 'Go' },
                    ]}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="popout"
                    iconSide="right"
                    href="https://opentelemetry.io/docs/kubernetes/operator/automatic/"
                    target="_blank"
                    flush="left"
                  >
                    Other languages documentation
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="l" />
              <EuiCodeBlock language="yaml" paddingSize="m" isCopyable>
                {otelAnnotationMode === 'pods'
                  ? `apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  ...
  template:
    metadata:
      annotations:
        instrumentation.opentelemetry.io/inject-${otelLanguage}: "opentelemetry-operator-system/elastic-instrumentation"
      ...
    spec:
      containers:
      - image: myapplication-image
        name: app
        ...`
                  : `apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
  annotations:
    instrumentation.opentelemetry.io/inject-${otelLanguage}: "opentelemetry-operator-system/elastic-instrumentation"`}
              </EuiCodeBlock>
              {otelAnnotationMode === 'pods' && (
                <>
                  <EuiSpacer size="l" />
                  <EuiText size="s">
                    <strong>Apply your updated manifest and restart the deployment:</strong>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiCodeBlock language="bash" paddingSize="m" isCopyable>
                    {`kubectl rollout restart deployment myapp -n my-namespace`}
                  </EuiCodeBlock>
                </>
              )}
            </>
          )}
        </>
      ),
    },
    ...(true
      ? [
          {
            title: 'Visualize your data',
            children: <WaitingForData />,
          },
        ]
      : []),
  ];

  const eaSteps = [
    {
      title: 'Choose deployment mode',
      children: (
        <>
          <EuiTabs>
            <EuiTab
              isSelected={eaMode === 'fleet'}
              onClick={() => setEaMode('fleet')}
            >
              Fleet-managed
            </EuiTab>
            <EuiTab
              isSelected={eaMode === 'standalone'}
              onClick={() => setEaMode('standalone')}
            >
              Standalone
            </EuiTab>
          </EuiTabs>

          {eaMode === 'fleet' && (
            <>
              <EuiSpacer size="l" />
              <EuiFlexGroup gutterSize="m" responsive={false}>
                <EuiFlexItem>
                  <EuiFormRow label="Fleet Server URL" fullWidth>
                    <EuiFieldText
                      fullWidth
                      placeholder="https://fleet-server:8220"
                      value={fleetServerUrl}
                      onChange={(e) => setFleetServerUrl(e.target.value)}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow label="Enrollment token" fullWidth>
                    <EuiFieldPassword
                      fullWidth
                      placeholder="Enrollment token"
                      value={enrollmentToken}
                      onChange={(e) => setEnrollmentToken(e.target.value)}
                      type="dual"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="l" />
              <EuiTitle size="xs">
                <h3>Add the Elastic Helm repository</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiCodeBlock language="bash" paddingSize="m" isCopyable>
                {`helm repo add elastic 'https://helm.elastic.co' --force-update`}
              </EuiCodeBlock>
              <EuiSpacer size="l" />
              <EuiTitle size="xs">
                <h3>Deploy Elastic Agent</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiCodeBlock language="bash" paddingSize="m" isCopyable>
                {fleetHelmCommand}
              </EuiCodeBlock>
              <EuiSpacer size="m" />
              <EuiButton size="s" iconType="copy">
                Copy to clipboard
              </EuiButton>
            </>
          )}

          {eaMode === 'standalone' && (
            <>
              <EuiSpacer size="l" />
              <EuiTitle size="xs">
                <h3>Ingestion selector</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiButtonGroup
                legend="Ingestion selector"
                idSelected={eaIngestionMode}
                onChange={(id) => setEaIngestionMode(id as 'ea-classic' | 'ea-streams')}
                options={[
                  { id: 'ea-classic', label: 'Classic ingestion' },
                  {
                    id: 'ea-streams',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Wired Streams
                        <EuiBadge color="hollow" style={{ fontSize: 9, padding: '0 4px' }}>
                          TECH PREVIEW
                        </EuiBadge>
                      </span>
                    ) as unknown as string,
                  },
                ]}
              />
              <EuiSpacer size="l" />
              {eaIngestionMode === 'ea-streams' && (
                <>
                  <EuiText size="s" color="subdued">
                    <p>
                      Streams provide our next-generation log ingestion model with a managed
                      hierarchy. Wired Streams is currently in tech preview, and some features may
                      not yet be fully supported. Logs will be routed to root streams (
                      <code>logs.ecs</code>) based on their format, while other signals continue
                      through standard data streams.
                    </p>
                    <p>
                      <EuiLink href="https://www.elastic.co/guide/en/observability/current/streams.html" target="_blank">
                        Read more about Streams
                      </EuiLink>
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                </>
              )}
              <EuiText size="s" color="subdued">
                <p>
                  Copy and run the install command. Note that the following manifest contains
                  resource limits that may not be appropriate for a production environment, review
                  our guide on{' '}
                  <EuiLink href="https://www.elastic.co/guide/en/fleet/current/scaling-on-kubernetes.html" target="_blank">
                    Scaling Elastic Agent on Kubernetes
                  </EuiLink>{' '}
                  before deploying this manifest. Refer to the{' '}
                  <EuiLink href="https://www.elastic.co/guide/en/fleet/current/elastic-agent-kubernetes-quickstart.html" target="_blank">
                    quickstart guide
                  </EuiLink>{' '}
                  for information on supported Helm versions.
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiCodeBlock language="bash" paddingSize="m" isCopyable overflowHeight={300}>
                {eaIngestionMode === 'ea-classic'
                  ? standaloneHelmCommand
                  : `${standaloneHelmCommand} \\
  --set 'outputs.default.streams_integration.enabled=true'`}
              </EuiCodeBlock>
            </>
          )}
        </>
      ),
    },
    ...[
          {
            title: 'Instrument your applications? (optional)',
            children: (
              <>
                <EuiFlexGroup gutterSize="m" responsive={false}>
                  <EuiFlexItem>
                    <ChoiceCard
                      id="ea-app-yes"
                      checked={eaHasAppInstr === 'yes'}
                      onChange={() => setEaHasAppInstr('yes')}
                      title="Yes"
                      description="Add APM agents or the OTel SDK to capture traces and application metrics."
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <ChoiceCard
                      id="ea-app-no"
                      checked={eaHasAppInstr === 'no'}
                      onChange={() => setEaHasAppInstr('no')}
                      title="No, infrastructure only"
                      description="Skip app instrumentation and collect only logs and infra metrics."
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                {eaHasAppInstr === 'yes' && (
                  <>
                    <EuiSpacer size="l" />
                    <EuiTitle size="xs">
                      <h3>APM endpoint</h3>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiFormRow label="APM Server URL" fullWidth>
                      <EuiFieldText
                        fullWidth
                        placeholder="https://my-deployment.apm.io:8200"
                      />
                    </EuiFormRow>
                    <EuiSpacer size="l" />
                    <EuiTitle size="xs">
                      <h3>Select language agent</h3>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiButtonGroup
                      legend="Programming language"
                      idSelected={eaLanguage}
                      onChange={(id) => setEaLanguage(id as Language)}
                      options={[
                        { id: 'nodejs', label: 'Node.js' },
                        { id: 'java', label: 'Java' },
                        { id: 'python', label: 'Python' },
                        { id: 'dotnet', label: '.NET' },
                        { id: 'go', label: 'Go' },
                      ]}
                    />
                    <EuiSpacer size="m" />
                    <EuiText size="s" color="subdued">
                      <p>
                        Follow the{' '}
                        <EuiLink href={`https://www.elastic.co/guide/en/apm/agent/${eaLanguage}/current/index.html`} target="_blank">
                          Elastic APM {eaLanguage} agent docs
                        </EuiLink>{' '}
                        to instrument your application.
                      </p>
                    </EuiText>
                  </>
                )}
              </>
            ),
          },
        ],
    ...(eaHasAppInstr !== null
      ? [
          {
            title: 'Visualize your data',
            children: <WaitingForData />,
          },
        ]
      : []),
  ];

  // ─── Unified steps array ─────────────────────────────────────────────────────

  const steps = [
    {
      title: 'Choose your data collection approach',
      children: (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="euiScreenReaderOnly">Choose your data collection approach</legend>
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <ChoiceCard
                id="method-otel"
                checked={method === 'otel'}
                onChange={() => setMethod('otel')}
                logoSrc="https://opentelemetry.io/img/logos/opentelemetry-logo-nav.png"
                logoAlt="OpenTelemetry"
                title="OpenTelemetry"
                badge="Recommended"
                description="Use the Elastic Distribution of OpenTelemetry (EDOT) Collector to send logs, metrics, and traces from your cluster."
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <ChoiceCard
                id="method-elastic-agent"
                checked={method === 'elastic-agent'}
                onChange={() => setMethod('elastic-agent')}
                logoSrc={`${ELASTIC_LOGOS}/elastic_agent/img/logo_elastic_agent.svg`}
                logoAlt="Elastic Agent"
                title="Elastic Agent"
                description="Deploy standalone or Fleet-managed Elastic Agent via Helm to collect logs and metrics from your Kubernetes nodes and workloads."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </fieldset>
      ),
    },
    ...(method === 'otel' ? otelSteps : eaSteps),
  ];

  return (
    <PageTemplate
      customHeader={
        <IntegrationHeader
          logoSrc={`${ELASTIC_LOGOS}/kubernetes/img/logo_kubernetes.svg`}
          logoAlt="Kubernetes"
          title="Monitor your Kubernetes cluster"
          subtitle="Collect logs, metrics, and traces from your Kubernetes infrastructure."
        />
      }
    >

      <EuiSteps
        css={css`
          margin-left: 16px;
          & .euiStep__titleWrapper {
            align-items: center;
          }
        `}
        steps={steps}
      />
    </PageTemplate>
  );
};
