/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionApiProvider as DetectionsApiProvider } from '@kbn/security-solution-test-api-clients/supertest/detections.gen';

import { getCustomQueryRuleParams } from '../get_rule_params';

/**
 * Customizes a rule with the given parameters.
 * @param ruleId - The ID of the rule to customize
 * @param customizations - Custom parameters for the rule
 */
export async function customizeRule(
  detectionsApi: ReturnType<typeof DetectionsApiProvider>,
  ruleId: string,
  customizations: Record<string, any>
) {
  const customRuleParams = getCustomQueryRuleParams({
    rule_id: ruleId,
    ...customizations,
  });

  await detectionsApi.updateRule({ body: customRuleParams }).expect(200);
}
