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
  EuiBadge,
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldPassword,
  EuiFieldText,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { type IntegrationTile } from './ingest_hub_data';
import { AwsFlyout } from './aws_flyout';
import { KubernetesFlyout } from './kubernetes_flyout';
import {
  AWS_SERVICES,
  CATEGORY_COLORS,
  type AwsService,
  type ServiceCategory,
} from './aws_services_data';
import {
  K8S_COMPONENTS,
  K8S_CATEGORY_COLORS,
  type K8sComponent,
  type K8sCategory,
} from './kubernetes_services_data';

// ─── Logo icons ───────────────────────────────────────────────────────────────

const IconBox: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        borderRadius: 8,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
};

const CardLogoIcon: React.FC<{ src: string; alt: string; size?: number }> = ({
  src,
  alt,
  size = 20,
}) => {
  const { euiTheme } = useEuiTheme();
  const [errored, setErrored] = React.useState(false);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size + 8 * 2,
        height: size + 8 * 2,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        borderRadius: 8,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        flexShrink: 0,
      }}
    >
      {errored ? (
        <EuiIcon type="logoElastic" size="s" color="text" />
      ) : (
        <img
          src={src}
          alt={alt}
          style={{ width: size, height: size, objectFit: 'contain' }}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
};


// ─── Service data ─────────────────────────────────────────────────────────────
// AWS_SERVICES, AwsService, ServiceCategory, CATEGORY_COLORS imported from ./aws_services_data

// ─── Cloud Connector credentials guide ────────────────────────────────────────

const CloudConnectorGuide: React.FC<{ onSetup: () => void }> = ({ onSetup }) => (
  <EuiPanel color="subdued" paddingSize="s" hasBorder>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="lock" size="m" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong>AWS credentials via Cloud Connector</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          Link your AWS account securely — CloudFormation handles the IAM Role automatically.
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="warning">Required</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" onClick={onSetup} iconType="lock">
          Set up
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

// ─── Cloud Connector setup flyout ─────────────────────────────────────────────

const GENERATED_EXTERNAL_ID = 'ext-8f3a2c1d-4b5e-4f6a-9b0c';

const EXISTING_CONNECTORS: Array<{ name: string; arn: string }> = [
  { name: 'prod-aws-us-east-1', arn: 'arn:aws:iam::123456789012:role/ElasticRole' },
];

export const ingestHubHistoryKey = Symbol('ingest-hub');

const CloudConnectorSetupFlyout: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [connectorName, setConnectorName] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [verifyState, setVerifyState] = useState<'idle' | 'loading' | 'success'>('idle');

  const canVerify = !!connectorName && !!roleArn;

  const handleVerify = () => {
    setVerifyState('loading');
    setTimeout(() => setVerifyState('success'), 1800);
  };

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="cloudConnectorFlyoutTitle"
      ownFocus={false}
      session="start"
      historyKey={ingestHubHistoryKey}
      flyoutMenuProps={{ title: 'Cloud Connector' }}
      css={css`
        inline-size: 72vw !important;
        max-inline-size: 72vw !important;
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        ${flyoutPaddingCss}
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <IconBox><EuiIcon type="lock" size="l" color="primary" /></IconBox>
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiTitle size="s">
              <h2 id="cloudConnectorFlyoutTitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Connect your AWS account</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued" style={{ marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Using Cloud Connector via IAM Role
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTabs size="s" bottomBorder>
          <EuiTab isSelected={activeTab === 'new'} onClick={() => setActiveTab('new')}>
            New connection
          </EuiTab>
          <EuiTab isSelected={activeTab === 'existing'} onClick={() => setActiveTab('existing')}>
            Existing connections
          </EuiTab>
        </EuiTabs>

        <EuiSpacer size="l" />

        {activeTab === 'new' ? (
          <EuiSteps
            titleSize="xxs"
            css={css`
              .euiStep__content {
                padding-block-start: 4px !important;
              }
            `}
            steps={[
              {
                title: 'Name your connector',
                children: (
                  <>
                    <EuiText size="xs" color="subdued">
                      A unique name to identify this AWS connection in Elastic.
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiFormRow fullWidth>
                      <EuiFieldText
                        placeholder="e.g. prod-aws-us-east-1"
                        value={connectorName}
                        onChange={(e) => setConnectorName(e.target.value)}
                        fullWidth
                      />
                    </EuiFormRow>
                  </>
                ),
              },
              {
                title: 'Launch CloudFormation',
                children: (
                  <>
                    <EuiText size="xs" color="subdued">
                      Creates the IAM Role and trust policy in your AWS account automatically.
                      Once complete, copy the <strong>Role ARN</strong> from the Outputs tab.
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiButton iconType="launch" iconSide="left" size="s">
                      Launch CloudFormation
                    </EuiButton>
                  </>
                ),
              },
              {
                title: 'Copy credentials',
                children: (
                  <>
                    <EuiText size="xs" color="subdued">
                      Paste the Role ARN from the CloudFormation Outputs tab. The External ID is
                      pre-filled and used to secure the trust relationship.
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiFormRow label="Role ARN" fullWidth>
                      <EuiFieldText
                        placeholder="arn:aws:iam::123456789012:role/ElasticRole"
                        value={roleArn}
                        onChange={(e) => {
                          setRoleArn(e.target.value);
                          setVerifyState('idle');
                        }}
                        fullWidth
                      />
                    </EuiFormRow>
                    <EuiSpacer size="s" />
                    <EuiFormRow
                      label="External ID"
                      helpText={
                        <EuiLink
                          href="https://www.elastic.co/docs/current/integrations/aws"
                          target="_blank"
                          external
                        >
                          Learn more about policy secrets
                        </EuiLink>
                      }
                      fullWidth
                    >
                      <EuiFieldPassword
                        value={GENERATED_EXTERNAL_ID}
                        readOnly
                        fullWidth
                        prepend={<EuiIcon type="lock" />}
                      />
                    </EuiFormRow>
                    <EuiSpacer size="m" />
                    <EuiButton
                      size="s"
                      isDisabled={!canVerify || verifyState === 'success'}
                      isLoading={verifyState === 'loading'}
                      color={verifyState === 'success' ? 'success' : 'primary'}
                      iconType={verifyState === 'success' ? 'checkInCircleFilled' : undefined}
                      onClick={handleVerify}
                    >
                      {verifyState === 'success' ? 'Connection verified' : 'Verify connection'}
                    </EuiButton>
                  </>
                ),
              },
            ]}
          />
        ) : (
          <>
            {EXISTING_CONNECTORS.length === 0 ? (
              <EuiPanel color="subdued" paddingSize="m" hasBorder>
                <EuiText size="s" color="subdued" textAlign="center">
                  No existing connectors found.{' '}
                  <EuiButtonEmpty size="s" onClick={() => setActiveTab('new')}>
                    Create a new one
                  </EuiButtonEmpty>
                </EuiText>
              </EuiPanel>
            ) : (
              <>
                <EuiText size="s" color="subdued">
                  <p>Select a connector to reuse its credentials for this integration.</p>
                </EuiText>
                <EuiSpacer size="s" />
                {EXISTING_CONNECTORS.map((c) => (
                  <EuiPanel key={c.name} hasBorder paddingSize="s" style={{ marginBottom: 8 }}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="lock" color="primary" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s"><strong>{c.name}</strong></EuiText>
                        <EuiText size="xs" color="subdued">{c.arn}</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton size="s" fill>Select</EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                ))}
              </>
            )}
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={activeTab === 'new' && (!connectorName || !roleArn || verifyState !== 'success')}
            >
              Save connector
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

// ─── Elastic Agent setup flyout ───────────────────────────────────────────────

const AgentSetupFlyout: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <EuiFlyout
    onClose={onClose}
    aria-labelledby="agentSetupFlyoutTitle"
    ownFocus={false}
    session="start"
    historyKey={ingestHubHistoryKey}
    flyoutMenuProps={{ title: 'Elastic Agent' }}
    css={css`
      inline-size: 72vw !important;
      max-inline-size: 72vw !important;
      animation-duration: 0s !important;
      transition-duration: 0s !important;
      ${flyoutPaddingCss}
    `}
  >
    <EuiFlyoutHeader hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <IconBox><EuiIcon type="agentApp" size="l" color="primary" /></IconBox>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 0 }}>
          <EuiTitle size="s">
            <h2 id="agentSetupFlyoutTitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Install Elastic Agent</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued" style={{ marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Required for {agentCount} AWS sources
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutHeader>

    <EuiFlyoutBody>
      <EuiText size="s" color="subdued">
        <p>
          Install Elastic Agent on any host with outbound access to AWS API endpoints. It can run
          on-prem, on an EC2 instance, or even your local machine for testing.
        </p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiTitle size="xs"><h3>Quick install</h3></EuiTitle>
      <EuiSpacer size="s" />

      <EuiPanel color="subdued" paddingSize="s" hasBorder>
        <EuiAccordion
          id="agent-install-linux"
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiIcon type="logoLinux" size="m" />
              <EuiText size="s"><strong>Linux</strong></EuiText>
            </EuiFlexGroup>
          }
        >
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued"><p>Run as root on the host:</p></EuiText>
          <EuiSpacer size="xs" />
          <EuiPanel color="accent" paddingSize="s" css={css`font-family: monospace; font-size: 12px;`}>
            curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-latest-linux-x86_64.tar.gz<br />
            tar xzvf elastic-agent-latest-linux-x86_64.tar.gz<br />
            cd elastic-agent-latest-linux-x86_64<br />
            sudo ./elastic-agent install
          </EuiPanel>
        </EuiAccordion>
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel color="subdued" paddingSize="s" hasBorder>
        <EuiAccordion
          id="agent-install-mac"
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiIcon type="logoApple" size="m" />
              <EuiText size="s"><strong>macOS</strong></EuiText>
            </EuiFlexGroup>
          }
        >
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued"><p>Run in Terminal:</p></EuiText>
          <EuiSpacer size="xs" />
          <EuiPanel color="accent" paddingSize="s" css={css`font-family: monospace; font-size: 12px;`}>
            curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-latest-darwin-x86_64.tar.gz<br />
            tar xzvf elastic-agent-latest-darwin-x86_64.tar.gz<br />
            cd elastic-agent-latest-darwin-x86_64<br />
            sudo ./elastic-agent install
          </EuiPanel>
        </EuiAccordion>
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel color="subdued" paddingSize="s" hasBorder>
        <EuiAccordion
          id="agent-install-windows"
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiIcon type="logoWindows" size="m" />
              <EuiText size="s"><strong>Windows</strong></EuiText>
            </EuiFlexGroup>
          }
        >
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued"><p>Run in PowerShell as Administrator:</p></EuiText>
          <EuiSpacer size="xs" />
          <EuiPanel color="accent" paddingSize="s" css={css`font-family: monospace; font-size: 12px;`}>
            Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-latest-windows-x86_64.zip -OutFile elastic-agent.zip<br />
            Expand-Archive elastic-agent.zip<br />
            cd elastic-agent<br />
            .\elastic-agent.exe install
          </EuiPanel>
        </EuiAccordion>
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiText size="s" color="subdued">
        Or manage agents at scale via{' '}
        <EuiLink href="/app/fleet" target="_blank" external>Fleet</EuiLink>.
      </EuiText>
    </EuiFlyoutBody>

    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill href="/app/fleet/agents" target="_blank" iconType="popout" iconSide="right">
            Open Fleet
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  </EuiFlyout>
);

// ─── Flyout padding CSS (shared) ──────────────────────────────────────────────

const flyoutPaddingCss = css`
  & .euiFlyoutHeader {
    padding: 40px !important;
  }
  & .euiFlyoutBody__overflowContent {
    padding: 40px !important;
  }
  & .euiFlyoutFooter {
    padding: 40px !important;
  }
`;

// ─── Services grid ────────────────────────────────────────────────────────────

type FilterType = 'all' | ServiceCategory;

const FILTER_OPTIONS: Array<{ id: FilterType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'Infrastructure', label: 'Infrastructure' },
  { id: 'Security', label: 'Security' },
  { id: 'Performance', label: 'Performance' },
  { id: 'Reliability', label: 'Reliability' },
];

type K8sFilterType = 'all' | K8sCategory;

const K8S_FILTER_OPTIONS: Array<{ id: K8sFilterType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'Workloads', label: 'Workloads' },
  { id: 'Infrastructure', label: 'Infrastructure' },
  { id: 'Networking', label: 'Networking' },
  { id: 'Security', label: 'Security' },
  { id: 'Performance', label: 'Performance' },
];

const AWS_GRID_MAX = 15;

const AwsServicesGrid: React.FC<{ expanded: boolean }> = ({ expanded }) => {
  const { euiTheme } = useEuiTheme();
  const visible = expanded ? AWS_SERVICES : AWS_SERVICES.slice(0, AWS_GRID_MAX);

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: ${euiTheme.size.s};
      `}
    >
      {visible.map((service) => (
        <EuiPanel key={service.id} hasBorder paddingSize="s">
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <img
                src={service.logoUrl}
                alt={service.name}
                style={{ width: 24, height: 24, objectFit: 'contain' }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs">{service.name}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      ))}
    </div>
  );
};

// ─── AWS details body ──────────────────────────────────────────────────────────

interface AwsDetailsBodyProps {
  selectedService: AwsService | null;
  onServiceSelect: (service: AwsService) => void;
  onSetupAll: () => void;
  onSetupCredentials: () => void;
  onSetupAgent: () => void;
}

const AWS_DASHBOARDS = [
  { icon: 'dashboardApp', label: 'AWS EC2 Overview' },
  { icon: 'dashboardApp', label: 'AWS S3 Access Logs' },
  { icon: 'dashboardApp', label: 'AWS CloudTrail Overview' },
  { icon: 'dashboardApp', label: 'AWS ELB Overview' },
  { icon: 'dashboardApp', label: 'AWS RDS Overview' },
  { icon: 'dashboardApp', label: 'AWS Lambda Overview' },
  { icon: 'dashboardApp', label: 'AWS VPC Flow Logs' },
  { icon: 'dashboardApp', label: 'AWS GuardDuty Findings' },
  { icon: 'dashboardApp', label: 'AWS CloudWatch Metrics' },
  { icon: 'dashboardApp', label: 'AWS Billing & Cost' },
  { icon: 'dashboardApp', label: 'AWS Security Hub Findings' },
  { icon: 'dashboardApp', label: 'AWS Network Firewall' },
];

const AWS_ALERTS = [
  { icon: 'bell', label: 'EC2 CPU utilization above 90%' },
  { icon: 'bell', label: 'RDS free storage below 10%' },
  { icon: 'bell', label: 'Lambda error rate spike' },
  { icon: 'bell', label: 'GuardDuty high-severity finding' },
  { icon: 'bell', label: 'S3 bucket public access enabled' },
  { icon: 'bell', label: 'CloudTrail: root account login' },
  { icon: 'bell', label: 'ELB 5xx error rate above 5%' },
  { icon: 'bell', label: 'DynamoDB throttle events detected' },
];

const K8S_DASHBOARDS = [
  { label: '[Kubernetes] Cluster Overview' },
  { label: '[Kubernetes] Node Metrics' },
  { label: '[Kubernetes] Pod Metrics' },
  { label: '[Kubernetes] Deployments' },
  { label: '[Kubernetes] DaemonSets' },
  { label: '[Kubernetes] StatefulSets' },
  { label: '[Kubernetes] Container Logs' },
  { label: '[Kubernetes] API Server' },
  { label: '[Kubernetes] Controller Manager' },
  { label: '[Kubernetes] Scheduler' },
  { label: '[Kubernetes] Persistent Volumes' },
  { label: '[Kubernetes] Network Traffic' },
];

const K8S_ALERTS = [
  { label: 'Node CPU usage above 90%' },
  { label: 'Pod OOM killed' },
  { label: 'Deployment replica mismatch' },
  { label: 'Node not ready' },
  { label: 'Pod crash loop detected' },
  { label: 'PersistentVolume capacity above 85%' },
  { label: 'High pod pending count' },
  { label: 'API server latency above 1s' },
];

const agentCount = AWS_SERVICES.length - AWS_SERVICES.filter((s) => s.agentless).length;

const AwsDetailsBody: React.FC<AwsDetailsBodyProps> = ({ selectedService, onServiceSelect, onSetupAll, onSetupCredentials, onSetupAgent }) => {
  const [gridExpanded, setGridExpanded] = useState(false);

  return (
  <>
    <EuiText size="s">
      <p>
        Use the AWS integration to collect <strong>metrics and logs</strong> across many AWS
        services managed by your AWS account. Visualize that data in Kibana, create alerts to
        notify you if something goes wrong, and reference data when troubleshooting an issue.
      </p>
      <p>
        The AWS integration collects two types of data across many AWS services:
      </p>
      <ul>
        <li>
          <strong>Logs</strong> — keep a record of events in your AWS account, such as every user
          request CloudFront receives or every action taken by an AWS user or role.
        </li>
        <li>
          <strong>Metrics</strong> — gain insight into the state of your services, including spend
          analysis, storage volume, CPU utilization, and more.
        </li>
      </ul>
      <p>
        Note: extra AWS charges on CloudWatch API requests will be generated by this integration.
      </p>
    </EuiText>

    <EuiSpacer size="xl" />
    <EuiHorizontalRule margin="none" />
    <EuiSpacer size="xl" />

    <EuiTitle size="xs">
      <h3>What's included</h3>
    </EuiTitle>
    <EuiText size="s" color="subdued">
      <p>Services monitored by this integration out of the box.</p>
    </EuiText>
    <EuiSpacer size="m" />

    <AwsServicesGrid expanded={gridExpanded} />

    <EuiSpacer size="xl" />
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType={gridExpanded ? 'arrowUp' : 'arrowDown'}
          iconSide="right"
          onClick={() => setGridExpanded((v) => !v)}
        >
          {gridExpanded ? 'Show less' : 'Show more'}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="xl" />

    <EuiTitle size="xs">
      <h3>Requirements</h3>
    </EuiTitle>
    <EuiText size="s" color="subdued">
      <p>Make sure these are in place before you get started.</p>
    </EuiText>
    <EuiSpacer size="m" />

    <EuiPanel paddingSize="none" hasBorder css={css`max-inline-size: 50%;`}>
      {/* Row 1 — AWS account */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
        css={css`padding: 10px 12px;`}>
        <EuiFlexItem grow={false}>
          <img
            src="https://raw.githubusercontent.com/elastic/integrations/main/packages/aws/img/logo_aws.svg"
            alt="AWS"
            style={{ width: 16, height: 16, objectFit: 'contain', display: 'block' }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s"><strong>An AWS account</strong></EuiText>
          <EuiText size="xs" color="subdued">Free tier works for most services.</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href="https://aws.amazon.com/free/" target="_blank" external>
            Learn more
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />

      {/* Row 2 — Cloud Connector */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
        css={css`padding: 10px 12px;`}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="lock" size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s"><strong>AWS credentials via Cloud Connector</strong></EuiText>
          <EuiText size="xs" color="subdued">
            Link your AWS account securely — CloudFormation handles the IAM Role automatically.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={onSetupCredentials}>Set up</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />

      {/* Row 3 — Elastic Agent */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
        css={css`padding: 10px 12px;`}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="agentApp" size="m" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s"><strong>Elastic Agent</strong></EuiText>
          <EuiText size="xs" color="subdued">
            Required for {agentCount} sources. Not needed for agentless sources.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={onSetupAgent}>Set up</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  </>
  );
};

// ─── Kubernetes services grid ──────────────────────────────────────────────────

interface KubernetesServicesGridProps {
  selectedComponent: K8sComponent | null;
  onComponentSelect: (component: K8sComponent) => void;
  onSetupAll: () => void;
}

const KubernetesServicesGrid: React.FC<KubernetesServicesGridProps> = ({
  selectedComponent,
  onComponentSelect,
  onSetupAll,
}) => {
  const [filter, setFilter] = useState<K8sFilterType>('all');
  const filtered = K8S_COMPONENTS.filter((c) => filter === 'all' || c.category === filter);

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Filter Kubernetes components by category"
            options={K8S_FILTER_OPTIONS}
            idSelected={filter}
            onChange={(id) => setFilter(id as K8sFilterType)}
            buttonSize="compressed"
            color="primary"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">{filtered.length} sources</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {filter === 'all' && (
        <>
          <EuiCard
            layout="horizontal"
            hasBorder
            paddingSize="s"
            title="Kubernetes Cluster"
            description="Full cluster visibility — metrics, logs, events & control plane health."
            icon={
              <img
                src="https://raw.githubusercontent.com/elastic/integrations/main/packages/kubernetes/img/logo_kubernetes.svg"
                alt="Kubernetes"
                style={{ width: 32, height: 32, objectFit: 'contain' }}
              />
            }
            onClick={onSetupAll}
            betaBadgeProps={{ label: 'Recommended', color: 'accent' }}
          />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiKeyPadMenu>
        {filtered.map((component) => (
          <EuiKeyPadMenuItem
            key={component.id}
            label={component.name}
            isSelected={selectedComponent?.id === component.id}
            onClick={() => onComponentSelect(component)}
          >
            <img
              src={component.logoUrl}
              alt={component.name}
              style={{ width: 40, height: 40, objectFit: 'contain' }}
            />
          </EuiKeyPadMenuItem>
        ))}
      </EuiKeyPadMenu>
    </>
  );
};

// ─── Kubernetes details body ───────────────────────────────────────────────────

interface KubernetesDetailsBodyProps {
  selectedComponent: K8sComponent | null;
  onComponentSelect: (component: K8sComponent) => void;
  onSetupAll: () => void;
}

const KubernetesDetailsBody: React.FC<KubernetesDetailsBodyProps> = ({
  selectedComponent,
  onComponentSelect,
  onSetupAll,
}) => (
  <>
    <EuiText size="s">
      <p>
        Collect metrics and logs from your <strong>Kubernetes cluster</strong> to visualize
        workload health, spot failing pods, and detect resource issues fast. Works with
        OpenTelemetry Operator or Elastic Agent — no custom instrumentation required.
      </p>
    </EuiText>

    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>Available sources</h3>
        </EuiTitle>
        <EuiText size="s" color="subdued" css={css`margin-top: 2px;`}>
          <p>Select all sources or monitor a specific component.</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />

    <KubernetesServicesGrid
      selectedComponent={selectedComponent}
      onComponentSelect={onComponentSelect}
      onSetupAll={onSetupAll}
    />

    <EuiHorizontalRule margin="l" />

    <EuiTitle size="xs">
      <h3>Requirements</h3>
    </EuiTitle>
    <EuiSpacer size="m" />

    <EuiPanel paddingSize="none" hasBorder>
      {/* Row 1 — Kubernetes cluster */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
        css={css`padding: 10px 12px;`}>
        <EuiFlexItem grow={false}>
          <img
            src="https://raw.githubusercontent.com/elastic/integrations/main/packages/kubernetes/img/logo_kubernetes.svg"
            alt="Kubernetes"
            style={{ width: 16, height: 16, objectFit: 'contain', display: 'block' }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s"><strong>A Kubernetes cluster (v1.20+)</strong></EuiText>
          <EuiText size="xs" color="subdued">Compatible with EKS, GKE, AKS, and self-managed clusters.</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />

      {/* Row 2 — OpenTelemetry Operator */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
        css={css`padding: 10px 12px;`}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="logoObservability" size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s"><strong>OpenTelemetry Operator via Helm</strong></EuiText>
          <EuiText size="xs" color="subdued">
            Automatically collects cluster metrics and traces — deployed in minutes.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={onSetupAll}>Set up</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />

      {/* Row 3 — Elastic Agent */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
        css={css`padding: 10px 12px;`}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="agentApp" size="m" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s"><strong>Elastic Agent</strong></EuiText>
          <EuiText size="xs" color="subdued">
            Optional. Required for container log collection and host-level metrics.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={onSetupAll}>Set up</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  </>
);

// ─── Main component ────────────────────────────────────────────────────────────

interface IntegrationDetailsFlyoutProps {
  tile: IntegrationTile;
  onClose: () => void;
  onDataConnected: () => void;
  onCloseAll: () => void;
}

export const IntegrationDetailsFlyout: React.FC<IntegrationDetailsFlyoutProps> = ({
  tile,
  onClose,
  onDataConnected,
  onCloseAll,
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'assets' | 'settings' | 'configs' | 'apiReference'>('overview');
  const [selectedService, setSelectedService] = useState<AwsService | null>(null);
  const [selectedK8sComponent, setSelectedK8sComponent] = useState<K8sComponent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showCloudConnector, setShowCloudConnector] = useState(false);
  const [showAgentSetup, setShowAgentSetup] = useState(false);

  const isAws = tile.id === 'aws' || tile.id.startsWith('amazon_');
  const isKubernetes = tile.id === 'kubernetes';

  const hasChild =
    selectedService !== null ||
    selectedK8sComponent !== null;

  const closeAllChildren = () => {
    setSelectedService(null);
    setSelectedK8sComponent(null);
    setShowInstall(false);
    setShowCloudConnector(false);
    setShowAgentSetup(false);
  };

  const handleSetup = () => {
    closeAllChildren();
    setShowInstall(true);
  };

  const handleSetupCredentials = () => {
    closeAllChildren();
    setShowCloudConnector(true);
  };

  const handleSetupAgent = () => {
    closeAllChildren();
    setShowAgentSetup(true);
  };

  return (
    <>
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="integrationDetailsFlyoutTitle"
      session="start"
      historyKey={ingestHubHistoryKey}
      ownFocus={false}
      flyoutMenuProps={{ title: tile.name }}
      css={css`
        inline-size: 72vw !important;
        max-inline-size: 72vw !important;
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        ${flyoutPaddingCss}
      `}
    >
      <EuiFlyoutHeader>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <CardLogoIcon src={tile.logoUrl ?? ''} alt={`${tile.name} logo`} size={24} />
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} style={{ flexWrap: 'nowrap' }}>
              <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
                <EuiTitle size="s">
                  <h2 id="integrationDetailsFlyoutTitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tile.name}</h2>
                </EuiTitle>
              </EuiFlexItem>
              {(isAws || isKubernetes) && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{isAws ? 'v6.4.1' : 'v2.10.0'}</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div
          css={css`
            margin-inline: -40px;
            padding-inline: 40px;
            margin-block-start: 20px;
            margin-block-end: -40px;
          `}
        >
          <EuiTabs size="m">
            <EuiTab
              isSelected={selectedTab === 'overview'}
              onClick={() => setSelectedTab('overview')}
            >
              Overview
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === 'assets'}
              onClick={() => setSelectedTab('assets')}
            >
              Assets
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === 'settings'}
              onClick={() => setSelectedTab('settings')}
            >
              Settings
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === 'configs'}
              onClick={() => setSelectedTab('configs')}
            >
              Configs
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === 'apiReference'}
              onClick={() => setSelectedTab('apiReference')}
            >
              API reference
            </EuiTab>
          </EuiTabs>
        </div>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* ── Tab content ── */}
        {selectedTab === 'overview' && (
          isAws ? (
            <AwsDetailsBody
              selectedService={selectedService}
              onServiceSelect={(service) => {
                closeAllChildren();
                setSelectedService(service);
              }}
              onSetupAll={handleSetup}
              onSetupCredentials={handleSetupCredentials}
              onSetupAgent={handleSetupAgent}
            />
          ) : isKubernetes ? (
            <KubernetesDetailsBody
              selectedComponent={selectedK8sComponent}
              onComponentSelect={(component) => {
                closeAllChildren();
                setSelectedK8sComponent(component);
              }}
              onSetupAll={handleSetup}
            />
          ) : (
            <>
              <EuiText>
                <p>{tile.description}</p>
              </EuiText>
              <EuiHorizontalRule margin="l" />
              <EuiText color="subdued">
                <p>
                  Full installation steps and dashboards for <strong>{tile.name}</strong> are
                  available in the Kibana Integrations app.
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton fill onClick={handleSetup}>
                    Add {tile.name}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    iconType="popout"
                    iconSide="right"
                    href={`/app/integrations/detail/${tile.logoDomain}/overview`}
                    target="_blank"
                  >
                    View in Integrations
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )
        )}

        {selectedTab === 'assets' && (() => {
          const dashboards = isAws ? AWS_DASHBOARDS : isKubernetes ? K8S_DASHBOARDS : [];
          const alerts = isAws ? AWS_ALERTS : isKubernetes ? K8S_ALERTS : [];
          const totalDashboards = isAws ? 53 : isKubernetes ? 32 : dashboards.length;
          const totalAlerts = alerts.length;

          return (
            <>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs"><h3>Dashboards</h3></EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{totalDashboards}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiPanel paddingSize="none" hasBorder>
                {dashboards.map((d, i) => (
                  <React.Fragment key={d.label}>
                    {i > 0 && <EuiHorizontalRule margin="none" />}
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
                      css={css`padding: 8px 12px;`}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="dashboardApp" size="s" color="subdued" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">{d.label}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </React.Fragment>
                ))}
                {totalDashboards > dashboards.length && (
                  <>
                    <EuiHorizontalRule margin="none" />
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
                      css={css`padding: 8px 12px;`}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="empty" size="s" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s" color="subdued">
                          + {totalDashboards - dashboards.length} more dashboards
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                )}
              </EuiPanel>

              <EuiSpacer size="l" />

              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs"><h3>Alerting rules</h3></EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{totalAlerts}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiPanel paddingSize="none" hasBorder>
                {alerts.map((a, i) => (
                  <React.Fragment key={a.label}>
                    {i > 0 && <EuiHorizontalRule margin="none" />}
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
                      css={css`padding: 8px 12px;`}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="bell" size="s" color="subdued" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">{a.label}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </React.Fragment>
                ))}
              </EuiPanel>
            </>
          );
        })()}

        {selectedTab === 'settings' && (
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            justifyContent="center"
            css={css`min-height: 320px;`}
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="gear" size="xl" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>Settings</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" textAlign="center">
                <p>Integration settings will appear here.</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {selectedTab === 'configs' && (
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            justifyContent="center"
            css={css`min-height: 320px;`}
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="document" size="xl" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>Configs</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" textAlign="center">
                <p>Configuration files and templates will appear here.</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {selectedTab === 'apiReference' && (
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            justifyContent="center"
            css={css`min-height: 320px;`}
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="editorCodeBlock" size="xl" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>API reference</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" textAlign="center">
                <p>API endpoints and schema documentation will appear here.</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
          </EuiFlexItem>
          {isAws && (
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={() => setShowInstall(true)}>
                Add Amazon Web Services
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>

      {/* ── Service detail child flyout — expands to the left natively ── */}
      {selectedService && !showInstall && (
        <EuiFlyout
          onClose={() => setSelectedService(null)}
          aria-labelledby="serviceDetailFlyoutTitle"
          ownFocus={false}
          flyoutMenuProps={{ title: selectedService.name }}
          css={css`
            inline-size: 36vw !important;
            animation-duration: 0s !important;
            transition-duration: 0s !important;
            ${flyoutPaddingCss}
          `}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <CardLogoIcon src={selectedService.logoUrl} alt={selectedService.name} size={28} />
              </EuiFlexItem>
              <EuiFlexItem style={{ minWidth: 0 }}>
                <EuiTitle size="s">
                  <h2 id="serviceDetailFlyoutTitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedService.name}</h2>
                </EuiTitle>
                <div style={{ height: 22, marginTop: 4, overflow: 'hidden' }}>
                <EuiFlexGroup gutterSize="xs" responsive={false} style={{ flexWrap: 'nowrap' }}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={CATEGORY_COLORS[selectedService.category]}>
                      {selectedService.category}
                    </EuiBadge>
                  </EuiFlexItem>
                  {selectedService.agentless && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="success">Agentless</EuiBadge>
                    </EuiFlexItem>
                  )}
                  {selectedService.badge && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{selectedService.badge}</EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <EuiText size="s" color="subdued">
              <p>{selectedService.useCase}</p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>{selectedService.description}</p>
            </EuiText>

            <EuiHorizontalRule margin="l" />

            <EuiTitle size="xs">
              <h3>Requirements</h3>
            </EuiTitle>
            <EuiSpacer size="s" />

            {selectedService.agentless && (
              <>
                <EuiPanel color="success" paddingSize="s" hasBorder>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="checkInCircleFilled" color="success" size="m" />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>No Elastic Agent needed</strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        This source connects directly to AWS via API — nothing to install.
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
                <EuiSpacer size="s" />
              </>
            )}

            <CloudConnectorGuide onSetup={handleSetupCredentials} />
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => setSelectedService(null)}>Back</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={handleSetup}>
                  Add {selectedService.name}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}

      {/* ── Kubernetes component detail child flyout ── */}
      {selectedK8sComponent && !showInstall && (
        <EuiFlyout
          onClose={() => setSelectedK8sComponent(null)}
          aria-labelledby="k8sComponentDetailFlyoutTitle"
          ownFocus={false}
          flyoutMenuProps={{ title: selectedK8sComponent.name }}
          css={css`
            inline-size: 36vw !important;
            animation-duration: 0s !important;
            transition-duration: 0s !important;
            ${flyoutPaddingCss}
          `}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <CardLogoIcon src={selectedK8sComponent.logoUrl} alt={selectedK8sComponent.name} size={28} />
              </EuiFlexItem>
              <EuiFlexItem style={{ minWidth: 0 }}>
                <EuiTitle size="s">
                  <h2
                    id="k8sComponentDetailFlyoutTitle"
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {selectedK8sComponent.name}
                  </h2>
                </EuiTitle>
                <div style={{ height: 22, marginTop: 4, overflow: 'hidden' }}>
                  <EuiFlexGroup gutterSize="xs" responsive={false} style={{ flexWrap: 'nowrap' }}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={K8S_CATEGORY_COLORS[selectedK8sComponent.category]}>
                        {selectedK8sComponent.category}
                      </EuiBadge>
                    </EuiFlexItem>
                    {selectedK8sComponent.badge && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{selectedK8sComponent.badge}</EuiBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <EuiText size="s" color="subdued">
              <p>{selectedK8sComponent.useCase}</p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>{selectedK8sComponent.description}</p>
            </EuiText>

            <EuiHorizontalRule margin="l" />

            <EuiTitle size="xs">
              <h3>Requirements</h3>
            </EuiTitle>
            <EuiSpacer size="s" />

            <EuiPanel paddingSize="none" hasBorder>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
                css={css`padding: 10px 12px;`}>
                <EuiFlexItem grow={false}>
                  <img
                    src="https://raw.githubusercontent.com/elastic/integrations/main/packages/kubernetes/img/logo_kubernetes.svg"
                    alt="Kubernetes"
                    style={{ width: 16, height: 16, objectFit: 'contain', display: 'block' }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s"><strong>A Kubernetes cluster (v1.20+)</strong></EuiText>
                  <EuiText size="xs" color="subdued">Compatible with EKS, GKE, AKS, and self-managed clusters.</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiHorizontalRule margin="none" />

              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
                css={css`padding: 10px 12px;`}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="logoObservability" size="m" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s"><strong>OpenTelemetry Operator via Helm</strong></EuiText>
                  <EuiText size="xs" color="subdued">
                    Automatically collects cluster metrics and traces — deployed in minutes.
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => setSelectedK8sComponent(null)}>Back</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={handleSetup}>
                  Add {selectedK8sComponent.name}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}

    </EuiFlyout>

    {/* ── Cloud Connector setup — new session flyout ── */}
    {showCloudConnector && (
      <CloudConnectorSetupFlyout onClose={() => setShowCloudConnector(false)} />
    )}

    {/* ── Elastic Agent setup — new session flyout ── */}
    {showAgentSetup && (
      <AgentSetupFlyout onClose={() => setShowAgentSetup(false)} />
    )}

    {/* ── Full installation — new session flyouts ── */}
    {showInstall && isAws && (
      <AwsFlyout
        logoUrl={tile.logoUrl ?? ''}
        historyKey={ingestHubHistoryKey}
        ownFocus={false}
        onClose={() => setShowInstall(false)}
        onSeeMyData={() => {
          onDataConnected();
          setShowInstall(false);
          onCloseAll();
        }}
      />
    )}

    {showInstall && isKubernetes && (
      <KubernetesFlyout
        logoUrl={tile.logoUrl ?? ''}
        historyKey={ingestHubHistoryKey}
        ownFocus={false}
        onClose={() => setShowInstall(false)}
      />
    )}

    {showInstall && !isAws && !isKubernetes && (
      <EuiFlyout
        onClose={() => setShowInstall(false)}
        aria-labelledby="genericInstallFlyoutTitle"
        ownFocus={false}
        session="start"
        historyKey={ingestHubHistoryKey}
        flyoutMenuProps={{ title: `Set up ${tile.name}` }}
        css={css`
          inline-size: 36vw !important;
          animation-duration: 0s !important;
          transition-duration: 0s !important;
          ${flyoutPaddingCss}
        `}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <CardLogoIcon src={tile.logoUrl ?? ''} alt={`${tile.name} logo`} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="m">
                <h2 id="genericInstallFlyoutTitle">Set up {tile.name}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText color="subdued">
            <p>
              Complete installation steps for <strong>{tile.name}</strong> are available in the
              Kibana Integrations app.
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            fill
            iconType="popout"
            iconSide="right"
            href={`/app/integrations/detail/${tile.logoDomain}/overview`}
            target="_blank"
          >
            Open in Integrations
          </EuiButton>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => setShowInstall(false)}>Close</EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    )}
    </>
  );
};
