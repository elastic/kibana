/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  triageApplyFpDecisionsStepCommonDefinition,
  triageHeadroomStepCommonDefinition,
  triageLoadAlertsStepCommonDefinition,
  triagePlanSweepStepCommonDefinition,
  triageRecordFpDecisionStepCommonDefinition,
  triageResolveFpClosureStepCommonDefinition,
} from '../../../common/step_types/alert_triage';
import { applyFpDecisions, writeFpDecisionKi } from '../../alert_triage/fp_decision';
import { readHeadroom } from '../../alert_triage/headroom';
import { planSweep } from '../../alert_triage/plan_sweep';
import { resolveFpClosure } from '../../alert_triage/resolve_fp_closure';
import type { HeadroomResult } from '../../alert_triage/types';
import {
  countAgedOutAlerts,
  fetchTriageAlerts,
  listLiveExecutionIds,
  loadAlertsByIds,
  readWorkflowRunLagMs,
  tagAlerts,
} from './ports';

export interface AlertTriageStepDependencies {
  getTaskManager: () => Pick<TaskManagerStartContract, 'aggregate'>;
}

export interface ResolveFpClosureStepDependencies {
  getProposalsService: ProposalsPluginStart['getProposalsService'];
  getProposalPrivileges: ProposalsPluginStart['getProposalPrivileges'];
  getConversations: () => AgentBuilderPluginStart['conversations'];
  getInternalEsClient?: () => ElasticsearchClient;
  logger?: Logger;
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

export const getTriageApplyFpDecisionsStepDefinition = ({
  getInternalEsClient,
  logger,
}: Pick<ResolveFpClosureStepDependencies, 'getInternalEsClient' | 'logger'>) =>
  createServerStepDefinition({
    ...triageApplyFpDecisionsStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = triageApplyFpDecisionsStepCommonDefinition.inputSchema.parse(context.input);
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const esClient = getInternalEsClient?.();
        if (!esClient) {
          return {
            output: {
              remaining_alert_ids: input.alerts
                .map((alert) => (typeof alert._id === 'string' ? alert._id : undefined))
                .filter((id): id is string => id !== undefined),
              remaining_alerts: input.alerts,
              close_alert_ids: [],
              suppressed_subject_keys: [],
              closed_count: 0,
              remaining_count: input.alerts.length,
            },
          };
        }
        const result = await applyFpDecisions({
          spaceId,
          ruleId: input.rule_id,
          alerts: input.alerts,
          esClient,
        });
        logger?.info?.(
          `triage_fp_decisions: close=${result.closeAlertIds.length} remaining=${result.remainingAlertIds.length} suppressed=${result.suppressedSubjectKeys.length}`
        );
        return {
          output: {
            remaining_alert_ids: result.remainingAlertIds,
            remaining_alerts: result.remainingAlerts,
            close_alert_ids: result.closeAlertIds,
            suppressed_subject_keys: result.suppressedSubjectKeys,
            closed_count: result.closeAlertIds.length,
            remaining_count: result.remainingAlertIds.length,
          },
        };
      } catch (error) {
        throw toApiError(error, 'apply FP decisions');
      }
    },
  });

export const getTriageRecordFpDecisionStepDefinition = ({
  getInternalEsClient,
}: Pick<ResolveFpClosureStepDependencies, 'getInternalEsClient'>) =>
  createServerStepDefinition({
    ...triageRecordFpDecisionStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = triageRecordFpDecisionStepCommonDefinition.inputSchema.parse(context.input);
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const esClient = getInternalEsClient?.();
        if (!esClient) {
          throw new ExecutionError({
            type: 'ApiError',
            message: 'No Elasticsearch client available to record FP decision',
          });
        }
        const kiId = await writeFpDecisionKi({
          esClient,
          spaceId,
          subjectKey: input.subject_key,
          patternKey: input.pattern_key,
          ruleId: input.rule_id,
          kind: input.decision,
        });
        return { output: { ki_id: kiId } };
      } catch (error) {
        throw toApiError(error, 'record FP decision');
      }
    },
  });

export const getTriageResolveFpClosureStepDefinition = ({
  getProposalsService,
  getProposalPrivileges,
  getConversations,
  getInternalEsClient,
  logger,
}: ResolveFpClosureStepDependencies) =>
  createServerStepDefinition({
    ...triageResolveFpClosureStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = triageResolveFpClosureStepCommonDefinition.inputSchema.parse(context.input);
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const request = context.contextManager.getFakeRequest();
        if (!request) {
          throw new ExecutionError({
            type: 'ApiError',
            message: 'No request available in workflow context',
          });
        }

        const conversationClient = await getConversations().getScopedClient({ request });
        const result = await resolveFpClosure({
          spaceId,
          ruleId: input.rule_id,
          alertIds: input.alert_ids,
          alerts: input.alerts,
          proposalsService: getProposalsService(),
          privileges: getProposalPrivileges(),
          conversationClient,
          request,
          esClient: getInternalEsClient?.(),
          logger,
        });

        return {
          output: {
            mint: result.mint.map((group) => ({
              kind: 'mint' as const,
              pattern_key: group.patternKey,
              subject_key: group.subjectKey,
              alert_ids: group.alertIds,
              entity_summary: group.entitySummary,
              proposal_id: group.proposalId,
              ki_id: group.kiId,
            })),
            converged: result.converged.map((group) => ({
              kind: 'converged' as const,
              pattern_key: group.patternKey,
              subject_key: group.subjectKey,
              alert_ids: group.alertIds,
              entity_summary: group.entitySummary,
              proposal_id: group.proposalId,
              conversation_id: group.conversationId,
              outcome: group.outcome,
              alert_count: group.alertCount,
            })),
            ...(result.primaryConversationId
              ? { primary_conversation_id: result.primaryConversationId }
              : {}),
            mint_count: result.mint.length,
            converged_count: result.converged.length,
          },
        };
      } catch (error) {
        throw toApiError(error, 'resolve FP closure groups');
      }
    },
  });
