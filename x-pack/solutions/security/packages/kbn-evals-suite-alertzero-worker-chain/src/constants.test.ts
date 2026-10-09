/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ACTION_CLOSE_ALERTS_FP_WORKFLOW_ID,
  ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID,
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
} from '@kbn/workflows/managed/definitions/alertzero';
import { WORKFLOW_IDS, ACTION_IDS } from './constants';

// Drift guard (review B1/B2): every inlined id must equal the upstream managed
// definition's exported constant. If upstream renames one, this fails before any
// live run silently targets a nonexistent workflow.
describe('inlined managed ids match upstream', () => {
  it('workflow ids', () => {
    expect(WORKFLOW_IDS.alertTriage).toBe(ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID);
    expect(WORKFLOW_IDS.alertTriageReview).toBe(ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID);
    // The "runner" YAML is the AD worker's definition.
    expect(WORKFLOW_IDS.attackDiscoveryRunner).toBe(ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID);
    expect(WORKFLOW_IDS.attackDiscoveryReview).toBe(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID);
    expect(WORKFLOW_IDS.forensicsSweep).toBe(
      ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID
    );
    expect(WORKFLOW_IDS.forensicsRun).toBe(ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID);
  });

  it('action ids', () => {
    expect(ACTION_IDS.closeAlertsFp).toBe(ALERTZERO_ACTION_CLOSE_ALERTS_FP_WORKFLOW_ID);
    expect(ACTION_IDS.handoffToForensics).toBe(ALERTZERO_ACTION_HANDOFF_TO_FORENSICS_WORKFLOW_ID);
    expect(ACTION_IDS.isolateHost).toBe(ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID);
    expect(ACTION_IDS.killProcess).toBe(ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID);
    expect(ACTION_IDS.suspendProcess).toBe(ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID);
  });
});
