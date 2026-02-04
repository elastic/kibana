/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getSurveyFeedbackURL } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePluginContext } from '../../../../hooks/use_plugin_context';

const SLO_FEEDBACK_LINK = 'https://ela.st/slo-feedback';

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
      iconType="popout"
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
