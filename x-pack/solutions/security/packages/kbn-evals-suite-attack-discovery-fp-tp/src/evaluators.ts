/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createTrajectoryEvaluator } from '@kbn/evals';
import { ExecutionStatus } from '@kbn/workflows';
import {
  FP_TP_VERDICTS,
  RATIONALE_MARKDOWN_MAX_LENGTH,
  SUMMARY_MARKDOWN_MAX_LENGTH,
  type FpTpOutcome,
} from './constants';
import type { FpTpTaskOutput } from './workflow_task';

interface ExpectedOutcome {
  outcome: FpTpOutcome;
}

const asOutput = (output: unknown): FpTpTaskOutput => output as FpTpTaskOutput;
const expectedOutcome = (expected: unknown): FpTpOutcome | undefined =>
  (expected as ExpectedOutcome | undefined)?.outcome;

/**
 * Primary metric: does the run's outcome match the gold outcome? A `failed` gold also
 * needs an explicit FAILED execution, so a timeout or cancellation cannot stand in for
 * the required-source guard. The label is the predicted outcome, so the report reads
 * as a confusion matrix.
 */
export const outcomeAccuracy: Evaluator = {
  name: 'OutcomeAccuracy',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { outcome: predicted, executionStatus } = asOutput(output);
    const gold = expectedOutcome(expected);
    const matches =
      predicted !== undefined &&
      predicted === gold &&
      (gold !== 'failed' || executionStatus === ExecutionStatus.FAILED);
    return {
      score: matches ? 1 : 0,
      label: predicted ?? 'none',
      explanation: `predicted="${predicted ?? 'none'}" expected="${gold ?? 'none'}"`,
      metadata: {
        predicted: predicted ?? null,
        expected: gold ?? null,
        executionStatus,
      },
    };
  },
};

/**
 * The costly error: `false_positive` closes the attack, so predicting it when the gold
 * is anything else scores 0.
 */
export const unsafeClose: Evaluator = {
  name: 'UnsafeClose',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const predicted = asOutput(output).outcome;
    const gold = expectedOutcome(expected);
    const unsafe = predicted === 'false_positive' && gold !== 'false_positive';
    return {
      score: unsafe ? 0 : 1,
      label: unsafe ? 'unsafe_close' : 'safe',
      explanation: `predicted="${predicted ?? 'none'}" expected="${gold ?? 'none'}"`,
    };
  },
};

const payloadProblems = (output: FpTpTaskOutput, attackDiscoveryId: string): string[] => {
  const { payload, attackDiscoveryIdEcho } = output;
  if (!payload) {
    return ['no payload'];
  }
  const problems: string[] = [];
  if (output.executionStatus !== ExecutionStatus.COMPLETED) {
    problems.push(`execution ended ${output.executionStatus}, not completed`);
  }
  if (!FP_TP_VERDICTS.some((verdict) => verdict === payload.verdict)) {
    problems.push(`unsupported verdict "${payload.verdict}"`);
  }
  const summary = payload.summary_markdown ?? '';
  if (summary.trim() === '') {
    problems.push('empty summary_markdown');
  }
  if (summary.length > SUMMARY_MARKDOWN_MAX_LENGTH) {
    problems.push(`summary_markdown longer than ${SUMMARY_MARKDOWN_MAX_LENGTH}`);
  }
  if ((payload.rationale_markdown?.length ?? 0) > RATIONALE_MARKDOWN_MAX_LENGTH) {
    problems.push(`rationale_markdown longer than ${RATIONALE_MARKDOWN_MAX_LENGTH}`);
  }
  if (attackDiscoveryIdEcho !== attackDiscoveryId) {
    problems.push(`attack_discovery_id "${attackDiscoveryIdEcho}" does not echo the input`);
  }
  return problems;
};

const failureProblems = (output: FpTpTaskOutput): string[] => [
  ...(output.executionStatus !== ExecutionStatus.FAILED
    ? [`execution ended ${output.executionStatus}, not failed`]
    : []),
  ...(output.payload ? ['payload produced by a run that should have failed'] : []),
];

/**
 * Contract conformance. A run whose gold is `failed` must end FAILED (not timed out or
 * cancelled) and produce no payload;
 * any other run must produce a payload that satisfies the output contract.
 */
export const payloadConformance: Evaluator = {
  name: 'PayloadConformance',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const task = asOutput(output);
    const problems =
      expectedOutcome(expected) === 'failed'
        ? failureProblems(task)
        : payloadProblems(task, task.seededIds.attackDiscoveryId);
    return {
      score: problems.length === 0 ? 1 : 0,
      label: problems.length === 0 ? 'conforms' : 'violates',
      explanation: problems.length === 0 ? null : problems.join('; '),
    };
  },
};

/**
 * Zero-tool guardrail: the workflow gathers the evidence and the agent is tool-less, so
 * any tool call fails. N/A when the traces are unavailable.
 */
export const createFpTpTrajectoryEvaluator = (): Evaluator => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) => asOutput(output).toolCallIds ?? [],
    goldenPathExtractor: () => [],
    orderWeight: 1,
    coverageWeight: 0,
  });

  return {
    ...inner,
    name: 'trajectory',
    evaluate: async (args) => {
      if (asOutput(args.output).toolCallsUnavailable) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'Workflow trace unavailable — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  };
};

/** Reports N/A for failed runs, which have no summary or rationale to judge. */
export const skipFailedRuns = (evaluator: Evaluator): Evaluator => ({
  ...evaluator,
  evaluate: async (args) => {
    if (asOutput(args.output).outcome === 'failed') {
      return {
        score: null,
        label: 'N/A',
        explanation: 'The run failed, so there is no summary or rationale to judge.',
      };
    }
    return evaluator.evaluate(args);
  },
});

interface WorldClaim {
  check?: string;
  result?: string;
  source?: string;
  id?: string;
}

interface RawCheck {
  name?: string;
  status?: string;
  result?: string;
}

interface AlertLinkClaim {
  field?: string;
  value?: string;
  alert_ids?: string[];
}

interface RawClaims {
  world?: WorldClaim[];
  alert_link?: AlertLinkClaim;
}

/** Dotted-path lookup that tolerates flattened (`host.name`) and nested (`host: {name}`) sources. */
const dottedValue = (source: Record<string, unknown>, path: string): unknown => {
  if (path in source) {
    return source[path];
  }
  let value: unknown = source;
  for (const segment of path.split('.')) {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
};

/** Membership match: the alert's value(s) for the pivot field include the claimed value. */
const pivotCarries = (actual: unknown, claimed: unknown): boolean =>
  [actual]
    .flat()
    .filter((item) => item !== undefined && item !== null)
    .map(String)
    .includes(String(claimed));

/**
 * Grounds the model's `claims` against the seeded documents without an LLM: every
 * cited id must exist in the seed, every claimed result must match the run's own
 * `raw.checks`, and an alert link must pivot every listed alert through a field the
 * alerts actually carry. Score = grounded claims / total claims.
 */
export const claimGrounding: Evaluator = {
  name: 'ClaimGrounding',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const task = asOutput(output);
    const { payload, raw, seededEvidence } = task;
    const problems: string[] = [];

    if (!payload) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No payload, so there are no claims to ground.',
      };
    }

    const claims = (raw?.claims ?? {}) as RawClaims;
    const worldClaims = claims.world ?? [];
    const hasEmittedClaims = worldClaims.length > 0 || claims.alert_link !== undefined;

    if (!hasEmittedClaims) {
      if (payload.verdict === 'inconclusive') {
        // Including a downgraded truncation: an inconclusive verdict that emits
        // no claims claims nothing about the world. Scoring it would pad the
        // mean by the inconclusive rate and confound model comparison. But an
        // inconclusive run that DOES emit claims is validated below — verdict
        // independence holds either way, and an ungrounded claim must not
        // silently vanish from the score.
        return { score: null, label: 'N/A', explanation: null };
      }
      return {
        score: 0,
        label: 'missing-claims',
        explanation: 'claims is empty but the verdict is not inconclusive',
      };
    }

    let grounded = 0;
    let total = 0;

    const rawChecks = (raw?.checks ?? []) as RawCheck[];
    const checkResults = new Map(
      rawChecks.map((check) => [check.name, { result: check.result, status: check.status }])
    );
    // The permitted evidence source for each world check, per the managed YAML
    // prompt: entity ids live in entity store hits, process and event ids in raw
    // event hits. Seeding a valid id in one source must not ground a claim that
    // cites the other.
    const CHECK_SOURCES: Record<string, 'entity_store' | 'raw_event'> = {
      entity_role: 'entity_store',
      process_parent: 'raw_event',
      network_destination: 'raw_event',
    };
    const seededEntityIds = new Set(
      seededEvidence.entities.map(
        ({ id, source }) => (source.entity as { id?: string } | undefined)?.id ?? id
      )
    );
    const seededEventIds = new Set(seededEvidence.events.map(({ id }) => id));

    for (const claim of worldClaims) {
      total++;
      const claimProblems: string[] = [];
      const claimSource =
        claim.source === 'entity_store' || claim.source === 'raw_event' ? claim.source : undefined;
      // Bind each world claim to the evidence source its check is permitted to
      // use: entity_role must cite an entity store hit, process_parent and
      // network_destination a raw event hit.
      const permittedSource = claim.check ? CHECK_SOURCES[claim.check] : undefined;
      const seeded =
        claimSource === undefined
          ? false
          : claimSource === 'entity_store'
          ? seededEntityIds.has(claim.id ?? '')
          : seededEventIds.has(claim.id ?? '');
      if (!claim.source) {
        claimProblems.push('no source');
      }
      if (!claim.id) {
        claimProblems.push('no id');
      } else if (!seeded) {
        claimProblems.push(`id "${claim.id}" not in the seeded ${claim.source ?? 'unknown'}`);
      } else if (
        permittedSource !== undefined &&
        claimSource !== undefined &&
        permittedSource !== claimSource
      ) {
        claimProblems.push(
          `check "${
            claim.check ?? ''
          }" may only cite ${permittedSource} evidence, not ${claimSource}`
        );
      }
      const check = checkResults.get(claim.check ?? '');
      if (check === undefined) {
        claimProblems.push(`check "${claim.check ?? ''}" missing from raw.checks`);
      } else if (check.status === 'skipped') {
        claimProblems.push(`check "${claim.check ?? ''}" is skipped, so it has no result to cite`);
      } else if (check.result !== claim.result) {
        claimProblems.push(
          `result "${claim.result}" contradicts raw.checks "${check.result}" for "${claim.check}"`
        );
      }
      if (claimProblems.length === 0) {
        grounded++;
      } else {
        problems.push(`world claim ${JSON.stringify(claim)}: ${claimProblems.join(', ')}`);
      }
    }

    const alertLink = claims.alert_link;
    if (alertLink) {
      total++;
      const linkProblems: string[] = [];
      const alertLinkage = checkResults.get('alert_linkage');
      // A skipped check carries no fresh result, so a stale/defaulted `supports`
      // must not ground the link: require both `completed` and `supports`.
      if (alertLinkage?.status !== 'completed' || alertLinkage.result !== 'supports') {
        linkProblems.push(
          `alert_linkage in raw.checks is "${alertLinkage?.result ?? 'missing'}" ` +
            `(status "${alertLinkage?.status ?? 'missing'}"), not "completed" + "supports"`
        );
      }
      const seededAlerts = new Map(seededEvidence.alerts.map(({ id, source }) => [id, source]));
      if ((alertLink.alert_ids ?? []).length < 2) {
        linkProblems.push('fewer than 2 alert_ids');
      } else if (new Set(alertLink.alert_ids).size < 2) {
        // The link must pivot two distinct cited alerts; repeating one id
        // proves nothing about a shared field across alerts.
        linkProblems.push('alert_ids must cite at least two distinct alerts');
      }
      for (const alertId of alertLink.alert_ids ?? []) {
        const source = seededAlerts.get(alertId);
        if (source === undefined) {
          linkProblems.push(`alert "${alertId}" not seeded`);
        } else if (!pivotCarries(dottedValue(source, alertLink.field ?? ''), alertLink.value)) {
          linkProblems.push(
            `alert "${alertId}" does not carry ${alertLink.field}="${alertLink.value}"`
          );
        }
      }
      if (linkProblems.length === 0) {
        grounded++;
      } else {
        problems.push(`alert_link claim: ${linkProblems.join(', ')}`);
      }
    }

    return {
      score: total === 0 ? 1 : grounded / total,
      label: grounded === total ? 'grounded' : 'ungrounded',
      explanation: problems.length === 0 ? null : problems.join('; '),
    };
  },
};
