/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { updateRuleStepDefinition } from './update_rule_step';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import type { updateRuleInputSchema } from '../../../../common/workflows/step_types/update_rule_step/update_rule_step_common';

type Context = StepHandlerContext<typeof updateRuleInputSchema>;
type InputRule = Context['input']['rule'];

const RULE_ID = '11111111-1111-4111-8111-111111111111';

const existingThresholdRule = {
  id: RULE_ID,
  rule_id: 'my-threshold-rule',
  type: 'threshold',
  name: 'Too many logons',
  enabled: true,
};

describe('updateRuleStepDefinition', () => {
  let mockContextManager: jest.Mocked<Context['contextManager']>;

  const buildContext = (rule: InputRule): Context =>
    ({
      input: { rule },
      contextManager: mockContextManager,
    } as unknown as Context);

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<Context['contextManager']>;
  });

  it('reads the rule by id, injects its type into the PATCH body and returns the updated rule', async () => {
    const rule = {
      id: RULE_ID,
      type: 'threshold',
      threshold: { field: ['host.name'], value: 200 },
    } as InputRule;
    const updatedRule = {
      ...existingThresholdRule,
      threshold: { field: ['host.name'], value: 200 },
    };
    mockContextManager.callKibanaApi
      .mockResolvedValueOnce({ status: 200, headers: {}, body: existingThresholdRule })
      .mockResolvedValueOnce({ status: 200, headers: {}, body: updatedRule });

    const result = await updateRuleStepDefinition.handler(buildContext(rule));

    expect(mockContextManager.callKibanaApi).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: DETECTION_ENGINE_RULES_URL,
      query: { id: RULE_ID },
    });
    expect(mockContextManager.callKibanaApi).toHaveBeenNthCalledWith(2, {
      method: 'PATCH',
      path: DETECTION_ENGINE_RULES_URL,
      body: { ...rule, type: 'threshold' },
    });
    expect(result.output).toEqual(updatedRule);
  });

  it('reads the rule by rule_id when id is not provided', async () => {
    const rule = { rule_id: 'my-threshold-rule', type: 'threshold', enabled: false } as InputRule;
    mockContextManager.callKibanaApi
      .mockResolvedValueOnce({ status: 200, headers: {}, body: existingThresholdRule })
      .mockResolvedValueOnce({ status: 200, headers: {}, body: existingThresholdRule });

    await updateRuleStepDefinition.handler(buildContext(rule));

    expect(mockContextManager.callKibanaApi).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: DETECTION_ENGINE_RULES_URL,
      query: { rule_id: 'my-threshold-rule' },
    });
  });

  it('injects the fetched type when the rendered input has none', async () => {
    // A rule object passed as a single `${{ ... }}` expression bypasses schema validation,
    // so `type` can be absent at run time.
    const rule = { id: RULE_ID, threshold: { field: ['host.name'], value: 500 } } as InputRule;
    mockContextManager.callKibanaApi
      .mockResolvedValueOnce({ status: 200, headers: {}, body: existingThresholdRule })
      .mockResolvedValueOnce({ status: 200, headers: {}, body: existingThresholdRule });

    await updateRuleStepDefinition.handler(buildContext(rule));

    expect(mockContextManager.callKibanaApi).toHaveBeenNthCalledWith(2, {
      method: 'PATCH',
      path: DETECTION_ENGINE_RULES_URL,
      body: { ...rule, type: 'threshold' },
    });
  });

  it('throws a ValidationError when the provided type does not match the existing rule', async () => {
    const rule = { id: RULE_ID, type: 'query', query: 'host.name: *' } as InputRule;
    mockContextManager.callKibanaApi.mockResolvedValueOnce({
      status: 200,
      headers: {},
      body: existingThresholdRule,
    });

    const error = await updateRuleStepDefinition
      .handler(buildContext(rule))
      .then(() => undefined)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ExecutionError);
    expect(error).toMatchObject({ type: 'ValidationError' });
    expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['neither id nor rule_id', { type: 'query', query: 'host.name: *' }],
    ['both id and rule_id', { id: RULE_ID, rule_id: 'my-rule', type: 'query' }],
  ])('throws a ValidationError when %s is provided', async (_case, rule) => {
    const error = await updateRuleStepDefinition
      .handler(buildContext(rule as InputRule))
      .then(() => undefined)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ExecutionError);
    expect(error).toMatchObject({ type: 'ValidationError' });
    expect(mockContextManager.callKibanaApi).not.toHaveBeenCalled();
  });

  it('routes read failures through toApiExecutionError and skips the PATCH', async () => {
    const rule = { id: RULE_ID, type: 'threshold' } as InputRule;
    mockContextManager.callKibanaApi.mockRejectedValueOnce(
      new KibanaApiCallError({
        status: 404,
        headers: {},
        body: { message: 'rule not found' },
        message: 'HTTP 404: rule not found',
      })
    );

    const error = await updateRuleStepDefinition
      .handler(buildContext(rule))
      .then(() => undefined)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ExecutionError);
    expect(error).toMatchObject({
      type: 'ApiError',
      message: 'Failed to read detection rule before update: HTTP 404: rule not found',
    });
    expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(1);
  });

  it('routes update failures through toApiExecutionError', async () => {
    const rule = { id: RULE_ID, type: 'threshold' } as InputRule;
    mockContextManager.callKibanaApi
      .mockResolvedValueOnce({ status: 200, headers: {}, body: existingThresholdRule })
      .mockRejectedValueOnce(
        new KibanaApiCallError({
          status: 400,
          headers: {},
          body: { message: 'invalid threshold' },
          message: 'HTTP 400: invalid threshold',
        })
      );

    const error = await updateRuleStepDefinition
      .handler(buildContext(rule))
      .then(() => undefined)
      .catch((e) => e);

    expect(error).toBeInstanceOf(ExecutionError);
    expect(error).toMatchObject({
      type: 'ApiError',
      message: 'Failed to update detection rule: HTTP 400: invalid threshold',
    });
  });
});
