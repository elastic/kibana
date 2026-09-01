/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { createRuleStepDefinition } from './create_rule_step';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import type { createRuleInputSchema } from '../../../../common/workflows/step_types/create_rule_step/create_rule_step_common';

type Context = StepHandlerContext<typeof createRuleInputSchema>;

const rule = {
  type: 'esql',
  language: 'esql',
  name: 'Suspicious PowerShell Execution',
  description: 'Detects suspicious PowerShell activity',
  query: 'FROM logs-endpoint.events.process-* | WHERE process.name == "powershell.exe"',
  severity: 'high',
  risk_score: 73,
  enabled: false,
} as Context['input']['rule'];

describe('createRuleStepDefinition', () => {
  let mockContextManager: jest.Mocked<Context['contextManager']>;
  let mockContext: Context;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<Context['contextManager']>;

    mockContext = {
      input: { rule },
      contextManager: mockContextManager,
    } as unknown as Context;
  });

  it('forwards the wrapped rule to the rule creation endpoint and returns the created rule', async () => {
    const createdRule = { ...rule, id: 'rule-1', rule_id: 'rule-uuid-1' };
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: createdRule,
    });

    const result = await createRuleStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: DETECTION_ENGINE_RULES_URL,
      body: rule,
    });
    expect(result.output).toEqual(createdRule);
  });

  it('defaults enabled to false when omitted from the wrapped rule', async () => {
    const { enabled, ...ruleWithoutEnabled } = rule;
    mockContext = {
      input: { rule: ruleWithoutEnabled as Context['input']['rule'] },
      contextManager: mockContextManager,
    } as unknown as Context;
    const createdRule = { ...ruleWithoutEnabled, enabled: false, id: 'rule-1' };
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: createdRule,
    });

    await createRuleStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: DETECTION_ENGINE_RULES_URL,
      body: { ...ruleWithoutEnabled, enabled: false },
    });
  });

  it('overrides an explicit "enabled: true" so the rule is still created disabled', async () => {
    mockContext = {
      input: { rule: { ...rule, enabled: true } },
      contextManager: mockContextManager,
    } as unknown as Context;
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { ...rule, enabled: false, id: 'rule-1' },
    });

    await createRuleStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: DETECTION_ENGINE_RULES_URL,
      body: { ...rule, enabled: false },
    });
  });

  it('routes API failures through toApiExecutionError', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 400,
        headers: {},
        body: { message: 'Invalid ES|QL query' },
        message: 'HTTP 400: Invalid ES|QL query',
      })
    );

    const error = await createRuleStepDefinition
      .handler(mockContext)
      .then(() => undefined)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ExecutionError);
    expect(error).toMatchObject({
      type: 'ApiError',
      message: 'Failed to create detection rule: HTTP 400: Invalid ES|QL query',
    });
  });
});
