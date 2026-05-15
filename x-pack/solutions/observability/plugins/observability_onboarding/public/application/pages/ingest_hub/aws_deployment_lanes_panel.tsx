/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AwsService } from './aws_services_data';
import {
  AWS_INTEGRATION_INPUT_LABELS,
  getUnionInputRequirementsForSelection,
  type AwsIntegrationInputId,
} from './aws_integration_matrix';
import {
  type AwsDeploymentConfigValues,
  type AwsDeploymentLane,
  type AwsDeploymentPlan,
  resolveS3LogsDeliveryMethod,
  serviceNamesForLane,
} from './aws_deployment_plan';

export interface AwsDeploymentLanesPanelProps {
  readonly plan: AwsDeploymentPlan;
  readonly catalog: readonly AwsService[];
  readonly config: AwsDeploymentConfigValues;
  readonly onConfigChange: (patch: AwsDeploymentConfigValues) => void;
  readonly s3LogsDeliveryChoice: 'cloud_forwarder' | 'firehose';
  readonly onS3LogsDeliveryChoiceChange: (choice: 'cloud_forwarder' | 'firehose') => void;
  readonly s3LogsSetup: React.ReactNode;
  readonly agentBasedSetup?: React.ReactNode;
}

function laneTitle(lane: AwsDeploymentLane): string {
  switch (lane.id) {
    case 'agentless':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.lane.agentlessTitle',
        {
          defaultMessage: 'Agentless collection',
        }
      );
    case 's3_logs':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.deployment.lane.s3LogsTitle', {
        defaultMessage: 'S3 or Firehose log delivery',
      });
    case 'httpjson':
      return i18n.translate('xpack.observabilityOnboarding.awsPage.deployment.lane.httpjsonTitle', {
        defaultMessage: 'HTTP API collection',
      });
    case 'agent_based':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.lane.agentBasedTitle',
        {
          defaultMessage: 'Elastic Agent',
        }
      );
    default:
      return lane.id;
  }
}

function laneDescription(lane: AwsDeploymentLane): string {
  switch (lane.id) {
    case 'agentless':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.lane.agentlessDescription',
        {
          defaultMessage:
            'Poll CloudWatch metrics and log groups, and other agentless integrations—no forwarder stack required for these sources.',
        }
      );
    case 's3_logs':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.lane.s3LogsDescription',
        {
          defaultMessage:
            'Access logs and similar data that land in S3 or Amazon Data Firehose. Choose how Elastic ingests them.',
        }
      );
    case 'httpjson':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.lane.httpjsonDescription',
        {
          defaultMessage: 'Pull findings from AWS APIs using Elastic’s HTTP input.',
        }
      );
    case 'agent_based':
      return i18n.translate(
        'xpack.observabilityOnboarding.awsPage.deployment.lane.agentBasedDescription',
        {
          defaultMessage:
            'These sources are not in the Version 1 matrix yet—use Elastic Agent policies to collect them.',
        }
      );
    default:
      return '';
  }
}

const AwsDeploymentLaneServices: React.FC<{
  readonly names: readonly string[];
}> = ({ names }) => (
  <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
    {names.map((name) => (
      <EuiFlexItem grow={false} key={name}>
        <EuiBadge color="hollow">{name}</EuiBadge>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

const AwsDeploymentMatrixInputs: React.FC<{
  readonly lane: AwsDeploymentLane;
  readonly config: AwsDeploymentConfigValues;
  readonly onConfigChange: (patch: AwsDeploymentConfigValues) => void;
  readonly s3LogsDeliveryChoice: 'cloud_forwarder' | 'firehose';
}> = ({ lane, config, onConfigChange, s3LogsDeliveryChoice }) => {
  const matrixMethod =
    lane.id === 's3_logs'
      ? resolveS3LogsDeliveryMethod({ choice: s3LogsDeliveryChoice, lane })
      : lane.matrixDeliveryMethod;

  if (matrixMethod === 'agent_based') {
    return null;
  }

  const { required, requireOneOf } =
    lane.id === 's3_logs'
      ? getUnionInputRequirementsForSelection({
          serviceIds: new Set(lane.serviceIds),
          deliveryMethod: matrixMethod,
        })
      : lane.inputRequirements;

  const renderInput = (inputId: AwsIntegrationInputId) => {
    const meta = AWS_INTEGRATION_INPUT_LABELS[inputId];
    const isMultiline =
      inputId === 'cloudwatch_log_group' ||
      inputId === 'cloudwatch_namespace' ||
      inputId === 'regions';
    const value = config[inputId] ?? '';

    return (
      <EuiFormRow
        key={inputId}
        fullWidth
        label={meta.label}
        helpText={meta.helpText}
        data-test-subj={`awsOnboardingDeploymentInput-${inputId}`}
      >
        {isMultiline ? (
          <EuiTextArea
            data-test-subj="observabilityOnboardingRenderInputTextArea"
            fullWidth
            compressed
            value={value}
            placeholder={meta.placeholder}
            rows={inputId === 'regions' ? 2 : 3}
            onChange={(event) => onConfigChange({ [inputId]: event.target.value })}
          />
        ) : (
          <EuiFieldText
            data-test-subj="observabilityOnboardingRenderInputFieldText"
            fullWidth
            compressed
            value={value}
            placeholder={meta.placeholder}
            onChange={(event) => onConfigChange({ [inputId]: event.target.value })}
          />
        )}
      </EuiFormRow>
    );
  };

  return (
    <>
      {required.map((inputId) => renderInput(inputId))}
      {requireOneOf.map((group, groupIndex) => (
        <React.Fragment key={group.join('-')}>
          {groupIndex === 0 && requireOneOf.length > 0 ? (
            <>
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                <p style={{ margin: 0 }}>
                  {i18n.translate(
                    'xpack.observabilityOnboarding.awsPage.deployment.lane.requireOneOfHint',
                    {
                      defaultMessage: 'Provide at least one of the following:',
                    }
                  )}
                </p>
              </EuiText>
              <EuiSpacer size="s" />
            </>
          ) : null}
          {group.map((inputId) => renderInput(inputId))}
        </React.Fragment>
      ))}
    </>
  );
};

const AwsDeploymentLanePanel: React.FC<{
  readonly lane: AwsDeploymentLane;
  readonly catalog: readonly AwsService[];
  readonly config: AwsDeploymentConfigValues;
  readonly onConfigChange: (patch: AwsDeploymentConfigValues) => void;
  readonly s3LogsDeliveryChoice: 'cloud_forwarder' | 'firehose';
  readonly onS3LogsDeliveryChoiceChange: (choice: 'cloud_forwarder' | 'firehose') => void;
  readonly s3LogsSetup: React.ReactNode;
  readonly agentBasedSetup?: React.ReactNode;
  readonly laneIndex: number;
}> = ({
  lane,
  catalog,
  config,
  onConfigChange,
  s3LogsDeliveryChoice,
  onS3LogsDeliveryChoiceChange,
  s3LogsSetup,
  agentBasedSetup,
  laneIndex,
}) => {
  const serviceNames = serviceNamesForLane(lane, catalog);
  const showS3MethodToggle =
    lane.id === 's3_logs' && lane.supportsCloudForwarder && lane.supportsFirehose;

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={`awsOnboardingDeploymentLane-${lane.id}`}>
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="primary">{laneIndex + 1}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiTitle size="xxs">
            <h3 style={{ margin: 0 }}>{laneTitle(lane)}</h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p style={{ margin: 0 }}>{laneDescription(lane)}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <AwsDeploymentLaneServices names={serviceNames} />
      <EuiSpacer size="m" />
      {showS3MethodToggle ? (
        <>
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.observabilityOnboarding.awsPage.deployment.lane.s3MethodLegend',
              {
                defaultMessage: 'Log delivery method',
              }
            )}
            buttonSize="compressed"
            idSelected={s3LogsDeliveryChoice}
            onChange={(id) => {
              const nextChoice = id as 'cloud_forwarder' | 'firehose';
              if (nextChoice !== s3LogsDeliveryChoice) {
                onS3LogsDeliveryChoiceChange(nextChoice);
              }
            }}
            options={[
              {
                id: 'cloud_forwarder',
                label: i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.deployment.cloudForwarderTitle',
                  { defaultMessage: 'EDOT Cloud Forwarder' }
                ),
              },
              {
                id: 'firehose',
                label: i18n.translate(
                  'xpack.observabilityOnboarding.awsPage.deployment.firehoseTitle',
                  { defaultMessage: 'Amazon Data Firehose' }
                ),
              },
            ]}
            data-test-subj="awsOnboardingDeploymentS3LogsMethod"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      {lane.id !== 's3_logs' && lane.id !== 'agent_based' ? (
        <AwsDeploymentMatrixInputs
          lane={lane}
          config={config}
          onConfigChange={onConfigChange}
          s3LogsDeliveryChoice={s3LogsDeliveryChoice}
        />
      ) : null}
      {lane.id === 's3_logs' ? (
        <>
          <AwsDeploymentMatrixInputs
            lane={lane}
            config={config}
            onConfigChange={onConfigChange}
            s3LogsDeliveryChoice={s3LogsDeliveryChoice}
          />
          <EuiSpacer size="m" />
          {s3LogsSetup}
        </>
      ) : null}
      {lane.id === 'agent_based' && agentBasedSetup ? (
        <>
          <EuiSpacer size="m" />
          {agentBasedSetup}
        </>
      ) : null}
    </EuiPanel>
  );
};

export const AwsDeploymentLanesPanel: React.FC<AwsDeploymentLanesPanelProps> = ({
  plan,
  catalog,
  config,
  onConfigChange,
  s3LogsDeliveryChoice,
  onS3LogsDeliveryChoiceChange,
  s3LogsSetup,
  agentBasedSetup,
}) => {
  const laneCount = plan.lanes.length;

  return (
    <>
      <EuiCallOut
        data-test-subj="awsOnboardingDeploymentPlanIntro"
        title={i18n.translate('xpack.observabilityOnboarding.awsPage.deployment.planIntroTitle', {
          defaultMessage:
            '{count, plural, one {# deployment path} other {# deployment paths}} for your selection',
          values: { count: laneCount },
        })}
        color="primary"
        iconType="cluster"
      >
        <p style={{ margin: 0 }}>
          {i18n.translate('xpack.observabilityOnboarding.awsPage.deployment.planIntroBody', {
            defaultMessage:
              'Elastic grouped your AWS sources by how they must be collected in the matrix. Complete each path below—some selections need agentless polling, others need S3 or Firehose delivery.',
          })}
        </p>
      </EuiCallOut>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" gutterSize="m">
        {plan.lanes.map((lane, index) => (
          <EuiFlexItem grow={false} key={lane.id}>
            <AwsDeploymentLanePanel
              lane={lane}
              catalog={catalog}
              config={config}
              onConfigChange={onConfigChange}
              s3LogsDeliveryChoice={s3LogsDeliveryChoice}
              onS3LogsDeliveryChoiceChange={onS3LogsDeliveryChoiceChange}
              s3LogsSetup={s3LogsSetup}
              agentBasedSetup={agentBasedSetup}
              laneIndex={index}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
