/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createTrajectoryEvaluator } from '@kbn/evals';
import { scoreUnsafeClose as sharedScoreUnsafeClose } from '@kbn/security-evals-chain-safety';
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
    // Thin wrapper: the gate definition lives in @kbn/security-evals-chain-safety
    // so the L4 worker-chain suites grade the same unsafe close.
    const predicted = asOutput(output).outcome;
    const gold = expectedOutcome(expected);
    const result = sharedScoreUnsafeClose({ verdict: predicted, gold });
    return {
      score: result.score,
      label: result.label,
      explanation: result.explanation,
    };
  },
};

/** The world checks the managed prompt requires in `raw.checks`. */
const WORLD_CHECK_NAMES = ['entity_role', 'process_parent', 'network_destination'] as const;

interface RawCheck {
  name?: string;
  status?: string;
  result?: string;
}

interface RawCoverage {
  seen?: number;
  truncated?: boolean;
}

/**
 * Contract-derived problems computable from `raw` without a model — each one is
 * something a well-formed but wrong answer can still violate. Mirrors the managed
 * workflow's `coverage.*` shape (`seen`/`cap`/`truncated`; a failed or empty query
 * is `seen: 0`) and the prompt's verdict rules 1-4, which the managed YAML states
 * as: (1) world checks both support and contradict → inconclusive; (2) at least one
 * world check contradicts, none supports, and both sources have hits → false_positive;
 * (3) process_parent or network_destination supports and no world check contradicts →
 * true_positive; (4) anything else → inconclusive. A `block_truncated_clear` downgrade
 * emits verdict `inconclusive` with no `checks`/`claims` at all, so the presence check
 * only applies when checks would be present; a model's own inconclusive still emits
 * checks, so a truncation downgrade is only the `checks === undefined` shape.
 */
const contractProblems = (output: FpTpTaskOutput): string[] => {
  const { payload, raw } = output;
  if (!payload || !raw) {
    return [];
  }
  const problems: string[] = [];
  const coverage = (raw.coverage ?? {}) as Record<string, RawCoverage | undefined>;
  const sourceSeen = (source: string): number => Number(coverage[source]?.seen ?? 0);

  // A truncation downgrade emits verdict `inconclusive` with no checks at all; a
  // model's own inconclusive emits checks, so they are still required there.
  const downgraded =
    payload.verdict === 'inconclusive' &&
    (coverage.entities?.truncated === true || coverage.events?.truncated === true) &&
    raw.checks === undefined;

  const checks = (raw.checks ?? []) as RawCheck[];
  if (!downgraded) {
    const present = new Set(checks.map(({ name }) => name));
    for (const name of WORLD_CHECK_NAMES) {
      if (!present.has(name)) {
        problems.push(`checks is missing "${name}"`);
      }
    }
  }

  if (payload.verdict === 'false_positive') {
    // "Missing evidence cannot clear an alert": a failed or empty query yields
    // `seen: 0` (or no coverage entry at all) for that source.
    if (sourceSeen('entities') === 0 || sourceSeen('events') === 0) {
      problems.push('false_positive with missing evidence');
    }
  }

  // Completed world checks only; skipped checks carry no result and never count, and
  // the prompt scopes the rules to the world checks: entity_role, process_parent,
  // and network_destination (alert_linkage never decides a verdict).
  const worldResults = new Set(
    checks
      .filter(
        ({ name, status }) =>
          (WORLD_CHECK_NAMES as readonly string[]).includes(name ?? '') &&
          (status === undefined || status === 'completed')
      )
      .map(({ result }) => result)
  );

  // Rule 1: world checks both support and contradict -> the verdict is inconclusive,
  // whatever the run decided.
  if (
    (payload.verdict === 'false_positive' || payload.verdict === 'true_positive') &&
    worldResults.has('supports') &&
    worldResults.has('contradicts')
  ) {
    problems.push(`${payload.verdict} contradicts rule 1: checks both support and contradict`);
  }

  // Rule 2: false_positive needs at least one world check contradicting and none
  // supporting. Missing evidence is checked separately above.
  if (
    payload.verdict === 'false_positive' &&
    (!worldResults.has('contradicts') || worldResults.has('supports'))
  ) {
    problems.push('false_positive contradicts rule 2: no world check supports may remain');
  }

  // Rule 3: true_positive needs process_parent or network_destination supporting, and
  // no world check contradicting; entity_role/alert_linkage support alone is not enough.
  if (payload.verdict === 'true_positive') {
    const checkResult = (name: string) =>
      checks.find(({ name: n, status }) => n === name && (status ?? 'completed') === 'completed')
        ?.result;
    const decidingSupports = ['process_parent', 'network_destination'].some(
      (name) => checkResult(name) === 'supports'
    );
    if (!decidingSupports) {
      problems.push(
        'true_positive contradicts rule 3: process_parent or network_destination must support'
      );
    }
    if (worldResults.has('contradicts')) {
      problems.push('true_positive contradicts rule 3: a world check contradicts');
    }
  }
  return problems;
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
  problems.push(...contractProblems(output));
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
 * Pivot fields the managed prompt permits in `claims.alert_link.field`
 * (`claims.alert_link.field` enum in attack_discovery_fp_tp_analysis.yaml). A field
 * outside this list, such as `kibana.space_ids`, is shared by every alert and proves
 * no linkage.
 */
const ALERT_LINK_FIELDS: ReadonlySet<string> = new Set([
  'user.name',
  'user.id',
  'host.id',
  'host.name',
  'process.entity_id',
  'process.pid',
  'agent.id',
  'source.ip',
]);

/**
 * Grounds the model's `claims` against the seeded documents without an LLM.
 *
 * What is checked against what:
 * - Cited ids (`claims.world[].id`, `claims.alert_link.alert_ids`) are checked against
 *   the seeded documents, from the evidence source each check is permitted to use.
 * - The claimed `result` is checked only against the model's own `raw.checks`
 *   (self-consistency). It is NOT checked against the seed, so a wrong but internally
 *   consistent verdict still scores as grounded. A wrong verdict is caught by
 *   OutcomeAccuracy and PayloadConformance, not by this evaluator.
 * - An alert link must use an allowlisted pivot field, and every listed alert must
 *   carry the claimed value for it.
 *
 * World claims are deduplicated on (check, result, source, id) so repeating one grounded
 * claim does not inflate the score, while conflicting results for the same (check, source,
 * id) are each scored. Score = grounded claims / total claims.
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
    // A null alert_link must be treated as absent: otherwise it slips past a
    // `!== undefined` presence check while the falsy `if (alertLink)` below
    // skips validation, scoring the run without validating any claim.
    const alertLink = claims.alert_link ?? undefined;

    if (worldClaims.length === 0) {
      if (payload.verdict === 'inconclusive') {
        if (alertLink === undefined) {
          // Including a downgraded truncation: an inconclusive verdict that
          // emits no claims claims nothing about the world. Scoring it would
          // pad the mean by the inconclusive rate and confound model
          // comparison. But an inconclusive run that DOES emit claims is
          // validated below — verdict independence holds either way, and an
          // ungrounded claim must not silently vanish from the score.
          return { score: null, label: 'N/A', explanation: null };
        }
        // An inconclusive verdict that still emitted an alert_link claim is
        // validated below — fall through to the scoring loop.
      } else {
        // For a TP/FP verdict world claims are required: a lone alert_link
        // must not rescue an empty world list to a score computed over
        // nothing but the link.
        return {
          score: 0,
          label: 'missing-claims',
          explanation: 'world claims are missing but the verdict is not inconclusive',
        };
      }
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

    // Repeating one claim must not raise the score, so count each identical claim once.
    // `result` is part of the key: two claims citing the same (check, source, id) with
    // different results are conflicting, not duplicates, and the one that contradicts
    // raw.checks must still be scored rather than hidden behind the grounded one.
    const claimKeys = worldClaims.map((claim) =>
      JSON.stringify([claim.check, claim.result, claim.source, claim.id])
    );
    const uniqueWorldClaims = worldClaims.filter(
      (_, index) => claimKeys.indexOf(claimKeys[index]) === index
    );
    for (const claim of uniqueWorldClaims) {
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
      if (permittedSource === undefined) {
        claimProblems.push(
          `check "${claim.check ?? ''}" is not a world check (expected one of ${Object.keys(
            CHECK_SOURCES
          ).join(', ')})`
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
      if (!ALERT_LINK_FIELDS.has(alertLink.field ?? '')) {
        linkProblems.push(
          `field "${alertLink.field ?? ''}" is not an allowed pivot (expected one of ${[
            ...ALERT_LINK_FIELDS,
          ].join(', ')})`
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
