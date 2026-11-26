/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BATCH_ENTRIES } from '../../../common/workflows/steps/resolve_written_detections';
import { resolveWrittenDetectionsPublicStepDefinition } from './resolve_written_detections';

describe('resolveWrittenDetectionsPublicStepDefinition', () => {
  it('accepts classifier batch entries accepted by the server step', () => {
    expect(
      resolveWrittenDetectionsPublicStepDefinition.inputSchema.parse({
        workflow_execution_id: 'execution-1',
        batch: [
          {
            detection_id: 'detection-1',
            rule_uuid: 'rule-1',
            rule_name: 'Checkout errors',
            classifier: {
              reason: 'not_live_member',
              live_events: [],
            },
          },
        ],
        reported_rule_uuids: ['rule-1'],
      })
    ).toMatchObject({
      batch: [
        {
          rule_name: 'Checkout errors',
          classifier: { reason: 'not_live_member' },
        },
      ],
    });
  });

  it('accepts an input without a reported rule list but still bounds one that is given', () => {
    const { inputSchema } = resolveWrittenDetectionsPublicStepDefinition;
    const input = { workflow_execution_id: 'execution-1', batch: [] };

    expect(inputSchema.safeParse(input).success).toBe(true);
    expect(inputSchema.safeParse({ ...input, reported_rule_uuids: [] }).success).toBe(true);
    expect(
      inputSchema.safeParse({
        ...input,
        reported_rule_uuids: Array(MAX_BATCH_ENTRIES + 1).fill('rule-1'),
      }).success
    ).toBe(false);
    expect(
      inputSchema.safeParse({ ...input, reported_rule_uuids: ['r'.repeat(1_000)] }).success
    ).toBe(false);
  });
});
