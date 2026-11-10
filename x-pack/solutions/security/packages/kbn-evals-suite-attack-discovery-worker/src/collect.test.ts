/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  analysisUsageOf,
  collectReviewArtifact,
  collectWorkerArtifacts,
  countIndexedAttacks,
  generationUsageOf,
  isParkedAtGate,
  isReviewSettled,
  readGenerationFault,
  splitFingerprintMatch,
  toInsights,
} from './collect';
import { BATCHED_GENERATION_WORKFLOW_ID, attackDiscoveryIndexForSpace } from './constants';
import type { WorkerOutcomeEvent } from './worker_types';
import type { AttackDiscoveryWorkerClient } from './worker_client';

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

describe('collectReviewArtifact', () => {
  const collect = (execution: WorkflowExecutionDto) =>
    collectReviewArtifact({
      client: {} as AttackDiscoveryWorkerClient,
      review: execution,
      fetch: jest.fn() as unknown as HttpHandler,
      spaceId: 'space',
    });

  it('carries the execution error message of a failed review', async () => {
    const failed = {
      ...review('failed', []),
      error: { type: 'Error', message: 'analyze step failed' },
    } as unknown as WorkflowExecutionDto;
    expect(await collect(failed)).toMatchObject({ status: 'failed', error: 'analyze step failed' });
  });

  it('carries no error for a review that did not fail', async () => {
    expect(await collect(review('waiting_for_input', []))).not.toHaveProperty('error');
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

  it('leaves a token field no analyze entry reported undefined, not 0', () => {
    const usage = analysisUsageOf(
      'child-1',
      child([
        { stepId: 'analyze', connectorId: 'review-model', inputTokens: 5, outputTokens: 2 },
        { stepId: 'analyze', connectorId: 'review-model', inputTokens: 7, outputTokens: 3 },
      ])
    );
    expect(usage).toMatchObject({ inputTokens: 12, outputTokens: 5 });
    expect(usage.cachedTokens).toBeUndefined();
  });

  it('sums a token field that only some analyze entries reported', () => {
    const usage = analysisUsageOf(
      'child-1',
      child([
        { stepId: 'analyze', connectorId: 'review-model', inputTokens: 5, cachedTokens: 4 },
        { stepId: 'analyze', connectorId: 'review-model', inputTokens: 7 },
      ])
    );
    expect(usage.cachedTokens).toBe(4);
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

  it('trims the comma-separated uuids it queries with and drops blank ones', async () => {
    const count = jest.fn(async () => ({ count: 2 }));
    await countIndexedAttacks({
      esClient: esCounting(count),
      spaceId: 's',
      executionUuids: 'a, b, ,',
      log,
    });
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { terms: { 'kibana.alert.rule.execution.uuid': ['a', 'b'] } },
      })
    );
  });

  it('trims and drops blank entries of an array of uuids too', async () => {
    const count = jest.fn(async () => ({ count: 2 }));
    await countIndexedAttacks({
      esClient: esCounting(count),
      spaceId: 's',
      executionUuids: [' a', 'b ', ' '],
      log,
    });
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { terms: { 'kibana.alert.rule.execution.uuid': ['a', 'b'] } },
      })
    );
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

describe('splitFingerprintMatch', () => {
  const attach = (id: string) => ({ attack_discovery_id: id });

  it('counts an attachment a review declared as a sibling, and any other as an existing attach', () => {
    expect(
      splitFingerprintMatch({
        reviews: [{ attack_discovery_id: 'a', sibling_attack_discovery_ids: ['b'] }],
        attachments: [attach('b'), attach('c')],
      })
    ).toEqual({
      reviewedAttackIds: ['a'],
      siblingAttackIds: ['b'],
      existingAttachCount: 1,
      attachCount: 2,
    });
  });

  it('is undefined when the output carries no reviews or attachments list', () => {
    expect(splitFingerprintMatch(undefined)).toBeUndefined();
    expect(splitFingerprintMatch({ reviews: [] })).toBeUndefined();
  });
});

describe('collectWorkerArtifacts', () => {
  it('wires the fingerprint split into the artifacts', async () => {
    const run = {
      id: 'run-1',
      status: 'completed',
      stepExecutions: [
        step('match_fingerprints', 'completed', {
          reviews: [{ attack_discovery_id: 'a', sibling_attack_discovery_ids: ['b'] }],
          attachments: [{ attack_discovery_id: 'b' }, { attack_discovery_id: 'c' }],
        }),
      ],
    } as unknown as WorkflowExecutionDto;

    const artifacts = await collectWorkerArtifacts({
      client: { track: jest.fn() } as unknown as AttackDiscoveryWorkerClient,
      esClient: {} as Client,
      run,
      spaceId: 'space',
      seeded: {
        runMarker: 'marker',
        spaceId: 'space',
        goldIdBySeededId: new Map(),
        alertCount: 0,
        openAlertIds: [],
        worldDocs: [],
      },
      fetch: jest.fn() as unknown as HttpHandler,
      log: { info: jest.fn(), warning: jest.fn(), debug: jest.fn() } as unknown as ToolingLog,
    });

    expect(artifacts).toMatchObject({
      fingerprintReviewedAttackIds: ['a'],
      fingerprintSiblingAttackIds: ['b'],
      fingerprintAttachCount: 2,
      fingerprintExistingAttachCount: 1,
    });
  });
  it('reads the persisted attacks from the index when the generation output carries none', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              'kibana.alert.uuid': 'a',
              'kibana.alert.attack_discovery.alert_ids': ['seeded-1'],
              'kibana.alert.attack_discovery.title': 'Chain',
            },
          },
        ],
      },
    });
    const run = {
      id: 'run-2',
      status: 'completed',
      stepExecutions: [
        step('run_generation', 'completed', { execution_uuids: ['u1'] }),
        step('match_fingerprints', 'completed', {
          reviews: [{ attack_discovery_id: 'a' }],
          attachments: [],
        }),
      ],
    } as unknown as WorkflowExecutionDto;

    const artifacts = await collectWorkerArtifacts({
      client: { track: jest.fn() } as unknown as AttackDiscoveryWorkerClient,
      esClient: { search, count: jest.fn().mockResolvedValue({ count: 1 }) } as unknown as Client,
      run,
      spaceId: 'space',
      seeded: {
        runMarker: 'marker',
        spaceId: 'space',
        goldIdBySeededId: new Map([['seeded-1', 'gold-1']]),
        alertCount: 0,
        openAlertIds: [],
        worldDocs: [],
      },
      fetch: jest.fn() as unknown as HttpHandler,
      log: { info: jest.fn(), warning: jest.fn(), debug: jest.fn() } as unknown as ToolingLog,
    });

    expect(artifacts.insights).toHaveLength(1);
    expect(artifacts.insights[0]).toMatchObject({ id: 'a', alertIds: ['gold-1'], title: 'Chain' });
    expect(search).toHaveBeenCalledTimes(1);
  });

  const evictedRun = (extra: unknown[], reviews: unknown[] = [{ attack_discovery_id: 'a' }]) =>
    ({
      id: 'run-3',
      status: 'completed',
      stepExecutions: [
        { id: 'g', stepId: 'run_generation', status: 'completed' },
        step('match_fingerprints', 'completed', { reviews, attachments: [] }),
        ...extra,
      ],
    } as unknown as WorkflowExecutionDto);

  const collectEvicted = async (
    run: WorkflowExecutionDto,
    count: jest.Mock,
    search: jest.Mock = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              'kibana.alert.uuid': 'a',
              'kibana.alert.rule.execution.uuid': 'u-doc',
            },
          },
        ],
      },
    })
  ) =>
    collectWorkerArtifacts({
      client: { track: jest.fn() } as unknown as AttackDiscoveryWorkerClient,
      esClient: {
        search,
        count,
      } as unknown as Client,
      run,
      spaceId: 'space',
      seeded: {
        runMarker: 'marker',
        spaceId: 'space',
        goldIdBySeededId: new Map(),
        alertCount: 0,
        openAlertIds: [],
        worldDocs: [],
      },
      fetch: jest.fn() as unknown as HttpHandler,
      log: { info: jest.fn(), warning: jest.fn(), debug: jest.fn() } as unknown as ToolingLog,
    });

  it('scopes the indexed count by the emit_result uuids when run_generation output was evicted', async () => {
    const count = jest.fn().mockResolvedValue({ count: 1 });
    const artifacts = await collectEvicted(
      evictedRun([step('emit_result', 'completed', { execution_uuids: 'u1, u2' })]),
      count
    );
    expect(artifacts.indexedAttackCount).toBe(1);
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { terms: { 'kibana.alert.rule.execution.uuid': ['u1', 'u2'] } },
      })
    );
  });

  it('reads the persisted attacks by the emit_result uuids when the matcher returned no attack ids', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              'kibana.alert.uuid': 'a',
              'kibana.alert.rule.execution.uuid': 'u1',
            },
          },
        ],
      },
    });
    const artifacts = await collectEvicted(
      evictedRun([step('emit_result', 'completed', { execution_uuids: 'u1, u2' })], []),
      jest.fn().mockResolvedValue({ count: 1 }),
      search
    );
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            should: [{ terms: { 'kibana.alert.rule.execution.uuid': ['u1', 'u2'] } }],
            minimum_should_match: 1,
          },
        },
      })
    );
    expect(artifacts.insights).toHaveLength(1);
    expect(artifacts.insights[0]).toMatchObject({ id: 'a' });
  });

  it('falls back to the uuids the persisted documents carry when no runner output has them', async () => {
    const count = jest.fn().mockResolvedValue({ count: 1 });
    const artifacts = await collectEvicted(evictedRun([]), count);
    expect(artifacts.indexedAttackCount).toBe(1);
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { terms: { 'kibana.alert.rule.execution.uuid': ['u-doc'] } },
      })
    );
  });
});

describe('readGenerationFault', () => {
  const REFUSAL =
    'The model (.anthropic-claude-5.5-opus-chat_completion) refused to complete the response';
  const run = {
    id: 'run-1',
    status: 'completed',
    stepExecutions: [],
  } as unknown as WorkflowExecutionDto;
  const log = { info: jest.fn(), warning: jest.fn(), debug: jest.fn() } as unknown as ToolingLog;

  const runCompleted = (input: Record<string, unknown>): WorkerOutcomeEvent[] => [
    {
      stepId: 'report_run_completed',
      status: 'completed',
      runOutcome: String(input.run_outcome),
      input,
    },
  ];
  const allFailed = runCompleted({
    run_outcome: 'failed_all_batches',
    alerts_analyzed: 0,
    batches_total: 1,
    batches_failed: 1,
  });
  const batchChild = (
    errors: Array<string | undefined>,
    workflowId = BATCHED_GENERATION_WORKFLOW_ID
  ) => ({
    workflowId,
    executionId: 'child-1',
    status: 'completed',
    stepExecutions: errors.map((message) => ({
      stepId: 'run_batch',
      status: message ? 'failed' : 'completed',
      ...(message ? { error: { type: 'Error', message } } : {}),
    })),
  });
  const clientWith = (getChildren: jest.Mock) =>
    ({ getChildren } as unknown as AttackDiscoveryWorkerClient);
  const read = (outcomes: WorkerOutcomeEvent[], getChildren = jest.fn()) =>
    readGenerationFault({ client: clientWith(getChildren), run, spaceId: 'space', outcomes, log });

  it('is refused when every failed batch was refused by the model', async () => {
    const getChildren = jest.fn().mockResolvedValue([batchChild([REFUSAL])]);
    await expect(read(allFailed, getChildren)).resolves.toEqual({
      kind: 'refused',
      message: REFUSAL,
    });
    expect(getChildren).toHaveBeenCalledWith('space', 'run-1');
  });

  it('is failed when a batch failed for another reason', async () => {
    const getChildren = jest.fn().mockResolvedValue([batchChild([REFUSAL, 'connector timed out'])]);
    await expect(read(allFailed, getChildren)).resolves.toEqual({
      kind: 'failed',
      message: REFUSAL,
    });
  });

  it('ignores steps of children that are not the generation workflow', async () => {
    const getChildren = jest
      .fn()
      .mockResolvedValue([batchChild(['unrelated'], 'other-workflow'), batchChild([REFUSAL])]);
    await expect(read(allFailed, getChildren)).resolves.toMatchObject({ kind: 'refused' });
  });

  it('is failed, with no message, when the children cannot be read', async () => {
    const getChildren = jest.fn().mockRejectedValue(new Error('404'));
    await expect(read(allFailed, getChildren)).resolves.toEqual({ kind: 'failed' });
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('404'));
  });

  it('is failed when no batch error was readable', async () => {
    const getChildren = jest.fn().mockResolvedValue([batchChild([undefined])]);
    await expect(read(allFailed, getChildren)).resolves.toEqual({ kind: 'failed' });
  });

  it('is empty when every batch succeeded over the alerts and found no attack', async () => {
    const getChildren = jest.fn();
    await expect(
      read(
        runCompleted({
          run_outcome: 'empty_no_attacks',
          alerts_analyzed: 10,
          batches_total: 1,
          batches_failed: 0,
        }),
        getChildren
      )
    ).resolves.toEqual({ kind: 'empty' });
    expect(getChildren).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a healthy run',
      { run_outcome: 'completed', alerts_analyzed: 10, batches_total: 1, batches_failed: 0 },
    ],
    [
      'some batches failed',
      { run_outcome: 'failed_all_batches', batches_total: 2, batches_failed: 1 },
    ],
    ['no batches ran', { run_outcome: 'failed_all_batches', batches_total: 0, batches_failed: 0 }],
    [
      'nothing was analyzed',
      { run_outcome: 'empty_no_attacks', alerts_analyzed: 0, batches_total: 1, batches_failed: 0 },
    ],
    [
      'an empty run with a failed batch',
      { run_outcome: 'empty_no_attacks', alerts_analyzed: 10, batches_total: 2, batches_failed: 1 },
    ],
  ])('is undefined for %s', async (_case, input) => {
    const getChildren = jest.fn();
    await expect(read(runCompleted(input), getChildren)).resolves.toBeUndefined();
    expect(getChildren).not.toHaveBeenCalled();
  });

  it('is undefined when the runner reported no outcome', async () => {
    await expect(read([])).resolves.toBeUndefined();
  });

  it('is wired into the collected artifacts', async () => {
    const reportStep = {
      ...step('report_run_completed', 'completed'),
      input: { run_outcome: 'failed_all_batches', batches_total: 1, batches_failed: 1 },
    } as unknown as WorkflowStepExecutionDto;
    const artifacts = await collectWorkerArtifacts({
      client: {
        track: jest.fn(),
        getChildren: jest.fn().mockResolvedValue([batchChild([REFUSAL])]),
      } as unknown as AttackDiscoveryWorkerClient,
      esClient: {} as Client,
      run: {
        id: 'run-1',
        status: 'completed',
        stepExecutions: [reportStep],
      } as unknown as WorkflowExecutionDto,
      spaceId: 'space',
      seeded: {
        runMarker: 'marker',
        spaceId: 'space',
        goldIdBySeededId: new Map(),
        alertCount: 0,
        openAlertIds: [],
        worldDocs: [],
      },
      fetch: jest.fn() as unknown as HttpHandler,
      log,
    });
    expect(artifacts.generationFault).toEqual({ kind: 'refused', message: REFUSAL });
  });
});
