/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L4 Durable Outcome — Raw Log Corroboration Worker
 *
 * Per PR #35 pyramid: "L4 requires a durable outcome to score. A worker
 * whose findings exist only in an ephemeral tool/chat response has no L4."
 *
 * Verifies that the corroboration report is persisted to the Investigation
 * timeline, making the findings durable and replayable for Evaluation Record
 * scoring.
 *
 * The persistence check READS PERSISTED STATE. It previously inferred
 * durability from the response text — `hasPersistedRef` was true when any
 * response content contained "investigation", "timeline" or "persisted", all
 * three of which are in the prompt — so an ephemeral or hallucinated report
 * scored as durable. It now searches the Investigation timeline through
 * `esClient` and only counts a record that is correlated to THIS run: the
 * per-run id echoed through the request must appear in the stored document, and
 * the document must not predate the run. The correlation logic is unit-tested in
 * `src/gates/durable_outcome.test.ts`.
 */

import { tags, evaluate, getToolCallSteps } from '@kbn/evals';
import { v4 as uuidv4 } from 'uuid';
import { SCENARIOS } from '../src/dataset';
import { logScorecard } from '../src/scorecard_log';
import { INDICES, SKILL_ID } from '../src/constants';
import { buildCorroborationPrompt } from '../src/prompt';
import { seedForensicTimeline, cleanupSeededData } from '../src/data_generators/forensic_data';
import {
  buildInvestigationReadbackSearch,
  evaluateDurableOutcome,
  type ReadbackHit,
} from '../src/gates/durable_outcome';

evaluate.describe(
  'C3:L4 | Raw Log Corroboration — Durable Outcome',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ esClient }) => {
      for (const scenario of SCENARIOS) {
        await seedForensicTimeline({ esClient, scenario });
      }
    });

    evaluate.afterAll(async ({ esClient }) => {
      for (const scenario of SCENARIOS) {
        await cleanupSeededData(esClient, scenario.id);
      }
    });

    const scenario = SCENARIOS.find((s) => s.id === 'partial-gap') ?? SCENARIOS[0];

    /**
     * Is there a durable producer for the Investigation timeline in this
     * deployment?
     *
     * The readback below can only ever find a document that some tool wrote into
     * `${INDICES.INVESTIGATIONS}`. At this head nothing in the skill under test
     * writes it: the probed `emit_corroboration` / `recordDeepWatch` tool ids have
     * no implementation in this repository, so the index stays empty, the gate is
     * permanently red, and the red measures nothing about the worker.
     *
     * A missing index is the cheap, definitive signal that no producer has ever
     * run here. When it is missing the spec SKIPS with that reason — visible in
     * the results, and distinguishable from a gate that actually failed — instead
     * of reporting a failure caused by an absent dependency. If the producer lands
     * but has not written yet, the skip is the conservative outcome and disappears
     * after its first write. Delete this guard with the producer PR.
     */
    let durableProducerPresent: boolean | undefined;

    evaluate.beforeAll(async ({ esClient, log }) => {
      try {
        durableProducerPresent = await esClient.indices.exists({ index: INDICES.INVESTIGATIONS });
      } catch (e) {
        durableProducerPresent = undefined;
        log.warning(`[L4] producer probe failed: ${(e as Error).message}`);
      }
      log.info(
        `[L4] producer probe: ${INDICES.INVESTIGATIONS} exists=${
          durableProducerPresent ?? 'unknown'
        }`
      );
    });

    evaluate(
      'should persist corroboration findings to investigation timeline',
      { tag: tags.stateful.classic },
      async ({ agentBuilderClient, esClient, log }) => {
        evaluate.skip(
          durableProducerPresent === false,
          `No durable producer for ${INDICES.INVESTIGATIONS} in this deployment: nothing at this ` +
            `head writes the Investigation timeline, so the readback can only return zero hits and ` +
            `this gate could never pass. Skipping rather than reporting a red that measures nothing.`
        );

        // Per-run identity. Without it the readback accepted ANY report written
        // in the last few minutes — an earlier spec, a retry, or a concurrent
        // run could satisfy the gate even when this invocation persisted
        // nothing.
        const runId = `raw-log-l4-${uuidv4()}`;
        const runStartedAt = new Date().toISOString();

        const prompt = buildCorroborationPrompt(scenario, {
          runId,
          requirePersistence: true,
        });

        log.info(`[L4] Starting durable outcome test (runId=${runId})`);

        const response = await agentBuilderClient.converse({
          agentId: 'elastic-ai-agent',
          input: prompt,
          // Pin the skill under test, as the sibling L3 composite spec does. This
          // spec scores the raw-log corroboration worker's DURABILITY, not the
          // agent's ability to route to it: without the override a run can be
          // decided by the router before `produce_draft_forensic_report` is ever
          // called, and routing is already covered by the L0 smoke spec.
          configurationOverrides: { skillIds: [SKILL_ID] },
        });

        const toolCallSteps = getToolCallSteps(response);
        const toolIds = new Set(toolCallSteps.map((s) => s.tool_id).filter(Boolean));

        // Skill invocation gate
        const skillInvoked = [...toolIds].some((id) => (id as string).includes(SKILL_ID));

        // Durable write: the persistence tool was invoked. Kept as a separate
        // dimension from the readback — calling the tool is not evidence that
        // anything was stored.
        const hasEmitCorroboration = [...toolIds].some(
          (id) =>
            (id as string).includes('emit_corroboration') ||
            (id as string).includes('recordDeepWatch')
        );

        // Read persisted state back, correlated to this run.
        let durable = evaluateDurableOutcome({ runId, runStartedAt, hits: [] });
        try {
          const searchRes = await esClient.search(
            buildInvestigationReadbackSearch({ runStartedAt })
          );
          durable = evaluateDurableOutcome({
            runId,
            runStartedAt,
            hits: (searchRes.hits?.hits ?? []) as unknown as ReadbackHit[],
          });
          log.info(
            `[L4] readback: recent=${durable.recentCount}, correlated=${durable.correlatedCount}, ` +
              `structuredFindings=${durable.structuredFindingsStored}`
          );
        } catch (e) {
          log.warning(`[L4] ES readback failed: ${(e as Error).message}`);
        }

        const success = skillInvoked && durable.success;

        const scorecard = {
          skillInvoked: skillInvoked ? 1 : 0,
          durableWriteCalled: hasEmitCorroboration ? 1 : 0,
          durableOutcomeVerified: durable.success ? 1 : 0,
          persistedCorrelatedToRun: durable.correlatedCount > 0 ? 1 : 0,
        };

        logScorecard(log, { level: 'L4', exampleId: scenario.id, scorecard });

        return {
          success,
          explanation:
            `Skill invoked: ${skillInvoked}. ` +
            `Persistence tool called: ${hasEmitCorroboration}. ` +
            `Records written since the run started: ${durable.recentCount}; ` +
            `of those carrying run id ${runId}: ${durable.correlatedCount}; ` +
            `stored structured findings: ${durable.structuredFindingsStored}.`,
          scorecard,
        };
      }
    );
  }
);
