/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_CATALOG,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/alertzero-common';
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
// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'path';
import { FP_TP_EXAMPLES } from '@kbn/evals-suite-attack-discovery-fp-tp/src/scenarios';
import {
  ACTION_IDS,
  HOP_TIMEOUTS_MS,
  WORKER_CHAIN_EXAMPLE_COUNT,
  WORKER_CHAIN_EXPERIMENT_CONCURRENCY,
  WORKER_CHAIN_MAX_CHAIN_MS,
  WORKER_CHAIN_MAX_REVIEWS_PER_CHAIN,
  WORKER_CHAIN_MAX_TRIAGE_RUNS_PER_CHAIN,
  WORKER_IDS,
  WORKFLOW_IDS,
} from './constants';

// Drift guard: a Workers-API id must be a registered Worker, not a workflow id.
describe('Worker ids are registered Workers', () => {
  it('match the upstream catalog and exported constants', () => {
    const catalogIds = SYSTEM_SECURITY_WORKER_CATALOG.map(({ id }) => id);
    expect(WORKER_IDS.alertTriage).toBe(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID);
    expect(WORKER_IDS.attackDiscovery).toBe(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID);
    for (const id of Object.values(WORKER_IDS)) {
      expect(catalogIds).toContain(id);
    }
  });

  it('the AD runner workflow id is not a Worker id', () => {
    expect(Object.values(WORKER_IDS)).not.toContain(WORKFLOW_IDS.attackDiscoveryRunner);
  });
});

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

describe('B2: serial experiment isolation', () => {
  it('runs the experiment one example at a time', () => {
    expect(WORKER_CHAIN_EXPERIMENT_CONCURRENCY).toBe(1);
  });

  it('the spec passes that concurrency to runExperiment, so it overrides the executor default', () => {
    // The Playwright spec cannot be imported under jest; assert on its source so
    // dropping the option (executor default is 5) turns this red.
    const spec = readFileSync(join(__dirname, '..', 'evals', 'worker_chain.spec.ts'), 'utf8');
    expect(spec).toMatch(/concurrency:\s*WORKER_CHAIN_EXPERIMENT_CONCURRENCY/);
  });

  it('WORKER_CHAIN_EXAMPLE_COUNT matches the examples the spec runs', () => {
    expect(
      FP_TP_EXAMPLES.filter(({ expectedOutcome }) => expectedOutcome !== 'failed')
    ).toHaveLength(WORKER_CHAIN_EXAMPLE_COUNT);
  });

  it('the Playwright config derives its timeout from the selection, not a flat constant', () => {
    const config = readFileSync(join(__dirname, '..', 'playwright.config.ts'), 'utf8');
    expect(config).toMatch(/timeout:\s*deriveWorkerChainTimeoutMs\(\)/);
  });

  it('the per-chain bound covers N reviews and one proposal wait per source', () => {
    const n = WORKER_CHAIN_MAX_REVIEWS_PER_CHAIN;
    expect(n).toBeGreaterThan(1);
    const m = WORKER_CHAIN_MAX_TRIAGE_RUNS_PER_CHAIN;
    expect(WORKER_CHAIN_MAX_CHAIN_MS).toBe(
      m * HOP_TIMEOUTS_MS.alertTriage +
        HOP_TIMEOUTS_MS.attackDiscoveryRunner +
        n * HOP_TIMEOUTS_MS.attackDiscoveryReview +
        (n + m) * HOP_TIMEOUTS_MS.perActionProposal
    );
  });
});
