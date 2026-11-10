/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionResult } from '../../../rule_monitoring';
import { createPreviewRuleExecutionLogger } from './preview_rule_execution_logger';

describe('createPreviewRuleExecutionLogger', () => {
  it('starts each invocation with empty logs and keeps logs of previous invocations', async () => {
    const previewLogger = createPreviewRuleExecutionLogger();
    const spyLogger = await previewLogger.factory({ context: {} } as never);

    spyLogger.warn('first warning');
    spyLogger.error('first error');
    spyLogger.logExecutionResult({ status: 'partial failure' } as ExecutionResult);
    const firstWarnings = previewLogger.getWarnings();
    const firstErrors = previewLogger.getErrors();

    previewLogger.reset();
    spyLogger.warn('second warning');

    expect(firstWarnings).toEqual(['first warning']);
    expect(firstErrors).toEqual(['first error']);
    expect(previewLogger.getWarnings()).toEqual(['second warning']);
    expect(previewLogger.getErrors()).toEqual([]);
    expect(previewLogger.getExecutionResult()).toBeUndefined();
  });
});
