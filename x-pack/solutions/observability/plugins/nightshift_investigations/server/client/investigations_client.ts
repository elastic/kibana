/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ExecutionStatus } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  GetInvestigationResponse,
  InvestigationStatus,
  InvestigationSubject,
  StartInvestigationRequest,
  StartInvestigationResponse,
} from '../../common';

function toInvestigationStatus(status: ExecutionStatus): InvestigationStatus {
  switch (status) {
    case ExecutionStatus.PENDING:
    case ExecutionStatus.QUEUED:
      return 'pending';
    case ExecutionStatus.RUNNING:
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_FOR_INPUT:
    case ExecutionStatus.WAITING_FOR_CHILD:
      return 'running';
    case ExecutionStatus.COMPLETED:
      return 'completed';
    case ExecutionStatus.FAILED:
    case ExecutionStatus.TIMED_OUT:
      return 'failed';
    case ExecutionStatus.CANCELLED:
    case ExecutionStatus.SKIPPED:
      return 'cancelled';
    default:
      return 'running';
  }
}

function recoverSubjectFromInput(
  input: Record<string, unknown> | undefined
): InvestigationSubject | undefined {
  const ctx = input?.context as Record<string, string> | undefined;
  if (ctx?.source === 'significant_event' || ctx?.source === 'alert') {
    const idKey = `${ctx.source}_id`;
    return {
      type: ctx.source as InvestigationSubject['type'],
      id: String(ctx[idKey] ?? ''),
    };
  }
  return undefined;
}

export class NightshiftInvestigationsClient {
  constructor(
    private readonly request: KibanaRequest,
    private readonly workflowsManagement: WorkflowsServerPluginSetup | undefined,
    private readonly spaces: SpacesPluginStart | undefined,
    private readonly logger: Logger
  ) {}

  private getSpaceId(): string {
    return this.spaces?.spacesService.getSpaceId(this.request) ?? DEFAULT_SPACE_ID;
  }

  async start({
    subject,
    concurrency_key,
    context = {},
  }: StartInvestigationRequest): Promise<StartInvestigationResponse> {
    if (!this.workflowsManagement) {
      throw new Error('workflowsManagement is not available');
    }

    const spaceId = this.getSpaceId();
    const workflow = await this.workflowsManagement.management.getWorkflow(
      SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
      spaceId
    );

    if (!workflow?.definition) {
      throw new Error(
        `Investigation workflow "${SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID}" is not installed in space "${spaceId}"`
      );
    }

    const inputs = {
      message: `Investigation requested for ${subject.type} ${subject.id}`,
      ...(concurrency_key ? { concurrency_key } : {}),
      context: {
        source: subject.type,
        [`${subject.type}_id`]: subject.id,
        ...context,
      },
    };

    const executionId = await this.workflowsManagement.management.runWorkflow(
      { ...workflow, definition: workflow.definition },
      spaceId,
      inputs,
      this.request,
      'nightshift-investigations'
    );

    this.logger.info(
      `Started investigation for ${subject.type}/${subject.id}, execution_id=${executionId}`
    );

    return { investigation_id: executionId };
  }

  async get(investigationId: string): Promise<GetInvestigationResponse> {
    if (!this.workflowsManagement) {
      throw new Error('workflowsManagement is not available');
    }

    const spaceId = this.getSpaceId();
    const execution = await this.workflowsManagement.management.getWorkflowExecution(
      investigationId,
      spaceId,
      { includeInput: true, includeOutput: true }
    );

    if (!execution) {
      throw new Error(`Investigation "${investigationId}" not found`);
    }

    const status = toInvestigationStatus(execution.status);
    const isTerminal = status === 'completed' || status === 'failed' || status === 'cancelled';

    // input/output are untyped in WorkflowExecutionDto; they are populated only when
    // includeInput/includeOutput is passed to getWorkflowExecution.
    const rawInput = (execution as Record<string, unknown>).input as
      | Record<string, unknown>
      | undefined;
    const rawOutput = (execution as Record<string, unknown>).output as
      | Record<string, unknown>
      | undefined;

    const subject = recoverSubjectFromInput(rawInput);

    return {
      investigation_id: investigationId,
      subject: subject ?? { type: 'significant_event', id: '' },
      status,
      started_at: execution.startedAt,
      completed_at: isTerminal ? execution.finishedAt : undefined,
      conclusions:
        status === 'completed'
          ? String(rawOutput?.conclusion ?? rawOutput?.summary ?? '')
          : undefined,
      error:
        status === 'failed'
          ? (execution.error?.message ?? 'Investigation failed')
          : undefined,
    };
  }
}
