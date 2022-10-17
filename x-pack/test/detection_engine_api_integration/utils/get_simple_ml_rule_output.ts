/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MachineLearningRule } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import { getMockSharedResponseSchema } from './get_simple_rule_output';
import { removeServerGeneratedProperties } from './remove_server_generated_properties';

const getBaseMlRuleOutput = (ruleId = 'rule-1'): MachineLearningRule => {
  return {
    ...getMockSharedResponseSchema(ruleId),
    name: 'Simple ML Rule',
    description: 'Simple Machine Learning Rule',
    anomaly_threshold: 44,
    machine_learning_job_id: ['some_job_id'],
    type: 'machine_learning',
  };
};

export const getSimpleMlRuleOutput = (ruleId = 'rule-1') => {
  return removeServerGeneratedProperties(getBaseMlRuleOutput(ruleId));
};
