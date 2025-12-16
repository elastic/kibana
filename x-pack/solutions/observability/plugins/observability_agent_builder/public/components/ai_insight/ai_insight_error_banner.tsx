/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiButton } from '@elastic/eui';

export interface AiInsightErrorBannerProps {
  error: string;
  onRetry?: () => void;
}

export function AiInsightErrorBanner({ error, onRetry }: AiInsightErrorBannerProps) {
  return (
    <EuiCallOut
      announceOnMount
      color="danger"
      iconType="alert"
      title={i18n.translate('xpack.observabilityAgentBuilder.aiInsight.errorTitle', {
        defaultMessage: 'Failed to generate AI insight',
      })}
      data-test-subj="AiInsightErrorBanner"
    >
      <p>
        {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.errorMessage', {
          defaultMessage: 'The AI insight could not be generated: {error}',
          values: { error },
        })}
      </p>
      {onRetry && (
        <EuiButton size="s" onClick={onRetry} data-test-subj="AiInsightErrorBannerRetryButton">
          {i18n.translate('xpack.observabilityAgentBuilder.aiInsight.retryButton', {
            defaultMessage: 'Try again',
          })}
        </EuiButton>
      )}
    </EuiCallOut>
  );
}
