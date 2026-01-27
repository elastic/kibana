/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiSteps,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../../..';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { useCloudForwarderFlow } from './use_cloudforwarder_flow';
import { EmptyPrompt } from '../shared/empty_prompt';

const EDOT_CLOUD_FORWARDER_DOCS_URL =
  'https://www.elastic.co/docs/reference/opentelemetry/edot-cloud-forwarder/aws';

/**
 * CloudFormation template configurations for different AWS log types.
 * All log types use the same template URL but with different parameters
 * (log type and OTLP endpoint) passed via URL hash parameters.
 */
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

/**
 * Validates S3 bucket names according to AWS naming rules:
 * - 3-63 characters long
 * - Only lowercase letters, numbers, hyphens, and periods
 * - Must start and end with a letter or number
 * - Cannot contain consecutive periods
 */
const S3_BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

function isValidS3BucketName(bucketName: string): boolean {
  return S3_BUCKET_NAME_REGEX.test(bucketName) && !bucketName.includes('..');
}

/**
 * Builds an S3 bucket ARN from a bucket name.
 * Format: arn:aws:s3:::bucket-name
 */
function buildS3BucketArn(bucketName: string): string {
  return `arn:aws:s3:::${bucketName}`;
}

/**
 * Builds a CloudFormation console URL with pre-filled parameters for deploying
 * the EDOT Cloud Forwarder. The URL includes the template URL, stack name, log type,
 * OTLP endpoint, API key, and S3 bucket ARN as hash parameters for the AWS CloudFormation console.
 */
function buildCloudFormationUrl(
  logType: LogType,
  otlpEndpoint: string,
  apiKey: string,
  s3BucketArn: string
): string {
  const config = CLOUDFORMATION_TEMPLATES[logType];
  const url = new URL('https://console.aws.amazon.com/cloudformation/home');
  const params = new URLSearchParams({
    templateURL: config.templateUrl,
    stackName: config.stackName,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    param_EdotCloudForwarderS3LogsType: config.logType,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    param_OTLPEndpoint: otlpEndpoint,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    param_ElasticAPIKey: apiKey,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    param_SourceS3BucketARN: s3BucketArn,
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
  const [s3BucketName, setS3BucketName] = useState<string>('');
  const { data, status, error, refetch } = useCloudForwarderFlow();

  const trimmedBucketName = s3BucketName.trim();
  const isBucketNameInvalid =
    trimmedBucketName.length > 0 && !isValidS3BucketName(trimmedBucketName);
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
        'xpack.observability_onboarding.cloudforwarderPanel.configureForwarderTitle',
        {
          defaultMessage: 'Configure the Cloud Forwarder',
        }
      ),
      children: (
        <>
          {status !== FETCH_STATUS.SUCCESS && (
            <>
              <EuiSkeletonText lines={2} />
              <EuiSpacer />
              <EuiSkeletonRectangle width="100%" height="40px" />
              <EuiSpacer size="m" />
              <EuiSkeletonText lines={1} />
              <EuiSpacer />
              <EuiSkeletonRectangle width="100%" height="40px" />
            </>
          )}
          {status === FETCH_STATUS.SUCCESS && data !== undefined && (
            <>
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.observability_onboarding.cloudforwarderPanel.configureForwarderDescription"
                    defaultMessage="Enter the name of the S3 bucket containing your AWS logs."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiFormRow
                label={i18n.translate(
                  'xpack.observability_onboarding.cloudforwarderPanel.s3BucketNameLabel',
                  {
                    defaultMessage: 'S3 Bucket Name',
                  }
                )}
                isInvalid={isBucketNameInvalid}
                error={
                  isBucketNameInvalid
                    ? i18n.translate(
                        'xpack.observability_onboarding.cloudforwarderPanel.s3BucketNameError',
                        {
                          defaultMessage:
                            'Enter a valid S3 bucket name (3-63 lowercase characters, numbers, hyphens, or periods)',
                        }
                      )
                    : undefined
                }
              >
                <EuiFieldText
                  data-test-subj="observabilityOnboardingCloudForwarderS3BucketNameInput"
                  value={s3BucketName}
                  onChange={(e) => setS3BucketName(e.target.value)}
                  isInvalid={isBucketNameInvalid}
                  placeholder={i18n.translate(
                    'xpack.observability_onboarding.cloudforwarderPanel.s3BucketNamePlaceholder',
                    {
                      defaultMessage: 'my-logs-bucket',
                    }
                  )}
                />
              </EuiFormRow>
              <EuiSpacer size="l" />
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.observability_onboarding.cloudforwarderPanel.selectLogTypeDescription"
                    defaultMessage="Select the type of AWS logs you want to forward from your S3 bucket."
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
              <EuiSkeletonText lines={1} />
              <EuiSpacer />
              <EuiSkeletonRectangle width="170px" height="40px" />
            </>
          )}
          {status === FETCH_STATUS.SUCCESS && data !== undefined && (
            <>
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.observability_onboarding.cloudforwarderPanel.launchStackDescription"
                    defaultMessage="Launch the CloudFormation stack in AWS to deploy the EDOT Cloud Forwarder."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="l" />
              <EuiButton
                data-test-subj="observabilityOnboardingCloudForwarderLaunchStackButton"
                href={buildCloudFormationUrl(
                  selectedLogType,
                  data.managedOtlpServiceUrl,
                  data.apiKeyEncoded,
                  buildS3BucketArn(trimmedBucketName)
                )}
                target="_blank"
                iconSide="right"
                iconType="popout"
                fill
                isDisabled={!isValidS3BucketName(trimmedBucketName)}
              >
                {i18n.translate(
                  'xpack.observability_onboarding.cloudforwarderPanel.launchStackButtonLabel',
                  { defaultMessage: 'Launch Stack in AWS' }
                )}
              </EuiButton>
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
