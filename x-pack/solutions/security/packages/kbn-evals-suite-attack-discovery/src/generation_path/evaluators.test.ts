/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import {
  createAlertIdFidelityEvaluator,
  createChainCoverageEvaluator,
  createFpChainSuppressionEvaluator,
  createModelFailureEvaluator,
  createRoutingEvaluator,
} from './evaluators';
import {
  ALL_SEEDED_IDS,
  alertIdForKey,
  buildAlertDocument,
  GROUND_TRUTH_CRITERIA,
  idsForChain,
  REFERENCE_DISCOVERIES,
  SEED_ALERT_SPECS,
} from './fixture';
import { buildRoutingProof, modelIdMatchesSubject } from './token_usage';
import {
  classifyModelFailure,
  toAttackDiscovery,
  toTaskErrors,
  type GenerationPathTaskOutput,
} from './workflow_task';

const discovery = (alertIds: string[]): AttackDiscovery => ({
  title: 't',
  alertIds,
  summaryMarkdown: 's',
  detailsMarkdown: 'd',
  timestamp: '2026-01-01T00:00:00.000Z',
});

const output = (overrides: Partial<GenerationPathTaskOutput>): GenerationPathTaskOutput => ({
  insights: null,
  executionId: 'e',
  executionStatus: ExecutionStatus.COMPLETED,
  timedOut: false,
  unknownAlertIds: [],
  foreignAlertIds: [],
  foreignOpenAlerts: 0,
  ...overrides,
});

const run = async (
  evaluator: ReturnType<typeof createAlertIdFidelityEvaluator>,
  taskOutput: GenerationPathTaskOutput
) =>
  evaluator.evaluate({
    input: undefined,
    output: taskOutput,
    expected: undefined,
    metadata: undefined,
  });

const windows = idsForChain('exfil_windows');
const linux = idsForChain('exfil_linux');
const decoy = idsForChain('backup_decoy');

describe('fixture', () => {
  it('has stable, unique alert ids and the planned chain sizes', () => {
    expect(ALL_SEEDED_IDS.size).toBe(SEED_ALERT_SPECS.length);
    expect([windows.length, linux.length, decoy.length]).toEqual([4, 4, 3]);
    expect(alertIdForKey('a1_cred')).toBe(alertIdForKey('a1_cred'));
  });

  it('keeps the reference discoveries on real chains', () => {
    expect(REFERENCE_DISCOVERIES.map(({ alertIds }) => alertIds)).toEqual([windows, linux]);
    expect(GROUND_TRUTH_CRITERIA.length).toBeGreaterThan(0);
  });

  it('names no malware and no credential-store paths', () => {
    const text = JSON.stringify([SEED_ALERT_SPECS, REFERENCE_DISCOVERIES]).toLowerCase();
    for (const forbidden of ['mimikatz', 'cobalt', 'ransom', 'trojan', 'payload', '.ssh']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('builds alerts the workflow retrieval accepts: open, not a building block, in the window', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');
    for (const spec of SEED_ALERT_SPECS) {
      const doc = buildAlertDocument(spec, 'run-1', now);
      expect(doc['kibana.alert.workflow_status']).toBe('open');
      expect(doc['kibana.alert.building_block_type']).toBeNull();
      expect(doc['kibana.alert.uuid']).toBe(alertIdForKey(spec.key));
      expect(doc.labels).toEqual({ ad_portable_seed: 'run-1' });
      expect(now.getTime() - new Date(doc['@timestamp'] as string).getTime()).toBeLessThan(
        60 * 60_000 + 1
      );
    }
  });
});

describe('createAlertIdFidelityEvaluator', () => {
  it('scores a hallucinated alert id 0', async () => {
    const result = await run(
      createAlertIdFidelityEvaluator(),
      output({ insights: [discovery([...windows, 'made-up-id'])], unknownAlertIds: ['made-up-id'] })
    );
    expect(result).toMatchObject({ score: 0, label: 'hallucinated_alert_ids' });
  });

  it('scores a real alert the fixture did not seed 0', async () => {
    const result = await run(
      createAlertIdFidelityEvaluator(),
      output({ insights: [discovery(windows)], foreignAlertIds: ['real-but-foreign'] })
    );
    expect(result).toMatchObject({ score: 0, label: 'foreign_alert_ids' });
  });

  it('scores clean citations 1 and an empty result N/A', async () => {
    expect(
      await run(createAlertIdFidelityEvaluator(), output({ insights: [discovery(windows)] }))
    ).toMatchObject({ score: 1 });
    expect(await run(createAlertIdFidelityEvaluator(), output({}))).toMatchObject({ score: null });
  });
});

describe('createChainCoverageEvaluator', () => {
  const score = async (insights: AttackDiscovery[]) =>
    (await run(createChainCoverageEvaluator(), output({ insights }))).score;

  it('scores 1 when both chains are found cleanly, 0.5 for one, 0 for none', async () => {
    expect(await score([discovery(windows), discovery(linux)])).toBe(1);
    expect(await score([discovery(windows)])).toBe(0.5);
    expect(await score([discovery(decoy)])).toBe(0);
  });

  it('does not credit a discovery that merges the two chains', async () => {
    expect(await score([discovery([...windows, ...linux])])).toBe(0);
  });

  it('does not credit a chain found with most of its alerts missing', async () => {
    expect(await score([discovery(windows.slice(0, 2)), discovery(linux)])).toBe(0.5);
  });
});

describe('createFpChainSuppressionEvaluator', () => {
  it('scores 1 when no decoy alert is cited and drops with each cited decoy alert', async () => {
    const score = async (ids: string[]) =>
      (await run(createFpChainSuppressionEvaluator(), output({ insights: [discovery(ids)] })))
        .score;
    expect(await score(windows)).toBe(1);
    expect(await score([...windows, decoy[0]])).toBeCloseTo(2 / 3);
    expect(await score(decoy)).toBe(0);
  });

  it('scores 1 when nothing was reported at all', async () => {
    expect(await run(createFpChainSuppressionEvaluator(), output({}))).toMatchObject({ score: 1 });
  });
});

describe('model failure', () => {
  const execution = (status: ExecutionStatus) =>
    ({ status, error: undefined } as unknown as WorkflowExecutionDto);

  it('classifies failed batches, an empty completion and an overrun as the model', () => {
    const completed = execution(ExecutionStatus.COMPLETED);
    expect(
      classifyModelFailure({
        execution: completed,
        output: { batches_failed: 1, batches_total: 1, alerts_analyzed: 0 },
        timedOut: false,
      })
    ).toMatch(/batches failed/);
    expect(
      classifyModelFailure({
        execution: completed,
        output: { batches_failed: 0, alerts_analyzed: 23, discoveries_generated: 0 },
        timedOut: false,
      })
    ).toMatch(/refusal or empty completion/);
    expect(
      classifyModelFailure({
        execution: execution(ExecutionStatus.RUNNING),
        output: {},
        timedOut: true,
      })
    ).toMatch(/did not finish/);
    expect(
      classifyModelFailure({
        execution: execution(ExecutionStatus.FAILED),
        output: {},
        timedOut: false,
      })
    ).toMatch(/FAILED|failed/i);
  });

  it('treats an empty batch_errors as no task error', () => {
    expect(toTaskErrors(undefined)).toBeUndefined();
    expect(toTaskErrors(null)).toBeUndefined();
    expect(toTaskErrors([])).toBeUndefined();
    expect(toTaskErrors({})).toBeUndefined();
    expect(toTaskErrors([{ batch: 1, message: 'boom' }])).toEqual([
      '[{"batch":1,"message":"boom"}]',
    ]);
  });

  it('is clean for a run that produced discoveries', () => {
    expect(
      classifyModelFailure({
        execution: execution(ExecutionStatus.COMPLETED),
        output: { batches_failed: 0, alerts_analyzed: 23, discoveries_generated: 2 },
        timedOut: false,
      })
    ).toBeUndefined();
  });

  it('scores a model failure 0', async () => {
    expect(
      await run(createModelFailureEvaluator(), output({ modelFailure: 'empty completion' }))
    ).toMatchObject({ score: 0, label: 'model_failure' });
    expect(await run(createModelFailureEvaluator(), output({}))).toMatchObject({ score: 1 });
  });
});

describe('toAttackDiscovery', () => {
  it('maps flat persisted fields', () => {
    expect(
      toAttackDiscovery({
        '@timestamp': '2026-01-01T00:00:00.000Z',
        'kibana.alert.attack_discovery.alert_ids': ['a', 'b'],
        'kibana.alert.attack_discovery.title': 'T',
        'kibana.alert.attack_discovery.summary_markdown': 'S',
        'kibana.alert.attack_discovery.details_markdown': 'D',
        'kibana.alert.attack_discovery.mitre_attack_tactics': ['Exfiltration'],
      })
    ).toMatchObject({
      alertIds: ['a', 'b'],
      title: 'T',
      summaryMarkdown: 'S',
      detailsMarkdown: 'D',
      mitreAttackTactics: ['Exfiltration'],
    });
  });

  it('maps nested persisted fields', () => {
    expect(
      toAttackDiscovery({
        kibana: { alert: { attack_discovery: { alert_ids: ['a'], title: 'T' } } },
      })
    ).toMatchObject({ alertIds: ['a'], title: 'T' });
  });
});

describe('routing proof', () => {
  const subject = ['claude-5-opus', 'eis/anthropic-claude-5-opus'];
  const record = (modelId: string, connectorId = 'subject-conn') => ({
    modelId,
    connectorId,
    featureId: 'alertzero_frontier',
  });

  it('proves routing when every non-judge call carries the subject model', async () => {
    const routing = buildRoutingProof({
      records: [record('claude-5-opus'), record('claude-5-opus'), record('glm-5.2', 'judge-conn')],
      subjectModelId: subject,
      judgeConnectorIds: ['judge-conn'],
      judgeModelId: 'glm-5.2',
    });
    expect(routing).toMatchObject({ subjectCalls: 2, judgeCalls: 1, misrouted: [] });
    expect(await run(createRoutingEvaluator(), output({ routing }))).toMatchObject({ score: 1 });
  });

  it('flags a non-judge call on another model (an unpinned tier)', async () => {
    const routing = buildRoutingProof({
      records: [record('claude-5-opus'), record('gpt-5.6-sol')],
      subjectModelId: subject,
      judgeConnectorIds: ['judge-conn'],
      judgeModelId: 'glm-5.2',
    });
    expect(routing.misrouted).toHaveLength(1);
    expect(await run(createRoutingEvaluator(), output({ routing }))).toMatchObject({
      score: 0,
      label: 'misrouted',
    });
  });

  it('fails closed when no token docs were logged', async () => {
    const routing = buildRoutingProof({ records: [], subjectModelId: subject });
    expect(await run(createRoutingEvaluator(), output({ routing }))).toMatchObject({
      score: 0,
      label: 'no_token_docs',
    });
  });

  it('keeps near-miss model ids distinct', () => {
    expect(modelIdMatchesSubject('claude-5-5-opus', 'claude-5-opus')).toBe(false);
    expect(modelIdMatchesSubject('anthropic-claude-5-opus', 'claude-5-opus')).toBe(true);
    expect(modelIdMatchesSubject(undefined, 'claude-5-opus')).toBe(false);
  });
});
