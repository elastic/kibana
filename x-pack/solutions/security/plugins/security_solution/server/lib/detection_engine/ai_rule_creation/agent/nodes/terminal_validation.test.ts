/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCreateEsqlRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_request_schema.mock';
import type { RuleCreationState } from '../state';
import { terminalValidationNode } from './terminal_validation';

const createBaseState = (rule: RuleCreationState['rule']): RuleCreationState => ({
  userQuery: 'detect suspicious login activity',
  rule,
  errors: [],
  warnings: [],
  rejectionReason: undefined,
  rejectionMessage: undefined,
});

describe('terminalValidationNode', () => {
  const node = terminalValidationNode();

  it('returns an empty update when the assembled rule passes schema validation', async () => {
    const validRule = getCreateEsqlRulesSchemaMock();

    const result = await node(createBaseState(validRule));

    expect(result).toEqual({});
  });

  it('rejects with INVALID_OUTPUT when rule type is not esql', async () => {
    const validRule = getCreateEsqlRulesSchemaMock();

    const result = await node(
      createBaseState({
        ...validRule,
        type: 'query' as typeof validRule.type,
        language: 'kuery' as typeof validRule.language,
      })
    );

    expect(result.rejectionReason?.code).toBe('INVALID_OUTPUT');
    expect(result.rejectionReason?.details).toEqual(expect.stringMatching(/type|language/));
  });

  it('rejects with INVALID_OUTPUT when required name is missing', async () => {
    const validRule = getCreateEsqlRulesSchemaMock();
    const { name: _name, ...ruleWithoutName } = validRule;

    const result = await node(createBaseState(ruleWithoutName));

    expect(result.rejectionReason).toEqual({
      code: 'INVALID_OUTPUT',
      message: 'The assembled rule failed schema validation',
      details: expect.stringContaining('name'),
    });
  });

  it('includes zod issue paths in rejection details for multiple validation failures', async () => {
    const result = await node(
      createBaseState({
        type: 'esql',
        language: 'esql',
        query: 'FROM logs-* | LIMIT 10',
      })
    );

    expect(result.rejectionReason?.code).toBe('INVALID_OUTPUT');
    expect(result.rejectionReason?.details).toEqual(
      expect.stringMatching(/name|description|severity|risk_score/)
    );
  });
});
