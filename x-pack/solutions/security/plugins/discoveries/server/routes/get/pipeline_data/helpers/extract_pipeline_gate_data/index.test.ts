/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import { extractPipelineGateData } from '.';

const gateExecution = (structuredOutput: Record<string, unknown>): WorkflowExecutionDto =>
  ({
    status: 'completed',
    stepExecutions: [
      {
        output: { structured_output: structuredOutput },
        stepId: 'gate',
        stepType: 'ai.agent',
      },
    ],
    workflowId: 'system-attack-discovery-skill-alert-retrieval',
  } as unknown as WorkflowExecutionDto);

describe('extractPipelineGateData', () => {
  it('counts the kept candidates plus the gate net-new additions', () => {
    const execution = gateExecution({
      added_alert_ids: ['added-1', 'added-2', 'added-3'],
      keep_alert_ids: ['id-1', 'id-2'],
    });

    const result = extractPipelineGateData({ execution });

    expect(result?.alerts_context_count).toBe(5);
  });

  it('uses the skill extraction strategy', () => {
    const execution = gateExecution({ keep_alert_ids: ['id-1'] });

    const result = extractPipelineGateData({ execution });

    expect(result?.extraction_strategy).toBe('skill');
  });

  it('returns no raw alert strings (the gate emits ids only)', () => {
    const execution = gateExecution({ added_alert_ids: ['added-1'], keep_alert_ids: ['id-1'] });

    const result = extractPipelineGateData({ execution });

    expect(result?.alerts).toEqual([]);
  });

  it('counts a kept-only decision', () => {
    const execution = gateExecution({ keep_alert_ids: ['id-1', 'id-2', 'id-3'] });

    const result = extractPipelineGateData({ execution });

    expect(result?.alerts_context_count).toBe(3);
  });

  it('returns null when the execution is not a gate decision (e.g. the net-new re-fetch run)', () => {
    const execution = {
      status: 'completed',
      stepExecutions: [{ output: { alerts: ['_id,a\nx'] }, stepId: 'retrieve', stepType: 'http' }],
      workflowId: 'default-retrieval',
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineGateData({ execution });

    expect(result).toBeNull();
  });

  it('returns null when the gate execution has not completed', () => {
    const execution = {
      status: 'running',
      stepExecutions: [],
      workflowId: 'system-attack-discovery-skill-alert-retrieval',
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineGateData({ execution });

    expect(result).toBeNull();
  });
});
