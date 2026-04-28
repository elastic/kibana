/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { UsageMetricRow } from './usage_metric_row';

interface ServerlessUsageProps {
  llmTotalTokens?: number;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}k`;
  return String(tokens);
}

export const ServerlessUsage: React.FC<ServerlessUsageProps> = ({ llmTotalTokens }) => {
  return (
    <>
      {llmTotalTokens !== undefined && (
        <UsageMetricRow
          label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.serverlessLlmUsageLabel', {
            defaultMessage: 'LLM Usage',
          })}
          tooltip={i18n.translate(
            'xpack.searchSharedUi.trialUsageBadge.serverlessLlmUsageTooltip',
            { defaultMessage: 'Token usage of Elastic Managed LLMs.' }
          )}
          value={formatTokens(llmTotalTokens)}
          subtitle={`${formatTokens(llmTotalTokens)} tokens`}
        />
      )}
    </>
  );
};
