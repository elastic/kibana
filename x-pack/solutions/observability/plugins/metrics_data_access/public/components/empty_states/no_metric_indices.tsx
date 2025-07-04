/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const noMetricIndicesPromptPrimaryActionTitle = i18n.translate(
  'xpack.metricsData.metrics.noDataConfig.beatsCard.title',
  {
    defaultMessage: 'Add a metrics integration',
  }
);

export const noMetricIndicesPromptDescription = i18n.translate(
  'xpack.metricsData.metrics.noDataConfig.beatsCard.description',
  {
    defaultMessage:
      'Use Beats to send metrics data to Elasticsearch. We make it easy with modules for many popular systems and apps.',
  }
);

export const noMetricIndicesPromptTitle = i18n.translate(
  'xpack.metricsData.metrics.noDataConfig.promptTitle',
  { defaultMessage: 'Add metrics data' }
);
