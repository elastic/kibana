/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_INVESTIGATION_URL_TEMPLATE,
  TEMPLATE_VERSION_CURRENT,
} from '@kbn/pnd-common';

import type { Proposal } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { realInvestigations } from './real_data';

const GenerateProposalRequestParams = z.object({
  id: z.string().min(1).max(256),
});

const GenerateProposalRequestBody = z
  .object({
    connectorId: z.string().min(1).max(256).optional(),
  })
  .optional();

const GENERATE_PROPOSAL_PATH = `${PND_INVESTIGATION_URL_TEMPLATE}/proposals/_generate` as const;

const AI_STEP_ID = 'reason';
const POLL_INTERVAL_MS = 400;
const MAX_POLL_MS = 120_000;
// Bounded retries for the post-completion race where the workflow reports COMPLETED
// before the output-bearing step-execution record is indexed (~15 * 400ms = 6s max).
const STEP_OUTPUT_MAX_ATTEMPTS = 15;
const ALLOWED_TYPES = new Set(['escalate', 'contain', 'investigate', 'tune']);

interface LlmDecision {
  type: string;
  confidence: number;
  reasoning: string;
}

/**
 * Build the Watch orchestrator workflow for on-demand proposal reasoning.
 *
 * Each Watch is an Elastic Workflow; the reasoning is expressed as an `ai.agent`
 * step (the platform "AI step") with a JSON `schema` so the agent returns
 * structured output instead of free text. This keeps proposal generation on the
 * same execution rail as scheduled Watch runs rather than an ad-hoc connector call.
 */
const buildWatchReasoningWorkflowYaml = (connectorId?: string): string => {
  const connectorLine = connectorId ? `\n    connector-id: "${connectorId}"` : '';
  return `version: "1"
name: pnd-watch-reasoning
enabled: true
triggers:
  - type: manual
inputs:
  - name: title
    type: string
  - name: severity
    type: string
  - name: affectedSurface
    type: string
  - name: summary
    type: string
steps:
  - name: ${AI_STEP_ID}
    type: ai.agent
    timeout: "2m"${connectorLine}
    with:
      message: |
        You are a Tier-1 SOC analyst assistant for an autonomous security Watch Floor.
        Decide the single best next action for this investigation and justify it.

        Investigation: {{ inputs.title }}
        Severity: {{ inputs.severity }}
        Affected surface: {{ inputs.affectedSurface }}
        Summary/evidence: {{ inputs.summary }}

        You already have all the evidence you need above. Do NOT call any tools,
        do NOT search for additional data, and do NOT ask questions. Reason only
        from the evidence provided and immediately return your decision as the
        required structured output in a single response.
      schema:
        type: object
        properties:
          type:
            type: string
            enum: ["escalate", "contain", "investigate", "tune"]
            description: The single recommended next action.
          confidence:
            type: number
            description: Confidence between 0 and 1.
          reasoning:
            type: string
            description: 2-3 sentence justification grounded in the evidence.
        required: ["type", "confidence", "reasoning"]
`;
};

const coerceDecision = (value: unknown): LlmDecision | undefined => {
  if (value == null) return undefined;
  let obj: Record<string, unknown> | undefined;
  if (typeof value === 'string') {
    try {
      obj = JSON.parse(value);
    } catch {
      return undefined;
    }
  } else if (typeof value === 'object') {
    obj = value as Record<string, unknown>;
  }
  if (!obj) return undefined;
  const type = String(obj.type ?? '').toLowerCase();
  const confidence = Number(obj.confidence);
  const reasoning = String(obj.reasoning ?? '').trim();
  if (!ALLOWED_TYPES.has(type) || !Number.isFinite(confidence) || reasoning.length === 0) {
    return undefined;
  }
  return { type, confidence: Math.max(0, Math.min(1, confidence)), reasoning };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const registerGenerateProposalRoute = ({
  router,
  logger,
  getSpaceId,
  getWorkflowsManagement,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: GENERATE_PROPOSAL_PATH,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Generate an LLM-driven proposal for a PND investigation via a Watch workflow',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GenerateProposalRequestParams),
            body: buildRouteValidationWithZod(GenerateProposalRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { id } = request.params;
          const investigation = realInvestigations.find((inv) => inv.id === id);
          if (investigation == null) {
            return response.notFound({ body: { message: `Investigation ${id} not found` } });
          }

          const management = getWorkflowsManagement();
          if (management == null) {
            return response.customError({
              statusCode: 501,
              body: { message: 'Workflows management unavailable — cannot run Watch workflow' },
            });
          }

          const spaceId = getSpaceId(request);
          const workflowYaml = buildWatchReasoningWorkflowYaml(request.body?.connectorId);

          const started = Date.now();
          // Run the Watch workflow (ai.agent reasoning step) and get its execution id.
          const executionId = await management.testWorkflow({
            workflowYaml,
            inputs: {
              event: {},
              title: investigation.title,
              severity: investigation.severity,
              affectedSurface: investigation.affectedSurface,
              summary: investigation.summary,
            },
            spaceId,
            request,
          });

          // Poll the workflow execution until it reaches a terminal state.
          let execution = await management.getWorkflowExecution(executionId, spaceId);
          while (
            execution != null &&
            !isTerminalStatus(execution.status) &&
            Date.now() - started < MAX_POLL_MS
          ) {
            await delay(POLL_INTERVAL_MS);
            execution = await management.getWorkflowExecution(executionId, spaceId);
          }

          if (execution == null) {
            return response.customError({
              statusCode: 502,
              body: { message: 'Watch workflow execution not found' },
            });
          }

          if (execution.status !== ExecutionStatus.COMPLETED) {
            logger.error(
              `Watch reasoning workflow ${executionId} ended with status ${execution.status}: ${
                execution.error?.message ?? 'no error message'
              }`
            );
            return response.customError({
              statusCode: 502,
              body: {
                message: `Watch reasoning workflow did not complete (status: ${execution.status})`,
              },
            });
          }

          // Read the ai.agent step's structured output from its step execution.
          // Test runs share the synthetic workflowId ("test-workflow"); disambiguate the
          // specific run by matching workflowRunId to our executionId.
          //
          // The workflow execution can flip to COMPLETED a beat before the final
          // step-execution record (the one carrying `structured_output`) is indexed:
          // an initial placeholder record with `output: null` is written first. Poll
          // a few times until the output-bearing record for our run lands.
          let stepOutput: { structured_output?: unknown; message?: unknown } | undefined;
          for (let attempt = 0; attempt < STEP_OUTPUT_MAX_ATTEMPTS; attempt++) {
            const stepExecutions = await management.searchStepExecutions(
              {
                workflowId: execution.workflowId ?? 'test-workflow',
                stepId: AI_STEP_ID,
                includeOutput: true,
                size: 50,
              },
              spaceId
            );
            const matchingSteps = (stepExecutions.results ?? []).filter(
              (step) => step.workflowRunId === executionId && step.stepId === AI_STEP_ID
            );
            const stepExecution = matchingSteps.find((step) => step.output != null);
            if (stepExecution?.output != null) {
              stepOutput = stepExecution.output as typeof stepOutput;
              break;
            }
            await delay(POLL_INTERVAL_MS);
          }

          const decision =
            coerceDecision(stepOutput?.structured_output) ?? coerceDecision(stepOutput?.message);

          if (decision == null) {
            logger.warn(
              `Watch reasoning workflow ${executionId} produced no parseable decision output`
            );
            return response.customError({
              statusCode: 422,
              body: {
                message: 'Watch reasoning workflow output could not be parsed into a proposal',
              },
            });
          }

          const latencyMs = Date.now() - started;
          const usage = execution.usage;

          const proposal: Proposal = {
            id: `prop-llm-${Date.now()}`,
            template_id: 'proposal',
            template_version: TEMPLATE_VERSION_CURRENT,
            parentConversationId: id,
            type: decision.type,
            confidence: decision.confidence,
            reasoning: decision.reasoning,
            evidenceRefs: [],
            status: 'pending',
            assignee: null,
            sla: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            events: [],
            sourceWatchId: investigation.watch_id,
            approvalRequired: true,
            summary: `LLM-recommended action: ${decision.type}`,
            recommendation: decision.reasoning,
          };

          logger.info(
            `Watch workflow proposal generated for ${id} (execution ${executionId}) in ${latencyMs}ms`
          );

          return response.ok({
            body: {
              proposal,
              provenance: {
                llmDriven: true,
                source: 'watch-workflow',
                workflowExecutionId: executionId,
                stepType: 'ai.agent',
                latencyMs,
                tokenUsage: usage
                  ? {
                      inputTokens: usage.inputTokens,
                      outputTokens: usage.outputTokens,
                      totalTokens: usage.totalTokens,
                    }
                  : undefined,
              },
            },
          });
        } catch (error) {
          const validationErrors = (error as { validationErrors?: string[] }).validationErrors;
          const detail = `${(error as Error).message ?? String(error)}${
            validationErrors?.length ? ` :: ${validationErrors.join(' | ')}` : ''
          }`;
          logger.error(`Failed to generate Watch workflow proposal: ${detail}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to generate Watch workflow proposal: ${detail}` },
          });
        }
      }
    );
};
