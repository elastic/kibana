/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { enableRuleStepDefinition } from './enable_rule_step';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../common/constants';
import type { enableRuleInputSchema } from '../../../../common/workflows/step_types/enable_rule_step/enable_rule_step_common';
import type { NormalizedRuleError } from '../../../../common/api/detection_engine/rule_management';

type Context = StepHandlerContext<typeof enableRuleInputSchema>;

const bulkActionBody = (
  summary: { succeeded: number; failed: number; skipped: number; total: number },
  errors?: NormalizedRuleError[]
) => ({
  attributes: {
    results: { updated: [], created: [], deleted: [], skipped: [] },
    summary,
    ...(errors ? { errors } : {}),
  },
});

describe('enableRuleStepDefinition', () => {
  let mockContextManager: jest.Mocked<Context['contextManager']>;
  let mockContext: Context;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<Context['contextManager']>;

    mockContext = {
      input: { ids: ['rule-1', 'rule-2'] },
      contextManager: mockContextManager,
    } as unknown as Context;
  });

  it('calls the bulk action API with the enable action and returns the mapped summary', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: bulkActionBody({ succeeded: 2, failed: 0, skipped: 0, total: 2 }),
    });

    const result = await enableRuleStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: DETECTION_ENGINE_RULES_BULK_ACTION,
      body: { action: 'enable', ids: ['rule-1', 'rule-2'] },
    });
    expect(result.output).toEqual({ succeeded: 2, failed: 0, skipped: 0, total: 2 });
  });

  // Branch logic (recover vs. throw) is covered in ../../utils/bulk_rule_action.test.ts; here we
  // only assert the handler routes failures through handleBulkRuleActionError.
  it('delegates error handling to handleBulkRuleActionError', async () => {
    const errors: NormalizedRuleError[] = [
      { message: 'Rule not found', status_code: 500, rules: [{ id: 'rule-2' }] },
    ];
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 500,
        headers: {},
        body: bulkActionBody({ succeeded: 1, failed: 1, skipped: 0, total: 2 }, errors),
        message: 'HTTP 500: bulk action partially failed',
      })
    );

    const result = await enableRuleStepDefinition.handler(mockContext);

    expect(result.output).toEqual({ succeeded: 1, failed: 1, skipped: 0, total: 2, errors });
  });
});
