/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { patchRuleStepDefinition } from './patch_rule_step';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import type { patchRuleInputSchema } from '../../../../common/workflows/step_types/patch_rule_step/patch_rule_step_common';

type Context = StepHandlerContext<typeof patchRuleInputSchema>;
type InputRule = Context['input']['patch'];

const RULE_ID = '11111111-1111-4111-8111-111111111111';

describe('patchRuleStepDefinition', () => {
  let mockContextManager: jest.Mocked<Context['contextManager']>;

  const buildContext = (rule: InputRule): Context =>
    ({
      input: { patch: rule },
      contextManager: mockContextManager,
    } as unknown as Context);

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<Context['contextManager']>;
  });

  it('forwards the wrapped rule to the patch endpoint and returns the updated rule', async () => {
    const rule = {
      id: RULE_ID,
      type: 'threshold',
      threshold: { field: ['host.name'], value: 200 },
    } as InputRule;
    const updatedRule = { ...rule, rule_id: 'my-threshold-rule', name: 'Too many logons' };
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: updatedRule,
    });

    const result = await patchRuleStepDefinition.handler(buildContext(rule));

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'PATCH',
      path: DETECTION_ENGINE_RULES_URL,
      body: rule,
    });
    expect(result.output).toEqual(updatedRule);
  });

  it('routes API failures through toApiExecutionError', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 400,
        headers: {},
        body: { message: 'either "id" or "rule_id" must be set' },
        message: 'HTTP 400: either "id" or "rule_id" must be set',
      })
    );

    const error = await patchRuleStepDefinition
      .handler(buildContext({ type: 'query' } as InputRule))
      .then(() => undefined)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ExecutionError);
    expect(error).toMatchObject({
      type: 'ApiError',
      message: 'Failed to patch detection rule: HTTP 400: either "id" or "rule_id" must be set',
    });
  });
});
