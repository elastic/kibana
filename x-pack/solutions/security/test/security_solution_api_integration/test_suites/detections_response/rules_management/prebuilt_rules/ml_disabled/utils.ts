/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { ML_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { RuleParamsWithDefaultValue } from '@kbn/response-ops-rule-params';
import { CreateRuleRequestBody } from '@kbn/alerting-plugin/common/routes/rule/apis/create';
import { createRuleThroughAlertingEndpoint } from '../../../utils';

/**
 * Creates a machine learning rule through the alerting endpoint.
 * Useful during testing under Basic and Essential licenses, as the DE rule creation API does not permit the creation of ML rules under those licenses.
 */
export async function createMlRuleThroughAlertingEndpoint(
  supertest: SuperTest.Agent,
  paramsOverride: Partial<RuleParamsWithDefaultValue> = {}
): Promise<void> {
  const params: RuleParamsWithDefaultValue = {
    alertSuppression: undefined,
    anomalyThreshold: 50,
    author: [],
    description: 'rule',
    exceptionsList: [],
    falsePositives: [],
    from: 'now-5m',
    immutable: true,
    machineLearningJobId: ['ml-rule-job'],
    outputIndex: '',
    references: [],
    responseActions: undefined,
    riskScore: 1,
    riskScoreMapping: [],
    ruleId: 'ml-rule',
    severity: 'low',
    severityMapping: [],
    threat: [],
    to: 'now',
    type: 'machine_learning',
    version: 1,
    ...paramsOverride,
  };

  const body: CreateRuleRequestBody<RuleParamsWithDefaultValue> = {
    actions: [],
    consumer: 'siem',
    enabled: false,
    name: 'Test ML rule',
    params,
    rule_type_id: ML_RULE_TYPE_ID,
    schedule: {
      interval: '5m',
    },
    tags: [],
    throttle: null,
  };

  await createRuleThroughAlertingEndpoint(supertest, body);
}
