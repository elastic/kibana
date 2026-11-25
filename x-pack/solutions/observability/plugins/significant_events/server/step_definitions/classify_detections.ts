/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * The gate between the change-point detections (noisy, frequent) and the discovery agent. Its one
 * question, per detection: has anything changed since someone last looked, so that the agent must
 * reprocess it? A detection is skipped when the live event its rule belongs to still holds, and goes
 * to the agent otherwise, with the reason. It judges nothing about whether the rate is unusual and
 * measures nothing for the agent: that is the agent's grounding.
 *
 * "Someone last looked" is the later of the live event's verdict time and the agent's last review of
 * the rule. The decisions apply in this order (`decideRow`, `reconcileSkip`):
 * 1. a row beyond `MAX_CLASSIFIED_ROWS` goes to the agent as `over_cap`;
 * 2. a flaky rule in no live event goes to the agent as `flaky_probe`;
 * 3. the live events and whether the rule's query returns rows now classify the rule
 *    (`classifyDetection`; the rule recorded a breach in its last two runs, or it did not): the stored
 *    verdict is contradicted (`state_changed`), the rule is in no live event (`not_live_member`), or a
 *    member has no verdict (`unjudged_member`);
 * 4. a verdict and a review both older than `max_skip_age_hours` go to the agent as `series_too_old`
 *    (a review counts when the detection fired after it);
 * 5. a skip needs a live event to rest on (`not_live_member`) and no rule joining it (`member_joining`);
 * 6. a held-back row (flaky-rule gate) is decided like any other, or stays pending and is never read;
 * 7. a run whose rows go to the agent only for `series_too_old`, `member_joining`, `flaky_probe` or
 *    `unjudged_member` calls no agent: they stay pending until a run has a detection that shows a
 *    change (any other reason, or a row the gate could not read), or one has waited
 *    `review_fresh_minutes`;
 * 8. at most `batch_max` rows go to the agent, those that show a change (or have waited out the hold)
 *    before those that still wait; the rest stay pending. `get_detections` returns up to `MAX_CLASSIFIED_ROWS`, so waiting rows never
 *    take a slot from a change, whatever the batch limit.
 *
 * Whether the rule's query returns rows is read from the breaches the rule itself recorded in
 * `.rule-events`, not by running the query again. The rule writes nothing on a quiet run, so a rule
 * with no recent breach reads as matching nothing; a failed read sends the rows to the agent unjudged, up to `batch_max`.
 */

import type { Logger } from '@kbn/core/server';
import { MAX_ID_LENGTH } from '@kbn/significant-events-schema';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { lazySchema, z } from '@kbn/zod/v4';
import { RuleEventsClient } from '../lib/significant_events/events/rule_events_client';
import { classifyBatch } from './classify_batch';
import { failOpen, outputSchema, MAX_INPUT_ROWS } from './classify_output';

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MAX_ROW_COLUMNS = 20;

const rowsSchema = lazySchema(() =>
  z.array(z.array(z.unknown()).max(MAX_ROW_COLUMNS)).max(MAX_INPUT_ROWS)
);

const inputSchema = lazySchema(() =>
  z.object({
    /**
     * The `get_detections` rows: `[rule_uuid, _source, ...]`. Absent when that query had none. A row
     * the flaky-rule gate held back says so in its `held_back` column: the classifier may skip it
     * when its live event still holds, and never hands it to the agent.
     */
    rows: rowsSchema.optional(),
    /**
     * The names of the row columns, in order, so each detection can be handed over by field name.
     * Absent with the rows when `get_detections` failed: an empty batch.
     */
    columns: z.array(z.string().max(64)).max(MAX_ROW_COLUMNS).default([]),
    space_id: z.string().max(MAX_ID_LENGTH),
    max_skip_age_hours: z
      .number()
      .min(1)
      .max(24 * 30),
    /**
     * How far back the live events a detection belongs to are read. It matches the default 90-day
     * `.rule-events` retention and is capped at 90: a live event with no version inside it reads
     * as "not a live member", and nothing warns when retention is raised above it.
     */
    live_lookback_days: z.number().min(1).max(90).default(90),
    /**
     * How long the gate keeps a detection from the agent: a held-back rule's change after a review
     * that covers it, and a detection that shows no change until a run has one.
     */
    review_fresh_minutes: z.number().int().min(15).max(1_440).default(240),
    /**
     * The most detections handed to the agent in one run (`detectionBatchMax`). `get_detections`
     * returns a pool of rows to classify, so a detection that waits does not take a slot from one
     * that shows a change; the rows past this wait for a later run.
     */
    batch_max: z.number().int().min(1).max(MAX_INPUT_ROWS).default(10),
  })
);

/** The gate before the discovery agent: see the comment at the top of this file. */
export const classifyDetectionsStepDefinition = ({ logger }: { logger: Logger }) =>
  createServerStepDefinition({
    id: 'significantEvents.classifyDetections',
    label: 'Classify significant events detections',
    category: StepCategory.Elasticsearch,
    description:
      'The gate before the discovery agent: decides per detection whether anything changed since someone last looked, by comparing whether the rule’s query returns rows now (the breach the rule itself recorded) with the member state in its live events and counting the time from the later of the verdict and the agent’s last review, so that only what the agent must reprocess reaches it. Read-only.',
    inputSchema,
    outputSchema,
    handler: async (context) => {
      const {
        rows = [],
        columns,
        space_id: spaceId,
        max_skip_age_hours: maxSkipAgeHours,
        live_lookback_days: liveLookbackDays,
        review_fresh_minutes: reviewFreshMinutes,
        batch_max: batchMax,
      } = context.input;
      const esClient = context.contextManager.getScopedEsClient();
      const ruleEventsClient = new RuleEventsClient({ esClient, space: spaceId });

      const now = Date.now();
      const output = await classifyBatch({
        rows,
        columns,
        maxSkipAgeMs: maxSkipAgeHours * HOUR_MS,
        now,
        reviewFreshMs: reviewFreshMinutes * MINUTE_MS,
        batchMax,
        // A live event stays a member while it has a version inside the lookback: `series_too_old`
        // decides whether the last look at it still stands.
        findLiveMemberships: (ruleUuids) =>
          ruleEventsClient.findLiveMemberships({
            ruleUuids,
            lookback: new Date(now - liveLookbackDays * DAY_MS).toISOString(),
          }),
        findRecentBreaches: (ruleUuids, from) =>
          ruleEventsClient.findLatestBreachedSignals({ ruleUuids, from }),
      }).catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        logger.error(`classifyDetections failed, sending the rows on unjudged: ${reason}`);
        return failOpen({ rows, columns, batchMax });
      });

      logger.info(
        `classifyDetections ${JSON.stringify({
          detections: output.skipped_count + output.needs_agent_count,
          skipped: output.skipped_count,
          held_back: output.held_back_count,
          failed: output.failed,
          needs_agent: output.needs_agent_count,
          reasons: output.reason_counts,
          flaky_live: output.flaky_live_reason_counts,
          // Rules whose live verdict the gate can no longer check: no breach was recorded, so
          // reading a quiet or stopped rule as matching nothing is what decided them.
          no_breach_state_changed: output.batch.filter(
            ({ classifier }) =>
              classifier?.reason === 'state_changed' &&
              classifier.rule_breached === false &&
              classifier.live_events?.some(({ stored_verdict: verdict }) => verdict === 'confirms')
          ).length,
          // The same read in the other direction: a healthy verdict left unreached for want of a
          // breach, so a stopped rule looks healthy. Skips keep the rule out of `batch`.
          no_breach_still_healthy: output.skips.filter(
            ({ skip }) =>
              skip.reason === 'still_healthy' &&
              skip.rule_breached === false &&
              skip.stored_verdict === 'refutes'
          ).length,
        })}`
      );
      return { output };
    },
  });
