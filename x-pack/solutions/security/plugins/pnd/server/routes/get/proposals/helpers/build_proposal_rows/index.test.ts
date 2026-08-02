/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import {
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';
import { buildProposalRows } from '.';

const openInvestigationStep = (
  overrides: Partial<EsWorkflowStepExecution> = {}
): EsWorkflowStepExecution =>
  ({
    id: 'step-exec-1',
    input: {
      message: 'Open an investigation for this attack discovery?',
      schema: { properties: { decision: { type: 'string' } }, type: 'object' },
    },
    startedAt: '2026-08-02T00:00:00.000Z',
    stepId: 'await_open_investigation',
    workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    workflowRunId: 'run-1',
    ...overrides,
  } as EsWorkflowStepExecution);

const applyTuningStep = (): EsWorkflowStepExecution =>
  openInvestigationStep({
    stepId: 'await_apply_tuning',
    workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  });

describe('buildProposalRows', () => {
  it('builds one row per registered gate', () => {
    const rows = buildProposalRows({
      attackDiscoveryIdByRunId: new Map([['run-1', 'ad-1']]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep()],
    });

    expect(rows).toHaveLength(1);
  });

  it('carries the gate bucket, reversibility and alwaysGate from the registry', () => {
    const [row] = buildProposalRows({
      attackDiscoveryIdByRunId: new Map([['run-1', 'ad-1']]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep()],
    });

    expect({
      alwaysGate: row.alwaysGate,
      gateId: row.gateId,
      recommendedAction: row.recommendedAction,
      reversible: row.reversible,
    }).toEqual({
      alwaysGate: false,
      gateId: 'open_investigation',
      recommendedAction: 'investigate',
      reversible: true,
    });
  });

  it('carries the correlated attack-discovery id', () => {
    const [row] = buildProposalRows({
      attackDiscoveryIdByRunId: new Map([['run-1', 'ad-1']]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep()],
    });

    expect(row.correlationId).toEqual('ad-1');
  });

  it('addresses the row with a parseable source id', () => {
    const [row] = buildProposalRows({
      attackDiscoveryIdByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep()],
    });

    expect(row.sourceId).toEqual(`${SYSTEM_SECURITY_WATCH_FLOOR_ID}:run-1:step-exec-1`);
  });

  it('surfaces the reasoning summary keyed by step execution id', () => {
    const [row] = buildProposalRows({
      attackDiscoveryIdByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(),
      reasoningByStepId: new Map([
        ['step-exec-1', { summary: 'Approve opening an investigation?' }],
      ]),
      steps: [openInvestigationStep()],
    });

    expect(row.reasoning).toEqual('Approve opening an investigation?');
  });

  it('drops steps that are not a registered PND gate', () => {
    const rows = buildProposalRows({
      attackDiscoveryIdByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep({ stepId: 'some_other_wait_step' })],
    });

    expect(rows).toEqual([]);
  });

  it('drops steps from a non-PND workflow', () => {
    const rows = buildProposalRows({
      attackDiscoveryIdByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep({ workflowId: 'some-other-workflow' })],
    });

    expect(rows).toEqual([]);
  });

  it('defaults the attack-discovery id to an empty string when uncorrelated', () => {
    const [row] = buildProposalRows({
      attackDiscoveryIdByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep()],
    });

    expect(row.correlationId).toEqual('');
  });

  it('drops a gate whose attack discovery the caller cannot read (S3/D3)', () => {
    const rows = buildProposalRows({
      attackDiscoveryIdByRunId: new Map([['run-1', 'ad-secret']]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      reasoningByStepId: new Map([['step-exec-1', { summary: 'the attack narrative' }]]),
      steps: [openInvestigationStep()],
    });

    expect(rows).toEqual([]);
  });

  it('keeps a gate whose discovery the caller can read (S3/D3)', () => {
    const rows = buildProposalRows({
      attackDiscoveryIdByRunId: new Map([['run-1', 'ad-1']]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep()],
    });

    expect(rows).toHaveLength(1);
  });

  it('keeps an uncorrelated gate, which exposes no discovery content (S3/D3)', () => {
    const rows = buildProposalRows({
      attackDiscoveryIdByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep()],
    });

    expect(rows).toHaveLength(1);
  });

  it("carries the thread conversation id derived from the row's (alert id, gate id)", () => {
    const [row] = buildProposalRows({
      attackDiscoveryIdByRunId: new Map([['run-1', 'ad-1']]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep()],
    });

    expect(row.threadConversationId).toEqual('a1c2022a-57ea-5afa-a7fa-c85ff30b0001');
  });

  it("keys the thread conversation id on the row's own gate, not on a fixed one", () => {
    const [row] = buildProposalRows({
      attackDiscoveryIdByRunId: new Map([['run-1', 'ad-1']]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      reasoningByStepId: new Map(),
      steps: [applyTuningStep()],
    });

    expect(row.threadConversationId).toEqual('8f3f960c-2972-5f32-be9e-742308bea5ce');
  });

  it('leaves the thread conversation id undefined for an uncorrelated gate (fail-closed)', () => {
    const [row] = buildProposalRows({
      attackDiscoveryIdByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(),
      reasoningByStepId: new Map(),
      steps: [openInvestigationStep()],
    });

    expect(row.threadConversationId).toBeUndefined();
  });
});
