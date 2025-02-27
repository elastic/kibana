/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiHealth, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { MlModelDeploymentState } from '../../../../../../common/types/ml';
import { TrainedModelState } from '../../../../../../common/types/pipelines';

const modelNotDownloadedText = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.notDownloaded',
  {
    defaultMessage: 'Not deployed',
  }
);
const modelNotDownloadedTooltip = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.notDownloaded.tooltip',
  {
    defaultMessage: 'This trained model can be deployed',
  }
);
const modelDownloadingText = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.downloading',
  {
    defaultMessage: 'Deploying',
  }
);
const modelDownloadingTooltip = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.downloading.tooltip',
  {
    defaultMessage: 'This trained model is deploying',
  }
);
const modelDownloadedText = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.downloaded',
  {
    defaultMessage: 'Deployed',
  }
);
const modelDownloadedTooltip = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.downloaded.tooltip',
  {
    defaultMessage: 'This trained model is deployed and can be started',
  }
);
const modelStartedText = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.started',
  {
    defaultMessage: 'Started',
  }
);
const modelStartedTooltip = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.started.tooltip',
  {
    defaultMessage: 'This trained model is running and fully available',
  }
);
const modelStartingText = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.starting',
  {
    defaultMessage: 'Starting',
  }
);
const modelStartingTooltip = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.starting.tooltip',
  {
    defaultMessage:
      'This trained model is in the process of starting up and will be available shortly',
  }
);
const modelStoppingText = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.stopping',
  {
    defaultMessage: 'Stopping',
  }
);
const modelStoppingTooltip = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.stopping.tooltip',
  {
    defaultMessage:
      'This trained model is in the process of shutting down and is currently unavailable',
  }
);
const modelDeploymentFailedText = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.deploymentFailed',
  {
    defaultMessage: 'Deployment failed',
  }
);
const modelNotDeployedText = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.notDeployed',
  {
    defaultMessage: 'Not started',
  }
);
const modelNotDeployedTooltip = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.modelState.notDeployed.tooltip',
  {
    defaultMessage:
      'This trained model is not currently started. Visit the trained models page to make changes',
  }
);

export interface TrainedModelHealthProps {
  modelState: TrainedModelState | MlModelDeploymentState;
  modelStateReason?: string;
  isDownloadable?: boolean;
  onClickAction?: Function;
}

export const TrainedModelHealth: React.FC<TrainedModelHealthProps> = ({
  modelState,
  modelStateReason,
  isDownloadable,
  onClickAction,
}) => {
  let modelHealth: {
    healthColor: string;
    healthText: React.ReactNode;
    tooltipText: React.ReactNode;
  };
  switch (modelState) {
    case TrainedModelState.NotDeployed:
    case MlModelDeploymentState.NotDeployed:
      modelHealth = {
        healthColor: isDownloadable ? 'subdued' : 'danger',
        healthText: isDownloadable ? modelNotDownloadedText : modelNotDeployedText,
        tooltipText: isDownloadable ? modelNotDownloadedTooltip : modelNotDeployedTooltip,
      };
      break;
    case MlModelDeploymentState.Downloading:
      modelHealth = {
        healthColor: 'warning',
        healthText: modelDownloadingText,
        tooltipText: modelDownloadingTooltip,
      };
      break;
    case MlModelDeploymentState.Downloaded:
      modelHealth = {
        healthColor: 'subdued',
        healthText: modelDownloadedText,
        tooltipText: modelDownloadedTooltip,
      };
      break;
    case TrainedModelState.Starting:
    case MlModelDeploymentState.Starting:
      modelHealth = {
        healthColor: 'warning',
        healthText: modelStartingText,
        tooltipText: modelStartingTooltip,
      };
      break;
    case TrainedModelState.Started:
    case MlModelDeploymentState.Started:
    case MlModelDeploymentState.FullyAllocated:
      modelHealth = {
        healthColor: 'success',
        healthText: modelStartedText,
        tooltipText: modelStartedTooltip,
      };
      break;
    case TrainedModelState.Stopping:
      modelHealth = {
        healthColor: 'warning',
        healthText: modelStoppingText,
        tooltipText: modelStoppingTooltip,
      };
      break;
    case TrainedModelState.Failed:
      modelHealth = {
        healthColor: 'danger',
        healthText: modelDeploymentFailedText,
        tooltipText: (
          <FormattedMessage
            id="xpack.enterpriseSearch.inferencePipelineCard.modelState.deploymentFailed.tooltip"
            defaultMessage="The trained model failed to deploy. {reason}"
            values={{
              reason: modelStateReason
                ? i18n.translate(
                    'xpack.enterpriseSearch.inferencePipelineCard.modelState.deploymentFailed.tooltip.reason',
                    {
                      defaultMessage: 'Reason: {modelStateReason}',
                      values: {
                        modelStateReason,
                      },
                    }
                  )
                : '',
            }}
          />
        ),
      };
      break;
    default:
      modelHealth = {
        healthColor: 'danger',
        healthText: modelNotDeployedText,
        tooltipText: modelNotDeployedTooltip,
      };
      break;
  }
  return (
    <EuiToolTip content={modelHealth.tooltipText}>
      {onClickAction ? (
        <EuiButtonEmpty
          data-test-subj="enterpriseSearchTrainedModelHealthPopoverButton"
          iconSide="right"
          flush="both"
          iconType="boxesHorizontal"
          onClick={() => onClickAction()}
        >
          <EuiHealth color={modelHealth.healthColor}>{modelHealth.healthText}</EuiHealth>
        </EuiButtonEmpty>
      ) : (
        <EuiHealth color={modelHealth.healthColor}>{modelHealth.healthText}</EuiHealth>
      )}
    </EuiToolTip>
  );
};
