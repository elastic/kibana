/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_CONTEXT } from '@kbn/rule-data-utils';
import type { TopAlert } from '../../../../../typings/alerts';

export const getInventoryOrMetricThresholdRuleData = ({ alert }: { alert: TopAlert }) => {
  const metricAlias = (alert.fields[ALERT_CONTEXT] as { metricAlias?: unknown })?.metricAlias;
  if (typeof metricAlias !== 'string') {
    return {};
  }

  return {
    discoverAppLocatorParams: {
      dataViewSpec: { title: metricAlias, timeFieldName: '@timestamp' },
    },
  };
};
