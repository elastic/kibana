/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const SLO_FEEDBACK_LINK = 'https://ela.st/slo-feedback';

interface Props {
  disabled?: boolean;
}

const feedbackButtonLabel = i18n.translate('xpack.slo.featureFeedbackButtonLabel', {
  defaultMessage: 'Give feedback',
});

export function FeedbackButton({ disabled }: Props) {
  return (
    <EuiHeaderLink
      aria-label={feedbackButtonLabel}
      href={SLO_FEEDBACK_LINK}
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
