/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  triageHeadroomStepCommonDefinition,
  triageLoadAlertsStepCommonDefinition,
  triagePlanSweepStepCommonDefinition,
  triageRetagProposalAlertsStepCommonDefinition,
  triageTagPatternKeysStepCommonDefinition,
} from '../../../common/step_types/alert_triage';
import { TAG_CHUNK_SIZE } from '../../alert_triage/constants';
import { readHeadroom } from '../../alert_triage/headroom';
import { planKeyTags } from '../../alert_triage/key_tags';
import { planSweep, tagInChunks } from '../../alert_triage/plan_sweep';
import type { HeadroomResult } from '../../alert_triage/types';
import {
  countAgedOutAlerts,
  fetchTriageAlerts,
  findLeftoverFalsePositiveIds,
  listLiveExecutionIds,
  loadAlertsByIds,
  readWorkflowRunLagMs,
  tagAlerts,
} from './ports';

export interface AlertTriageStepDependencies {
  getTaskManager: () => Pick<TaskManagerStartContract, 'aggregate'>;
}

const toApiError = (error: unknown, action: string): ExecutionError =>
  error instanceof ExecutionError
    ? error
    : new ExecutionError({
        type: 'ApiError',
        message: error instanceof Error ? error.message : `Failed to ${action}`,
      });

export const getTriageHeadroomStepDefinition = ({ getTaskManager }: AlertTriageStepDependencies) =>
  createServerStepDefinition({
    ...triageHeadroomStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      try {
        const headroom = await readHeadroom({
          readTmLagMs: () => readWorkflowRunLagMs(getTaskManager(), Date.now()),
          countInFlight: async () => {
            const live = await listLiveExecutionIds(
              contextManager,
              input.batch_workflow_id,
              logger
            );
            if (live === undefined) throw new Error('Live batches could not be read');
            return live.size;
          },
        });
        return {
          output:
            headroom.status === 'ok'
              ? { status: 'ok' as const, in_flight: headroom.inFlight, slots: headroom.slots }
              : headroom.status === 'behind'
              ? { status: 'behind' as const, lag_ms: headroom.lagMs }
              : { status: 'unknown' as const },
        };
      } catch (error) {
        throw toApiError(error, 'read triage headroom');
      }
    },
  });

export const getTriagePlanSweepStepDefinition = () =>
  createServerStepDefinition({
    ...triagePlanSweepStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      try {
        const { headroom: given } = input;
        // `ok` without its slots is not a usable answer, so it is treated as unknown.
        const headroom: HeadroomResult =
          given.status === 'ok' && given.slots !== undefined
            ? { status: 'ok', inFlight: given.in_flight ?? 0, slots: given.slots }
            : given.status === 'behind'
            ? { status: 'behind', lagMs: given.lag_ms ?? 0 }
            : { status: 'unknown' };

        const now = Date.now();
        const filters = {
          minSeverity: input.min_severity,
          excludeBuildingBlocks: input.exclude_building_blocks,
          excludedRuleTags: input.excluded_rule_tags,
        };
        const plan = await planSweep(
          {
            readHeadroom: async () => headroom,
            countAgedOutAlerts: () =>
              countAgedOutAlerts(
                contextManager,
                input.analysis_tag_prefix,
                now - input.lookback_hours * 60 * 60 * 1000,
                filters
              ),
            fetchAlerts: () =>
              fetchTriageAlerts(
                contextManager,
                input.analysis_tag_prefix,
                now - input.lookback_hours * 60 * 60 * 1000,
                filters
              ),
            listLiveExecutionIds: () =>
              listLiveExecutionIds(contextManager, input.batch_workflow_id, logger),
            tagAlerts: tagAlerts(contextManager),
          },
          {
            now,
            budgetPerHour: input.budget_per_hour,
            intervalMinutes: input.interval_minutes,
            lookbackHours: input.lookback_hours,
            analysisTagPrefix: input.analysis_tag_prefix,
          }
        );
        const { numbers } = plan;
        return {
          output: {
            skip_reason: plan.skipReason,
            batches: plan.batches.map(({ ruleId, ruleName, alerts }) => ({
              rule_id: ruleId,
              rule_name: ruleName,
              alert_ids: alerts.map(({ id }) => id),
            })),
            numbers: {
              pending_alerts: numbers.pendingAlerts,
              aged_out_alerts: numbers.agedOutAlerts,
              claimed_alerts: numbers.claimedAlerts,
              reclaimed_alerts: numbers.reclaimedAlerts,
              live_batches: numbers.liveBatches,
              planned_batches: numbers.plannedBatches,
              planned_alerts: numbers.plannedAlerts,
              sweep_budget: numbers.sweepBudget,
              planned_cost: numbers.plannedCost,
            },
          },
        };
      } catch (error) {
        throw toApiError(error, 'plan triage sweep');
      }
    },
  });

export const getTriageLoadAlertsStepDefinition = () =>
  createServerStepDefinition({
    ...triageLoadAlertsStepCommonDefinition,
    handler: async ({ input, contextManager }) => {
      try {
        const { alerts, missingAlertIds } = await loadAlertsByIds(contextManager, input.alert_ids);
        return { output: { alerts, missing_alert_ids: missingAlertIds } };
      } catch (error) {
        throw toApiError(error, 'load triage batch alerts');
      }
    },
  });

export const getTriageTagPatternKeysStepDefinition = () =>
  createServerStepDefinition({
    ...triageTagPatternKeysStepCommonDefinition,
    handler: async ({ input, contextManager }) => {
      try {
        const { alerts, missingAlertIds } = await loadAlertsByIds(contextManager, input.alert_ids);
        const { groups, counts } = planKeyTags({
          alerts: alerts.map((doc) => ({ id: String(doc._id), doc })),
          fpCandidateIds: input.fp_candidate_ids,
          spaceId: input.space_id,
        });
        const write = tagAlerts(contextManager);
        for (const { alertIds, tags } of groups) {
          await tagInChunks(write, { alertIds, add: tags, remove: [] });
        }
        return {
          output: {
            alerts_with_strict_key: counts.alertsWithStrictKey,
            strict_keys: counts.strictKeys,
            strict_keys_single_alert: counts.strictKeysSingleAlert,
            wide_keys: counts.wideKeys,
            wide_keys_single_alert: counts.wideKeysSingleAlert,
            fp_candidates_on_fallback: counts.fpCandidatesOnFallback,
            missing_alert_ids: missingAlertIds,
          },
        };
      } catch (error) {
        throw toApiError(error, 'tag triage alerts with their pattern keys');
      }
    },
  });

const RETAG_ATTEMPTS = 3;

export const getTriageRetagProposalAlertsStepDefinition = () =>
  createServerStepDefinition({
    ...triageRetagProposalAlertsStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      try {
        const query = {
          proposalTag: input.proposal_id ? `az:proposal:${input.proposal_id}` : undefined,
          ids: input.alert_ids ?? [],
          excludeIds: input.exclude_alert_ids ?? [],
        };
        const write = tagAlerts(contextManager);
        const describe = input.proposal_id ?? '(by id)';
        // Re-tagged alerts leave the query, so searching again finds the rest of a full page.
        // What a search finds again after a write was attempted and did not change (a version
        // conflict or a skipped update): it counts as failed and is left out of the next search.
        // Each pass either tags new alerts or fails more of them, so the loop ends.
        const sweep = async (
          modelMarkerOnly: boolean,
          update: { add: string[]; remove: string[] }
        ) => {
          const seen = new Set<string>();
          const failed = new Set<string>();
          for (;;) {
            const page = await findLeftoverFalsePositiveIds(contextManager, {
              ...query,
              excludeIds: [...query.excludeIds, ...failed],
              modelMarkerOnly,
            });
            const failedBefore = failed.size;
            const fresh = page.filter((id) => !seen.has(id));
            page.filter((id) => seen.has(id)).forEach((id) => failed.add(id));
            if (fresh.length === 0 && failed.size === failedBefore) break;
            fresh.forEach((id) => seen.add(id));
            // A chunk that fails must not stop the others, so each one is counted.
            for (let start = 0; start < fresh.length; start += TAG_CHUNK_SIZE) {
              const ids = fresh.slice(start, start + TAG_CHUNK_SIZE);
              for (let attempt = 1; attempt <= RETAG_ATTEMPTS; attempt++) {
                try {
                  await write({ alertIds: ids, ...update });
                  break;
                } catch (error) {
                  if (attempt < RETAG_ATTEMPTS) continue;
                  ids.forEach((id) => failed.add(id));
                  logger.warn(
                    `Re-tagging ${ids.length} alert(s) of proposal ${describe} failed: ${
                      error instanceof Error ? error.message : String(error)
                    }`
                  );
                }
              }
            }
          }
          return { seen, failed };
        };
        const open = await sweep(false, {
          add: ['az:inconclusive'],
          remove: input.drop_model_fp
            ? ['az:false_positive', 'az:model_fp']
            : ['az:false_positive'],
        });
        // A candidate closed before the dismissal is out of the open query but must still lose
        // the rejected model judgement, or Rule Tuning keeps counting it as a false positive.
        const marked = input.drop_model_fp
          ? await sweep(true, { add: [], remove: ['az:model_fp'] })
          : { seen: new Set<string>(), failed: new Set<string>() };
        const seen = new Set([...open.seen, ...marked.seen]);
        const failedIds = new Set([...open.failed, ...marked.failed]);
        return { output: { matched: seen.size, failed: failedIds.size } };
      } catch (error) {
        throw toApiError(error, 're-tag the alerts of a triage proposal');
      }
    },
  });
