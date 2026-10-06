/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { httpServerMock } from '@kbn/core/server/mocks';
import {
  AttachAlertTriageRulesRequestBody,
  SECURITY_DETECTION_RULES_CREATED_TRIGGER_ID,
} from '@kbn/alertzero-common';
import {
  ALERTZERO_FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import {
  DetectionRulesCreatedTriggerId,
  MAX_RULES_PER_TRIGGER,
} from '../../../common/workflows/triggers';
import { SecuritySolutionEventBus } from '../../events/event_bus';
import type { DetectionRulesCreatedPayload } from '../../events/types';
import { emitDetectionRulesCreatedInChunks } from './emit_rules_created';

const definition = getManagedWorkflowDefinition(
  ALERTZERO_FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_WORKFLOW_ID
);
const yaml = definition && 'yaml' in definition ? definition.yaml : undefined;
if (typeof yaml !== 'string') {
  throw new Error('attach new rules is not a static managed workflow');
}
const workflow = parse(yaml) as {
  triggers: Array<{ type: string }>;
  steps: Array<{ name: string; with?: { body?: Record<string, string> } }>;
};

// The trigger lives here and the workflow that consumes it lives in @kbn/workflows. Neither side's
// own tests can see the other, so this is where a renamed trigger id, a renamed `ids` field, or a
// chunk larger than the attach route accepts would be caught.
describe('attach new rules workflow and the detectionRulesCreated trigger', () => {
  const request = httpServerMock.createKibanaRequest();

  it('is subscribed to the registered trigger id', () => {
    expect(workflow.triggers).toEqual([{ type: DetectionRulesCreatedTriggerId }]);
  });

  // AlertZero cannot import this plugin, so it keeps its own copy of the id to decide whether the
  // workflow can be installed. If the two differ, the workflow would never be installed.
  it('matches the copy of the trigger id AlertZero uses to decide whether to install it', () => {
    expect(SECURITY_DETECTION_RULES_CREATED_TRIGGER_ID).toBe(DetectionRulesCreatedTriggerId);
  });

  it('reads the ids field the trigger emits', () => {
    const body = workflow.steps.find(({ name }) => name === 'attach_rules')?.with?.body;
    expect(body?.ruleIds).toBe('${{ event.ids }}');
  });

  // 2,000 rules in one event is the most the route takes, so every event the emitter can produce
  // has to be accepted by it, including when a large creation is split.
  it.each([
    { total: 1, events: 1 },
    { total: MAX_RULES_PER_TRIGGER, events: 1 },
    { total: MAX_RULES_PER_TRIGGER + 1, events: 2 },
    { total: 2 * MAX_RULES_PER_TRIGGER + 1, events: 3 },
  ])(
    'every event for $total created rules is accepted by the attach route',
    ({ total, events }) => {
      const eventBus = new SecuritySolutionEventBus();
      const payloads: DetectionRulesCreatedPayload[] = [];
      eventBus.onDetectionRulesCreated((event) => {
        payloads.push(event.payload);
      });

      emitDetectionRulesCreatedInChunks({
        eventBus,
        request,
        rules: Array.from({ length: total }, (_, i) => ({ id: `so-${i}`, type: 'query' })),
        source: 'import',
      });

      expect(payloads).toHaveLength(events);
      for (const { ids } of payloads) {
        expect(AttachAlertTriageRulesRequestBody.safeParse({ ruleIds: ids }).success).toBe(true);
      }
      expect(payloads.flatMap(({ ids }) => ids)).toHaveLength(total);
    }
  );
});
