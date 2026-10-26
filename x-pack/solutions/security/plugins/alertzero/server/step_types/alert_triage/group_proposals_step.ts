/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { buildAlertsPagePath } from '@kbn/securitysolution-alerts-page-url';
import { ExecutionStatus } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  triageGroupFpCandidatesStepCommonDefinition,
  triageJoinProposalStepCommonDefinition,
} from '../../../common/step_types/alert_triage';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../common/proposals/origin';
import { hashKey, strictKeyTags } from '../../alert_triage/key_tags';
import {
  groupFpCandidates,
  HeadsTruncatedError,
  tryJoinHead,
  type GroupingDeps,
  type GroupingHead,
} from '../../alert_triage/group_proposals';
import { buildPatternKeys, getField } from '../../alert_triage/pattern_key';
import { buildProposalText } from '../../alert_triage/proposal_text';
import { createInvestigationOpenChecker } from '../../services/proposals/dedup';
import type { WorkflowExecutionReader } from '../report_worker_outcome/report_worker_outcome_step';
import { loadAlertsByIds, readKeyHistory } from './ports';

/** How far back the proposal comment looks for earlier verdicts of the same pattern. */
const HISTORY_DAYS = 30;

/**
 * The earlier verdicts of the pattern the alerts share, for the proposal comment. Optional context:
 * a failed read leaves the line out instead of failing the proposal.
 */
const readHistory = async (
  { contextManager, logger }: { contextManager: Context['contextManager']; logger?: Logger },
  spaceId: string,
  docs: ReadonlyArray<Record<string, unknown>>,
  excludeIds: readonly string[]
) => {
  const tags = strictKeyTags(spaceId, docs);
  if (tags.length === 0) return undefined;
  try {
    return await readKeyHistory(contextManager, {
      strictKeyTags: tags,
      excludeIds,
      since: Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000,
    });
  } catch (error) {
    logger?.warn(`alert_triage grouping: could not read the pattern history: ${error}`);
    return undefined;
  }
};

/** The most heads one lookup reads: the index's default `max_result_window`. */
const MAX_HEADS = 10_000;

export interface GroupProposalsStepDependencies {
  getProposals: () => ProposalsPluginStart;
  getWorkflowsManagement: () => WorkflowExecutionReader | undefined;
  getConversations: () => AgentBuilderPluginStart['conversations'];
  /** The kill switch: false makes every batch mint its own proposal, as before grouping. */
  isGroupingEnabled: () => Promise<boolean>;
  logger?: Logger;
}

type Context = StepHandlerContext<unknown, unknown>;

const toApiError = (error: unknown, action: string): ExecutionError =>
  error instanceof ExecutionError
    ? error
    : new ExecutionError({
        type: 'ApiError',
        message: error instanceof Error ? error.message : `Failed to ${action}`,
      });

const toHead = (proposal: {
  id: string;
  rootProposalId?: string;
  revision?: number;
  status: string;
  decision?: string;
  expiresAt?: string;
  previousExecutionError?: string;
  conversationId: string;
  actionInput?: Record<string, unknown>;
  workflowExecutionId?: string;
}): GroupingHead => {
  const alertIds = proposal.actionInput?.alertIds;
  return {
    proposalId: proposal.id,
    rootProposalId: proposal.rootProposalId ?? proposal.id,
    revision: proposal.revision ?? 1,
    status: proposal.status,
    decision: proposal.decision,
    expiresAt: proposal.expiresAt,
    previousExecutionError: proposal.previousExecutionError,
    conversationId: proposal.conversationId,
    alertIds: Array.isArray(alertIds) ? alertIds.map(String) : [],
    workflowExecutionId: proposal.workflowExecutionId,
  };
};

/** Binds the proposals service, the gate check and the Investigation check to one step run. */
const createRuntime = async (
  deps: GroupProposalsStepDependencies,
  { contextManager }: Pick<Context, 'contextManager'>,
  text: { ruleName: string; confidenceFloor: number }
) => {
  const { spaceId } = contextManager.getContext().workflow;
  const request = contextManager.getFakeRequest();
  if (!request) {
    throw new ExecutionError({
      type: 'ApiError',
      message: 'No request available in workflow context',
    });
  }
  const { getProposalsService, getProposalPrivileges } = deps.getProposals();
  const service = getProposalsService();
  await getProposalPrivileges().assertCanRead(request);
  const management = deps.getWorkflowsManagement();
  const isInvestigationOpen = createInvestigationOpenChecker({
    conversationClient: await deps.getConversations().getScopedClient({ request }),
    logger: deps.logger,
  });

  const groupingDeps: GroupingDeps = {
    listHeads: async (rootIds) => {
      const { proposals, total } = await service.list(
        {
          rootProposalIds: rootIds,
          origin: ALERTZERO_PROPOSAL_ORIGIN,
          excludeSuperseded: true,
          excludeExpired: false,
          size: MAX_HEADS,
          from: 0,
        },
        spaceId,
        request
      );
      // A page that stops short of the total would hide heads, and a join or a derived id decided
      // without them could duplicate a proposal.
      if (total > proposals.length) {
        throw new HeadsTruncatedError(
          `The proposal lookup matched ${total} proposals and returned ${proposals.length}, so the batch is not grouped`
        );
      }
      return proposals.map(toHead);
    },
    // The gate check of `releaseGate`: a gate that no longer waits has been approved, and a revise
    // now would be closed without the approver having seen it.
    canJoin: async ({ workflowExecutionId, conversationId }) => {
      if (!workflowExecutionId || !management) return false;
      const execution = await management.getWorkflowExecution(workflowExecutionId, spaceId, {
        omitStepExecutions: true,
        request,
      });
      if (execution?.status !== ExecutionStatus.WAITING_FOR_INPUT || execution.finishedAt) {
        return false;
      }
      return isInvestigationOpen(conversationId);
    },
    revise: async (head, alertIds) => {
      const { alerts } = await loadAlertsByIds(contextManager, alertIds);
      const history = await readHistory(
        { contextManager, logger: deps.logger },
        spaceId,
        alerts,
        alertIds
      );
      const { title, comment } = buildProposalText({ alerts, kind: 'keyed', history, ...text });
      return service.revise(
        { id: head.proposalId, title, comment, actionInput: { alertIds } },
        spaceId,
        request
      );
    },
    newId: uuidv4,
    onError: (message) => deps.logger?.warn(`alert_triage grouping: ${message}`),
  };
  return { spaceId, groupingDeps };
};

export const getTriageGroupFpCandidatesStepDefinition = (deps: GroupProposalsStepDependencies) =>
  createServerStepDefinition({
    ...triageGroupFpCandidatesStepCommonDefinition,
    handler: async (context) => {
      try {
        const { input, contextManager } = context;
        const text = { ruleName: input.rule_name, confidenceFloor: input.confidence_floor };
        const { alerts, missingAlertIds } = await loadAlertsByIds(
          contextManager,
          input.fp_candidate_ids
        );
        const byId = new Map<string, Record<string, unknown>>(
          alerts.map((doc) => [String(doc._id), doc])
        );
        const textFor = async (
          ids: readonly string[],
          kind: 'keyed' | 'pooled' | 'overflow' | 'failed_join' | 'batch'
        ) => {
          const docs = ids.flatMap((id) => {
            const doc = byId.get(id);
            return doc ? [doc] : [];
          });
          // Only a keyed proposal holds one pattern, so only it has a history to show.
          const history =
            kind === 'keyed'
              ? await readHistory(
                  { contextManager, logger: deps.logger },
                  input.space_id,
                  docs,
                  ids
                )
              : undefined;
          return buildProposalText({ alerts: docs, kind, history, ...text });
        };
        const entitiesOf = (ids: readonly string[]) => {
          const docs = ids.flatMap((id) => {
            const doc = byId.get(id);
            return doc ? [doc] : [];
          });
          const hosts = new Set(docs.map((doc) => getField(doc, 'host.name')));
          const users = new Set(docs.map((doc) => getField(doc, 'user.name')));
          return (input.impacted_entities ?? []).filter(({ name, type }) =>
            (type === 'host' ? hosts : users).has(name)
          );
        };
        const empty = {
          mints: [],
          joins: [],
          grouped: false,
          grouping: 'flag_off' as 'on' | 'supervised' | 'flag_off' | 'lookup_incomplete',
          alerts_joined: 0,
          alerts_pooled: 0,
          proposals_created: 0,
          missing_alert_ids: missingAlertIds,
        };
        const foundIds = [...byId.keys()];
        if (foundIds.length === 0) return { output: empty };

        const supervised = input.autonomy !== 'manual';
        const grouped = !supervised && (await deps.isGroupingEnabled());
        if (!grouped) {
          return {
            output: {
              ...empty,
              grouping: supervised ? ('supervised' as const) : ('flag_off' as const),
              mints: [
                {
                  proposal_id: uuidv4(),
                  alert_ids: foundIds,
                  kind: 'batch' as const,
                  ...(await textFor(foundIds, 'batch')),
                  impacted_entities: entitiesOf(foundIds),
                },
              ],
              proposals_created: 1,
            },
          };
        }

        const { spaceId, groupingDeps } = await createRuntime(deps, context, text);
        const idsByKey = new Map<string, string[]>();
        for (const [id, doc] of byId) {
          const keyHash = hashKey(spaceId, buildPatternKeys(doc).wide);
          idsByKey.set(keyHash, [...(idsByKey.get(keyHash) ?? []), id]);
        }
        const plan = await groupFpCandidates({
          keys: [...idsByKey].map(([keyHash, alertIds]) => ({ keyHash, alertIds })),
          spaceId,
          now: Date.now(),
          pool: true,
          deps: groupingDeps,
        });
        return {
          output: {
            ...empty,
            grouped: !plan.lookupIncomplete,
            grouping: plan.lookupIncomplete ? ('lookup_incomplete' as const) : ('on' as const),
            mints: await Promise.all(
              plan.mints.map(async ({ proposalId, alertIds, kind }) => ({
                proposal_id: proposalId,
                alert_ids: alertIds,
                kind,
                ...(await textFor(alertIds, kind)),
                impacted_entities: entitiesOf(alertIds),
              }))
            ),
            joins: plan.joins.map((join) => ({
              owner_proposal_id: join.rootProposalId,
              proposal_id: join.proposalId,
              revision: join.revision,
              conversation_id: join.conversationId,
              alert_ids: join.alertIds,
              alerts_page_query: buildAlertsPagePath(join.alertIds, new Date().toISOString()),
              impacted_entities: entitiesOf(join.alertIds),
            })),
            alerts_joined: plan.joins.reduce((sum, { alertIds }) => sum + alertIds.length, 0),
            alerts_pooled: plan.mints
              .filter(({ kind }) => kind === 'pooled')
              .reduce((sum, { alertIds }) => sum + alertIds.length, 0),
            proposals_created: plan.mints.length,
          },
        };
      } catch (error) {
        throw toApiError(error, 'group triage false positives');
      }
    },
  });

export const getTriageJoinProposalStepDefinition = (deps: GroupProposalsStepDependencies) =>
  createServerStepDefinition({
    ...triageJoinProposalStepCommonDefinition,
    handler: async (context) => {
      try {
        const { input } = context;
        const notJoined = {
          joined: false,
          proposal_id: '',
          conversation_id: '',
          revision: 0,
          alert_ids: [] as string[],
          alerts_page_query: '',
        };
        if (!(await deps.isGroupingEnabled())) return { output: notJoined };
        const { groupingDeps } = await createRuntime(deps, context, {
          ruleName: input.rule_name,
          confidenceFloor: input.confidence_floor,
        });
        const [head] = await groupingDeps.listHeads([input.proposal_id]);
        // The owner was created moments ago and may not be searchable yet. Failing lets the review
        // retry the step, which a proposal that exists but cannot take the alerts does not need.
        if (!head) {
          throw new ExecutionError({
            type: 'NotFound',
            message: `Proposal ${input.proposal_id} is not searchable yet`,
          });
        }
        const join = await tryJoinHead({
          head,
          alertIds: input.alert_ids,
          now: Date.now(),
          deps: groupingDeps,
        });
        return {
          output: join
            ? {
                joined: true,
                proposal_id: join.proposalId,
                conversation_id: join.conversationId,
                revision: join.revision,
                alert_ids: join.alertIds,
                alerts_page_query:
                  join.alertIds.length > 0
                    ? buildAlertsPagePath(join.alertIds, new Date().toISOString())
                    : '',
              }
            : notJoined,
        };
      } catch (error) {
        throw toApiError(error, 'join the triage proposal');
      }
    },
  });
