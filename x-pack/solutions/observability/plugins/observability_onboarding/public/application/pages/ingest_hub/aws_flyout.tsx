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
  EuiButton,
  EuiCallOut,
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

  const steps = [
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
            id="awsDashboardsAccordion"
            buttonContent={`Dashboards available once installed (${selectedTab === 'metrics' ? AWS_METRICS_DASHBOARDS.length : AWS_LOGS_DASHBOARDS.length})`}
            paddingSize="s"
          >
            <EuiSpacer size="s" />
            <EuiPanel color="plain" hasBorder paddingSize="m">
              <EuiFlexGroup direction="column" gutterSize="xs">
                {(selectedTab === 'metrics' ? AWS_METRICS_DASHBOARDS : AWS_LOGS_DASHBOARDS).map((name, idx) => (
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
              data-test-subj="awsFlyoutSeeMyDataButton"
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
