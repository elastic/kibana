/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceMetadataResponse } from '.';
import { parseSourceMetadata } from '.';

describe('parseSourceMetadata', () => {
  it('parses source metadata from valid event.reference JSON', () => {
    const reference = JSON.stringify({
      sourceMetadata: {
        actionExecutionUuid: 'action-exec-uuid-123',
        ruleId: 'rule-id-456',
        ruleName: 'My Detection Rule',
      },
    });

    const expected: SourceMetadataResponse = {
      action_execution_uuid: 'action-exec-uuid-123',
      rule_id: 'rule-id-456',
      rule_name: 'My Detection Rule',
    };

    expect(parseSourceMetadata(reference)).toEqual(expected);
  });

  it('returns null when reference is undefined', () => {
    expect(parseSourceMetadata(undefined)).toBeNull();
  });

  it('returns null when reference is not valid JSON', () => {
    expect(parseSourceMetadata('not-valid-json')).toBeNull();
  });

  it('returns null when reference JSON has no sourceMetadata key', () => {
    const reference = JSON.stringify({
      alertRetrieval: [{ workflowId: 'wf-1', workflowRunId: 'run-1' }],
    });

    expect(parseSourceMetadata(reference)).toBeNull();
  });

  it('handles partial sourceMetadata (missing optional fields)', () => {
    const reference = JSON.stringify({
      sourceMetadata: {
        ruleId: 'rule-id-789',
      },
    });

    const expected: SourceMetadataResponse = {
      action_execution_uuid: undefined,
      rule_id: 'rule-id-789',
      rule_name: undefined,
    };

    expect(parseSourceMetadata(reference)).toEqual(expected);
  });

  it('handles sourceMetadata alongside workflowExecutions data', () => {
    const reference = JSON.stringify({
      alertRetrieval: [{ workflowId: 'wf-1', workflowRunId: 'run-1' }],
      sourceMetadata: {
        actionExecutionUuid: 'action-uuid',
        ruleId: 'rule-1',
        ruleName: 'Rule Name',
      },
    });

    const expected: SourceMetadataResponse = {
      action_execution_uuid: 'action-uuid',
      rule_id: 'rule-1',
      rule_name: 'Rule Name',
    };

    expect(parseSourceMetadata(reference)).toEqual(expected);
  });
});
