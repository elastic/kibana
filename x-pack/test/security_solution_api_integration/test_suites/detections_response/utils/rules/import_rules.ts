/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, omit } from 'lodash';
import expect from 'expect';
import type { ImportRulesResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { combineArrayToNdJson } from '..';

interface ImportRulesParams {
  getService: FtrProviderContext['getService'];
  rules: unknown[];
  overwrite: boolean;
}

export async function importRules({
  getService,
  rules,
  overwrite,
}: ImportRulesParams): Promise<ImportRulesResponse> {
  const securitySolutionApi = getService('securitySolutionApi');
  const buffer = Buffer.from(combineArrayToNdJson(rules));

  const { body: importResponse } = await securitySolutionApi
    .importRules({ query: { overwrite } })
    .attach('file', buffer, 'rules.ndjson')
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(200);

  return importResponse;
}

export async function importRulesWithSuccess(params: ImportRulesParams): Promise<void> {
  const importResponse = await importRules(params);

  expect(importResponse).toMatchObject({
    rules_count: params.rules.length,
    success: true,
    success_count: params.rules.length,
    errors: [],
  });
}

interface AssertImportedRuleParams {
  getService: FtrProviderContext['getService'];
  expectedRule: Record<string, unknown> & {
    rule_id?: string;
    immutable: boolean;
    rule_source: Record<string, unknown>;
  };
}

export async function assertImportedRule({
  getService,
  expectedRule,
}: AssertImportedRuleParams): Promise<void> {
  const securitySolutionApi = getService('securitySolutionApi');

  const ruleId = expectedRule.rule_id;
  const expectedRuleSource = pick(expectedRule, ['immutable', 'rule_source']);
  const expectedRuleFields = omit(expectedRule, ['immutable', 'rule_source']);

  const { body: rule } = await securitySolutionApi
    .readRule({
      query: { rule_id: ruleId },
    })
    .expect(200);

  expect(rule).toMatchObject(expectedRuleSource);
  expect(rule).toMatchObject(expectedRuleFields);
}
