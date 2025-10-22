/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import type { CustomThresholdExpressionMetric } from '../../../../common/custom_threshold_rule/types';
import { InfraFormatterType } from '../../../../common/custom_threshold_rule/types';

export const metricToFormat = (metric?: CustomThresholdExpressionMetric) => {
  if (metric && metric.field) {
    const suffix = last(metric.field.split(/\./));
    if (suffix === 'pct') {
      return InfraFormatterType.percent;
    }
    if (suffix === 'bytes') {
      return InfraFormatterType.bytes;
    }
  }
  return InfraFormatterType.number;
};
