/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionsMetric, MlJobUsage } from './types';

export const updateMlJobUsage = (jobMetric: DetectionsMetric, usage: MlJobUsage): MlJobUsage => {
  const { isEnabled, isElastic } = jobMetric;
  if (isEnabled && isElastic) {
    return {
      ...usage,
      elastic: {
        ...usage.elastic,
        enabled: usage.elastic.enabled + 1,
      },
    };
  } else if (!isEnabled && isElastic) {
    return {
      ...usage,
      elastic: {
        ...usage.elastic,
        disabled: usage.elastic.disabled + 1,
      },
    };
  } else if (isEnabled && !isElastic) {
    return {
      ...usage,
      custom: {
        ...usage.custom,
        enabled: usage.custom.enabled + 1,
      },
    };
  } else if (!isEnabled && !isElastic) {
    return {
      ...usage,
      custom: {
        ...usage.custom,
        disabled: usage.custom.disabled + 1,
      },
    };
  } else {
    return usage;
  }
};
