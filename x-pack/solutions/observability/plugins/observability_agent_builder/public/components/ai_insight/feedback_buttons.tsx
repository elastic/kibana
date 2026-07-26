/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';

export type Feedback = 'positive' | 'negative';

interface FeedbackButtonsProps {
  onClickFeedback: (feedback: Feedback) => void;
}

const THANK_YOU_MESSAGE = i18n.translate(
  'xpack.observabilityAgentBuilder.feedbackButtons.notificationLabel',
  { defaultMessage: 'Thanks for your feedback' }
);

export function FeedbackButtons({ onClickFeedback }: FeedbackButtonsProps) {
  const { notifications } = useKibana().services;
  const isFeedbackEnabled = notifications.feedback.isEnabled();

  const [hasBeenClicked, setHasBeenClicked] = useState(false);

  const handleClick = (feedback: Feedback) => {
    setHasBeenClicked(true);
    notifications.toasts.addSuccess(THANK_YOU_MESSAGE);
    onClickFeedback(feedback);
  };

  if (!isFeedbackEnabled) {
    return null;
  }

  return (
    <EuiFlexGroup responsive={false} direction="row" alignItems="center" gutterSize="s" wrap>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          <em>
            {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.feedbackButtons.title', {
              defaultMessage: 'Was this helpful?',
            })}
          </em>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} direction="row" alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="observabilityAgentBuilderFeedbackPositiveButton"
              color="success"
              disabled={hasBeenClicked}
              iconType="faceHappy"
              size="s"
              onClick={() => handleClick('positive')}
            >
              {i18n.translate(
                'xpack.observabilityAgentBuilder.aiInsight.feedbackButtons.yesLabel',
                {
                  defaultMessage: 'Yes',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="observabilityAgentBuilderFeedbackNegativeButton"
              color="danger"
              disabled={hasBeenClicked}
              iconType="faceSad"
              size="s"
              onClick={() => handleClick('negative')}
            >
              {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.feedbackButtons.noLabel', {
                defaultMessage: 'No',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
