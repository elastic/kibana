/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML from 'yaml';
import type { EsWorkflowExecution, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowRunFixture } from '@kbn/workflows-execution-engine/test_helpers';
import {
  resumeWorkflow,
  runWorkflow,
} from '@kbn/workflows-execution-engine/server/execution_functions';
import type { StepExecutionRepository } from '@kbn/workflows-execution-engine/server/repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '@kbn/workflows-execution-engine/server/repositories/workflow_execution_repository';

export const CHAIN_SPACE_ID = 'fake_space_id';

export interface ChainParentRef {
  workflowId: string;
  executionId: string;
  stepId: string;
  invocation: 'sync' | 'async';
}

export interface RunExecutionOptions {
  executionId: string;
  workflowYaml: string;
  workflowId?: string;
  inputs?: Record<string, unknown>;
  event?: Record<string, unknown>;
  parent?: ChainParentRef;
}

/**
 * Drives several executions through ONE `WorkflowRunFixture`, which is what a
 * `workflow.execute` chain needs.
 *
 * The fixture's own `runWorkflow` / `resumeWorkflow` are pinned to a single
 * execution id and `runWorkflow` clears the repositories first, so a parent
 * could never read its child back. This runner uses only the fixture's public
 * surface (the repository mocks, `dependencies`, `loggerMock`, …) and the
 * engine's own `runWorkflow` / `resumeWorkflow` entry points, so the platform
 * fixture stays untouched.
 */
export class WorkflowChainRunner {
  private readonly workflowExecutionRepository: WorkflowExecutionRepository;
  private readonly stepExecutionRepository: StepExecutionRepository;

  constructor(private readonly engine: WorkflowRunFixture) {
    this.workflowExecutionRepository =
      engine.workflowExecutionRepositoryMock as unknown as WorkflowExecutionRepository;
    this.stepExecutionRepository =
      engine.stepExecutionRepositoryMock as unknown as StepExecutionRepository;
  }

  /**
   * Starts an execution under an explicit id. Unlike `fixture.runWorkflow`, this
   * does NOT clear the repositories: every execution in a chain shares them.
   */
  public runExecution({
    executionId,
    workflowYaml,
    workflowId,
    inputs,
    event,
    parent,
  }: RunExecutionOptions) {
    const workflowDefinition = YAML.parseDocument(workflowYaml).toJSON() as WorkflowYaml;
    const workflowExecution: Partial<EsWorkflowExecution> = {
      id: executionId,
      spaceId: CHAIN_SPACE_ID,
      workflowId: workflowId ?? 'fake_workflow_id',
      isTestRun: false,
      // Managed, so a `workflow.execute` step resolving a managed target takes the
      // `includeGlobal` + `managedFilter: 'all'` path the shipped workflows take.
      managed: true,
      workflowDefinition,
      context: {
        inputs,
        event,
        ...(parent
          ? {
              parentWorkflowId: parent.workflowId,
              parentWorkflowExecutionId: parent.executionId,
              parentStepId: parent.stepId,
              parentWorkflowInvocation: parent.invocation,
            }
          : {}),
      },
      status: ExecutionStatus.PENDING,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      triggeredBy: parent ? 'workflow-step' : 'system',
    };
    this.engine.workflowExecutionRepositoryMock.workflowExecutions.set(
      executionId,
      workflowExecution as EsWorkflowExecution
    );
    return this.runExistingExecution(executionId);
  }

  /**
   * Runs an execution row that already exists in the repository, exactly as the
   * scheduled `workflow:run` task would: the sync `workflow.execute` strategy's
   * mocked `executeWorkflow` inserts the child's PENDING row, and a driver loop
   * calls this to run it.
   */
  public runExistingExecution(executionId: string) {
    return runWorkflow({
      workflowRunId: executionId,
      spaceId: CHAIN_SPACE_ID,
      signal: this.engine.taskAbortController.signal,
      dependencies: this.engine.dependencies,
      logger: this.engine.loggerMock,
      config: this.engine.configMock,
      fakeRequest: this.engine.fakeKibanaRequest,
      workflowsExecutionEngine: this.engine.workflowsExecutionEngineMock,
      internalResumeWorkflowExecution: this.engine.internalResumeWorkflowExecutionMock,
      workflowExecutionRepository: this.workflowExecutionRepository,
      stepExecutionRepository: this.stepExecutionRepository,
    });
  }

  /** Resumes a parked execution at its current cursor. */
  public resumeExecution(executionId: string) {
    return resumeWorkflow({
      workflowRunId: executionId,
      spaceId: CHAIN_SPACE_ID,
      signal: this.engine.taskAbortController.signal,
      logger: this.engine.loggerMock,
      config: this.engine.configMock,
      fakeRequest: this.engine.fakeKibanaRequest,
      dependencies: this.engine.dependencies,
      workflowsExecutionEngine: this.engine.workflowsExecutionEngineMock,
      internalResumeWorkflowExecution: this.engine.internalResumeWorkflowExecutionMock,
      workflowExecutionRepository: this.workflowExecutionRepository,
      stepExecutionRepository: this.stepExecutionRepository,
    });
  }

  public getExecution(executionId: string): EsWorkflowExecution | undefined {
    return this.engine.workflowExecutionRepositoryMock.workflowExecutions.get(executionId);
  }
}
