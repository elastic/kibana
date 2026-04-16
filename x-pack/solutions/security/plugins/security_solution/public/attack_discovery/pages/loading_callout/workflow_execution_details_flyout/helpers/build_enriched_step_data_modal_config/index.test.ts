/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StepExecutionWithLink } from '../../../types';
import { buildEnrichedStepDataModalConfig } from '.';

const baseConfig = {
  dataCount: 2,
  dataType: 'alerts' as const,
  extractionStrategy: undefined,
  items: [],
  stepName: 'Alert Retrieval',
  workflowId: undefined,
  workflowName: undefined,
  workflowRunId: undefined,
  workflowSummaries: undefined,
};

const makeStep = (overrides: Partial<StepExecutionWithLink> = {}): StepExecutionWithLink => ({
  error: undefined,
  executionTimeMs: 100,
  finishedAt: '2024-01-01T00:00:00.100Z',
  globalExecutionIndex: 0,
  id: 'step-1',
  input: undefined,
  output: undefined,
  scopeStack: [],
  startedAt: '2024-01-01T00:00:00.000Z',
  state: undefined,
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  stepId: 'retrieve_alerts',
  stepType: 'alert_retrieval',
  topologicalIndex: 0,
  workflowId: 'workflow-123',
  workflowName: 'My Workflow',
  workflowRunId: 'run-456',
  ...overrides,
});

describe('buildEnrichedStepDataModalConfig', () => {
  it('applies metadata workflowId to the result', () => {
    const result = buildEnrichedStepDataModalConfig({
      config: baseConfig,
      metadata: { workflowId: 'meta-workflow', workflowName: undefined, workflowRunId: undefined },
      steps: undefined,
    });

    expect(result.workflowId).toBe('meta-workflow');
  });

  it('applies metadata workflowName to the result', () => {
    const result = buildEnrichedStepDataModalConfig({
      config: baseConfig,
      metadata: { workflowId: undefined, workflowName: 'Meta Workflow', workflowRunId: undefined },
      steps: undefined,
    });

    expect(result.workflowName).toBe('Meta Workflow');
  });

  it('applies metadata workflowRunId to the result', () => {
    const result = buildEnrichedStepDataModalConfig({
      config: baseConfig,
      metadata: { workflowId: undefined, workflowName: undefined, workflowRunId: 'meta-run' },
      steps: undefined,
    });

    expect(result.workflowRunId).toBe('meta-run');
  });

  it('returns undefined workflowSummaries when config has none', () => {
    const result = buildEnrichedStepDataModalConfig({
      config: { ...baseConfig, workflowSummaries: undefined },
      metadata: undefined,
      steps: undefined,
    });

    expect(result.workflowSummaries).toBeUndefined();
  });

  it('preserves summary as-is when no matching step is found', () => {
    const summary = {
      alertsCount: null,
      workflowId: undefined,
      workflowName: undefined,
      workflowRunId: 'run-999',
    };

    const result = buildEnrichedStepDataModalConfig({
      config: { ...baseConfig, workflowSummaries: [summary] },
      metadata: undefined,
      steps: [makeStep({ workflowRunId: 'run-different' })],
    });

    expect(result.workflowSummaries?.[0]).toEqual(summary);
  });

  it('enriches summary workflowId from matching step when summary has none', () => {
    const summary = {
      alertsCount: null,
      workflowId: undefined,
      workflowName: undefined,
      workflowRunId: 'run-456',
    };

    const result = buildEnrichedStepDataModalConfig({
      config: { ...baseConfig, workflowSummaries: [summary] },
      metadata: undefined,
      steps: [makeStep({ workflowId: 'workflow-123', workflowRunId: 'run-456' })],
    });

    expect(result.workflowSummaries?.[0].workflowId).toBe('workflow-123');
  });

  it('enriches summary workflowName from matching step when summary has none', () => {
    const summary = {
      alertsCount: null,
      workflowId: undefined,
      workflowName: undefined,
      workflowRunId: 'run-456',
    };

    const result = buildEnrichedStepDataModalConfig({
      config: { ...baseConfig, workflowSummaries: [summary] },
      metadata: undefined,
      steps: [makeStep({ workflowName: 'My Workflow', workflowRunId: 'run-456' })],
    });

    expect(result.workflowSummaries?.[0].workflowName).toBe('My Workflow');
  });

  it('keeps existing summary workflowId when already set', () => {
    const summary = {
      alertsCount: null,
      workflowId: 'existing-wf',
      workflowName: undefined,
      workflowRunId: 'run-456',
    };

    const result = buildEnrichedStepDataModalConfig({
      config: { ...baseConfig, workflowSummaries: [summary] },
      metadata: undefined,
      steps: [makeStep({ workflowId: 'step-wf', workflowRunId: 'run-456' })],
    });

    expect(result.workflowSummaries?.[0].workflowId).toBe('existing-wf');
  });

  it('handles undefined steps gracefully', () => {
    const summary = {
      alertsCount: null,
      workflowId: undefined,
      workflowName: undefined,
      workflowRunId: 'run-456',
    };

    const result = buildEnrichedStepDataModalConfig({
      config: { ...baseConfig, workflowSummaries: [summary] },
      metadata: undefined,
      steps: undefined,
    });

    expect(result.workflowSummaries?.[0]).toEqual(summary);
  });
});
