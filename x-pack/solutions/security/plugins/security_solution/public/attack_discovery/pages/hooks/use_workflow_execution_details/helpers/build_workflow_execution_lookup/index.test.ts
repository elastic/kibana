/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';

import { buildWorkflowExecutionLookup } from '.';

describe('buildWorkflowExecutionLookup', () => {
  it('returns an empty map when input is null', () => {
    const result = buildWorkflowExecutionLookup(null);

    expect(result.size).toBe(0);
  });

  it('returns an empty map when input is undefined', () => {
    const result = buildWorkflowExecutionLookup(undefined);

    expect(result.size).toBe(0);
  });

  it('maps alertRetrieval run IDs to workflow IDs', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [
        { workflowId: 'alert-wf-1', workflowRunId: 'alert-run-1' },
        { workflowId: 'alert-wf-2', workflowRunId: 'alert-run-2' },
      ],
      generation: null,
      validation: null,
    };

    const result = buildWorkflowExecutionLookup(workflowExecutions);

    expect(result.get('alert-run-1')).toBe('alert-wf-1');
    expect(result.get('alert-run-2')).toBe('alert-wf-2');
  });

  it('maps generation run ID to workflow ID', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [],
      generation: { workflowId: 'gen-wf', workflowRunId: 'gen-run' },
      validation: null,
    };

    const result = buildWorkflowExecutionLookup(workflowExecutions);

    expect(result.get('gen-run')).toBe('gen-wf');
  });

  it('maps validation run ID to workflow ID', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [],
      generation: null,
      validation: { workflowId: 'val-wf', workflowRunId: 'val-run' },
    };

    const result = buildWorkflowExecutionLookup(workflowExecutions);

    expect(result.get('val-run')).toBe('val-wf');
  });

  it('maps all execution types in a full tracking object', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [{ workflowId: 'alert-wf', workflowRunId: 'alert-run' }],
      generation: { workflowId: 'gen-wf', workflowRunId: 'gen-run' },
      validation: { workflowId: 'val-wf', workflowRunId: 'val-run' },
    };

    const result = buildWorkflowExecutionLookup(workflowExecutions);

    expect(result.size).toBe(3);
    expect(result.get('alert-run')).toBe('alert-wf');
    expect(result.get('gen-run')).toBe('gen-wf');
    expect(result.get('val-run')).toBe('val-wf');
  });

  it('skips null alertRetrieval entries', () => {
    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval: [],
      generation: null,
      validation: null,
    };

    const result = buildWorkflowExecutionLookup(workflowExecutions);

    expect(result.size).toBe(0);
  });
});
