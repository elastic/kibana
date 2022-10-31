/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type {
  RuleCreateProps,
  PreviewRulesSchema,
  RulePreviewLogs,
} from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

import { DETECTION_ENGINE_RULES_PREVIEW } from '@kbn/security-solution-plugin/common/constants';

/**
 * Runs the preview for a rule. Any generated alerts will be written to .preview.alerts.
 * This is much faster than actually running the rule, and can also quickly simulate multiple
 * consecutive rule runs, e.g. for ensuring that rule state is properly handled across runs.
 * @param supertest The supertest deps
 * @param rule The rule to create
 */
export const previewRule = async ({
  supertest,
  rule,
  invocationCount = 1,
  timeframeEnd = new Date(),
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  rule: RuleCreateProps;
  invocationCount?: number;
  timeframeEnd?: Date;
}): Promise<{
  previewId: string;
  logs: RulePreviewLogs[];
  isAborted: boolean;
}> => {
  const previewRequest: PreviewRulesSchema = {
    ...rule,
    invocationCount,
    timeframeEnd: timeframeEnd.toISOString(),
  };
  const response = await supertest
    .post(DETECTION_ENGINE_RULES_PREVIEW)
    .set('kbn-xsrf', 'true')
    .send(previewRequest)
    .expect(200);
  return response.body;
};
