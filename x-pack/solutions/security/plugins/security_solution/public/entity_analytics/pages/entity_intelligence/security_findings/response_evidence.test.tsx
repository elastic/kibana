/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { getFindingResponse, workflowExecutionPath } from './response_evidence';
import { FindingResponseEvidence, FindingResponseLink } from './finding_response_evidence';
import type { SecurityFinding } from './types';
import { SecurityGraphNodes } from '../ai_agents/security_graph_nodes';
import type { CodexToolEvent } from '../ai_agents/codex_types';

const mockGetUrlForApp = jest.fn(
  (app: string, { path }: { path: string }) => `/s/analysts/app/${app}${path}`
);
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { application: { getUrlForApp: mockGetUrlForApp } } }),
}));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));

const workflowId = 'workflow-ei-google-native-containment-v1';
const executionId = '0aa0ef05-aee6-455c-935a-c24384915993';
const triggerSessionId = '524ac4a6-69fe-4fcc-8f0b-2ce6ed4ac2db';
const runtimePrincipal = 'agent-runtime@project.iam.gserviceaccount.com';
const bucket = 'project-agent-export';
const receipt = `Elastic Workflow ${workflowId}, execution ${executionId}, was triggered by lookup alert ${'a'.repeat(
  64
)} in session ${triggerSessionId}. Its native HTTP steps removed roles/storage.objectCreator for ${runtimePrincipal} from ${bucket}, with Google HTTP 200 and IAM readback. This later export call received Google Storage HTTP 403; its exact target returned HTTP 404.`;
const finding: SecurityFinding = {
  id: 'blocked-export',
  timestamp: '2026-10-14T12:00:00Z',
  title: 'Export blocked',
  severity: 'high',
  status: 'open',
  kind: 'guardrail',
  outcome: 'blocked',
  target: `gs://${bucket}/summary.txt`,
  agent: { id: 'agent-one', provider: 'google_adk', sessionId: 'later-export-session' },
  rule: { name: 'Export containment' },
  policy: {
    id: 'native-containment',
    name: 'Google native containment',
    mode: 'enforce',
    decision: 'deny',
    engine: 'elastic_workflows.google_storage_iam',
    reason: receipt,
  },
  invocation: {
    correlation: 'exact_native_observation',
    operationOutcome: 'failure',
    runtimePrincipal,
    toolCallId: 'call_export',
    toolName: 'export_case_summary',
    source: { index: 'logs-google_adk.entity_intelligence-default', id: 'native-export' },
    inputRecordHash: 'b'.repeat(64),
    input: '{}',
    inputSource: 'tool.arguments',
    inputRedacted: false,
    inputTruncated: false,
  },
  source: { index: 'alerts', id: 'alert-export' },
  ancestors: [],
  entityIds: [],
};

it('links the response execution recorded with the exact denied call, including its distinct trigger', () => {
  const response = getFindingResponse(finding);
  expect(response).toEqual({
    workflowId,
    executionId,
    triggerAlertId: 'a'.repeat(64),
    triggerSessionId,
    runtimePrincipal,
    role: 'roles/storage.objectCreator',
    bucket,
    provider: 'google_cloud_storage',
    httpStatus: 403,
  });
  expect(workflowExecutionPath({ workflowId, executionId })).toBe(
    `/${workflowId}?tab=executions&executionId=${executionId}`
  );
});

it('rejects generic blocked findings, monitor matches, successful tools and missing native bindings', () => {
  expect(getFindingResponse({ ...finding, outcome: 'unknown' })).toBeUndefined();
  expect(getFindingResponse({ ...finding, agent: undefined })).toBeUndefined();
  expect(getFindingResponse({ ...finding, invocation: undefined })).toBeUndefined();
  expect(getFindingResponse({ ...finding, policy: undefined })).toBeUndefined();
  if (!finding.policy || !finding.invocation) throw new Error('Incomplete fixture.');
  expect(
    getFindingResponse({ ...finding, policy: { ...finding.policy, mode: 'monitor' } })
  ).toBeUndefined();
  expect(
    getFindingResponse({ ...finding, policy: { ...finding.policy, engine: 'local-harness' } })
  ).toBeUndefined();
  expect(
    getFindingResponse({
      ...finding,
      invocation: { ...finding.invocation, operationOutcome: 'success' },
    })
  ).toBeUndefined();
  expect(
    getFindingResponse({
      ...finding,
      invocation: { ...finding.invocation, correlation: 'exact_request_id' },
    })
  ).toBeUndefined();
});

it('rejects a receipt attached to another principal, target or the triggering action itself', () => {
  if (!finding.invocation || !finding.agent) throw new Error('Incomplete fixture.');
  expect(
    getFindingResponse({
      ...finding,
      invocation: { ...finding.invocation, runtimePrincipal: 'another-service-account' },
    })
  ).toBeUndefined();
  expect(
    getFindingResponse({ ...finding, target: 'gs://another-bucket/summary.txt' })
  ).toBeUndefined();
  expect(
    getFindingResponse({ ...finding, agent: { ...finding.agent, sessionId: triggerSessionId } })
  ).toBeUndefined();
});

it.each([
  receipt.replace(workflowId, 'https://example.invalid'),
  receipt.replace(workflowId, '../workflows'),
  receipt.replace(executionId, `${executionId}&executionId=another`),
  receipt.replace('HTTP 403;', 'HTTP 200;'),
  `An analyst wrote: ${receipt}`,
  `See /app/workflows/${workflowId}?executionId=${executionId}`,
])('does not invent a response link from unrecognized receipt text: %s', (reason) => {
  if (!finding.policy) throw new Error('Incomplete fixture.');
  expect(getFindingResponse({ ...finding, policy: { ...finding.policy, reason } })).toBeUndefined();
});

it.each(['../path', 'workflow?executionId=other', 'https://example.invalid'])(
  'rejects unsafe route identifiers (%s)',
  (id) => {
    expect(() => workflowExecutionPath({ workflowId: id, executionId })).toThrow();
    expect(() => workflowExecutionPath({ workflowId, executionId: id })).toThrow();
  }
);

it('opens the exact execution in a new tab through the current space and keeps containment chronology explicit', () => {
  render(<FindingResponseEvidence finding={finding} />);
  const link = screen.getByRole('link', { name: 'Open full workflow execution' });
  expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows', {
    path: `/${workflowId}?tab=executions&executionId=${executionId}`,
  });
  expect(link).toHaveAttribute(
    'href',
    `/s/analysts/app/workflows/${workflowId}?tab=executions&executionId=${executionId}`
  );
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.getByText(/did not undo or block the original lookup/)).toBeInTheDocument();
  expect(screen.getByText(/not a check of current access/)).toBeInTheDocument();
  expect(screen.getByText(`Execution ${executionId}`)).toBeInTheDocument();
});

it('gives a compact graph link an action-specific accessible name', () => {
  render(<FindingResponseLink finding={finding} />);
  expect(
    screen.getByRole('button', { name: 'Open response workflow execution for export_case_summary' })
  ).toBeInTheDocument();
});

it('does not show a response section when there is no recorded workflow binding', () => {
  const { container } = render(
    <FindingResponseEvidence finding={{ ...finding, policy: undefined }} />
  );
  expect(container).toBeEmptyDOMElement();
});

it('keeps one response link on a correlated tool node and exposes its execution in finding details', () => {
  if (!finding.invocation || !finding.agent?.sessionId || !finding.policy)
    throw new Error('Incomplete fixture.');
  const event: CodexToolEvent = {
    id: finding.invocation.toolCallId,
    agentId: finding.agent.id,
    provider: 'google_adk',
    sessionId: finding.agent.sessionId,
    toolName: finding.invocation.toolName,
    timestamp: finding.timestamp,
    outcome: 'failure',
    source: finding.invocation.source,
    recordHash: finding.invocation.inputRecordHash,
  };
  const monitor: SecurityFinding = {
    ...finding,
    id: 'monitor-match',
    source: { index: 'alerts', id: 'monitor-match' },
    outcome: 'unknown',
    kind: 'detection',
    policy: { ...finding.policy, id: 'monitor-policy', mode: 'monitor', reason: undefined },
  };
  const onInspectEvent = jest.fn();
  render(
    <SecurityGraphNodes
      scope={{ type: 'agent', provider: 'google_adk', agentId: event.agentId }}
      result={{
        findings: [monitor, finding],
        total: 2,
        partial: false,
        isLoading: false,
        isRefreshing: false,
        unavailable: false,
        refetch: jest.fn(),
      }}
      contextKey="google-run"
      source={{ x: 0, y: 0 }}
      left={0}
      top={0}
      width={800}
      height={400}
      invocations
      events={[event]}
      onInspectEvent={onInspectEvent}
    />
  );
  expect(screen.getAllByTestId('securityGraphEvent')).toHaveLength(1);
  expect(
    screen.getAllByRole('button', {
      name: 'Open response workflow execution for export_case_summary',
    })
  ).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect exact tool call call_export' }));
  expect(onInspectEvent).toHaveBeenCalledWith(event);
  fireEvent.click(screen.getByTestId('securityGraphEvent'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByTestId('securityFindingResponse')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open full workflow execution' })).toHaveAttribute(
    'href',
    `/s/analysts/app/workflows/${workflowId}?tab=executions&executionId=${executionId}`
  );
});
