/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
});
