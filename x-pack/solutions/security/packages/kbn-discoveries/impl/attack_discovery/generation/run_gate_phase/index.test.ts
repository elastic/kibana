/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { runGatePhase } from '.';
import type { AlertRetrievalResult } from '../invoke_alert_retrieval_workflow';

const mockInvokeGateWorkflow = jest.fn();
const mockRetrieveAnonymizedAlertsByIds = jest.fn();

jest.mock('../invoke_gate_workflow', () => ({
  invokeGateWorkflow: (...args: unknown[]) => mockInvokeGateWorkflow(...args),
}));

jest.mock('../retrieve_anonymized_alerts_by_ids', () => ({
  retrieveAnonymizedAlertsByIds: (...args: unknown[]) => mockRetrieveAnonymizedAlertsByIds(...args),
}));

const logger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const apiConfig = {
  action_type_id: '.gen-ai',
  connector_id: 'connector-1',
  model: 'gpt-4',
};

const candidateResult: AlertRetrievalResult = {
  alerts: ['_id,id-1\nhost.name,web-01', '_id,id-2\nhost.name,web-02'],
  alertsContextCount: 2,
  anonymizedAlerts: [
    { id: 'id-1', metadata: {}, page_content: '_id,id-1\nhost.name,web-01' },
    { id: 'id-2', metadata: {}, page_content: '_id,id-2\nhost.name,web-02' },
  ],
  apiConfig,
  connectorName: 'Connector 1',
  replacements: { 'web-01': 'host-a' },
  workflowExecutions: [{ workflowId: 'retrieval', workflowRunId: 'retrieval-run' }],
  workflowId: 'retrieval',
  workflowRunId: 'retrieval-run',
};

const baseParams = {
  alertsIndexPattern: '.alerts',
  anonymizationFields: [],
  apiConfig,
  authenticatedUser: {} as never,
  candidateResult,
  defaultAlertRetrievalWorkflowId: 'default-retrieval',
  eventLogger: {} as never,
  eventLogIndex: '.events',
  executionUuid: 'exec-1',
  gateWorkflowId: 'gate',
  logger,
  request: {} as never,
  skillEnabled: false,
  spaceId: 'default',
  workflowsManagementApi: {} as never,
};

describe('runGatePhase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: [], keepAlertIds: ['id-1', 'id-2'] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });
  });

  it('forwards the original kept candidate bytes unchanged (pass-through)', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: [], keepAlertIds: ['id-1'] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });

    const result = await runGatePhase(baseParams);

    expect(result.alerts).toEqual(['_id,id-1\nhost.name,web-01']);
  });

  it('removes candidates the gate did not keep', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: [], keepAlertIds: ['id-2'] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });

    const result = await runGatePhase(baseParams);

    expect(result.alertsContextCount).toBe(1);
  });

  it('filters anonymizedAlerts to the kept subset', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: [], keepAlertIds: ['id-2'] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });

    const result = await runGatePhase(baseParams);

    expect(result.anonymizedAlerts.map((a) => a.id)).toEqual(['id-2']);
  });

  it('does NOT re-fetch kept candidates', async () => {
    await runGatePhase(baseParams);

    expect(mockRetrieveAnonymizedAlertsByIds).not.toHaveBeenCalled();
  });

  it('re-fetches and anonymizes the skill-added alerts by _id', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: {
        addedAlertIds: ['added-1'],
        keepAlertIds: ['id-1', 'id-2'],
      },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });
    mockRetrieveAnonymizedAlertsByIds.mockResolvedValue({
      alerts: ['_id,added-1\nhost.name,REDACTED'],
      alertsContextCount: 1,
      anonymizedAlerts: [{ id: 'added-1', metadata: {}, page_content: '_id,added-1' }],
      connectorName: 'Connector 1',
      replacements: { 'web-09': 'host-z' },
      workflowExecution: { workflowId: 'default-retrieval', workflowRunId: 'added-run' },
      workflowRunId: 'added-run',
    });

    const result = await runGatePhase({ ...baseParams, skillEnabled: true });

    expect(mockRetrieveAnonymizedAlertsByIds).toHaveBeenCalledWith(
      expect.objectContaining({ alertIds: ['added-1'], workflowId: 'default-retrieval' })
    );
    expect(result.alerts).toEqual([
      '_id,id-1\nhost.name,web-01',
      '_id,id-2\nhost.name,web-02',
      '_id,added-1\nhost.name,REDACTED',
    ]);
  });

  it('merges replacements from the candidate set and the skill additions', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: ['added-1'], keepAlertIds: ['id-1'] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });
    mockRetrieveAnonymizedAlertsByIds.mockResolvedValue({
      alerts: ['_id,added-1'],
      alertsContextCount: 1,
      anonymizedAlerts: [],
      connectorName: 'Connector 1',
      replacements: { 'web-09': 'host-z' },
      workflowExecution: { workflowId: 'default-retrieval', workflowRunId: 'added-run' },
      workflowRunId: 'added-run',
    });

    const result = await runGatePhase({ ...baseParams, skillEnabled: true });

    expect(result.replacements).toEqual({ 'web-01': 'host-a', 'web-09': 'host-z' });
  });

  it('threads the gate conversationId for the report phase', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: [], conversationId: 'conv-1', keepAlertIds: ['id-1'] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });

    const result = await runGatePhase(baseParams);

    expect(result.conversationId).toBe('conv-1');
  });

  it('threads the gate additionalContext', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: {
        addedAlertIds: [],
        additionalContext: 'entity risk high',
        keepAlertIds: ['id-1'],
      },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });

    const result = await runGatePhase(baseParams);

    expect(result.additionalContext).toBe('entity risk high');
  });

  it('keeps only the deterministic retrieval executions in workflowExecutions', async () => {
    const result = await runGatePhase(baseParams);

    expect(result.workflowExecutions).toEqual([
      { workflowId: 'retrieval', workflowRunId: 'retrieval-run' },
    ]);
  });

  it('records the gate execution in gateExecutions (surfaced under Generation)', async () => {
    const result = await runGatePhase(baseParams);

    expect(result.gateExecutions).toEqual([{ workflowId: 'gate', workflowRunId: 'gate-run' }]);
  });

  it('folds the skill-added re-fetch into the single gate entry (one workflow per Generation entry)', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: ['added-1'], keepAlertIds: ['id-1'] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });
    mockRetrieveAnonymizedAlertsByIds.mockResolvedValue({
      alerts: ['_id,added-1'],
      alertsContextCount: 1,
      anonymizedAlerts: [],
      connectorName: 'Connector 1',
      replacements: {},
      workflowExecution: { workflowId: 'default-retrieval', workflowRunId: 'added-run' },
      workflowRunId: 'added-run',
    });

    const result = await runGatePhase({ ...baseParams, skillEnabled: true });

    // The net-new re-fetch is an internal hydration detail of the skill (gate)
    // invocation, so it is NOT surfaced as a separate execution: the gate stays a
    // single entry under the Generation phase even when it adds net-new alerts.
    expect(result.gateExecutions).toEqual([{ workflowId: 'gate', workflowRunId: 'gate-run' }]);
  });

  it('re-fetches the gate added_alert_ids directly (ids-only contract)', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: ['added-1', 'added-2'], keepAlertIds: [] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });
    mockRetrieveAnonymizedAlertsByIds.mockResolvedValue({
      alerts: ['_id,added-1', '_id,added-2'],
      alertsContextCount: 2,
      anonymizedAlerts: [],
      connectorName: 'Connector 1',
      replacements: {},
      workflowExecution: { workflowId: 'default-retrieval', workflowRunId: 'added-run' },
      workflowRunId: 'added-run',
    });

    await runGatePhase({ ...baseParams, skillEnabled: true });

    expect(mockRetrieveAnonymizedAlertsByIds).toHaveBeenCalledWith(
      expect.objectContaining({ alertIds: ['added-1', 'added-2'] })
    );
  });

  it('drops empty/whitespace gate added_alert_ids before the re-fetch', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: ['added-1', '', '  '], keepAlertIds: [] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });
    mockRetrieveAnonymizedAlertsByIds.mockResolvedValue({
      alerts: ['_id,added-1'],
      alertsContextCount: 1,
      anonymizedAlerts: [],
      connectorName: 'Connector 1',
      replacements: {},
      workflowExecution: { workflowId: 'default-retrieval', workflowRunId: 'added-run' },
      workflowRunId: 'added-run',
    });

    await runGatePhase({ ...baseParams, skillEnabled: true });

    expect(mockRetrieveAnonymizedAlertsByIds).toHaveBeenCalledWith(
      expect.objectContaining({ alertIds: ['added-1'] })
    );
  });

  it('re-fetches real keep ids that have no matching candidate (sole-source mode) instead of dropping them', async () => {
    // Sole-source mode: the deterministic retrieval produced zero candidates, so
    // every keep id the gate returns has no candidate to forward original bytes
    // from. Such keep ids must be re-fetched by _id (folded into the added set)
    // rather than silently dropped; the ids filter drops any hallucinated id.
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: ['added-1'], keepAlertIds: ['kept-real-1', 'kept-real-2'] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });
    mockRetrieveAnonymizedAlertsByIds.mockResolvedValue({
      alerts: ['_id,added-1', '_id,kept-real-1', '_id,kept-real-2'],
      alertsContextCount: 3,
      anonymizedAlerts: [],
      connectorName: 'Connector 1',
      replacements: {},
      workflowExecution: { workflowId: 'default-retrieval', workflowRunId: 'added-run' },
      workflowRunId: 'added-run',
    });

    await runGatePhase({
      ...baseParams,
      skillEnabled: true,
      candidateResult: { ...candidateResult, alerts: [], anonymizedAlerts: [] },
    });

    expect(mockRetrieveAnonymizedAlertsByIds).toHaveBeenCalledWith(
      expect.objectContaining({ alertIds: ['added-1', 'kept-real-1', 'kept-real-2'] })
    );
  });

  it('does NOT re-fetch keep ids that match a candidate (still forwarded as original bytes)', async () => {
    // id-1 matches a candidate, so it is forwarded as original bytes (pass-through)
    // and must NOT be re-fetched. Only the unmatched keep id is folded in.
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: [], keepAlertIds: ['id-1', 'kept-real-1'] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });
    mockRetrieveAnonymizedAlertsByIds.mockResolvedValue({
      alerts: ['_id,kept-real-1'],
      alertsContextCount: 1,
      anonymizedAlerts: [],
      connectorName: 'Connector 1',
      replacements: {},
      workflowExecution: { workflowId: 'default-retrieval', workflowRunId: 'added-run' },
      workflowRunId: 'added-run',
    });

    const result = await runGatePhase({ ...baseParams, skillEnabled: true });

    expect(mockRetrieveAnonymizedAlertsByIds).toHaveBeenCalledWith(
      expect.objectContaining({ alertIds: ['kept-real-1'] })
    );
    // id-1 is still forwarded as original candidate bytes (not re-fetched).
    expect(result.alerts).toContain('_id,id-1\nhost.name,web-01');
  });

  it('does NOT re-fetch when the gate added no ids', async () => {
    mockInvokeGateWorkflow.mockResolvedValue({
      decision: { addedAlertIds: [], keepAlertIds: ['id-1'] },
      workflowExecution: { workflowId: 'gate', workflowRunId: 'gate-run' },
    });

    await runGatePhase({ ...baseParams, skillEnabled: true });

    expect(mockRetrieveAnonymizedAlertsByIds).not.toHaveBeenCalled();
  });

  it('logs loudly when a candidate lacks a recoverable _id', async () => {
    await runGatePhase({
      ...baseParams,
      candidateResult: {
        ...candidateResult,
        alerts: ['_id,id-1\nhost.name,web-01', 'host.name,web-02'],
      },
    });

    expect((logger.error as jest.Mock).mock.calls[0][0]).toContain('_id contract violation');
  });

  it('fails closed when the gate workflow throws', async () => {
    mockInvokeGateWorkflow.mockRejectedValue(new Error('gate failed'));

    await expect(runGatePhase(baseParams)).rejects.toThrow('gate failed');
  });
});
