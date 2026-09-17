/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { getRuleMock } from '../../../../routes/__mocks__/request_responses';
import { bulkDeleteRules } from './bulk_delete_rules';

describe('bulkDeleteRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  const ruleA = getRuleMock(getQueryRuleParams(), { id: 'rule-a', name: 'Rule A' });
  const ruleB = getRuleMock(getQueryRuleParams(), { id: 'rule-b', name: 'Rule B' });

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
  });

  it('returns successfully deleted rules', async () => {
    rulesClient.bulkDeleteRules.mockResolvedValue({
      rules: [ruleA, ruleB],
      errors: [],
      total: 2,
      taskIdsFailedToBeDeleted: [],
    });

    const result = await bulkDeleteRules({ rulesClient, rules: [ruleA, ruleB] });

    expect(result.rules).toEqual([ruleA, ruleB]);
    expect(result.errors).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it('puts a 404 error into skipped when the rule ID is in the input set', async () => {
    rulesClient.bulkDeleteRules.mockResolvedValue({
      rules: [ruleA],
      errors: [{ message: 'Rule not found', status: 404, rule: { id: 'rule-b', name: 'Rule B' } }],
      total: 2,
      taskIdsFailedToBeDeleted: [],
    });

    const result = await bulkDeleteRules({ rulesClient, rules: [ruleA, ruleB] });

    expect(result.rules).toEqual([ruleA]);
    expect(result.errors).toEqual([]);
    expect(result.skipped).toEqual([
      { id: 'rule-b', name: 'Rule B', skip_reason: 'RULE_NOT_FOUND' },
    ]);
  });

  it('keeps a non-404 error in the errors bucket', async () => {
    const serverError = {
      message: 'Internal error',
      status: 500,
      rule: { id: 'rule-b', name: 'Rule B' },
    };
    rulesClient.bulkDeleteRules.mockResolvedValue({
      rules: [ruleA],
      errors: [serverError],
      total: 2,
      taskIdsFailedToBeDeleted: [],
    });

    const result = await bulkDeleteRules({ rulesClient, rules: [ruleA, ruleB] });

    expect(result.rules).toEqual([ruleA]);
    expect(result.errors).toEqual([serverError]);
    expect(result.skipped).toEqual([]);
  });

  it('keeps a 404 error when the rule ID is not in the input set', async () => {
    const unknownRuleError = {
      message: 'Rule not found',
      status: 404,
      rule: { id: 'unknown-id', name: 'Unknown' },
    };
    rulesClient.bulkDeleteRules.mockResolvedValue({
      rules: [ruleA],
      errors: [unknownRuleError],
      total: 2,
      taskIdsFailedToBeDeleted: [],
    });

    const result = await bulkDeleteRules({ rulesClient, rules: [ruleA, ruleB] });

    expect(result.rules).toEqual([ruleA]);
    expect(result.errors).toEqual([unknownRuleError]);
    expect(result.skipped).toEqual([]);
  });
});
