/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { css, keyframes } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckableCard,
  EuiCodeBlock,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSuperSelect,
  EuiSteps,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { CardLogoIcon } from './ingest_hub_components';

interface AwsFlyoutProps {
  logoUrl: string;
  onClose: () => void;
  onSeeMyData?: () => void;
  isChild?: boolean;
  hideCloseButton?: boolean;
  ownFocus?: boolean;
}

const ELASTIC_LOGOS =
  'https://raw.githubusercontent.com/elastic/integrations/main/packages';

const AWS_METRIC_SOURCES = [
  { name: 'CloudWatch', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudwatch.svg` },
  { name: 'DynamoDB', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_dynamodb.svg` },
  { name: 'RDS', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_rds.svg` },
  { name: 'Kinesis', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_kinesis.svg` },
];

const AWS_ALL_METRIC_SOURCES = [
  'CloudWatch', 'DynamoDB', 'RDS', 'Kinesis', 'EC2', 'S3', 'Lambda', 'EBS',
  'ECS', 'EMR', 'MSK', 'MQ', 'NAT Gateway', 'Redshift', 'Route 53', 'SNS',
  'SQS', 'ELB', 'ALB', 'NLB', 'API Gateway', 'Billing', 'VPN',
];

const AWS_LOG_SOURCES = [
  { name: 'CloudTrail', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudtrail.svg` },
  { name: 'VPC Flow Logs', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_vpcflow.svg` },
  { name: 'GuardDuty', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_guardduty.svg` },
  { name: 'S3', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_s3.svg` },
];

const AWS_ALL_LOG_SOURCES = [
  'CloudTrail', 'VPC Flow Logs', 'GuardDuty', 'S3', 'Inspector', 'CloudFront',
  'WAF', 'ELB', 'ALB', 'API Gateway', 'Lambda', 'EMR', 'Config',
  'Security Hub', 'Firewall',
];

const PREFERRED_METHOD_OPTIONS = [
  { value: 'cloud-connector', inputDisplay: 'Cloud Connector (recommended)' },
  { value: 'access-keys', inputDisplay: 'AWS Access Keys' },
  { value: 'assume-role', inputDisplay: 'Assume Role (manual)' },
];

const EXISTING_CONNECTOR_OPTIONS = [
  { name: 'aws-connector-1', arn: 'arn:aws:iam::123456789012:role/ExampleRole' },
  { name: 'aws-connector-2', arn: 'arn:aws:iam::123456789012:role/ExampleRole2' },
  { name: 'aws-connector-org-1', arn: 'arn:aws:iam::154869826589487:role/ExampleRole3' },
  { name: 'aws-connector-org-2', arn: 'arn:aws:iam::154869826589487:role/ExampleRole4' },
  { name: 'aws-connector-org-3', arn: 'arn:aws:iam::848769826515489:role/ExampleRole' },
];

const AWS_METRICS_DASHBOARDS = [
  '[Metrics AWS] Kinesis Overview',
  '[Metrics AWS] TransitGateway Overview',
  '[Metrics AWS] SQS Overview',
  '[Metrics AWS] ALB Overview',
  '[Metrics AWS] RDS Overview',
  '[Metrics AWS] NLB Overview',
  '[Metrics AWS] Firewall Overview',
  '[Metrics AWS] EBS Overview',
  '[Metrics AWS] AWS Load Balancer Overview',
  '[Metrics AWS] MSK Overview',
  '[Metrics AWS] VPN Overview',
  '[Metrics AWS] DynamoDB Overview',
  '[Metrics AWS] Lambda Overview',
  '[Metrics AWS] S3 Storage Lens Overview',
  '[Metrics AWS] Redshift metrics overview',
  '[Metrics AWS] Usage Overview',
  '[Metrics AWS] AWS Health Overview',
  '[Metrics AWS] SNS Overview',
  '[Metrics AWS] API Gateway HTTP Overview',
  '[Metrics AWS] Billing Overview',
  '[Metrics AWS] ELB Overview',
  '[Metrics AWS] S3 Overview',
  '[Metrics AWS] API Gateway WebSocket Overview',
  '[Metrics AWS] API Gateway REST Overview',
  '[Metrics AWS] NATGateway Overview',
  '[Metrics AWS] EC2 Overview',
  '[Metrics AWS] EMR Overview',
  '[Metrics AWS] Overview',
];

const LOGS_SETUP_OPTIONS = [
  {
    id: 'discovery-script',
    label: 'Discovery script (Recommended)',
    description:
      "Run our discovery script in CloudShell. We'll automatically detect and configure your AWS services.",
  },
  {
    id: 'manually-configure',
    label: 'Manually configure sources',
    description:
      'Select which AWS services to monitor and configure your buckets.',
  },
];

const CLOUDSHELL_COMMAND =
  "export API_KEY=asdfasdfasdfasdf OTLP_ENDPOINT=asdfasdfasdfasdf | curl -fsSL http://ela.st/onboard-ecf-aws | bash";

const AWS_SELECTABLE_SOURCES = [
  { id: 'bedrock', name: 'Amazon Bedrock', logoUrl: `${ELASTIC_LOGOS}/aws_bedrock/img/icon.svg` },
  { id: 'bedrock-agentcore', name: 'Amazon Bedrock AgentCore', logoUrl: `${ELASTIC_LOGOS}/aws_bedrock/img/icon.svg` },
  { id: 'cloudfront', name: 'Amazon CloudFront', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudfront.svg` },
  { id: 'firehose', name: 'Amazon Data Firehose', logoUrl: `${ELASTIC_LOGOS}/awsfirehose/img/logo_firehose.svg` },
  { id: 'ec2', name: 'Amazon EC2', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_ec2.svg` },
  { id: 'emr', name: 'Amazon EMR', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_emr.svg` },
  { id: 'guardduty', name: 'Amazon GuardDuty', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_guardduty.svg` },
  { id: 'inspector', name: 'Amazon Inspector', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_inspector.svg` },
  { id: 'mq', name: 'Amazon MQ', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_msk.svg` },
  { id: 's3', name: 'Amazon S3', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_s3.svg` },
  { id: 'vpc', name: 'Amazon VPC', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_vpcflow.svg` },
  { id: 'api-gateway', name: 'AWS API Gateway', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_apigateway.svg` },
  { id: 'cloudtrail', name: 'AWS CloudTrail', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudtrail.svg` },
  { id: 'cloudwatch', name: 'AWS CloudWatch', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_cloudwatch.svg` },
  { id: 'config', name: 'AWS Config', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo-aws-config.svg` },
  { id: 'ecs', name: 'Amazon ECS', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_ecs.svg` },
  { id: 'elb', name: 'AWS ELB', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_elb.svg` },
  { id: 'lambda', name: 'AWS Lambda', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_lambda.svg` },
  { id: 'network-firewall', name: 'AWS Network Firewall', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_firewall.svg` },
  { id: 'route53', name: 'AWS Route 53', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_route53.svg` },
  { id: 'security-hub', name: 'AWS Security Hub', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_securityhub.svg` },
  { id: 'security-hub-cspm', name: 'AWS Security Hub CSPM', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_securityhub.svg` },
  { id: 'serverless-app-repo', name: 'AWS Serverless Application Repository', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_lambda.svg` },
  { id: 'waf', name: 'AWS WAF', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_waf.svg` },
  { id: 'custom-aws-logs', name: 'Custom AWS Logs', logoUrl: `${ELASTIC_LOGOS}/aws/img/logo_aws.svg` },
];

const CLOUDSHELL_TERMINAL_LINES: Array<{ text: string; delay: number; color?: string }> = [
  { text: '$ export API_KEY=asdf... OTLP_ENDPOINT=asdf... | curl -fsSL http://ela.st/onboard-ecf-aws | bash', delay: 0, color: '#98c379' },
  { text: '', delay: 300 },
  { text: '  ✓ Authenticating with Elastic Cloud...', delay: 600, color: '#98c379' },
  { text: '  ✓ Verifying API key permissions...', delay: 400, color: '#98c379' },
  { text: '', delay: 200 },
  { text: '  Discovering AWS log sources in region us-west-2...', delay: 700, color: '#61afef' },
  { text: '  ├─ CloudWatch Logs      ✓ 14 log groups found', delay: 350, color: '#abb2bf' },
  { text: '  ├─ CloudTrail           ✓ trail logs enabled', delay: 300, color: '#abb2bf' },
  { text: '  ├─ S3 Access Logs       ✓ 3 buckets found', delay: 300, color: '#abb2bf' },
  { text: '  ├─ VPC Flow Logs        ✓ 2 VPCs found', delay: 250, color: '#abb2bf' },
  { text: '  ├─ Lambda               ✓ 12 functions found', delay: 300, color: '#abb2bf' },
  { text: '  ├─ GuardDuty            ✓ findings enabled', delay: 250, color: '#abb2bf' },
  { text: '  ├─ ECS                  ✓ 2 clusters found', delay: 300, color: '#abb2bf' },
  { text: '  └─ ELB Access Logs      ✓ 4 load balancers found', delay: 300, color: '#abb2bf' },
  { text: '', delay: 200 },
  { text: '  Found 8 log sources across 1 region', delay: 400, color: '#e5c07b' },
  { text: '', delay: 300 },
  { text: '  Configuring log collection pipelines...', delay: 600, color: '#61afef' },
  { text: '  ├─ Creating CloudFormation stack elastic-log-forwarder...', delay: 700, color: '#abb2bf' },
  { text: '  ├─ Deploying log forwarder (v9.2.4)...', delay: 900, color: '#abb2bf' },
  { text: '  ├─ Setting up S3 bucket notifications...', delay: 500, color: '#abb2bf' },
  { text: '  ├─ Subscribing to CloudWatch log groups (14 groups)...', delay: 600, color: '#abb2bf' },
  { text: '  ├─ Enabling VPC Flow Logs export...', delay: 400, color: '#abb2bf' },
  { text: '  └─ Configuring GuardDuty findings export...', delay: 450, color: '#abb2bf' },
  { text: '', delay: 200 },
  { text: '  ✓ Stack elastic-log-forwarder created successfully', delay: 700, color: '#98c379' },
  { text: '', delay: 300 },
  { text: '  Sending test data to Elastic Observability...', delay: 600, color: '#61afef' },
  { text: '  ├─ CloudWatch logs      ✓ streaming (87 events/sec)', delay: 400, color: '#98c379' },
  { text: '  ├─ S3 access logs       ✓ streaming (34 events/sec)', delay: 350, color: '#98c379' },
  { text: '  ├─ VPC Flow Logs        ✓ streaming (56 events/sec)', delay: 350, color: '#98c379' },
  { text: '  ├─ CloudTrail events    ✓ streaming (21 events/sec)', delay: 300, color: '#98c379' },
  { text: '  ├─ Lambda logs          ✓ streaming (43 events/sec)', delay: 350, color: '#98c379' },
  { text: '  └─ GuardDuty findings   ✓ streaming (8 events/sec)', delay: 400, color: '#98c379' },
  { text: '', delay: 200 },
  { text: '  ══════════════════════════════════════════════════════════', delay: 300, color: '#61afef' },
  { text: '  ✅ Setup complete! Logs are flowing to Elastic Observability.', delay: 400, color: '#98c379' },
  { text: '  📊 Dashboards: 23 installed  |  🔔 Alert rules: 8 pre-configured', delay: 300, color: '#e5c07b' },
  { text: '  ══════════════════════════════════════════════════════════', delay: 200, color: '#61afef' },
  { text: '', delay: 150 },
  { text: '  You can now close this window and return to Elastic to view your data.', delay: 400, color: '#abb2bf' },
];

const AWS_LOGS_DASHBOARDS = [
  '[Logs AWS] Inspector Findings Overview',
  '[Logs AWS] VPC Flow Log Overview',
  '[Logs AWS] Firewall Overview',
  '[Logs AWS] Inspector Vulnerabilities',
  '[Logs AWS] ELB Access Log Overview',
  '[Logs AWS] Security Hub Findings Action',
  '[Logs AWS] Guardduty Findings Severity',
  '[Logs AWS] S3 Server Access Log Overview',
  '[Logs AWS] EMR Overview',
  '[Logs AWS] API Gateway Overview',
  '[Logs AWS] Firewall Flows',
  '[Logs AWS] Config',
  '[Logs AWS] Inspector Severity',
  '[Logs AWS] Inspector EC2 and ECR Overview',
  '[Logs AWS] Lambda Log Overview',
  '[Logs AWS] Security Hub Findings Malware, Threat Intelligence Indicator and Network Path',
  '[Logs AWS] ALB Connection Log Overview',
  '[Logs AWS] Security Hub Findings and Insights Overview',
  '[Logs AWS] Firewall Alerts',
  '[Logs AWS] Guardduty Findings Threat',
  '[Logs AWS] Guardduty Findings Overview',
  '[Logs AWS] CloudTrail',
  '[Logs AWS] Guardduty Findings logs',
];

export const AwsFlyout: React.FC<AwsFlyoutProps> = ({
  logoUrl,
  onClose,
  onSeeMyData,
  isChild,
  hideCloseButton,
  ownFocus: ownFocusProp,
}) => {
  const { euiTheme } = useEuiTheme();
  const [selectedTab, setSelectedTab] = useState<'metrics' | 'logs'>('metrics');
  const [preferredMethod, setPreferredMethod] = useState('cloud-connector');
  const [connectionTab, setConnectionTab] = useState<'existing' | 'new'>('existing');
  const [selectedConnector, setSelectedConnector] = useState('aws-connector-2');
  const [connectorName, setConnectorName] = useState('aws-connector-2');
  const [roleArn, setRoleArn] = useState('arn:aws:iam::123456789012:role/ExampleRole');
  const [logsSetupMethod, setLogsSetupMethod] = useState('discovery-script');
  const [hasCloudShellCopied, setHasCloudShellCopied] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [bucketNames, setBucketNames] = useState<Record<string, string>>({});
  const [isCloudShellOpen, setIsCloudShellOpen] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [terminalComplete, setTerminalComplete] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const startCloudShell = useCallback(() => {
    setIsCloudShellOpen(true);
    setTerminalLines([]);
    setTerminalComplete(false);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    let cumulative = 0;
    CLOUDSHELL_TERMINAL_LINES.forEach((line, idx) => {
      cumulative += line.delay;
      const t = setTimeout(() => {
        setTerminalLines((prev) => [...prev, line.text]);
        if (idx === CLOUDSHELL_TERMINAL_LINES.length - 1) {
          setTerminalComplete(true);
        }
      }, cumulative);
      timeoutsRef.current.push(t);
    });
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const renderExistingConnectionTab = () => (
    <>
      <EuiText size="s" color="subdued">
        <p>
          Cloud Connector uses AWS Assume Role, making it easy to set up access without
          managing new credentials.{' '}
          <EuiLink href="#" external={false}>
            Learn more
          </EuiLink>
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFormRow label="Cloud Connector Name">
        <EuiSuperSelect
          options={EXISTING_CONNECTOR_OPTIONS.map((c) => ({
            value: c.name,
            inputDisplay: c.name,
            dropdownDisplay: (
              <>
                <strong>{c.name}</strong>
                <EuiText size="xs" color="subdued">
                  {c.arn}
                </EuiText>
              </>
            ),
          }))}
          valueOfSelected={selectedConnector}
          onChange={setSelectedConnector}
        />
      </EuiFormRow>
    </>
  );

  const renderNewConnectionTab = () => (
    <>
      <EuiText size="s" color="subdued">
        <p>
          Create a reusable IAM role in your AWS account, then give Elastic its Role ARN and
          the External ID shown below. You&apos;ll need rights to launch a CloudFormation stack
          and create/update IAM roles in the target AWS account.
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFormRow
        label="Cloud Connector Name"
        labelAppend={
          <EuiIcon type="iInCircle" size="s" color="subdued" />
        }
      >
        <EuiFieldText value={connectorName} onChange={(e) => setConnectorName(e.target.value)} />
      </EuiFormRow>
      <EuiSpacer size="l" />
      <EuiAccordion
        id="stepsToAssumeRole"
        buttonContent="Steps to assume role"
        paddingSize="s"
      />
      <EuiSpacer size="l" />
      <EuiButton iconType="launch" color="primary" fill={false}>
        Launch CloudFormation
      </EuiButton>
      <EuiSpacer size="l" />
      <EuiFormRow
        label="Role ARN"
        labelAppend={
          <EuiIcon type="iInCircle" size="s" color="subdued" />
        }
      >
        <EuiFieldText value={roleArn} onChange={(e) => setRoleArn(e.target.value)} />
      </EuiFormRow>
      <EuiSpacer size="l" />
      <EuiPanel color="subdued" paddingSize="m">
        <EuiFormRow
          label="External ID"
          labelAppend={
            <EuiIcon type="iInCircle" size="s" color="subdued" />
          }
        >
          <EuiFieldText value="826374909222" readOnly />
        </EuiFormRow>
        <EuiSpacer size="xs" />
        <EuiLink href="#" target="_blank" external>
          Learn more about policy secrets.
        </EuiLink>
      </EuiPanel>
    </>
  );

  const renderCheckingForDataStep = (dashboards: string[], accordionId: string, isComplete?: boolean) => ({
    title: 'Verify your connection',
    status: (isComplete ? 'complete' : 'incomplete') as 'complete' | 'incomplete',
    children: (
      <>
        <EuiText size="s" color="subdued">
          <p>
            {isComplete
              ? 'Your data is successfully flowing into Elastic Observability.'
              : 'When finished come back and test your connection to see incoming data.'}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiCallOut
          color={isComplete ? 'success' : 'primary'}
          css={css`
            border-radius: ${euiTheme.border.radius.small};
          `}
          title={
            isComplete ? (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="checkCircle" color="success" />
                </EuiFlexItem>
                <EuiFlexItem>Data is flowing successfully</EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem>Establishing connection...</EuiFlexItem>
              </EuiFlexGroup>
            )
          }
        />
        <EuiSpacer size="m" />
        <EuiAccordion
          id={accordionId}
          buttonContent={isComplete
            ? `Dashboards installed (${dashboards.length})`
            : `Dashboards available once installed (${dashboards.length})`}
          paddingSize="s"
          initialIsOpen={isComplete}
          forceState={isComplete ? 'open' : undefined}
        >
          <EuiSpacer size="s" />
          <EuiPanel color="plain" hasBorder paddingSize="m">
            <EuiFlexGroup direction="column" gutterSize="xs">
              {dashboards.map((name, idx) => (
                <EuiFlexItem key={`${name}-${idx}`}>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={isComplete ? 'checkCircle' : 'dashedCircle'}
                        size="s"
                        color={isComplete ? 'success' : 'subdued'}
                      />
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
  });

  const metricsSteps = [
    {
      title: 'Setup Access',
      status: 'current' as const,
      children: (
        <>
          <EuiText size="s" color="subdued">
            <p>
              Utilize AWS Access Keys or assume role to set up access for assessing your AWS
              environment&apos;s security posture. Refer to our{' '}
              <EuiLink href="#" external={false}>
                Getting Started
              </EuiLink>{' '}
              guide for details.
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFormRow label="Preferred method">
            <EuiSuperSelect
              options={PREFERRED_METHOD_OPTIONS}
              valueOfSelected={preferredMethod}
              onChange={setPreferredMethod}
            />
            </EuiFormRow>
          <EuiSpacer size="l" />
          <EuiTabs size="s">
            <EuiTab
              isSelected={connectionTab === 'existing'}
              onClick={() => setConnectionTab('existing')}
            >
              Existing connection
            </EuiTab>
            <EuiTab
              isSelected={connectionTab === 'new'}
              onClick={() => setConnectionTab('new')}
            >
              New connection
            </EuiTab>
          </EuiTabs>
          <EuiSpacer size="l" />
          {connectionTab === 'existing'
            ? renderExistingConnectionTab()
            : renderNewConnectionTab()}
        </>
      ),
    },
    renderCheckingForDataStep(AWS_METRICS_DASHBOARDS, 'awsMetricsDashboardsAccordion'),
  ];

  const logsSteps = [
    {
      title: 'Choose your setup method',
      status: (terminalComplete ? 'complete' : 'current') as const,
      children: (
        <>
          <EuiText size="s" color="subdued">
            <p>
              Select how you want to discover and collect logs from your AWS environment.
            </p>
          </EuiText>
          {!terminalComplete && (
            <>
              <EuiSpacer size="l" />
              <fieldset>
                <EuiFlexGroup
                  gutterSize="m"
                  responsive={false}
                  css={css`
                    .euiCheckableCard {
                      height: 100%;
                    }
                  `}
                >
                  {LOGS_SETUP_OPTIONS.map((option) => (
                    <EuiFlexItem key={option.id}>
                      <EuiCheckableCard
                        id={`logs-${option.id}`}
                        label={
                          <>
                            <strong>{option.label}</strong>
                            <EuiText size="xs" color="subdued" style={{ marginTop: 2 }}>
                              {option.description}
                            </EuiText>
                          </>
                        }
                        checked={logsSetupMethod === option.id}
                        onChange={() => setLogsSetupMethod(option.id)}
                        checkableType="radio"
                      />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </fieldset>
            </>
          )}
        </>
      ),
    },
    ...(logsSetupMethod === 'discovery-script'
      ? [
          {
            title: 'Discover and send data from AWS sources using CloudShell',
            status: (terminalComplete ? 'complete' : 'incomplete') as const,
            children: (
              <>
                <EuiText size="s" color="subdued">
                  <p>
                    {terminalComplete
                      ? 'CloudShell discovery completed successfully. All log sources are connected.'
                      : 'Copy and paste our script into CloudShell to automatically discover and send data from your AWS sources.'}
                  </p>
                </EuiText>
                {!terminalComplete && (
                  <>
                    <EuiSpacer size="l" />
                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                    <div onClick={() => setHasCloudShellCopied(true)}>
                      <EuiCodeBlock language="bash" isCopyable paddingSize="m" fontSize="s">
                        {CLOUDSHELL_COMMAND}
                      </EuiCodeBlock>
                    </div>
                    <EuiSpacer size="l" />
                    <EuiButton
                      iconType="popout"
                      iconSide="right"
                      color="primary"
                      fill={false}
                      disabled={!hasCloudShellCopied || isCloudShellOpen}
                      onClick={startCloudShell}
                    >
                      {isCloudShellOpen ? 'CloudShell running...' : 'Launch CloudShell'}
                    </EuiButton>
                  </>
                )}
              </>
            ),
          },
        ]
      : [
          {
            title: 'What AWS sources do you want to monitor?',
            status: 'incomplete' as const,
            children: (
              <>
                <EuiText size="s" color="subdued">
                  <p>
                    Select the sources you&apos;re using. We&apos;ll collect metrics, logs, and
                    traces from each one.
                  </p>
                </EuiText>
                <EuiSpacer size="l" />
                <EuiComboBox
                  placeholder="Search AWS sources..."
                  options={AWS_SELECTABLE_SOURCES.map((s) => ({
                    key: s.id,
                    label: s.name,
                    value: s,
                  }))}
                  selectedOptions={selectedSources.map((id) => {
                    const s = AWS_SELECTABLE_SOURCES.find((src) => src.id === id);
                    return { key: id, label: s?.name ?? id, value: s };
                  })}
                  onChange={(opts) => {
                    setSelectedSources(opts.map((o) => o.key!));
                  }}
                  renderOption={(option) => {
                    const source = option.value as (typeof AWS_SELECTABLE_SOURCES)[number];
                    return (
                      <EuiFlexGroup
                        gutterSize="s"
                        alignItems="center"
                        responsive={false}
                      >
                        <EuiFlexItem grow={false}>
                          <img
                            src={source.logoUrl}
                            alt={source.name}
                            style={{
                              width: 24,
                              height: 24,
                              objectFit: 'contain',
                            }}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>{source.name}</EuiFlexItem>
                      </EuiFlexGroup>
                    );
                  }}
                  rowHeight={40}
                  fullWidth
                />

                {selectedSources.length > 0 && (
                  <>
                    <EuiSpacer size="xl" />
                    <EuiTitle size="xs">
                      <h4>Configure data sources</h4>
                    </EuiTitle>
                    <EuiText size="s" color="subdued">
                      <p>Add the bucket name for each source</p>
                    </EuiText>
                    <EuiSpacer size="l" />
                    {selectedSources.map((sourceId) => {
                      const source = AWS_SELECTABLE_SOURCES.find((s) => s.id === sourceId);
                      if (!source) return null;
                      return (
                        <React.Fragment key={sourceId}>
                          <EuiFormRow
                            label={
                              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                                <EuiFlexItem grow={false}>
                                  <img
                                    src={source.logoUrl}
                                    alt=""
                                    style={{ width: 20, height: 20, objectFit: 'contain' }}
                                  />
                                </EuiFlexItem>
                                <EuiFlexItem grow={false}>
                                  <EuiText size="s">
                                    <strong>{source.name}</strong>
                                  </EuiText>
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            }
                            css={css`
                              .euiFormRow__labelWrapper {
                                margin-bottom: ${euiTheme.size.s};
                              }
                            `}
                          >
                            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                              <EuiFlexItem>
                                <EuiFieldText
                                  placeholder={`Enter ${source.name} bucket name`}
                                  value={bucketNames[sourceId] ?? ''}
                                  onChange={(e) =>
                                    setBucketNames((prev) => ({
                                      ...prev,
                                      [sourceId]: e.target.value,
                                    }))
                                  }
                                />
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <EuiButtonIcon
                                  iconType="cross"
                                  aria-label={`Remove ${source.name}`}
                                  onClick={() => {
                                    setSelectedSources((prev) =>
                                      prev.filter((s) => s !== sourceId)
                                    );
                                    setBucketNames((prev) => {
                                      const next = { ...prev };
                                      delete next[sourceId];
                                      return next;
                                    });
                                  }}
                                />
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFormRow>
                          <EuiSpacer size="xl" />
                        </React.Fragment>
                      );
                    })}
                    <EuiSpacer size="m" />
                    <EuiButton
                      iconType="popout"
                      iconSide="right"
                      color="primary"
                      fill={false}
                      disabled
                    >
                      Launch CloudFormation in AWS
                    </EuiButton>
                  </>
                )}
              </>
            ),
          },
        ]),
    renderCheckingForDataStep(AWS_LOGS_DASHBOARDS, 'awsLogsDashboardsAccordion', terminalComplete),
  ];

  return (
    <>
    <EuiFlyout
      ownFocus={ownFocusProp !== undefined ? ownFocusProp : !isChild}
      onClose={onClose}
      hideCloseButton={hideCloseButton}
      aria-labelledby="awsFlyoutTitle"
      {...(isChild
        ? {
            session: 'start' as const,
            flyoutMenuProps: { title: 'Add Amazon Web Services', hideCloseButton },
          }
        : {})}
      css={css`
        inline-size: ${isChild ? '65vw' : '50vw'} !important;
        ${
          isChild
            ? `
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
        `
            : ''
        }
      `}
    >
      <EuiFlyoutHeader>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <CardLogoIcon src={logoUrl} alt="AWS logo" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="awsFlyoutTitle">Add Amazon Web Services</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              Collect logs and metrics from your AWS services.
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiTabs>
          <EuiTab
            isSelected={selectedTab === 'metrics'}
            onClick={() => setSelectedTab('metrics')}
          >
            Metrics
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === 'logs'}
            onClick={() => setSelectedTab('logs')}
          >
            Logs
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {selectedTab === 'metrics' ? (
          <>
            <EuiTitle size="xs">
              <h3>We&apos;ll collect metrics from sources like:</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              {AWS_METRIC_SOURCES.map((service) => (
                <EuiFlexItem grow={false} key={service.name}>
                  <CardLogoIcon src={service.logoUrl} alt={service.name} />
                </EuiFlexItem>
              ))}
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc' }}>
                      {AWS_ALL_METRIC_SOURCES.filter(
                        (s) => !AWS_METRIC_SOURCES.some((m) => m.name === s)
                      ).map((s) => (
                        <li key={s} style={{ listStyleType: 'disc' }}>{s}</li>
                      ))}
                    </ul>
                  }
                >
                  <EuiBadge color="hollow">+ {AWS_ALL_METRIC_SOURCES.length - AWS_METRIC_SOURCES.length}</EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : (
          <>
            <EuiTitle size="xs">
              <h3>We&apos;ll collect logs from sources like:</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              {AWS_LOG_SOURCES.map((service) => (
                <EuiFlexItem grow={false} key={service.name}>
                  <CardLogoIcon src={service.logoUrl} alt={service.name} />
                </EuiFlexItem>
              ))}
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc' }}>
                      {AWS_ALL_LOG_SOURCES.filter(
                        (s) => !AWS_LOG_SOURCES.some((l) => l.name === s)
                      ).map((s) => (
                        <li key={s} style={{ listStyleType: 'disc' }}>{s}</li>
                      ))}
                    </ul>
                  }
                >
                  <EuiBadge color="hollow">+ {AWS_ALL_LOG_SOURCES.length - AWS_LOG_SOURCES.length}</EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
        <EuiSpacer size="xxl" />
        <EuiSteps
          steps={selectedTab === 'metrics' ? metricsSteps : logsSteps}
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
              data-test-subj="awsFlyoutSeeMyDataButton"
              fill
              disabled={!terminalComplete}
              onClick={onSeeMyData ?? onClose}
            >
              See my data
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>

    {isCloudShellOpen &&
      createPortal(
        <div
          css={css`
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: #1e1e2e;
            display: flex;
            flex-direction: column;
            animation: ${keyframes`
              from { opacity: 0; }
              to { opacity: 1; }
            `} 0.25s ease-out;
          `}
        >
          <div
            css={css`
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 16px;
              background: #181825;
              border-bottom: 1px solid #313244;
              flex-shrink: 0;
              user-select: none;
            `}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <div css={css`display: flex; gap: 8px;`}>
                  <div css={css`width: 12px; height: 12px; border-radius: 50%; background: #f38ba8;`} />
                  <div css={css`width: 12px; height: 12px; border-radius: 50%; background: #f9e2af;`} />
                  <div css={css`width: 12px; height: 12px; border-radius: 50%; background: #a6e3a1;`} />
                </div>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText
                  size="s"
                  css={css`
                    color: #a6adc8;
                    text-align: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
                  `}
                >
                  AWS CloudShell — us-west-2
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={css`min-width: 60px;`} />
            </EuiFlexGroup>
          </div>

          <div
            css={css`
              background: #232634;
              padding: 4px 16px 0;
              border-bottom: 1px solid #313244;
              display: flex;
              flex-shrink: 0;
            `}
          >
            <div
              css={css`
                background: #1e1e2e;
                border: 1px solid #45475a;
                border-bottom: 1px solid #1e1e2e;
                border-radius: 8px 8px 0 0;
                padding: 6px 16px;
                font-size: 12px;
                color: #cdd6f4;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                display: flex;
                align-items: center;
                gap: 6px;
              `}
            >
              <EuiIcon type="console" size="s" color="#cdd6f4" />
              bash
            </div>
          </div>

          <div
            ref={terminalRef}
            css={css`
              flex: 1;
              overflow-y: auto;
              padding: 24px 32px;
              font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace;
              font-size: 14px;
              line-height: 1.8;
              color: #cdd6f4;
              &::-webkit-scrollbar {
                width: 8px;
              }
              &::-webkit-scrollbar-track {
                background: transparent;
              }
              &::-webkit-scrollbar-thumb {
                background: #45475a;
                border-radius: 4px;
              }
            `}
          >
            {terminalLines.map((line, idx) => (
              <div
                key={idx}
                css={css`
                  white-space: pre-wrap;
                  word-break: break-all;
                  min-height: 1.8em;
                  color: ${CLOUDSHELL_TERMINAL_LINES[idx]?.color ?? '#cdd6f4'};
                `}
              >
                {line}
              </div>
            ))}
            {!terminalComplete && (
              <span
                css={css`
                  display: inline-block;
                  width: 9px;
                  height: 18px;
                  background: #cdd6f4;
                  animation: ${keyframes`
                    50% { opacity: 0; }
                  `} 1s step-end infinite;
                `}
              />
            )}
          </div>

          {terminalComplete && (
            <div
              css={css`
                background: #181825;
                border-top: 1px solid #313244;
                padding: 16px 32px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-shrink: 0;
              `}
            >
              <EuiText size="s" css={css`color: #a6e3a1;`}>
                Setup complete — all services connected successfully.
              </EuiText>
              <EuiButton
                color="success"
                fill
                onClick={() => setIsCloudShellOpen(false)}
                iconType="returnKey"
                iconSide="right"
              >
                Return to Elastic Observability
              </EuiButton>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
