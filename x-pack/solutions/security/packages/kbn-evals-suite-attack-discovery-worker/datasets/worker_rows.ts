/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CohortRouting } from '../src/cohort_routing';
import { EVAL_SPACE_ID } from '../src/constants';
import type { WorkerExample, WorkerExpected } from '../src/worker_types';

/**
 * Per-scenario answer key for the review stage. The scenarios and their generation gold (alert
 * groups, forbidden joins) are copied from the audit failure classes of
 * `kbn-evals-suite-attack-discovery` (elastic/kibana#302714, `src/audit_failure_classes/`).
 *
 * The verdict gold reads the alerts as an analyst would:
 * - shared egress, benign batch and threshold alerts carry no attack: false positive;
 * - the ClickFix chain is an attack among noise: true positive;
 * - the bait alerts look like an attack but the world shows management activity: a discovery
 *   written over them is a false positive (reviewed only when generation writes one);
 * - the same display name in two accounts cannot be told apart from the alerts alone, so
 *   inconclusive is the answer, and true positive is accepted because one account is malicious.
 */
export const WORKER_SCENARIOS: ReadonlyArray<{
  scenarioId: string;
  title: string;
  expected: WorkerExpected;
}> = [
  {
    scenarioId: 'shared-ci-egress',
    title: 'Three unrelated principals share an egress IP',
    expected: {
      goldVerdict: 'false_positive',
      blindReason:
        'cloud alerts carry no host, and the review reads raw events from logs-endpoint.events.* by host only',
      expectedDiscoveries: 'none',
      criteria: [
        'The rationale does not treat the shared egress IP as evidence that the principals are related.',
      ],
      generationCriteria: [],
    },
  },
  {
    scenarioId: 'same-display-name-cross-account',
    title: 'One display name raises alerts in two accounts',
    expected: {
      goldVerdict: 'inconclusive',
      alsoAccepts: ['true_positive'],
      blindReason:
        'cloud alerts carry no host, and the review reads raw events from logs-endpoint.events.* by host only',
      expectedDiscoveries: 'atLeastOne',
      criteria: [
        'The rationale scopes its verdict to what the alerts show and does not treat the shared display name as one confirmed actor.',
      ],
      generationCriteria: [
        'The narrative attributes the activity to the shared display name without asserting that all of it comes from one confirmed actor, which the alerts alone cannot establish.',
      ],
    },
  },
  {
    scenarioId: 'threshold-meta-alerts',
    title: 'Threshold alerts that count other alerts',
    expected: {
      goldVerdict: 'false_positive',
      expectedDiscoveries: 'none',
      criteria: [
        'The rationale does not cite a threshold alert as evidence of malicious activity on its own.',
      ],
      generationCriteria: [],
    },
  },
  {
    scenarioId: 'benign-batch',
    title: 'Vendor-signed tooling running from known paths',
    expected: {
      goldVerdict: 'false_positive',
      expectedDiscoveries: 'none',
      criteria: ['The rationale recognizes the activity as routine, signed enterprise tooling.'],
      generationCriteria: [],
    },
  },
  {
    scenarioId: 'positive-chain-with-noise',
    title: 'A ClickFix-style endpoint chain among unrelated alerts',
    expected: {
      goldVerdict: 'true_positive',
      expectedDiscoveries: 'atLeastOne',
      criteria: [
        'The rationale names the endpoint chain as the malicious activity and does not fold the unrelated cloud alerts into it.',
      ],
      generationCriteria: [
        'The narrative describes the endpoint chain as one attack and leaves the unrelated cloud alerts out.',
      ],
    },
  },
  {
    scenarioId: 'bait-false-positive',
    title: 'Attack-shaped alerts over routine management activity',
    expected: {
      goldVerdict: 'false_positive',
      expectedDiscoveries: 'none',
      criteria: [
        'The rationale weighs the management-agent parent and the internal management destination against the attack-shaped rule names.',
      ],
      generationCriteria: [],
    },
  },
  {
    scenarioId: 'seeded-false-positive',
    title: 'Seeded false-positive discovery over benign SCCM alerts',
    expected: {
      goldVerdict: 'false_positive',
      expectedDiscoveries: 'none',
      criteria: [
        'The rationale recognizes the cited alerts as routine, vendor-signed SCCM endpoint management activity rather than command-and-control.',
      ],
      generationCriteria: [],
    },
  },
];

/** One row per scenario, stamped with the cohort and both stage models of the run. */
export const buildWorkerRows = (routing: CohortRouting): WorkerExample[] =>
  WORKER_SCENARIOS.map(({ scenarioId, title, expected }) => ({
    id: scenarioId,
    input: { scenarioId, spaceId: EVAL_SPACE_ID },
    output: expected,
    metadata: {
      Title: title,
      scenarioId,
      inputVariant: 'baseline',
      provenance: 'authored',
      cohort: routing.cohort,
      generation_model: routing.generationModel,
      review_model: routing.reviewModel,
    },
  }));
