/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Approval-gate eval for the managed rule-tuning worker/review pair.
 *
 * WHY THIS SPEC EXISTS: `src/workflow_task.ts` answers every review child's gate with
 * `approved: true` and grades the resulting proposal. That measures the *decision* — but a
 * suite that only ever approves cannot show that the gate is load-bearing, because a gate
 * that ignored its input would score identically. This spec leaves the gate unanswered,
 * takes BOTH arms, and asserts the observable difference against the detection engine and
 * the alerts index:
 *
 *   reject → the rule's `query` is byte-identical to its pre-run value (nothing was applied)
 *            and the harvested alerts carry the dismissed tag;
 *   approve → the rule's `query` now equals the persisted `proposed_query` and the alerts
 *            carry the applied tag.
 *
 * Both arms assert on engine state, not on the workflow's self-report: the tag steps are
 * gated on `record_outcome.rule_patched`, so "the applied tag landed" IS the claim "this
 * pipeline patched the rule".
 *
 * The fixture is `fp-overbroad-query` — an over-broad query on a plain `query` rule whose FPs
 * share no entity. That matters for the approve arm specifically: `apply_query_tuning` needs
 * `can_preview_query_change.supported == true` (change_type `query`, rule type `query`, no
 * data view / timestamp override / alert suppression) AND both backtest previews to succeed,
 * or the approve arm would assert a patch the workflow was never going to make.
 *
 * ISOLATION: each arm seeds its own rule with a unique uuid and sweeps it in `afterEach`.
 * The worker harvests every unreviewed closed-FP cluster in the space and the harness
 * requires exactly one review child, so a leaked fixture from this spec (or a sibling spec
 * in the same stack) makes the next run fail with "found 2" rather than scoring anything.
 *
 * The gate mechanics here are deterministic, so `EVAL_REPETITIONS=1` is acceptable for this
 * spec (unlike the judged decision suite) — there is no LLM-judge score to average.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import { evaluate, tags } from '../src/evaluate';
import { ensureAlertsIndexReady } from '../src/alerts_index';
import { readProposal } from '../src/proposal_reading';
import {
  describeStepExecutions,
  respondToReviewGate,
  runRuleTuningToApprovalGate,
} from '../src/workflow_task';
import {
  ACKNOWLEDGED_TAG,
  APPLIED_TAG,
  DISMISSED_TAG,
  REVIEWED_TAG,
  WORKFLOWS_API_VERSION,
} from '../src/constants';
import {
  ALERTS_INDEX,
  cleanupSeededArtifacts,
  seedRuleAndFpAlerts,
  type SeedFixtureSpec,
} from './seed_fp_cluster';

/**
 * Over-broad query on a plain query rule: the only fixture whose golden label is `query`, and
 * the only shape whose FPs cannot be excepted away by entity. See the spec docs above for why
 * the approve arm depends on this.
 */
const FIXTURE: SeedFixtureSpec = {
  id: 'fp-overbroad-query',
  ruleType: 'query',
  expected: 'query',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface SeededFixture {
  seededUuid: string;
  ruleId: string;
}

interface DetectionRule {
  id: string;
  rule_id?: string;
  name?: string;
  query?: string;
  updated_at?: string;
}

/** Read the rule back from the detection engine — the artifact both arms assert on. */
const readRule = async (fetch: HttpHandler, savedObjectId: string): Promise<DetectionRule> => {
  const rule = await fetch<DetectionRule>('/api/detection_engine/rules', {
    method: 'GET',
    headers: { 'kbn-xsrf': 'true' },
    query: { id: savedObjectId },
  });
  if (!rule?.id) {
    throw new Error(`Seeded rule ${savedObjectId} was not found in the detection engine`);
  }
  return rule;
};

/** The harvested alerts' `kibana.alert.workflow_tags`, one entry per seeded alert. */
const readWorkflowTags = async (esClient: EsClient, ruleUuid: string): Promise<string[][]> => {
  const response = await esClient.search<{ 'kibana.alert.workflow_tags'?: string[] }>({
    index: ALERTS_INDEX,
    size: 20,
    query: { term: { 'kibana.alert.rule.uuid': ruleUuid } },
  });
  return response.hits.hits.map((hit) => hit._source?.['kibana.alert.workflow_tags'] ?? []);
};

/**
 * Wait until every seeded alert carries `tag`, then return the observed tag sets.
 *
 * The tag step has run by the time the review execution settles, but the write may not be
 * visible to a search yet; this polls for the positive signal rather than guessing a delay.
 * Waiting cannot weaken the assertion — the caller still checks the exact tag set afterwards,
 * and the absence of a *forbidden* tag is only meaningful once the tag step has landed.
 */
const waitForTag = async ({
  esClient,
  log,
  ruleUuid,
  tag,
  timeoutMs = 60_000,
  pollIntervalMs = 2_000,
}: {
  esClient: EsClient;
  log: ToolingLog;
  ruleUuid: string;
  tag: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<string[][]> => {
  const deadline = Date.now() + timeoutMs;
  let observed: string[][] = [];

  while (Date.now() < deadline) {
    observed = await readWorkflowTags(esClient, ruleUuid);
    if (observed.length > 0 && observed.every((alertTags) => alertTags.includes(tag))) {
      log.info(`All ${observed.length} seeded alerts carry ${tag}`);
      return observed;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `None of the ${observed.length} seeded alert(s) of rule ${ruleUuid} carried ${tag} within ` +
      `${timeoutMs}ms — observed tag sets: ${JSON.stringify(observed)}`
  );
};

/**
 * Report an unmeasurable arm as UNMEASURED (a Playwright skip carrying the reason) instead of
 * failing the suite or passing while asserting nothing.
 */
const unmeasured = (log: ToolingLog, reason: string): never => {
  log.warning(`UNMEASURED: ${reason}`);
  evaluate.skip(true, reason);
  // Unreachable: evaluate.skip() aborts the test. Present so callers narrow the union.
  throw new Error(reason);
};

/**
 * Attach the settled review's step list to a tag-assertion failure: when a tag never lands,
 * the reason is which step stopped the workflow (a failed preview, a skipped gate step), and
 * that is only visible in the execution.
 */
const withReviewSteps = (error: unknown, settled: WorkflowExecutionDto): Error =>
  new Error(
    `${error instanceof Error ? error.message : String(error)} — review steps: ` +
      `${describeStepExecutions(settled)}`
  );

const requireCompleted = (
  execution: WorkflowExecutionDto,
  arm: string,
  approval: boolean
): void => {
  if (execution.status !== ExecutionStatus.COMPLETED) {
    throw new Error(
      `Review workflow did not complete after ${approval ? 'approval' : 'rejection'} (${arm}) — ` +
        `status: ${execution.status}. Steps: ${describeStepExecutions(execution)}`
    );
  }
};

evaluate.describe(
  'Rule Tuning Workflow — approval gate',
  { tag: tags.serverless.security.complete },
  () => {
    /** Executions this spec started, cancelled in afterEach before the fixtures are swept. */
    const pendingExecutionIds = new Set<string>();
    let seeded: SeededFixture | undefined;

    // Both arms seed alerts and then assert on what the workflow wrote back, so the
    // alerts index must already carry the unified-alerts mapping. Without this the
    // seed's bulk creates a plain, dynamically-mapped index and the worker's harvest
    // fails with `Unknown column [kibana.alert.workflow_tags]` — a "completed" sweep
    // with zero reviews, which is exactly the silent failure this spec must not have.
    evaluate.beforeAll(async ({ fetch, esClient, log }) => {
      await ensureAlertsIndexReady({ fetch, esClient, log });
    });

    // Cleanup runs on EVERY path, including assertion failures and timeouts. A seeded rule
    // left behind is re-harvested by the next sweep in the stack, which then opens a second
    // review child and trips the harness's one-child assert — i.e. a failed arm would poison
    // every later run instead of failing alone. Cancelling first matters: a review that is
    // still parked can still resume and tag alerts while the sweep below is deleting them.
    evaluate.afterEach(async ({ fetch, esClient, log }) => {
      for (const executionId of pendingExecutionIds) {
        try {
          await fetch(`/api/workflows/executions/${encodeURIComponent(executionId)}/cancel`, {
            method: 'POST',
            version: WORKFLOWS_API_VERSION,
            headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
          });
          log.info(`Cancelled execution ${executionId}`);
        } catch (error) {
          log.warning(
            `Failed to cancel execution ${executionId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
      pendingExecutionIds.clear();

      if (seeded) {
        const { seededUuid, ruleId } = seeded;
        seeded = undefined;
        await cleanupSeededArtifacts({ fetch, esClient }, seededUuid, ruleId);
        log.info(`Swept seeded rule ${ruleId} (${seededUuid}) and its alerts`);
      }
    });

    evaluate(
      'rejecting the gate leaves the rule query byte-identical and dismisses the harvested alerts',
      async ({ fetch, esClient, log }) => {
        const { seededUuid, ruleId } = await seedRuleAndFpAlerts(
          { fetch, esClient, log },
          FIXTURE,
          `${FIXTURE.id}-reject-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
        );
        seeded = { seededUuid, ruleId };

        // Captured BEFORE the run: the reject arm's whole claim is that this value is
        // untouched by a diagnosis, two previews and a refused decision.
        const before = await readRule(fetch, seededUuid);

        const gate = await runRuleTuningToApprovalGate({ fetch, log });
        pendingExecutionIds.add(gate.workflowExecutionId);
        pendingExecutionIds.add(gate.reviewExecutionId);

        const proposal = readProposal(gate.proposal, FIXTURE.id, before.query);
        const proposedQuery = proposal.measured
          ? proposal.proposedQuery
          : unmeasured(log, proposal.reason);

        const settled = await respondToReviewGate({
          fetch,
          log,
          reviewExecutionId: gate.reviewExecutionId,
          approved: false,
        });
        requireCompleted(settled, 'reject arm', false);

        // Engine assertion: byte-identical, not "equivalent" — no normalization, no
        // re-serialization. A rejected proposal must not reach the rule at all, which
        // `updated_at` states independently of the query text.
        const after = await readRule(fetch, seededUuid);
        if (after.query !== before.query) {
          throw new Error(
            `A rejected tuning changed the rule query — before: "${before.query}", ` +
              `after: "${after.query}". apply_query_tuning is gated on the approved response; ` +
              `if this fires on a rejection the gate is not enforced.`
          );
        }
        if (after.updated_at !== before.updated_at) {
          throw new Error(
            `A rejected tuning still wrote to the rule (updated_at ${before.updated_at} → ` +
              `${after.updated_at}) — nothing should have been applied. Reject arm steps: ` +
              `${describeStepExecutions(settled)}`
          );
        }
        if (after.query === proposedQuery) {
          throw new Error(
            `The rule query now equals the rejected proposal ("${proposedQuery}") — the ` +
              `proposal was applied despite the rejection.`
          );
        }

        const observed = await waitForTag({
          esClient,
          log,
          ruleUuid: seededUuid,
          tag: DISMISSED_TAG,
        }).catch((error: unknown) => {
          throw withReviewSteps(error, settled);
        });
        for (const alertTags of observed) {
          if (!alertTags.includes(REVIEWED_TAG)) {
            throw new Error(
              `A harvested alert carries the dismissed tag without the reviewed tag: ` +
                `${JSON.stringify(alertTags)}`
            );
          }
          for (const forbidden of [APPLIED_TAG, ACKNOWLEDGED_TAG]) {
            if (alertTags.includes(forbidden)) {
              throw new Error(
                `A rejected tuning tagged a harvested alert with ${forbidden}: ` +
                  `${JSON.stringify(alertTags)} — that tag means the pipeline patched the rule.`
              );
            }
          }
        }
      }
    );

    evaluate(
      'approving the gate applies the persisted proposed_query and marks the harvested alerts applied',
      async ({ fetch, esClient, log }) => {
        const { seededUuid, ruleId } = await seedRuleAndFpAlerts(
          { fetch, esClient, log },
          FIXTURE,
          `${FIXTURE.id}-approve-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
        );
        seeded = { seededUuid, ruleId };

        const before = await readRule(fetch, seededUuid);

        const gate = await runRuleTuningToApprovalGate({ fetch, log });
        pendingExecutionIds.add(gate.workflowExecutionId);
        pendingExecutionIds.add(gate.reviewExecutionId);

        // The proposal is read from the PAUSED review's diagnose step — the same persisted
        // value the gate renders and the apply step interpolates — and captured before the
        // response, so the assertion below cannot be satisfied by re-reading our own answer.
        const proposal = readProposal(gate.proposal, FIXTURE.id, before.query);
        const proposedQuery = proposal.measured
          ? proposal.proposedQuery
          : unmeasured(log, proposal.reason);

        const settled = await respondToReviewGate({
          fetch,
          log,
          reviewExecutionId: gate.reviewExecutionId,
          approved: true,
        });
        requireCompleted(settled, 'approve arm', true);

        const after = await readRule(fetch, seededUuid);
        if (after.query !== proposedQuery) {
          throw new Error(
            `The approved proposal was not applied — rule query: "${after.query}", ` +
              `persisted proposed_query: "${proposedQuery}". Review steps: ` +
              `${describeStepExecutions(settled)}`
          );
        }
        if (after.query === before.query) {
          throw new Error(
            `The rule query is unchanged after approval ("${after.query}") — the proposal was ` +
              `recorded but not written.`
          );
        }

        // `mark_alerts_applied` only fires when record_outcome.rule_patched is true, so this
        // is an independent confirmation that the patch really happened.
        const observed = await waitForTag({
          esClient,
          log,
          ruleUuid: seededUuid,
          tag: APPLIED_TAG,
        }).catch((error: unknown) => {
          throw withReviewSteps(error, settled);
        });
        for (const alertTags of observed) {
          if (!alertTags.includes(REVIEWED_TAG)) {
            throw new Error(
              `A harvested alert carries the applied tag without the reviewed tag: ` +
                `${JSON.stringify(alertTags)}`
            );
          }
          for (const forbidden of [DISMISSED_TAG, ACKNOWLEDGED_TAG]) {
            if (alertTags.includes(forbidden)) {
              throw new Error(
                `An approved query change tagged a harvested alert with ${forbidden}: ` +
                  `${JSON.stringify(alertTags)} — a query change this pipeline applied is ` +
                  `neither dismissed nor merely acknowledged.`
              );
            }
          }
        }
      }
    );
  }
);
