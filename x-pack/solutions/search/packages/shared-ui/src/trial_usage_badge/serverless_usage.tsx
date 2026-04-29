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
  searchPowerMax?: number;
  searchPowerMin?: number;
  boostWindowHours?: number;
  llmTotalTokens?: number;
}

const MAX_BOOST_WINDOW_DAYS = 30;

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}k`;
  return String(tokens);
}

export const ServerlessUsage: React.FC<ServerlessUsageProps> = ({
  searchPowerMax,
  searchPowerMin,
  boostWindowHours,
  llmTotalTokens,
}) => {
  const boostWindowDays =
    boostWindowHours !== undefined ? Math.round(boostWindowHours / 24) : undefined;

  return (
    <>
      {searchPowerMax !== undefined && (
        <UsageMetricRow
          label={i18n.translate('xpack.searchSharedUI.trialUsageBadge.searchPowerLabel', {
            defaultMessage: 'Search Power',
          })}
          tooltip={i18n.translate('xpack.searchSharedUI.trialUsageBadge.searchPowerTooltip', {
            defaultMessage: 'Controls the speed of searches against your data.',
          })}
          value={String(searchPowerMax)}
          subtitle={
            searchPowerMin !== undefined
              ? `${searchPowerMin} / ${searchPowerMax}`
              : String(searchPowerMax)
          }
        />
      )}
      {boostWindowDays !== undefined && (
        <UsageMetricRow
          label={i18n.translate('xpack.searchSharedUI.trialUsageBadge.searchBoostLabel', {
            defaultMessage: 'Search Boost Window',
          })}
          tooltip={i18n.translate('xpack.searchSharedUI.trialUsageBadge.searchBoostTooltip', {
            defaultMessage:
              'Determines the volume of time series project data that will be considered search-ready.',
          })}
          value={i18n.translate('xpack.searchSharedUI.trialUsageBadge.boostWindowValue', {
            defaultMessage: '{days} days',
            values: { days: boostWindowDays },
          })}
          subtitle={i18n.translate('xpack.searchSharedUI.trialUsageBadge.boostWindowMax', {
            defaultMessage: 'Max {max} day',
            values: { max: MAX_BOOST_WINDOW_DAYS },
          })}
        />
      )}
      {llmTotalTokens !== undefined && (
        <UsageMetricRow
          label={i18n.translate('xpack.searchSharedUI.trialUsageBadge.serverlessLlmUsageLabel', {
            defaultMessage: 'LLM Usage',
          })}
          tooltip={i18n.translate(
            'xpack.searchSharedUI.trialUsageBadge.serverlessLlmUsageTooltip',
            { defaultMessage: 'Token usage of Elastic Managed LLMs.' }
          )}
          value={formatTokens(llmTotalTokens)}
          subtitle={`${formatTokens(llmTotalTokens)} tokens`}
        />
      )}
    </>
  );
};
