/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FindingResponseLink } from './finding_response_evidence';
import { ResponseExecutionFlyout } from './response_execution_flyout';
import { toResponseExecution } from './response_execution_model';
import type { ExecutionValue } from './response_execution_model';
import type { FindingResponseEvidence } from './response_evidence';
import type { SecurityFinding } from './types';

const mockGet = jest.fn();
const mockHttp = { get: mockGet };
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      http: mockHttp,
      application: {
        getUrlForApp: (app: string, { path }: { path: string }) => `/s/analysts/app/${app}${path}`,
      },
    },
  }),
}));
jest.mock('../../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'analysts' }));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));

const response: FindingResponseEvidence = {
  workflowId: 'workflow-ei-google-native-containment-v1',
  executionId: '0aa0ef05-aee6-455c-935a-c24384915993',
  triggerAlertId: 'a'.repeat(64),
  triggerSessionId: '524ac4a6-69fe-4fcc-8f0b-2ce6ed4ac2db',
  runtimePrincipal: 'agent-runtime@project.iam.gserviceaccount.com',
  bucket: 'project-agent-export',
  role: 'roles/storage.objectCreator',
  provider: 'google_cloud_storage',
  httpStatus: 403,
};
const finding: SecurityFinding = {
  id: 'blocked',
  timestamp: '2026-10-14T12:01:00Z',
  title: 'Blocked export',
  severity: 'high',
  status: 'open',
  kind: 'guardrail',
  outcome: 'blocked',
  target: `gs://${response.bucket}/summary.txt`,
  agent: { id: 'agent', provider: 'google_adk', sessionId: 'later-session' },
  rule: { name: 'Export containment' },
  policy: {
    id: 'native-containment',
    name: 'Google native containment',
    mode: 'enforce',
    decision: 'deny',
    engine: 'elastic_workflows.google_storage_iam',
    reason: `Elastic Workflow ${response.workflowId}, execution ${response.executionId}, was triggered by lookup alert ${response.triggerAlertId} in session ${response.triggerSessionId}. Its native HTTP steps removed roles/storage.objectCreator for ${response.runtimePrincipal} from ${response.bucket}, with Google HTTP 200 and IAM readback. This later export call received Google Storage HTTP 403; its exact target returned HTTP 404.`,
  },
  invocation: {
    correlation: 'exact_native_observation',
    operationOutcome: 'failure',
    runtimePrincipal: response.runtimePrincipal,
    toolCallId: 'call_export',
    toolName: 'export_case_summary',
    source: { index: 'logs-google_adk.entity_intelligence-analysts', id: 'export' },
    inputRecordHash: 'b'.repeat(64),
    input: '{}',
    inputSource: 'tool.arguments',
    inputRedacted: false,
    inputTruncated: false,
  },
  source: { index: 'alerts', id: 'blocked' },
  ancestors: [],
  entityIds: [],
};

const makeExecution = () => ({
  id: response.executionId,
  workflowId: response.workflowId,
  spaceId: 'analysts',
  status: 'completed',
  isTestRun: false,
  triggeredBy: 'alert',
  startedAt: '2026-10-14T12:00:00Z',
  finishedAt: '2026-10-14T12:00:01Z',
  duration: 1000,
  workflowDefinition: { name: 'Google agent containment — revoke export access' },
  context: {
    event: {
      alerts: [
        {
          _id: response.triggerAlertId,
          entity_intelligence: {
            agent: { provider: 'google_adk', session_id: response.triggerSessionId },
          },
        },
      ],
    },
    output: {
      action: 'revoke_export_permission',
      runtime_principal: response.runtimePrincipal,
      bucket: response.bucket,
      removed_role: response.role,
      iam_policy_change_verified: true,
    },
  },
  stepExecutions: [
    'read_current_export_bucket_iam',
    'revoke_agent_export_permission',
    'read_back_google_iam_policy',
  ].map((stepId, index) => ({
    stepId,
    stepType: 'http',
    workflowRunId: response.executionId,
    workflowId: response.workflowId,
    spaceId: 'analysts',
    status: 'completed',
    executionTimeMs: 100,
    input: {
      method: index === 1 ? 'PUT' : 'GET',
      headers: { Authorization: 'do-not-render-this-secret' },
    },
    output: {
      status: 200,
      headers: { arbitrary: 'do-not-render-this-header' },
      data: {
        resourceId: `projects/_/buckets/${response.bucket}`,
        etag: index === 0 ? 'before' : 'after',
        bindings:
          index === 0
            ? [{ role: response.role, members: [`serviceAccount:${response.runtimePrincipal}`] }]
            : [],
      },
    },
  })),
});

beforeEach(() => {
  mockGet.mockReset();
  mockGet.mockResolvedValue(makeExecution());
});

it('projects verified native HTTP evidence without headers, inputs or unrelated outputs', () => {
  const parsed = toResponseExecution(makeExecution(), response, 'analysts');
  expect(parsed.permissionRemoved).toBe(true);
  expect(parsed.steps.map((step) => [step.method, step.httpStatus])).toEqual([
    ['GET', 200],
    ['PUT', 200],
    ['GET', 200],
  ]);
  expect(JSON.stringify(parsed)).not.toContain('do-not-render');
  expect(JSON.stringify(parsed)).not.toContain('bindings');
});

it.each([
  { id: 'another-execution' },
  { workflowId: 'another-workflow' },
  { spaceId: 'another-space' },
  { triggeredBy: 'manual' },
  { isTestRun: true },
  { isTestRun: null },
  { status: 'invented' },
  { stepExecutions: null },
  { context: {} },
])('rejects a mismatched or unverified execution: %s', (patch) => {
  expect(() =>
    toResponseExecution({ ...makeExecution(), ...patch }, response, 'analysts')
  ).toThrow();
});

it('requires the exact alert, provider and originating lookup session', () => {
  for (const field of ['_id', 'session_id', 'provider']) {
    const value = makeExecution();
    if (field === '_id') value.context.event.alerts[0]._id = 'another-alert';
    if (field === 'session_id')
      value.context.event.alerts[0].entity_intelligence.agent.session_id = 'another-session';
    if (field === 'provider')
      value.context.event.alerts[0].entity_intelligence.agent.provider = 'codex';
    expect(() => toResponseExecution(value, response, 'analysts')).toThrow();
  }
});

it('does not claim revocation from status alone, an idempotent response or ambiguous steps', () => {
  const missing = makeExecution();
  missing.stepExecutions.pop();
  expect(toResponseExecution(missing, response, 'analysts').permissionRemoved).toBe(false);
  const alreadyAbsent = makeExecution();
  alreadyAbsent.stepExecutions[0].output.data.bindings = [];
  expect(toResponseExecution(alreadyAbsent, response, 'analysts').permissionRemoved).toBe(false);
  const stillPresent = makeExecution();
  stillPresent.stepExecutions[2].output.data.bindings =
    stillPresent.stepExecutions[0].output.data.bindings;
  expect(toResponseExecution(stillPresent, response, 'analysts').permissionRemoved).toBe(false);
  const duplicate = makeExecution();
  duplicate.stepExecutions.push(duplicate.stepExecutions[0]);
  expect(toResponseExecution(duplicate, response, 'analysts').permissionRemoved).toBe(false);
  const wrongStep = makeExecution();
  wrongStep.stepExecutions[1].workflowRunId = 'another-execution';
  expect(toResponseExecution(wrongStep, response, 'analysts').permissionRemoved).toBe(false);
  const failed = makeExecution();
  failed.stepExecutions[1].output.status = 403;
  expect(toResponseExecution(failed, response, 'analysts').permissionRemoved).toBe(false);
});

it('loads only when Response is opened and keeps the exact full execution link', async () => {
  render(<FindingResponseLink finding={finding} />);
  expect(mockGet).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Open response workflow execution for export_case_summary' })
  );
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await screen.findByText('Google agent containment — revoke export access');
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet).toHaveBeenCalledWith(
    `/api/workflows/executions/${response.executionId}`,
    expect.objectContaining({
      version: '2023-10-31',
      query: { includeInput: true, includeOutput: true },
    })
  );
  expect(screen.getAllByTestId('responseExecutionHttpStep')).toHaveLength(3);
  expect(screen.getByText('Export permission removed')).toBeInTheDocument();
  expect(screen.getByText('Later agent export denied')).toBeInTheDocument();
  expect(screen.getByText(/HTTP 403 after this response/)).toBeInTheDocument();
  expect(screen.queryByText(/do-not-render/)).not.toBeInTheDocument();
  const link = screen.getByRole('link', { name: 'Open full workflow execution' });
  expect(link).toHaveAttribute(
    'href',
    `/s/analysts/app/workflows/${response.workflowId}?tab=executions&executionId=${response.executionId}`
  );
  expect(link).toHaveAttribute('target', '_blank');
  expect(document.querySelector('img[src="launch"]')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('shows unavailable evidence without claiming the execution was verified and supports a retry', async () => {
  mockGet.mockResolvedValueOnce({ ...makeExecution(), spaceId: 'other-space' });
  render(<ResponseExecutionFlyout finding={finding} response={response} onClose={jest.fn()} />);
  await screen.findByText('Execution details are unavailable');
  expect(screen.queryByText('Export permission removed')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('Google agent containment — revoke export access');
  expect(mockGet).toHaveBeenCalledTimes(2);
});

it('aborts a pending execution request when the flyout closes', async () => {
  mockGet.mockReturnValue(new Promise<ExecutionValue>(() => {}));
  const { unmount } = render(
    <ResponseExecutionFlyout finding={finding} response={response} onClose={jest.fn()} />
  );
  await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
  const options = mockGet.mock.calls[0][1];
  expect(options.signal.aborted).toBe(false);
  unmount();
  expect(options.signal.aborted).toBe(true);
});

it.each([401, 403, 404])('handles an unavailable execution with HTTP %s', async (status) => {
  mockGet.mockRejectedValueOnce(
    Object.assign(new Error('Request failed'), { request: {}, response: { status } })
  );
  render(<ResponseExecutionFlyout finding={finding} response={response} onClose={jest.fn()} />);
  await screen.findByText('Execution details are unavailable');
  expect(
    screen.getByText(status === 404 ? /not found in the current space/ : /needs permission/)
  ).toBeInTheDocument();
  expect(screen.queryByTestId('responseExecutionHttpStep')).not.toBeInTheDocument();
});

it('does not show a previous execution while loading another response', async () => {
  const { rerender } = render(
    <ResponseExecutionFlyout finding={finding} response={response} onClose={jest.fn()} />
  );
  await screen.findByText('Google agent containment — revoke export access');
  mockGet.mockReturnValue(new Promise<ExecutionValue>(() => {}));
  rerender(
    <ResponseExecutionFlyout
      finding={finding}
      response={{ ...response, executionId: '11111111-1111-1111-1111-111111111111' }}
      onClose={jest.fn()}
    />
  );
  expect(
    screen.queryByText('Google agent containment — revoke export access')
  ).not.toBeInTheDocument();
  expect(screen.queryByTestId('responseExecutionHttpStep')).not.toBeInTheDocument();
});

it.each([undefined, 'not-a-date', '2026-10-14T12:02:00Z', '2026-10-14T11:59:00Z'])(
  'does not claim the export followed the response with an unverified finish time: %s',
  async (finishedAt) => {
    mockGet.mockResolvedValueOnce({ ...makeExecution(), finishedAt });
    render(<ResponseExecutionFlyout finding={finding} response={response} onClose={jest.fn()} />);
    await screen.findByText('Google agent containment — revoke export access');
    expect(screen.getByText('Agent export denied')).toBeInTheDocument();
    expect(screen.getByText(/Their time order could not be verified/)).toBeInTheDocument();
    expect(screen.queryByText(/HTTP 403 after this response/)).not.toBeInTheDocument();
    expect(screen.queryByText('Later agent export denied')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open full workflow execution' })).toBeInTheDocument();
  }
);
