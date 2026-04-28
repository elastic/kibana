/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { UsageMetricRow } from './usage_metric_row';

interface CloudHostedUsageProps {
  storageUsage?: string;
  mlNodeCount?: number;
  mlMemoryLimit?: string;
  llmTotalTokens?: number;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}k`;
  return String(tokens);
}

export const CloudHostedUsage: React.FC<CloudHostedUsageProps> = ({
  storageUsage,
  mlNodeCount,
  mlMemoryLimit,
  llmTotalTokens,
}) => {
  return (
    <>
      {storageUsage !== undefined && (
        <UsageMetricRow
          label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.storageLabel', {
            defaultMessage: 'Storage',
          })}
          tooltip={i18n.translate('xpack.searchSharedUi.trialUsageBadge.storageTooltip', {
            defaultMessage: 'The size of your deployment as specified in the hardware profile.',
          })}
          value={storageUsage}
          subtitle={storageUsage}
        />
      )}
      {mlNodeCount !== undefined && mlMemoryLimit !== undefined && (
        <UsageMetricRow
          label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.mlNodesLabel', {
            defaultMessage: 'ML Nodes',
          })}
          tooltip={i18n.translate('xpack.searchSharedUi.trialUsageBadge.mlNodesTooltip', {
            defaultMessage:
              'The size of your Machine Learning node as specified in the hardware profile.',
          })}
          value={`${mlNodeCount} nodes`}
          subtitle={`Max memory: ${mlMemoryLimit}`}
        />
      )}
      {llmTotalTokens !== undefined && (
        <UsageMetricRow
          label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.llmUsageLabel', {
            defaultMessage: 'LLM Usage',
          })}
          tooltip={i18n.translate('xpack.searchSharedUi.trialUsageBadge.llmUsageTooltip', {
            defaultMessage: 'Token usage of Elastic Managed LLMs.',
          })}
          value={formatTokens(llmTotalTokens)}
          subtitle={`${formatTokens(llmTotalTokens)} tokens`}
        />
      )}
    </>
  );
};
