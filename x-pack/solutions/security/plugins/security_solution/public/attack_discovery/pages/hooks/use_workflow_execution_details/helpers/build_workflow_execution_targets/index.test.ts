/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';

import { buildWorkflowExecutionTargets } from '.';

describe('buildWorkflowExecutionTargets', () => {
  it('returns an empty array when no inputs are provided', () => {
    const result = buildWorkflowExecutionTargets({});

    expect(result).toEqual([]);
  });

  it('returns an empty array when all inputs are null', () => {
    const result = buildWorkflowExecutionTargets({
      workflowExecutions: null,
      workflowId: null,
      workflowRunId: null,
    });

    expect(result).toEqual([]);
  });

  it('adds alertRetrieval targets with retrieve_alerts pipeline phase', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [
        { workflowId: 'alert-wf-1', workflowRunId: 'alert-run-1' },
        { workflowId: 'alert-wf-2', workflowRunId: 'alert-run-2' },
      ],
      generation: null,
      validation: null,
    };

    const result = buildWorkflowExecutionTargets({ workflowExecutions });

    expect(result).toEqual([
      { pipelinePhase: 'retrieve_alerts', workflowId: 'alert-wf-1', workflowRunId: 'alert-run-1' },
      { pipelinePhase: 'retrieve_alerts', workflowId: 'alert-wf-2', workflowRunId: 'alert-run-2' },
    ]);
  });

  it('adds generation target with generate_discoveries pipeline phase', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [],
      generation: { workflowId: 'gen-wf', workflowRunId: 'gen-run' },
      validation: null,
    };

    const result = buildWorkflowExecutionTargets({ workflowExecutions });

    expect(result).toEqual([
      { pipelinePhase: 'generate_discoveries', workflowId: 'gen-wf', workflowRunId: 'gen-run' },
    ]);
  });

  it('adds validation target with validate_discoveries pipeline phase', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [],
      generation: null,
      validation: { workflowId: 'val-wf', workflowRunId: 'val-run' },
    };

    const result = buildWorkflowExecutionTargets({ workflowExecutions });

    expect(result).toEqual([
      {
        pipelinePhase: 'validate_discoveries',
        workflowId: 'val-wf',
        workflowRunId: 'val-run',
      },
    ]);
  });

  it('adds all three target types in correct order', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [{ workflowId: 'alert-wf', workflowRunId: 'alert-run' }],
      generation: { workflowId: 'gen-wf', workflowRunId: 'gen-run' },
      validation: { workflowId: 'val-wf', workflowRunId: 'val-run' },
    };

    const result = buildWorkflowExecutionTargets({ workflowExecutions });

    expect(result).toEqual([
      {
        pipelinePhase: 'retrieve_alerts',
        workflowId: 'alert-wf',
        workflowRunId: 'alert-run',
      },
      {
        pipelinePhase: 'generate_discoveries',
        workflowId: 'gen-wf',
        workflowRunId: 'gen-run',
      },
      {
        pipelinePhase: 'validate_discoveries',
        workflowId: 'val-wf',
        workflowRunId: 'val-run',
      },
    ]);
  });

  it('adds workflowRunId as fallback target when not already present', () => {
    const result = buildWorkflowExecutionTargets({
      workflowId: 'my-wf',
      workflowRunId: 'my-run',
    });

    expect(result).toEqual([
      { pipelinePhase: undefined, workflowId: 'my-wf', workflowRunId: 'my-run' },
    ]);
  });

  it('does not add duplicate target when workflowRunId matches an existing target', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [],
      generation: { workflowId: 'gen-wf', workflowRunId: 'gen-run' },
      validation: null,
    };

    const result = buildWorkflowExecutionTargets({
      workflowExecutions,
      workflowRunId: 'gen-run',
    });

    expect(result).toHaveLength(1);
    expect(result[0].workflowRunId).toBe('gen-run');
  });

  it('deduplicates targets with the same workflowRunId', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [
        { workflowId: 'wf-1', workflowRunId: 'same-run' },
        { workflowId: 'wf-2', workflowRunId: 'same-run' },
      ],
      generation: null,
      validation: null,
    };

    const result = buildWorkflowExecutionTargets({ workflowExecutions });

    expect(result).toHaveLength(1);
    expect(result[0].workflowRunId).toBe('same-run');
  });

  it('handles workflowId as null by converting to undefined in the fallback target', () => {
    const result = buildWorkflowExecutionTargets({
      workflowId: null,
      workflowRunId: 'my-run',
    });

    expect(result).toEqual([
      { pipelinePhase: undefined, workflowId: undefined, workflowRunId: 'my-run' },
    ]);
  });
});
