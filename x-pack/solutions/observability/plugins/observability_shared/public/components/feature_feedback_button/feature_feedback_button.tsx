/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const KIBANA_VERSION_QUERY_PARAM = 'version';
const KIBANA_DEPLOYMENT_TYPE_PARAM = 'deployment_type';
const SANITIZED_PATH_PARAM = 'path';
const ML_JOB_TYPE = 'ml_job_type';

export type NodeType = 'host' | 'pod';

const getDeploymentType = (isCloudEnv?: boolean, isServerlessEnv?: boolean): string | undefined => {
  if (isServerlessEnv) {
    return 'Serverless';
  }
  if (isCloudEnv) {
    return 'Elastic Cloud';
  }
  return 'Self-Managed';
};

const getMLJobType = (mlJobType: NodeType) =>
  mlJobType === 'pod' ? 'Pod Anomalies' : 'Host Anomalies';

export const getSurveyFeedbackURL = ({
  formUrl,
  kibanaVersion,
  sanitizedPath,
  isCloudEnv,
  isServerlessEnv,
  nodeType,
}: {
  formUrl: string;
  kibanaVersion?: string;
  deploymentType?: string;
  sanitizedPath?: string;
  mlJobType?: string;
  isCloudEnv?: boolean;
  isServerlessEnv?: boolean;
  nodeType?: NodeType;
}) => {
  const deploymentType =
    isCloudEnv !== undefined || isServerlessEnv !== undefined
      ? getDeploymentType(isCloudEnv, isServerlessEnv)
      : undefined;

  const mlJobType = nodeType ? getMLJobType(nodeType) : undefined;

  const url = new URL(formUrl);
  if (kibanaVersion) {
    url.searchParams.append(KIBANA_VERSION_QUERY_PARAM, kibanaVersion);
  }
  if (deploymentType) {
    url.searchParams.append(KIBANA_DEPLOYMENT_TYPE_PARAM, deploymentType);
  }
  if (sanitizedPath) {
    url.searchParams.append(SANITIZED_PATH_PARAM, sanitizedPath);
  }
  if (mlJobType) {
    url.searchParams.append(ML_JOB_TYPE, mlJobType);
  }

  return url.href;
};

interface FeatureFeedbackButtonProps {
  formUrl: string;
  'data-test-subj': string;
  surveyButtonText?: ReactElement;
  onClickCapture?: () => void;
  defaultButton?: boolean;
  kibanaVersion?: string;
  isCloudEnv?: boolean;
  isServerlessEnv?: boolean;
  sanitizedPath?: string;
  nodeType?: NodeType;
}

export const FeatureFeedbackButton = ({
  formUrl,
  'data-test-subj': dts,
  onClickCapture,
  defaultButton,
  kibanaVersion,
  isCloudEnv,
  isServerlessEnv,
  sanitizedPath,
  nodeType,
  surveyButtonText = (
    <FormattedMessage
      id="xpack.observabilityShared.featureFeedbackButton.tellUsWhatYouThinkLink"
      defaultMessage="Tell us what you think!"
    />
  ),
}: FeatureFeedbackButtonProps) => {
  return (
    <EuiButton
      href={getSurveyFeedbackURL({
        formUrl,
        kibanaVersion,
        isCloudEnv,
        nodeType,
        isServerlessEnv,
        sanitizedPath,
      })}
      target="_blank"
      color={defaultButton ? undefined : 'warning'}
      iconType={defaultButton ? undefined : 'editorComment'}
      data-test-subj={dts}
      onClickCapture={onClickCapture}
    >
      {surveyButtonText}
    </EuiButton>
  );
};
