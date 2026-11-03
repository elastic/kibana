/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { analysisUsageOf, generationUsageOf, isParkedAtGate, isReviewSettled } from './collect';

const step = (
  stepId: string,
  status: string,
  output?: Record<string, unknown>
): WorkflowStepExecutionDto =>
  ({ id: `${stepId}-1`, stepId, status, output } as unknown as WorkflowStepExecutionDto);

const review = (status: string, steps: WorkflowStepExecutionDto[]): WorkflowExecutionDto =>
  ({ id: 'review-1', status, stepExecutions: steps } as unknown as WorkflowExecutionDto);

const escalate = step('resolve_escalation', 'completed', { escalate: true });
const openGate = step('escalation_gate', 'waiting_for_input');

describe('isParkedAtGate', () => {
  it('is parked when the analysis escalated and the gate is open', () => {
    expect(isParkedAtGate(review('waiting_for_input', [escalate, openGate]))).toBe(true);
  });

  it('accepts escalate rendered as the string "true"', () => {
    const stringly = step('resolve_escalation', 'completed', { escalate: 'true' });
    expect(isParkedAtGate(review('waiting_for_input', [stringly, openGate]))).toBe(true);
  });

  it('is not parked when the analysis did not escalate', () => {
    const noEscalate = step('resolve_escalation', 'completed', { escalate: false });
    expect(isParkedAtGate(review('waiting_for_input', [noEscalate, openGate]))).toBe(false);
  });

  it('is not parked when there is no escalation decision at all', () => {
    expect(isParkedAtGate(review('waiting_for_input', [openGate]))).toBe(false);
  });

  it('is not parked when the gate step has already ended', () => {
    const endedGate = step('escalation_gate', 'completed');
    expect(isParkedAtGate(review('waiting_for_input', [escalate, endedGate]))).toBe(false);
  });

  it('is not parked when the gate errored and recorded record_gate_failed', () => {
    const failed = step('record_gate_failed', 'completed');
    expect(isParkedAtGate(review('waiting_for_input', [escalate, openGate, failed]))).toBe(false);
  });

  it('is not parked when the review is merely waiting for another reason', () => {
    expect(isParkedAtGate(review('waiting', [step('resolve_analysis', 'completed')]))).toBe(false);
  });

  it('is not parked once the review ended', () => {
    expect(isParkedAtGate(review('completed', [escalate, openGate]))).toBe(false);
  });
});

describe('isReviewSettled', () => {
  it('settles on a terminal status', () => {
    expect(isReviewSettled(review('failed', []))).toBe(true);
  });

  it('settles when parked at the gate', () => {
    expect(isReviewSettled(review('waiting_for_input', [escalate, openGate]))).toBe(true);
  });

  it('does not settle on a waiting review with a completed analysis but no escalation', () => {
    const analysis = step('resolve_analysis', 'completed', { verdict: 'true_positive' });
    expect(isReviewSettled(review('waiting_for_input', [analysis]))).toBe(false);
  });
});

describe('analysisUsageOf', () => {
  const child = (stepUsage: unknown): WorkflowExecutionDto =>
    ({ id: 'child-1', stepExecutions: [], stepUsage } as unknown as WorkflowExecutionDto);

  it('reads the connector and tokens from the analyze step usage', () => {
    expect(
      analysisUsageOf(
        'child-1',
        child([
          { stepId: 'other', connectorId: 'x', inputTokens: 9, outputTokens: 9, totalTokens: 18 },
          {
            stepId: 'analyze',
            connectorId: 'review-model',
            inputTokens: 100,
            outputTokens: 20,
            cachedTokens: 40,
            totalTokens: 120,
          },
        ])
      )
    ).toEqual({
      childExecutionId: 'child-1',
      connectorIds: ['review-model'],
      inputTokens: 100,
      outputTokens: 20,
      cachedTokens: 40,
    });
  });

  it('is unresolved when the engine reported the connector as unknown', () => {
    const usage = analysisUsageOf(
      'child-1',
      child([
        {
          stepId: 'analyze',
          connectorId: 'unknown',
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        },
      ])
    );
    expect(usage.connectorIds).toEqual([]);
    expect(usage.unresolvedReason).toContain('no connector id');
  });

  it('is unresolved when the child reported no usage for analyze', () => {
    expect(analysisUsageOf('child-1', child(undefined)).unresolvedReason).toContain('no usage');
  });

  it('is unresolved when the child execution id or execution is missing', () => {
    expect(analysisUsageOf(undefined, undefined).unresolvedReason).toContain(
      'no analysis execution id'
    );
    expect(analysisUsageOf('child-1', undefined, 'boom').unresolvedReason).toContain('boom');
  });
});

describe('generationUsageOf', () => {
  it('reads distinct connector ids and counts discoveries without one', () => {
    expect(
      generationUsageOf([
        {
          'kibana.alert.attack_discovery.api_config': { connector_id: 'gen', model: 'm' },
        },
        { 'kibana.alert.attack_discovery.api_config.connector_id': 'gen' },
        {},
      ])
    ).toEqual({
      discoveryCount: 3,
      connectorIds: ['gen'],
      models: ['m'],
      discoveriesWithoutConnector: 1,
    });
  });
});
