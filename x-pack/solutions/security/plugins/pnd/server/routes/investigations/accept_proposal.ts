/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATION_URL_TEMPLATE } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { getRealProposalById } from './real_data';

const AcceptProposalRequestParams = z.object({
  id: z.string().min(1).max(256),
  proposalId: z.string().min(1).max(256),
});

const AcceptProposalRequestBody = z
  .object({
    connectorId: z.string().min(1).max(256).optional(),
  })
  .optional();

const ACCEPT_PROPOSAL_PATH =
  `${PND_INVESTIGATION_URL_TEMPLATE}/proposals/{proposalId}/accept` as const;

const ESCALATION_STEP_ID = 'escalate';
const MAX_POLL_MS = 120_000;
const POLL_INTERVAL_MS = 1_500;
// Bounded retries for the post-completion race where the workflow reports COMPLETED
// before the output-bearing step-execution record is indexed.
const STEP_OUTPUT_MAX_ATTEMPTS = 15;
const STEP_OUTPUT_POLL_INTERVAL_MS = 400;

/**
 * Build the escalation Watch workflow triggered when an analyst accepts an
 * `escalate` proposal. Each Watch is an Elastic Workflow; the escalation hand-off
 * is expressed as an `ai.agent` step (the platform "AI step") that produces a
 * structured escalation record. This keeps analyst-approved escalation on the same
 * workflow execution rail as scheduled Watch runs rather than an ad-hoc call.
 */
const buildEscalationWorkflowYaml = (connectorId?: string): string => {
  const connectorLine = connectorId ? `\n    connector-id: "${connectorId}"` : '';
  return `version: "1"
name: pnd-watch-escalation
enabled: true
triggers:
  - type: manual
inputs:
  - name: investigationTitle
    type: string
  - name: proposalReasoning
    type: string
  - name: targetTier
    type: string
steps:
  - name: ${ESCALATION_STEP_ID}
    type: ai.agent
    timeout: "2m"${connectorLine}
    with:
      message: |
        You are the Watch Orchestrator for an autonomous security Watch Floor.
        An analyst has APPROVED an escalation proposal. Produce the escalation
        hand-off record for the specialist Watch tier.

        Investigation: {{ inputs.investigationTitle }}
        Approved rationale: {{ inputs.proposalReasoning }}
        Target Watch tier: {{ inputs.targetTier }}

        You already have all the context you need above. Do NOT call any tools,
        do NOT search for additional data, and do NOT ask questions. Produce the
        escalation hand-off record as the required structured output in a single
        response.
      schema:
        type: object
        properties:
          escalationSummary:
            type: string
            description: One-paragraph hand-off brief for the receiving Watch tier.
          priority:
            type: string
            enum: ["critical", "high", "medium", "low"]
            description: Escalation priority.
          nextActions:
            type: array
            items:
              type: string
            description: Concrete next steps for the specialist tier.
        required: ["escalationSummary", "priority", "nextActions"]
`;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const registerAcceptProposalRoute = ({
  router,
  logger,
  config,
  getSpaceId,
  getWorkflowsManagement,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: ACCEPT_PROPOSAL_PATH,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Accept a proposal for an investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(AcceptProposalRequestParams),
            body: buildRouteValidationWithZod(AcceptProposalRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { id: investigationId, proposalId } = request.params;
          const connectorId = request.body?.connectorId;

          const proposal = getRealProposalById(investigationId, proposalId);

          // Reflect the analyst decision on the investigation timeline (both the
          // non-escalation "approve/isolate" path and escalation share this),
          // then refresh the parent's pendingProposalCount so the Brief queue
          // card's CTA doesn't keep advertising the pre-decision action.
          const recordApprovalOnTimeline = async () => {
            const store = getInvestigationStore();
            if (store == null) return;
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            // In mock mode there is no ES document to mutate — mirrors reject/modify/escalate/
            // defer's guard so accept doesn't diverge from its sibling routes.
            if (!config.ui.useMockData) {
              try {
                await store.updateProposalStatus(
                  esClient,
                  proposalId,
                  { status: 'approved' },
                  request
                );
              } catch (statusError) {
                logger.warn(`Failed to persist approved status: ${statusError}`);
              }
            }
            try {
              await store.recordDeepWatchOutcome(esClient, {
                investigationId,
                events: [
                  {
                    id: `evt-decision-approve-${proposalId}`,
                    timestamp: new Date().toISOString(),
                    type: 'decision',
                    summary: `Analyst approved ${proposal?.type ?? 'the'} proposal ${proposalId}${
                      proposal?.type === 'contain' ? ' — endpoint isolation authorized' : ''
                    }`,
                    actor: 'analyst',
                  },
                ],
              });
            } catch (timelineError) {
              logger.warn(`Failed to record approval on timeline: ${timelineError}`);
            }
            try {
              await store.reconcileInvestigationAfterDecision(esClient, investigationId);
            } catch (reconcileError) {
              logger.warn(`Failed to reconcile investigation after approval: ${reconcileError}`);
            }
          };

          // Non-escalation proposals: approve without triggering a Watch workflow.
          if (proposal?.type !== 'escalate') {
            await recordApprovalOnTimeline();
            return response.ok({
              body: {
                proposalId,
                status: 'approved',
                message: 'Proposal accepted',
                escalation: null,
              },
            });
          }

          const management = getWorkflowsManagement();
          if (management == null) {
            logger.warn(
              'Escalation proposal accepted but workflows management API is unavailable; ' +
                'approving without triggering the escalation Watch workflow.'
            );
            return response.ok({
              body: {
                proposalId,
                status: 'approved',
                message: 'Proposal accepted (escalation workflow unavailable)',
                escalation: null,
              },
            });
          }

          const spaceId = getSpaceId(request);
          const workflowYaml = buildEscalationWorkflowYaml(connectorId);
          const startedAt = Date.now();

          const executionId = await management.testWorkflow({
            workflowYaml,
            inputs: {
              event: {},
              investigationTitle: investigationId,
              proposalReasoning: proposal.reasoning ?? '',
              targetTier: 'deep',
            },
            spaceId,
            request,
          });

          // Poll the escalation Watch workflow execution to a terminal state.
          let execution = await management.getWorkflowExecution(executionId, spaceId);
          while (
            execution != null &&
            !isTerminalStatus(execution.status) &&
            Date.now() - startedAt < MAX_POLL_MS
          ) {
            await delay(POLL_INTERVAL_MS);
            execution = await management.getWorkflowExecution(executionId, spaceId);
          }

          const status = execution?.status;
          const completed = status === ExecutionStatus.COMPLETED;

          // Read the escalation step's structured output.
          //
          // Two step-execution records can exist for one run (an early placeholder
          // with output: null, then the final record carrying structured_output),
          // and the workflow can report COMPLETED a beat before the output-bearing
          // record is indexed. Poll until the populated record for our run lands.
          let escalationRecord: unknown;
          if (completed) {
            for (let attempt = 0; attempt < STEP_OUTPUT_MAX_ATTEMPTS; attempt++) {
              const stepExecutions = await management.searchStepExecutions(
                {
                  workflowId: execution?.workflowId ?? 'test-workflow',
                  stepId: ESCALATION_STEP_ID,
                  includeOutput: true,
                },
                spaceId
              );
              const stepExec = stepExecutions.results.find(
                (step) =>
                  step.workflowRunId === executionId &&
                  step.stepId === ESCALATION_STEP_ID &&
                  step.output != null
              );
              const output = stepExec?.output as Record<string, unknown> | undefined;
              if (output != null) {
                escalationRecord = output.structured_output ?? output.message;
                break;
              }
              await delay(STEP_OUTPUT_POLL_INTERVAL_MS);
            }
          }

          const latencyMs = Date.now() - startedAt;
          logger.info(
            `Escalation Watch workflow ${executionId} for proposal ${proposalId} ` +
              `ended with status ${status ?? 'unknown'} in ${latencyMs}ms`
          );

          await recordApprovalOnTimeline();

          return response.ok({
            body: {
              proposalId,
              status: 'approved',
              message: completed
                ? 'Proposal accepted — escalation Watch workflow completed'
                : `Proposal accepted — escalation Watch workflow ended with status ${
                    status ?? 'unknown'
                  }`,
              escalation: {
                triggered: true,
                workflowExecutionId: executionId,
                stepType: 'ai.agent',
                workflowStatus: status ?? 'unknown',
                completed,
                latencyMs,
                record: escalationRecord ?? null,
              },
            },
          });
        } catch (error) {
          logger.error(`Failed to accept proposal: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to accept proposal' },
          });
        }
      }
    );
};
