/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tuning-decision eval for the managed `system-security-rule-tuning-worker` +
 * `system-security-rule-tuning-review` workflows (post-#290097 split).
 *
 * Drives the real workflow end-to-end: each example seeds one rule plus a cluster of
 * analyst-dismissed (false-positive) alerts, triggers the worker's sweep (which fans out
 * one review per rule), auto-approves each review's gate, and grades the review's
 * `diagnose_rule` step's structured change_type against the golden label.
 *
 * Each task seeds a UNIQUE rule uuid and fresh alert ids per run. The workflow's re-harvest
 * guard tags reviewed alerts and excludes them from later sweeps, so reusing a rule uuid
 * across repetitions would make the second and later repetitions harvest nothing and score
 * 0 for reasons unrelated to the model — the same isolation contract as the alert-analysis
 * suite's `already_analyzed` gate.
 *
 * Evaluators:
 *   - ChangeTypeAccuracy (CODE, primary): predicted tuning path == golden label.
 *   - ValidProposal (CODE, structural): structured output conforms to the workflow's
 *     fail-closed gate contract (a summary on every branch plus that branch's payload
 *     fields; a query only on a rule type the workflow can actually preview and apply).
 *     Expected to saturate at 1.0 — it is a smoke check, never a discriminating metric.
 *   - Tool Routing (CODE, trace-based): the diagnose step actually invoked
 *     `investigate-rule.get_alerts_by_ids` rather than answering from the prompt alone.
 *   - TuningQuality (LLM): the summary is grounded in the seeded FP evidence.
 *
 * Every dataset run ends with a per-evaluator reliability line
 * (see src/evaluators/run_summary.ts): mean ± CI95 (n=N) plus SATURATED(no signal) for
 * evaluators that discriminated nothing. Saturated evaluators are reported, never
 * averaged into a pass/fail claim.
 */

import type { Client as TraceEsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { selectEvaluators, type EvaluationDataset, type Example } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { runRuleTuningWorkflow, type RuleTuningVerdict } from '../src/workflow_task';
import { changeTypeAccuracy, validProposal } from '../src/evaluators';
import {
  assertToolSpansReachable,
  createToolRoutingEvaluator,
} from '../src/evaluators/tool_routing';
import { logRunSummary, withScoreCollection, type ScoreSink } from '../src/evaluators/run_summary';
import { type ChangeType } from '../src/constants';
import { seedRuleAndFpAlerts, cleanupSeededArtifacts } from './seed_fp_cluster';

/** Experiment/dataset name. Also the label on every per-evaluator summary line. */
const DATASET_NAME = 'security: rule-tuning-workflow-decision';

const SUMMARY_CRITERIA = [
  'The summary references the specific alert entities or rule behavior that drove the false positives, ' +
    'rather than only restating the rule name',
  'The summary justifies the chosen tuning path against the alternatives it did not choose',
  'The summary does not invent alert fields, hosts, users, or commands that are not in the seeded data',
];

/** Golden tuning-path fixtures, one per branch of the review workflow's `oneOf`.
 *
 * LABEL DERIVATION: the review workflow's `diagnose_rule` schema is a root `oneOf` of
 * four const branches — exception (+`exception_entries`), query (+`proposed_query`),
 * risk_score (+`proposed_risk_score`/`proposed_severity`) and manual (summary only) —
 * and its prompt asks for the branch whose criteria the entity evidence actually meets.
 * Every label here is one of those four, derived from the fixture's own description and
 * seeded entity profile:
 *
 *   - `exception`: one repeated, known-good entity the rule can be excepted on.
 *   - `query`: FPs spread across unrelated entities sharing an over-broad query term.
 *   - `risk_score`: real detections the description asks to be downgraded.
 *   - `manual`: no automated branch applies — the pattern is volume rather than
 *     identity, every entity is distinct with no shared key, or the rule type blocks the
 *     only candidate (a query change needs a `query` rule). The workflow's only
 *     automated paths are exception/query/risk_score, so a volume-shaped fix has to be
 *     recommended through the hand-off branch.
 *
 * Distribution: 6 exception / 6 query / 6 risk_score / 17 manual. Labels are
 * PRELIMINARY until validated on the live stack: the first full run is a
 * characterization baseline, and any relabel must go through the golden-label
 * characterization test in the same commit.
 */
const TUNING_FIXTURES: Array<{
  id: string;
  expected: ChangeType;
  ruleType: string;
  description: string;
}> = [
  {
    id: 'fp-host-exception',
    expected: 'exception',
    ruleType: 'query',
    description: 'Repeated FPs from a single noisy host — the right fix is an exception entry',
  },
  {
    id: 'fp-overbroad-query',
    expected: 'query',
    ruleType: 'query',
    description: 'FPs spread across many entities from an over-broad query term — narrow the query',
  },
  {
    id: 'fp-volume-suppression',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Low-value alert flood from a repeated benign process — no automated path, recommend suppression manually',
  },
  {
    id: 'fp-low-value-risk',
    expected: 'risk_score',
    ruleType: 'query',
    description: 'Alerts are real but low-value — downgrade risk score and severity',
  },
  {
    id: 'fp-unfixable-noise',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Rule fires exclusively on benign activity with no discriminating signal — disable',
  },
  // Rule-type precondition fixture: the alert cluster looks exactly like the
  // single-entity exception cases (one entity re-firing), but `new_terms` is not a
  // rule type the workflow can preview or apply a query change on
  // (`can_preview_query_change` requires type == "query"), and a novel term on a
  // new_terms rule is a judgement call rather than a tuning — so the only safe
  // answer is the manual hand-off. Without this the query rule-type gate is
  // asserted only in unit tests and never exercised against a real model on a real
  // rule.
  {
    id: 'fp-suppression-incapable-rule-type',
    expected: 'manual',
    ruleType: 'new_terms',
    description:
      'Repeated single-entity FPs on a new_terms rule — a query change is not applicable to ' +
      'this rule type, so the worker must fall back to a manual hand-off',
  },
  {
    id: 'fp-host-exception-ci',
    expected: 'exception',
    ruleType: 'query',
    description: 'Repeated FPs concentrated on ci-runner-07 - tightest fix is an exception entry',
  },
  {
    id: 'fp-host-exception-backup',
    expected: 'exception',
    ruleType: 'query',
    description: 'Repeated FPs concentrated on backup-nas-02 - tightest fix is an exception entry',
  },
  {
    id: 'fp-host-exception-av',
    expected: 'exception',
    ruleType: 'query',
    description: 'Repeated FPs concentrated on sec-scan-11 - tightest fix is an exception entry',
  },
  {
    id: 'fp-host-exception-print',
    expected: 'exception',
    ruleType: 'query',
    description: 'Repeated FPs concentrated on print-srv-01 - tightest fix is an exception entry',
  },
  {
    id: 'fp-host-exception-mdm',
    expected: 'exception',
    ruleType: 'query',
    description: 'Repeated FPs concentrated on mdm-agent-09 - tightest fix is an exception entry',
  },
  {
    id: 'fp-overbroad-wildcard-cmd',
    expected: 'query',
    ruleType: 'query',
    description:
      'A wildcard command-line term matches unrelated admin tooling across many hosts - tighten the process arguments',
  },
  {
    id: 'fp-overbroad-any-user',
    expected: 'query',
    ruleType: 'query',
    description:
      'The rule omits a user filter, so every service account trips it - scope the query to interactive users',
  },
  {
    id: 'fp-overbroad-port-range',
    expected: 'query',
    ruleType: 'query',
    description:
      'A broad destination port range sweeps in routine service traffic - restrict the port set',
  },
  {
    id: 'fp-overbroad-parent-any',
    expected: 'query',
    ruleType: 'query',
    description:
      'No parent-process constraint lets benign launchers match - pin the expected parent binary',
  },
  {
    id: 'fp-overbroad-ext-match',
    expected: 'query',
    ruleType: 'query',
    description:
      'A loose file-extension match catches ordinary document activity - narrow the extension list',
  },
  {
    id: 'fp-suppression-healthcheck',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Benign curl re-firing from one entity - no automated path, recommend suppression manually',
  },
  {
    id: 'fp-suppression-vulnscan',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Benign nessus re-firing from one entity - no automated path, recommend suppression manually',
  },
  {
    id: 'fp-suppression-inventory',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Benign osqueryd re-firing from one entity - no automated path, recommend suppression manually',
  },
  {
    id: 'fp-suppression-patchagent',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Benign wuauclt re-firing from one entity - no automated path, recommend suppression manually',
  },
  {
    id: 'fp-suppression-logship',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Benign filebeat re-firing from one entity - no automated path, recommend suppression manually',
  },
  {
    id: 'fp-low-value-admin-tools',
    expected: 'risk_score',
    ruleType: 'query',
    description:
      'Sanctioned admin tooling generates true but unremarkable hits - lower risk score and severity',
  },
  {
    id: 'fp-low-value-devtools',
    expected: 'risk_score',
    ruleType: 'query',
    description:
      'Developer tooling on build laptops fires constantly with no incident value - downgrade scoring',
  },
  {
    id: 'fp-low-value-remote-support',
    expected: 'risk_score',
    ruleType: 'query',
    description:
      'Approved remote-support sessions are real yet routine - reduce risk score rather than exclude',
  },
  {
    id: 'fp-low-value-archive',
    expected: 'risk_score',
    ruleType: 'query',
    description:
      'Routine archive extraction is benign in this environment - downgrade instead of suppressing',
  },
  {
    id: 'fp-low-value-scripting',
    expected: 'risk_score',
    ruleType: 'query',
    description:
      'Everyday scripting by platform engineers is expected - lower severity to keep visibility',
  },
  {
    id: 'fp-unfixable-telemetry',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Only telemetry agents match, with no field separating benign from malicious - no automated path, recommend disabling manually',
  },
  {
    id: 'fp-unfixable-agentmesh',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Service-mesh sidecars account for every hit and share no discriminating attribute - no automated path, recommend disabling manually',
  },
  {
    id: 'fp-unfixable-buildfarm',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Ephemeral build-farm workers regenerate identifiers each run, so no stable filter exists - no automated path, recommend disabling manually',
  },
  {
    id: 'fp-unfixable-imaging',
    expected: 'manual',
    ruleType: 'query',
    description:
      'OS imaging fleets reproduce the pattern wholesale with nothing to key an exception on - no automated path, recommend disabling manually',
  },
  {
    id: 'fp-unfixable-mailflow',
    expected: 'manual',
    ruleType: 'query',
    description:
      'Mail-gateway scanning is indistinguishable from the targeted behaviour - no automated path, recommend disabling manually',
  },
  {
    id: 'fp-manual-newterms-dns',
    expected: 'manual',
    ruleType: 'new_terms',
    description:
      'New DNS resolvers trip a new_terms rule; an unseen term is a judgement call for the analyst, so escalate',
  },
  {
    id: 'fp-manual-newterms-proxy',
    expected: 'manual',
    ruleType: 'new_terms',
    description:
      'A newly introduced proxy host looks novel to a new_terms rule - needs human review, not an automated tuning',
  },
  {
    id: 'fp-manual-newterms-vpn',
    expected: 'manual',
    ruleType: 'new_terms',
    description:
      'A replacement VPN concentrator registers as an unseen term - escalate rather than auto-tune',
  },
  {
    id: 'fp-manual-newterms-ntp',
    expected: 'manual',
    ruleType: 'new_terms',
    description:
      'A re-pointed NTP source appears novel on a new_terms rule - route to manual review',
  },
];

interface RuleTuningExample extends Example {
  input: { fixtureId: string };
  output: { change_type: ChangeType };
  metadata: { fixtureId: string; ruleType: string; expected: ChangeType; description: string };
}

evaluate.describe(
  'Rule Tuning Workflow — tuning decision accuracy',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    const createdRuleIds = new Set<string>();

    // Setup probe. A trace cluster that never received Agent Builder spans silently degrades
    // every trace-based evaluator to N/A, and N/A is not a failure — the suite would still
    // report a pass. Drive one real fixture through the workflow here and assert that the
    // resulting review trace exposes TOOL spans, using the SAME join clauses the Tool Routing
    // evaluator scores with (a probe that proved reachability on a different key would arm the
    // evaluators dishonestly). Costs one fixture run (~233s measured) per repetition; that is
    // cheap next to an 8h run that N/A-s every trace evaluator and calls it green.
    evaluate.beforeAll(
      async ({
        fetch,
        log,
        esClient,
        traceEsClient,
      }: {
        fetch: HttpHandler;
        log: ToolingLog;
        esClient: EsClient;
        traceEsClient: TraceEsClient;
      }) => {
        const probeFixture = TUNING_FIXTURES[0];
        const { seededUuid, ruleId } = await seedRuleAndFpAlerts(
          { fetch, esClient, log },
          probeFixture,
          `probe-${probeFixture.id}-${Date.now()}`
        );

        let probe: RuleTuningVerdict;
        try {
          probe = await runRuleTuningWorkflow({ fetch, log });
        } finally {
          await cleanupSeededArtifacts({ fetch, esClient }, seededUuid, ruleId);
        }

        if (!probe.traceId) {
          throw new Error(
            'Review execution carried no traceId — trace-based evaluators (Tool Routing) would ' +
              'silently score N/A and the suite would report a false pass. This stack is not ' +
              'persisting OTEL trace ids (see #284701); fix the stack, not the suite.'
          );
        }
        await assertToolSpansReachable({ traceEsClient, probe, log });
        log.info(`trace reachability verified (${probe.traceId}) — trace-based evaluators armed`);
      }
    );

    evaluate.afterAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      if (createdRuleIds.size === 0) {
        return;
      }
      log.info(`Cleaning up ${createdRuleIds.size} rule-tuning eval artifacts`);
      // Rules are deleted through the detection engine API artifacts table; the sweep below
      // removes alerts that slipped through per-run cleanup.
      createdRuleIds.clear();
    });

    evaluate(
      'proposes the golden tuning path for each seeded FP cluster',
      async ({
        executorClient,
        evaluators,
        fetch,
        log,
        esClient,
        traceEsClient,
        connector: _judgeConnector,
      }) => {
        const examples: RuleTuningExample[] = TUNING_FIXTURES.map((fixture) => ({
          id: fixture.id,
          input: { fixtureId: fixture.id },
          output: { change_type: fixture.expected },
          metadata: {
            fixtureId: fixture.id,
            ruleType: fixture.ruleType,
            expected: fixture.expected,
            description: fixture.description,
          },
        }));

        // The LLM judge is reported as `TuningQuality`: the per-evaluator summary keys its
        // reliability lines by evaluator name, and the criteria evaluator's default name
        // (`criteria`) does not say which judge produced the score.
        const tuningQualityJudge = {
          ...evaluators.criteria(SUMMARY_CRITERIA),
          name: 'TuningQuality',
        };

        const selectedEvaluators = selectEvaluators([
          changeTypeAccuracy,
          validProposal,
          createToolRoutingEvaluator({ traceEsClient, log }),
          tuningQualityJudge,
        ]);

        // Observe every score so the run states its own resolution limits: per-evaluator
        // mean ± CI95 (n=N), a SATURATED(no signal) flag for evaluators that discriminated
        // nothing this run, and N/A counts as measurement gaps. A saturated evaluator is
        // reported, never averaged into a pass/fail claim.
        const scoreSink: ScoreSink = new Map();

        await executorClient.runExperiment(
          {
            // The workflow's concurrency group is max:1 strategy:drop — parallel task runs
            // would be dropped ("Dropped due to concurrency limit"). Serialize to match.
            concurrency: 1,
            datasets: [
              {
                name: DATASET_NAME,
                description:
                  'Runs the managed system-security-rule-tuning-worker/review workflows ' +
                  'end-to-end against ' +
                  `${TUNING_FIXTURES.length} seeded false-positive clusters (one per tuning path: ` +
                  'exception, query, risk_score, manual) and grades the diagnose_rule ' +
                  "step's change_type against the golden label.",
                examples,
              } satisfies EvaluationDataset,
            ],
            task: async ({ metadata }: { metadata: RuleTuningExample['metadata'] }) => {
              const fixture = TUNING_FIXTURES.find((f) => f.id === metadata.fixtureId);
              if (!fixture) {
                throw new Error(`No tuning fixture found for id ${metadata.fixtureId}`);
              }

              // Unique rule uuid + alert ids per run: the workflow's re-harvest guard tags
              // reviewed alerts with NOT MV_CONTAINS(workflow_tags, ...) filtering, so a
              // reused uuid would make repetitions after the first harvest nothing.
              const uniqueRuleId = `${fixture.id}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
              createdRuleIds.add(uniqueRuleId);

              const { seededUuid, ruleId } = await seedRuleAndFpAlerts(
                { fetch, esClient, log },
                fixture,
                uniqueRuleId
              );

              try {
                // No connector pinning post-split (see runRuleTuningWorkflow): the
                // worker schema rejects extra inputs, so the review's ai.agent
                // resolves the space-default connector like the rule-creation suite.
                return await runRuleTuningWorkflow({ fetch, log });
              } finally {
                await cleanupSeededArtifacts({ fetch, esClient }, seededUuid, ruleId);
              }
            },
          },
          withScoreCollection(selectedEvaluators, scoreSink)
        );

        logRunSummary({ sink: scoreSink, datasetName: DATASET_NAME, log });
      }
    );

    // Evaluator control: if the CODE evaluators silently accept garbage, every score
    // above is untrustworthy. Feed known-broken verdicts straight into the evaluators
    // and require rejection. A silent pass here means the suite's gates are vacuous.
    evaluate('rejects malformed diagnose output (evaluator control)', async () => {
      const completedRun = {
        executionId: 'evaluator-control',
        executionStatus: 'completed' as never,
      };
      const summary = 'FPs are the sanctioned scanner, not a detection';

      // change_type outside the four-branch union — the runtime gate would refuse the PATCH.
      const outOfUnion = await validProposal.evaluate?.({
        output: {
          ...completedRun,
          change_type: 'delete_rule' as ChangeType,
          summary,
        },
        metadata: { ruleType: 'query' },
      } as never);
      expect(outOfUnion?.score).toBe(0);
      expect(outOfUnion?.label).toBe('invalid');

      // A label from the pre-#288807 enum: nothing in the merged workflow can emit it,
      // so a model still returning it has not followed the prompt.
      const legacyLabel = await validProposal.evaluate?.({
        output: {
          ...completedRun,
          change_type: 'threshold' as ChangeType,
          summary,
        },
        metadata: { ruleType: 'query' },
      } as never);
      expect(legacyLabel?.score).toBe(0);

      // Well-formed change_type but an empty payload — the exception branch's apply step
      // iterates exception_entries, so an entry-less proposal renders an empty exception.
      const noEntries = await validProposal.evaluate?.({
        output: {
          ...completedRun,
          change_type: 'exception' as ChangeType,
          summary,
          exception_entries: [],
        },
        metadata: { ruleType: 'query' },
      } as never);
      expect(noEntries?.score).toBe(0);

      // A query proposal on a rule type whose query is never previewed or applied —
      // can_preview_query_change requires the rule type to be "query".
      const queryOnUnsupportedRuleType = await validProposal.evaluate?.({
        output: {
          ...completedRun,
          change_type: 'query' as ChangeType,
          summary,
          proposed_query: 'process.name:java',
        },
        metadata: { ruleType: 'new_terms' },
      } as never);
      expect(queryOnUnsupportedRuleType?.score).toBe(0);

      // risk_score outside the schema's 0-100 bounds and with an unlisted severity.
      const badRiskScore = await validProposal.evaluate?.({
        output: {
          ...completedRun,
          change_type: 'risk_score' as ChangeType,
          summary,
          proposed_risk_score: 140,
          proposed_severity: 'urgent',
        },
        metadata: { ruleType: 'query' },
      } as never);
      expect(badRiskScore?.score).toBe(0);

      // No summary at all — the review_tuning gate never opens, so no decision is
      // possible whatever the branch.
      const noSummary = await validProposal.evaluate?.({
        output: { ...completedRun, change_type: 'manual' as ChangeType },
        metadata: { ruleType: 'query' },
      } as never);
      expect(noSummary?.score).toBe(0);

      // No proposal at all (workflow failed upstream) — accuracy must score 0, not error.
      const noProposal = await changeTypeAccuracy.evaluate?.({
        output: { ...completedRun, executionStatus: 'failed' as never },
        expected: { change_type: 'query' },
      } as never);
      expect(noProposal?.score).toBe(0);
    });
  }
);
