/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  AttachAlertTriageRulesRequestBody,
  AttachAlertTriageRulesResponse,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  buildWorkerAttachRulesUrl,
} from '@kbn/alertzero-common';
import {
  ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS,
  ALERTZERO_FLOOR_ALERT_TRIAGE_ATTACH_NEW_RULES_WORKFLOW_ID as id,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import { createWorkflowLiquidEngine } from '@kbn/workflows';

const definition = getManagedWorkflowDefinition(id);
const yaml = definition && 'yaml' in definition ? definition.yaml : undefined;
if (typeof yaml !== 'string') {
  throw new Error(`${id} is not a static managed workflow`);
}

interface Step {
  name: string;
  with?: { path?: string; body?: Record<string, string>; message?: string };
}
const { steps } = parse(yaml) as { steps: Step[] };
const attach = steps.find(({ name }) => name === 'attach_rules');
const log = steps.find(({ name }) => name === 'log_outcome');
const engine = createWorkflowLiquidEngine();

// The workflow YAML lives in @kbn/workflows, which does not depend on this plugin's route, so the
// route and the workflow can only be checked against each other from here.
describe('attach new rules workflow and the attach route', () => {
  it('is installed with the other global AlertZero Alert Triage workflows', () => {
    expect(ALERTZERO_ALERT_TRIAGE_WORKFLOW_IDS).toContain(id);
  });

  it('calls the route that is actually registered, in the space of the run', () => {
    expect(attach?.with?.path).toBe(
      `/s/{{ workflow.spaceId }}${buildWorkerAttachRulesUrl(
        SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
      )}`
    );
  });

  it.each([1, 2000])('sends a body the route accepts for an event of %i rules', (count) => {
    const ids = Array.from({ length: count }, (_, i) => `so-${i}`);
    const expression = (attach?.with?.body?.ruleIds ?? '').trim().slice(3, -2).trim();
    const body = {
      ...attach?.with?.body,
      ruleIds: engine.evalValueSync(expression, { event: { ids } }),
    };

    expect(AttachAlertTriageRulesRequestBody.safeParse(body).success).toBe(true);
  });

  // The log step reads fields the route returns; a renamed or dropped field would log blanks.
  it('logs every outcome the route can return', () => {
    const examples = [
      { outcome: 'worker_disabled' },
      { outcome: 'worker_unavailable' },
      { outcome: 'attached', matched: 3, updated: 2 },
    ];
    for (const output of examples) {
      expect(AttachAlertTriageRulesResponse.safeParse(output).success).toBe(true);
      const rendered = engine.parseAndRenderSync(log?.with?.message ?? '', {
        steps: { attach_rules: { output } },
        event: { totalCount: 3 },
      });
      expect(rendered).toContain(output.outcome);
      expect(rendered).not.toMatch(/undefined|NaN/);
    }
  });
});
