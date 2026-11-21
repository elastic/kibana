/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML from 'yaml';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/test_helpers';
import { WorkflowChainRunner } from './workflow_chain_runner';

const CONSOLE_WORKFLOW = `
steps:
  - name: say
    type: console
    with:
      message: 'hello'
`;

const WAIT_WORKFLOW = `
steps:
  - name: before
    type: console
    with:
      message: 'before'
  - name: pause
    type: wait
    with:
      duration: 20m
  - name: after
    type: console
    with:
      message: 'after'
`;

const stepRuns = (engine: WorkflowRunFixture, executionId: string, stepId: string) =>
  [...engine.stepExecutionRepositoryMock.stepExecutions.values()].filter(
    (step) => step.workflowRunId === executionId && step.stepId === stepId
  );

describe('WorkflowChainRunner', () => {
  let engine: WorkflowRunFixture;
  let chain: WorkflowChainRunner;

  beforeEach(() => {
    engine = new WorkflowRunFixture();
    chain = new WorkflowChainRunner(engine);
  });

  describe('runExecution', () => {
    it('runs under the caller-supplied id as a managed, system-triggered row', async () => {
      await chain.runExecution({ executionId: 'exec-a', workflowYaml: CONSOLE_WORKFLOW });

      const execution = chain.getExecution('exec-a');
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution?.managed).toBe(true);
      expect(execution?.triggeredBy).toBe('system');
      expect(execution?.context).not.toHaveProperty('parentWorkflowId');
    });

    it('records the parent link and is triggered by a workflow step when `parent` is set', async () => {
      const run = chain.runExecution({
        executionId: 'exec-child',
        workflowYaml: CONSOLE_WORKFLOW,
        parent: {
          workflowId: 'parent-workflow',
          executionId: 'exec-parent',
          stepId: 'call_child',
          invocation: 'sync',
        },
      });
      // The engine rewrites `context` into its own render shape once the run
      // finishes, so the row the runner inserted is read before awaiting.
      const inserted = { ...chain.getExecution('exec-child')! };
      await run;

      expect(chain.getExecution('exec-child')?.triggeredBy).toBe('workflow-step');
      expect(inserted.context).toEqual(
        expect.objectContaining({
          parentWorkflowId: 'parent-workflow',
          parentWorkflowExecutionId: 'exec-parent',
          parentStepId: 'call_child',
          parentWorkflowInvocation: 'sync',
        })
      );
    });

    it('does not clear the repositories, so an earlier execution stays readable', async () => {
      await chain.runExecution({ executionId: 'exec-a', workflowYaml: CONSOLE_WORKFLOW });
      await chain.runExecution({ executionId: 'exec-b', workflowYaml: CONSOLE_WORKFLOW });

      expect(chain.getExecution('exec-a')?.status).toBe(ExecutionStatus.COMPLETED);
      expect(chain.getExecution('exec-b')?.status).toBe(ExecutionStatus.COMPLETED);
      expect(stepRuns(engine, 'exec-a', 'say')).toHaveLength(1);
    });

    it("contrasts with the fixture's runWorkflow, which clears an execution the runner started", async () => {
      await chain.runExecution({ executionId: 'exec-a', workflowYaml: CONSOLE_WORKFLOW });
      await engine.runWorkflow({ workflowYaml: CONSOLE_WORKFLOW });

      expect(chain.getExecution('exec-a')).toBeUndefined();
    });
  });

  describe('resumeExecution', () => {
    it('resumes a parked execution at its cursor without re-running earlier steps', async () => {
      await chain.runExecution({ executionId: 'exec-wait', workflowYaml: WAIT_WORKFLOW });
      expect(chain.getExecution('exec-wait')?.status).toBe(ExecutionStatus.WAITING);
      expect(stepRuns(engine, 'exec-wait', 'after')).toHaveLength(0);

      const resumeTask = engine.taskManagerMock.schedule.mock.calls.at(-1)?.[0];
      if (!resumeTask?.runAt) throw new Error('Expected a scheduled wait deadline');
      jest.useFakeTimers({ now: new Date(resumeTask.runAt) });
      try {
        await chain.resumeExecution('exec-wait');
      } finally {
        jest.useRealTimers();
      }

      expect(chain.getExecution('exec-wait')?.status).toBe(ExecutionStatus.COMPLETED);
      expect(stepRuns(engine, 'exec-wait', 'before')).toHaveLength(1);
      expect(stepRuns(engine, 'exec-wait', 'after')).toHaveLength(1);
    });
  });

  describe('runExistingExecution', () => {
    it('runs a PENDING row inserted straight into the repository to a terminal status', async () => {
      engine.workflowExecutionRepositoryMock.workflowExecutions.set('scheduled-child', {
        id: 'scheduled-child',
        spaceId: 'fake_space_id',
        workflowId: 'fake_workflow_id',
        isTestRun: false,
        managed: true,
        workflowDefinition: YAML.parseDocument(CONSOLE_WORKFLOW).toJSON(),
        context: {},
        status: ExecutionStatus.PENDING,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        triggeredBy: 'workflow-step',
      } as unknown as EsWorkflowExecution);
      expect(chain.getExecution('scheduled-child')?.status).toBe(ExecutionStatus.PENDING);

      await chain.runExistingExecution('scheduled-child');

      expect(chain.getExecution('scheduled-child')?.status).toBe(ExecutionStatus.COMPLETED);
      expect(stepRuns(engine, 'scheduled-child', 'say')).toHaveLength(1);
    });
  });

  describe('getExecution', () => {
    it('returns undefined for an unknown id', () => {
      expect(chain.getExecution('nope')).toBeUndefined();
    });
  });
});
