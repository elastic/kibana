/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Threshold,
  ThresholdRule,
  ThresholdRuleCreateProps,
} from '../../../api/detection_engine/model/rule_schema';

export const extractRuleThreshold = (rule: ThresholdRule | ThresholdRuleCreateProps): Threshold => {
  const cardinality =
    rule.threshold.cardinality && rule.threshold.cardinality.length
      ? rule.threshold.cardinality
      : undefined;
  return {
    value: rule.threshold.value,
    field: rule.threshold.field,
    cardinality,
  };
};
