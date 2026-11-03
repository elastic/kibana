/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  analysisUsageOf,
  countIndexedAttacks,
  generationUsageOf,
  isParkedAtGate,
  isReviewSettled,
  toInsights,
} from './collect';
import { attackDiscoveryIndexForSpace } from './constants';

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

describe('toInsights', () => {
  const base = {
    'kibana.alert.uuid': 'attack-1',
    'kibana.alert.attack_discovery.alert_ids': ['seeded-1'],
  };
  const noGold = new Map([['seeded-1', 'gold-1']]);

  it('reads the stored _with_replacements narrative so real entity names are scanned', () => {
    const { insights } = toInsights(
      [
        {
          ...base,
          'kibana.alert.attack_discovery.title': 'Activity by tok-user',
          'kibana.alert.attack_discovery.title_with_replacements': 'Activity by alice',
          'kibana.alert.attack_discovery.summary_markdown': 'tok-host ran it',
          'kibana.alert.attack_discovery.summary_markdown_with_replacements': 'web-1 ran it',
          'kibana.alert.attack_discovery.details_markdown_with_replacements': 'alice on web-1',
          'kibana.alert.attack_discovery.entity_summary_markdown_with_replacements': 'alice',
        },
      ],
      noGold
    );
    expect(insights[0]).toMatchObject({
      title: 'Activity by alice',
      summaryMarkdown: 'web-1 ran it',
      detailsMarkdown: 'alice on web-1',
      entitySummaryMarkdown: 'alice',
      alertIds: ['gold-1'],
    });
  });

  it('applies the document replacements when no _with_replacements field is stored', () => {
    const { insights } = toInsights(
      [
        {
          ...base,
          'kibana.alert.attack_discovery.title': 'Activity by tok-user',
          'kibana.alert.attack_discovery.summary_markdown': 'tok-host ran it',
          'kibana.alert.attack_discovery.replacements': [
            { uuid: 'tok-user', value: 'alice' },
            { uuid: 'tok-host', value: 'web-1' },
          ],
        },
      ],
      noGold
    );
    expect(insights[0].title).toBe('Activity by alice');
    expect(insights[0].summaryMarkdown).toBe('web-1 ran it');
  });

  it('leaves text without replacements untouched', () => {
    const { insights } = toInsights(
      [{ ...base, 'kibana.alert.attack_discovery.title': 'Plain' }],
      noGold
    );
    expect(insights[0].title).toBe('Plain');
    expect(insights[0].entitySummaryMarkdown).toBeUndefined();
  });
});

describe('countIndexedAttacks', () => {
  const log = { warning: jest.fn() } as unknown as ToolingLog;
  const esCounting = (count: jest.Mock): Client => ({ count } as unknown as Client);

  it('counts the space index by the run generation uuids, read separately from the runner', async () => {
    const count = jest.fn(async () => ({ count: 2 }));
    await expect(
      countIndexedAttacks({
        esClient: esCounting(count),
        spaceId: 'space-a',
        executionUuids: 'u1,u2',
        log,
      })
    ).resolves.toBe(2);
    expect(count).toHaveBeenCalledWith({
      index: attackDiscoveryIndexForSpace('space-a'),
      query: { terms: { 'kibana.alert.rule.execution.uuid': ['u1', 'u2'] } },
    });
  });

  it('is zero without searching when the runner reported an empty uuid list', async () => {
    const count = jest.fn();
    await expect(
      countIndexedAttacks({
        esClient: esCounting(count),
        spaceId: 's',
        executionUuids: [],
        log,
      })
    ).resolves.toBe(0);
    expect(count).not.toHaveBeenCalled();
  });

  it('is undefined when the runner reported no uuid field', async () => {
    await expect(
      countIndexedAttacks({
        esClient: esCounting(jest.fn()),
        spaceId: 's',
        executionUuids: undefined,
        log,
      })
    ).resolves.toBeUndefined();
  });

  it('is undefined when the index cannot be read', async () => {
    const count = jest.fn().mockRejectedValue(new Error('forbidden'));
    await expect(
      countIndexedAttacks({
        esClient: esCounting(count),
        spaceId: 's',
        executionUuids: ['u1'],
        log,
      })
    ).resolves.toBeUndefined();
  });
});
