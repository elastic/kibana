/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { UsageMetricRow } from './usage_metric_row';

export const ServerlessUsage: React.FC = () => {
  return (
    <>
      <UsageMetricRow
        label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.searchPowerLabel', {
          defaultMessage: 'Search Power',
        })}
        tooltip={i18n.translate('xpack.searchSharedUi.trialUsageBadge.searchPowerTooltip', {
          defaultMessage: 'Controls the speed of searches against your data.',
        })}
        value="91%"
        progressValue={91}
        progressMax={100}
        subtitle="91 / 100  On-demand"
      />
      <UsageMetricRow
        label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.searchBoostLabel', {
          defaultMessage: 'Search Boost Window',
        })}
        tooltip={i18n.translate('xpack.searchSharedUi.trialUsageBadge.searchBoostTooltip', {
          defaultMessage:
            'Determines the volume of time series project data that will be considered search-ready.',
        })}
        value="4 days"
        subtitle="Max 7 day"
      />
      <UsageMetricRow
        label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.serverlessLlmUsageLabel', {
          defaultMessage: 'LLM Usage',
        })}
        tooltip={i18n.translate('xpack.searchSharedUi.trialUsageBadge.serverlessLlmUsageTooltip', {
          defaultMessage: 'Token usage of Elastic Managed LLMs.',
        })}
        value="1%"
        progressValue={3000}
        progressMax={1000000}
        subtitle="3k / 1M"
      />
    </>
  );
};
