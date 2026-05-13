/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePluginContext } from '../../../../hooks/use_plugin_context';

const SLO_FEEDBACK_LINK = 'https://ela.st/slo-feedback';
const KIBANA_VERSION_QUERY_PARAM = 'version';
const KIBANA_DEPLOYMENT_TYPE_PARAM = 'deployment_type';
const SANITIZED_PATH_PARAM = 'path';

const getDeploymentType = (isCloudEnv?: boolean, isServerlessEnv?: boolean): string => {
  if (isServerlessEnv) {
    return 'Serverless';
  }
  if (isCloudEnv) {
    return 'Elastic Cloud';
  }
  return 'Self-Managed';
};

const getSurveyFeedbackURL = ({
  formUrl,
  kibanaVersion,
  sanitizedPath,
  isCloudEnv,
  isServerlessEnv,
}: {
  formUrl: string;
  kibanaVersion?: string;
  sanitizedPath?: string;
  isCloudEnv?: boolean;
  isServerlessEnv?: boolean;
}) => {
  const deploymentType =
    isCloudEnv !== undefined || isServerlessEnv !== undefined
      ? getDeploymentType(isCloudEnv, isServerlessEnv)
      : undefined;

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

  return url.href;
};

interface Props {
  disabled?: boolean;
}

const feedbackButtonLabel = i18n.translate('xpack.slo.featureFeedbackButtonLabel', {
  defaultMessage: 'Give feedback',
});

export function FeedbackButton({ disabled }: Props) {
  const { kibanaVersion, cloud, notifications } = useKibana().services;
  const { isServerless } = usePluginContext();
  const isFeedbackEnabled = notifications?.feedback?.isEnabled() ?? true;

  const feedbackUrl = getSurveyFeedbackURL({
    formUrl: SLO_FEEDBACK_LINK,
    kibanaVersion,
    isCloudEnv: cloud?.isCloudEnabled,
    isServerlessEnv: isServerless,
    sanitizedPath: window.location.pathname,
  });

  if (!isFeedbackEnabled) return null;

  return (
    <EuiHeaderLink
      aria-label={feedbackButtonLabel}
      href={feedbackUrl}
      size="s"
      iconType="external"
      iconSide="right"
      target="_blank"
      color="primary"
      isDisabled={disabled}
      data-test-subj="sloFeedbackButton"
    >
      {feedbackButtonLabel}
    </EuiHeaderLink>
  );
}
