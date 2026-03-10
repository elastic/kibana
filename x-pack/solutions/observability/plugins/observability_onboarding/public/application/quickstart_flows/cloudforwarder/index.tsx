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
import { OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import { type LogType } from '../../../../common/aws_cloudforwarder';
import { isValidS3BucketName, buildS3BucketArn, buildCloudFormationUrl } from './utils';

const EDOT_CLOUD_FORWARDER_DOCS_URL =
  'https://www.elastic.co/docs/reference/opentelemetry/edot-cloud-forwarder/aws';

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
      analytics,
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
          cloudforwarder: { cloudServiceProvider },
        }}
        onRetryClick={refetch}
      />
    );
  }

  const logTypeOptions: Array<{ id: LogType; label: string }> = [
    {
      id: 'vpcflow',
      label: i18n.translate('xpack.observability_onboarding.cloudforwarder.logType.vpcflow', {
        defaultMessage: 'VPC Flow Logs',
      }),
    },
    {
      id: 'elbaccess',
      label: i18n.translate('xpack.observability_onboarding.cloudforwarder.logType.elbaccess', {
        defaultMessage: 'ELB Access Logs',
      }),
    },
    {
      id: 'cloudtrail',
      label: i18n.translate('xpack.observability_onboarding.cloudforwarder.logType.cloudtrail', {
        defaultMessage: 'CloudTrail Logs',
      }),
    },
  ];

  const steps = [
    {
      title: i18n.translate(
        'xpack.observability_onboarding.cloudforwarderPanel.prerequisitesTitle',
        {
          defaultMessage: 'Prerequisites',
        }
      ),
      children: (
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
                    defaultMessage="Launch the CloudFormation stack in AWS to deploy the EDOT Cloud Forwarder. This will deploy it in your default AWS Region, be sure to switch your region in the AWS console to the region your s3 bucket resides in before deploying the stack."
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
                onClick={() => {
                  analytics?.reportEvent(
                    OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT.eventType,
                    {
                      onboardingFlowType: 'cloudforwarder',
                      onboardingId: data.onboardingId,
                      step: 'aws_launch_stack',
                      context: {
                        cloudforwarder: {
                          cloudServiceProvider,
                          selectedLogType,
                        },
                      },
                    }
                  );
                }}
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
