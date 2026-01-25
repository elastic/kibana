/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiLink,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiSteps,
  EuiText,
  copyToClipboard,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ValuesType } from 'utility-types';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { useCloudForwarderFlow } from './use_cloudforwarder_flow';
import { EmptyPrompt } from '../shared/empty_prompt';
import { ManagedOtlpCallout } from '../shared/managed_otlp_callout';

const EDOT_CLOUD_FORWARDER_DOCS_URL =
  'https://www.elastic.co/docs/reference/opentelemetry/edot-cloud-forwarder/aws';

// CloudFormation template base URLs for different log types
const CLOUDFORMATION_TEMPLATES = {
  vpcflow: {
    templateUrl:
      'https://edot-cloud-forwarder.s3.amazonaws.com/v1/latest/cloudformation/s3_logs-cloudformation.yaml',
    stackName: 'edot-cloud-forwarder-vpcflow',
    logType: 'vpcflow',
    label: i18n.translate('xpack.observability_onboarding.cloudforwarder.logType.vpcflow', {
      defaultMessage: 'VPC Flow Logs',
    }),
  },
  elbaccess: {
    templateUrl:
      'https://edot-cloud-forwarder.s3.amazonaws.com/v1/latest/cloudformation/s3_logs-cloudformation.yaml',
    stackName: 'edot-cloud-forwarder-elbaccess',
    logType: 'elbaccess',
    label: i18n.translate('xpack.observability_onboarding.cloudforwarder.logType.elbaccess', {
      defaultMessage: 'ELB Access Logs',
    }),
  },
  cloudtrail: {
    templateUrl:
      'https://edot-cloud-forwarder.s3.amazonaws.com/v1/latest/cloudformation/s3_logs-cloudformation.yaml',
    stackName: 'edot-cloud-forwarder-cloudtrail',
    logType: 'cloudtrail',
    label: i18n.translate('xpack.observability_onboarding.cloudforwarder.logType.cloudtrail', {
      defaultMessage: 'CloudTrail Logs',
    }),
  },
};

type LogType = keyof typeof CLOUDFORMATION_TEMPLATES;

function buildCloudFormationUrl(logType: LogType, otlpEndpoint: string): string {
  const config = CLOUDFORMATION_TEMPLATES[logType];
  const url = new URL('https://console.aws.amazon.com/cloudformation/home');
  const params = new URLSearchParams({
    templateURL: config.templateUrl,
    stackName: config.stackName,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    param_EdotCloudForwarderS3LogsType: config.logType,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    param_OTLPEndpoint: otlpEndpoint,
  });

  url.hash = `/stacks/create/review?${params.toString()}`;
  return url.toString();
}

export function CloudForwarderPanel() {
  useFlowBreadcrumb({
    text: i18n.translate(
      'xpack.observability_onboarding.cloudforwarderPanel.breadcrumbs.cloudforwarder',
      {
        defaultMessage: 'EDOT Cloud Forwarder',
      }
    ),
  });

  const {
    services: {
      context: { cloudServiceProvider },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const [selectedLogType, setSelectedLogType] = useState<LogType>('vpcflow');
  const { data, status, error, refetch } = useCloudForwarderFlow();
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
    return (
      <EmptyPrompt
        onboardingFlowType="cloudforwarder"
        error={error}
        telemetryEventContext={{
          cloudforwarder: { cloudServiceProvider, selectedLogType },
        }}
        onRetryClick={refetch}
      />
    );
  }

  const logTypeOptions = Object.entries(CLOUDFORMATION_TEMPLATES).map(([id, config]) => ({
    id,
    label: config.label,
  }));

  const steps = [
    {
      title: i18n.translate(
        'xpack.observability_onboarding.cloudforwarderPanel.prerequisitesTitle',
        {
          defaultMessage: 'Prerequisites',
        }
      ),
      children: (
        <>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.observability_onboarding.cloudforwarderPanel.prerequisitesDescription"
                defaultMessage="Before deploying the EDOT Cloud Forwarder, ensure you have:"
              />
            </p>
            <ul>
              <li>
                <FormattedMessage
                  id="xpack.observability_onboarding.cloudforwarderPanel.prerequisiteAWS"
                  defaultMessage="An active AWS account with permissions to create CloudFormation stacks, Lambda functions, and S3 bucket notifications"
                />
              </li>
              <li>
                <FormattedMessage
                  id="xpack.observability_onboarding.cloudforwarderPanel.prerequisiteS3"
                  defaultMessage="An S3 bucket containing your AWS logs (VPC Flow Logs, ELB Access Logs, or CloudTrail)"
                />
              </li>
            </ul>
            <p>
              <FormattedMessage
                id="xpack.observability_onboarding.cloudforwarderPanel.prerequisitesDocumentation"
                defaultMessage="{documentationLink} for detailed setup instructions."
                values={{
                  documentationLink: (
                    <EuiLink
                      data-test-subj="observabilityOnboardingCloudForwarderPanelDocumentationLink"
                      href={EDOT_CLOUD_FORWARDER_DOCS_URL}
                      external
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.observability_onboarding.cloudforwarderPanel.documentationLinkLabel',
                        { defaultMessage: 'Check the documentation' }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </>
      ),
    },
    {
      title: i18n.translate(
        'xpack.observability_onboarding.cloudforwarderPanel.copyCredentialsTitle',
        {
          defaultMessage: 'Copy your OTLP credentials',
        }
      ),
      children: (
        <>
          {status !== FETCH_STATUS.SUCCESS && (
            <>
              <EuiSkeletonText lines={2} />
              <EuiSpacer />
              <EuiSkeletonText lines={1} />
              <EuiSkeletonText lines={1} />
            </>
          )}
          {status === FETCH_STATUS.SUCCESS && data !== undefined && (
            <>
              <ManagedOtlpCallout />
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.observability_onboarding.cloudforwarderPanel.copyCredentialsDescription"
                    defaultMessage="Copy the API key below. You'll need to enter it in the AWS CloudFormation console in the next step."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <CredentialsTable
                managedOtlpServiceUrl={data.managedOtlpServiceUrl}
                apiKeyEncoded={data.apiKeyEncoded}
              />
            </>
          )}
        </>
      ),
    },
    {
      title: i18n.translate('xpack.observability_onboarding.cloudforwarderPanel.launchStackTitle', {
        defaultMessage: 'Deploy the EDOT Cloud Forwarder in AWS',
      }),
      children: (
        <>
          {status !== FETCH_STATUS.SUCCESS && (
            <>
              <EuiSkeletonText lines={3} />
              <EuiSpacer />
              <EuiSkeletonRectangle width="170px" height="40px" />
            </>
          )}
          {status === FETCH_STATUS.SUCCESS && data !== undefined && (
            <>
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.observability_onboarding.cloudforwarderPanel.selectLogTypeDescription"
                    defaultMessage="Select the type of AWS logs you want to forward, then click the button to launch the CloudFormation stack. The OTLP endpoint is pre-populated; you only need to enter the API key from the previous step."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButtonGroup
                data-test-subj="observabilityOnboardingCloudForwarderLogTypeSelector"
                legend={i18n.translate(
                  'xpack.observability_onboarding.cloudforwarderPanel.logTypeLegend',
                  {
                    defaultMessage: 'Select the type of AWS logs to forward',
                  }
                )}
                options={logTypeOptions}
                idSelected={selectedLogType}
                onChange={(id) => setSelectedLogType(id as LogType)}
                buttonSize="m"
              />
              <EuiSpacer size="l" />
              <EuiButton
                data-test-subj="observabilityOnboardingCloudForwarderLaunchStackButton"
                href={buildCloudFormationUrl(selectedLogType, data.managedOtlpServiceUrl)}
                target="_blank"
                iconSide="right"
                iconType="popout"
                fill
              >
                {i18n.translate(
                  'xpack.observability_onboarding.cloudforwarderPanel.launchStackButtonLabel',
                  { defaultMessage: 'Launch Stack in AWS' }
                )}
              </EuiButton>
              <EuiSpacer size="m" />
              <EuiText size="s" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.observability_onboarding.cloudforwarderPanel.launchStackNote"
                    defaultMessage="In the AWS Console, you'll need to paste the API key you copied above into the {paramName} field."
                    values={{
                      paramName: <code>ElasticAPIKey</code>,
                    }}
                  />
                </p>
              </EuiText>
            </>
          )}
        </>
      ),
    },
    {
      title: i18n.translate(
        'xpack.observability_onboarding.cloudforwarderPanel.visualizeDataTitle',
        {
          defaultMessage: 'Visualize your data',
        }
      ),
      children: (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.observability_onboarding.cloudforwarderPanel.visualizeDataCalloutTitle',
              {
                defaultMessage: 'Data will appear in Discover',
              }
            )}
            color="success"
            iconType="check"
          >
            <p>
              <FormattedMessage
                id="xpack.observability_onboarding.cloudforwarderPanel.visualizeDataCalloutDescription"
                defaultMessage="Once logs are flowing, you can view them in Discover and create visualizations in Dashboard. Look for indices prefixed with {logsPrefix}."
                values={{
                  logsPrefix: (
                    <strong>
                      {i18n.translate(
                        'xpack.observability_onboarding.cloudforwarderPanel.strong.logsawsLabel',
                        { defaultMessage: 'logs-aws.*' }
                      )}
                    </strong>
                  ),
                }}
              />
            </p>
          </EuiCallOut>
        </>
      ),
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiSteps steps={steps} />
      <FeedbackButtons flow="cloudforwarder" />
    </EuiPanel>
  );
}

function CredentialsTable({
  managedOtlpServiceUrl,
  apiKeyEncoded,
}: {
  managedOtlpServiceUrl: string;
  apiKeyEncoded: string;
}) {
  const items = [
    {
      setting: i18n.translate(
        'xpack.observability_onboarding.cloudforwarderPanel.credentials.otlpEndpoint',
        {
          defaultMessage: 'OTLP Endpoint',
        }
      ),
      value: managedOtlpServiceUrl,
      description: i18n.translate(
        'xpack.observability_onboarding.cloudforwarderPanel.credentials.otlpEndpointDesc',
        {
          defaultMessage: 'Pre-populated in the CloudFormation URL',
        }
      ),
    },
    {
      setting: i18n.translate(
        'xpack.observability_onboarding.cloudforwarderPanel.credentials.apiKey',
        {
          defaultMessage: 'API Key',
        }
      ),
      value: apiKeyEncoded,
      description: i18n.translate(
        'xpack.observability_onboarding.cloudforwarderPanel.credentials.apiKeyDesc',
        {
          defaultMessage: 'Copy and paste into AWS CloudFormation',
        }
      ),
    },
  ];

  const columns: Array<EuiBasicTableColumn<ValuesType<typeof items>>> = [
    {
      field: 'setting',
      width: '20%',
      name: i18n.translate('xpack.observability_onboarding.cloudforwarderPanel.configSetting', {
        defaultMessage: 'Setting',
      }),
    },
    {
      field: 'value',
      width: '50%',
      name: i18n.translate('xpack.observability_onboarding.cloudforwarderPanel.configValue', {
        defaultMessage: 'Value',
      }),
      render: (_, { value }) => (
        <>
          <EuiText size="s" color="accent">
            <code>{value}</code>
          </EuiText>
          {value && (
            <EuiButtonIcon
              data-test-subj="cloudforwarderCredentialsCopyButton"
              aria-label={i18n.translate(
                'xpack.observability_onboarding.cloudforwarderPanel.copyIconText',
                {
                  defaultMessage: 'Copy to clipboard',
                }
              )}
              color="text"
              iconType="copy"
              onClick={() => copyToClipboard(value)}
            />
          )}
        </>
      ),
    },
    {
      field: 'description',
      width: '30%',
      name: i18n.translate('xpack.observability_onboarding.cloudforwarderPanel.configDescription', {
        defaultMessage: 'Note',
      }),
      render: (_, { description }) => (
        <EuiText size="s" color="subdued">
          {description}
        </EuiText>
      ),
    },
  ];

  return (
    <EuiBasicTable
      items={items}
      columns={columns}
      tableCaption={i18n.translate(
        'xpack.observability_onboarding.cloudforwarderPanel.credentialsTableCaption',
        {
          defaultMessage: 'OTLP credentials for AWS CloudFormation deployment',
        }
      )}
      data-test-subj="cloudforwarder-credentials-table"
    />
  );
}
