/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { UsageMetricRow } from './usage_metric_row';

export const CloudHostedUsage: React.FC = () => {
  return (
    <>
      <UsageMetricRow
        label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.storageLabel', {
          defaultMessage: 'Storage',
        })}
        tooltip={i18n.translate('xpack.searchSharedUi.trialUsageBadge.storageTooltip', {
          defaultMessage: 'The size of your deployment as specified in the hardware profile.',
        })}
        value="91%"
        progressValue={327}
        progressMax={360}
        subtitle="327 / 360GB  On-demand"
      />
      <UsageMetricRow
        label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.mlNodesLabel', {
          defaultMessage: 'ML Nodes',
        })}
        tooltip={i18n.translate('xpack.searchSharedUi.trialUsageBadge.mlNodesTooltip', {
          defaultMessage:
            'The size of your Machine Learning node as specified in the hardware profile.',
        })}
        value="42%"
        progressValue={1.7}
        progressMax={4}
        subtitle="1.7GB / 4GB"
      />
      <UsageMetricRow
        label={i18n.translate('xpack.searchSharedUi.trialUsageBadge.llmUsageLabel', {
          defaultMessage: 'LLM Usage',
        })}
        tooltip={i18n.translate('xpack.searchSharedUi.trialUsageBadge.llmUsageTooltip', {
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
