/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threshold } from '../../../api/detection_engine/model/rule_schema';

export const normalizeRuleThreshold = (threshold: Threshold): Threshold => {
  const cardinality =
    threshold.cardinality && threshold.cardinality.length ? threshold.cardinality : undefined;
  return {
    value: threshold.value,
    field: threshold.field,
    cardinality,
  };
};
