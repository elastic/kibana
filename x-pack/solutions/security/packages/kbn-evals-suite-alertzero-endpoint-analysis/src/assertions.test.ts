/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertPersistedProposal,
  assertStructuredEvidence,
  assertAnalysisExecution,
} from './assertions';
import { analysisInputValidator, assertAlertZeroContracts, workerWorkflowId } from './contracts';
import { getCompleteWorkerSettingsSchema } from '@kbn/alertzero-common';
import { ExecutionStatus, type WorkflowStepExecutionDto } from '@kbn/workflows';

const expected = {
  host: 'AZ-EVAL-01',
  eventIds: ['az-1', 'az-2'],
  command: 'powershell.exe -EncodedCommand SQBFAFgA',
};
const findings = () => ({
  propose: false,
  rationale: 'Encoded PowerShell follows a document process.',
  timeline: {
    events: [
      {
        timestamp: '2026-01-01T00:00:00Z',
        host: expected.host,
        category: 'process',
        description: 'Document launched',
        is_malicious: false,
      },
      {
        timestamp: '2026-01-01T00:01:00Z',
        host: expected.host,
        category: 'process',
        description: 'Encoded PowerShell launched',
        is_malicious: true,
      },
    ],
  },
  iocs: {
    shas: [],
    ips: [],
    file_paths: [],
    malicious_commands: [{ value: expected.command }],
    affected_hosts: [{ value: expected.host }],
    ransom_notes: [],
    encryption_markers: [],
    compromised_identities: [],
  },
  recommendedActions: [],
});
const proposal = () => ({
  id: 'az-proposal',
  spaceId: 'default',
  conversationId: 'az-investigation',
  title: 'Review endpoint evidence',
  comment: 'Review endpoint evidence',
  origin: 'alertzero',
  category: 'endpoint_analysis',
  impact: 'medium',
  confidence: 'high',
  status: 'pending',
  createdAt: '2026-01-01T00:00:00Z',
  expiresAt: '2026-01-02T00:00:00Z',
  workflowExecutionId: 'az-execution',
  stepId: 'proposal_gate',
});
const proposalExpectation = {
  conversationId: 'az-investigation',
  workflowExecutionId: 'az-execution',
  status: 'pending' as const,
};

describe('AlertZero L0 production contracts', () => {
  it('uses the registered sweep, child workflow and proposal gate', () =>
    assertAlertZeroContracts());
  it('accepts declared worker settings and rejects unsupported autonomy', () => {
    expect(() =>
      getCompleteWorkerSettingsSchema(workerWorkflowId).parse({
        workerId: workerWorkflowId,
        autonomy: 'manual',
      })
    ).not.toThrow();
    expect(() =>
      getCompleteWorkerSettingsSchema(workerWorkflowId).parse({
        workerId: workerWorkflowId,
        autonomy: 'assisted',
      })
    ).toThrow();
  });
  it.each([
    { ki_id: '', ai_index_id: 'valid' },
    { ki_id: 'ki', ai_index_id: '../unsafe' },
    { ki_id: 'ki' },
  ])('rejects invalid production inputs %p', (input) => {
    expect(() => analysisInputValidator.parse(input)).toThrow();
  });
});
describe('AlertZero L2 deterministic evidence', () => {
  it('accepts schema-valid grounded evidence', () =>
    expect(assertStructuredEvidence(findings(), expected)).toBeDefined());
  it.each(['rationale', 'timeline', 'iocs', 'recommendedActions'])('rejects missing %s', (key) => {
    const value: Record<string, unknown> = findings();
    delete value[key];
    expect(() => assertStructuredEvidence(value, expected)).toThrow();
  });
  it('rejects unsupported actions through the production schema', () => {
    expect(() =>
      assertStructuredEvidence(
        { ...findings(), recommendedActions: [{ type: 'delete_host', reason: 'malicious' }] },
        expected
      )
    ).toThrow();
  });
  it.each([
    'fabricated',
    'empty',
    'unordered',
    'invalid_date',
    'wrong_host',
    'wrong_command',
    'token_only_command',
  ])('rejects %s evidence', (mutation) => {
    const value = findings();
    if (mutation === 'fabricated') value.timeline.events[0].host = 'made-up';
    if (mutation === 'empty') value.timeline.events = [];
    if (mutation === 'unordered') value.timeline.events.reverse();
    if (mutation === 'invalid_date') value.timeline.events[0].timestamp = 'not-a-date';
    if (mutation === 'wrong_host') value.iocs.affected_hosts = [{ value: 'another-host' }];
    if (mutation === 'wrong_command') value.iocs.malicious_commands = [{ value: 'benign' }];
    if (mutation === 'token_only_command') {
      value.iocs.malicious_commands = [{ value: 'fabricated -EncodedCommand AAAA' }];
    }
    expect(() => assertStructuredEvidence(value, expected)).toThrow();
  });
  it('rejects missing, failed and synthetic agent execution output', () => {
    expect(() => assertAnalysisExecution([], expected)).toThrow();
    const step: WorkflowStepExecutionDto = {
      stepId: 'forensic_analysis',
      stepType: 'ai.agent',
      status: ExecutionStatus.COMPLETED,
      id: 'step',
      workflowRunId: 'run',
      workflowId: 'workflow',
      startedAt: '',
      topologicalIndex: 0,
      scopeStack: [],
      globalExecutionIndex: 0,
      stepExecutionIndex: 0,
      output: { structured_output: findings() },
    };
    expect(() => assertAnalysisExecution([step], expected)).toThrow(/conversation/);
    expect(() =>
      assertAnalysisExecution([{ ...step, status: ExecutionStatus.FAILED }], expected)
    ).toThrow();
    const real = {
      ...step,
      output: { conversation_id: 'az-agent', structured_output: findings() },
    };
    expect(assertAnalysisExecution([real], expected)).toBeDefined();
    expect(() => assertAnalysisExecution([real, real], expected)).toThrow();
  });
});
describe('AlertZero L4 durable proposal evidence', () => {
  it('validates a pending proposal and its later dismissed state', () => {
    expect(assertPersistedProposal(proposal(), proposalExpectation).id).toBe('az-proposal');
    expect(
      assertPersistedProposal(
        { ...proposal(), status: 'no_action', decision: 'dismissed' },
        { ...proposalExpectation, status: 'no_action', decision: 'dismissed' }
      ).decision
    ).toBe('dismissed');
  });
  it.each([
    { origin: 'unrelated' },
    { category: 'rule_management' },
    { conversationId: 'other' },
    { workflowExecutionId: 'other' },
    { status: 'succeeded' },
    { decision: 'approved' },
    { id: '' },
  ])('rejects unrelated or malformed proposal %p', (mutation) => {
    expect(() =>
      assertPersistedProposal({ ...proposal(), ...mutation }, proposalExpectation)
    ).toThrow();
  });
});
