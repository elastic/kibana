/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../utils/kibana_react';

const LOGS_ALERT_DETAILS_FEEDBACK_LINK = 'https://ela.st/log-alert-details-feedback';
const feedbackButtonLabel = i18n.translate(
  'xpack.observability.logs.alertDetails.feedbackButtonLabel',
  {
    defaultMessage: 'Give feedback',
  }
);
export function FeedbackButton() {
  const { notifications } = useKibana().services;
  const isFeedbackEnabled = notifications?.feedback?.isEnabled() ?? true;

  if (!isFeedbackEnabled) return null;

  return (
    <EuiButtonEmpty
      aria-label={feedbackButtonLabel}
      href={LOGS_ALERT_DETAILS_FEEDBACK_LINK}
      size="s"
      iconType="popout"
      iconSide="right"
      target="_blank"
      data-test-subj="logsAlertDetailsFeedbackButton"
    >
      {feedbackButtonLabel}
    </EuiButtonEmpty>
  );
}
