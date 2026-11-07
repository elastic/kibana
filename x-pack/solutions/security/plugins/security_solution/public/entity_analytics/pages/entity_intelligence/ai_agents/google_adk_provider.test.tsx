/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GoogleAdkContext } from '../../../../../common/entity_intelligence/google_adk';
import { buildCodexSessionsQuery, CODEX_SOURCE_FIELDS } from './codex_queries';
import { parseCodexSessions, parseCodexTools } from './codex_model';
import { CodexSessionGraph } from './session_graph';
import { CodexPromptDetails } from './codex_prompt_details';
import { useCodexContent } from './use_codex_content';
import { findingMatchesToolEvent } from './security_graph_model';
import type { SecurityFinding } from '../security_findings/types';
import { parseSecurityInvocation } from '../security_findings/evidence_model';
import { provenanceLabel } from '../security_findings/finding_presentation';
import type { CodexDocument, CodexSearchResponse } from './codex_types';

jest.mock('./use_codex_content');
jest.mock('../../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'blue' }));
jest.mock('../security_findings/security_findings_panel', () => ({
  FindingDetails: () => null,
}));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));

const hash = 'a'.repeat(64);
const context: GoogleAdkContext = {
  project_id: 'example-project',
  service_name: 'support-agent',
  revision: 'support-agent-001',
  run_id: 'run-1',
  trace_id: 'b'.repeat(32),
  span_id: 'c'.repeat(16),
  requester: {
    email: 'requester@example.com',
    subject: 'google-user-1',
    authenticated: true,
    provenance: 'google_signed_id_token_verified_by_application',
    human_identity: 'account_level_only',
  },
  runtime: {
    email: 'runtime@example-project.iam.gserviceaccount.com',
    provenance: 'cloud_run_metadata_service_identity',
  },
  owner: {
    email: 'owner@example.com',
    recorded_by: 'operator@example.com',
    effective_from: '2026-10-14T08:00:00Z',
    provenance: 'operator_declared',
  },
  resources: [
    {
      uri: 'gs://support-bucket/cases/CASE-001.json',
      generation: '123456789',
      sha256: hash,
      tool_call_id: 'call-1',
      content_verified: true,
      editor: {
        email: 'editor@example.com',
        audit_id: 'edit-audit-1',
        timestamp: '2026-10-14T09:00:00Z',
        change_id: 'change-1',
        provenance: 'cloud_audit_write_receipt_generation_hash',
      },
    },
  ],
  audit_matches: [
    {
      tool_call_id: 'call-1',
      audit_id: 'read-audit-1',
      principal: 'runtime@example-project.iam.gserviceaccount.com',
      method: 'storage.objects.get',
      timestamp: '2026-10-14T10:00:00Z',
    },
  ],
  source_policy: {
    id: 'source-policy',
    name: 'Data boundary',
    revision: 1,
    mode: 'monitor',
    enforced: false,
    matches: [],
  },
};
const document: CodexDocument = {
  '@timestamp': '2026-10-14T10:00:00Z',
  google_adk: context,
  agent: { id: 'google-support-agent', name: 'Google ADK', type: 'google_adk' },
  kibana: { space_id: 'blue' },
  event: { action: 'session', id: 'session-1', outcome: 'success' },
  source: { kind: 'google_adk_cloud_run', file_hash: hash, schema_version: 1 },
  session: {
    id: 'session-1',
    kind: 'agent_run',
    is_chat_session: true,
    start: '2026-10-14T09:59:00Z',
    last_seen: '2026-10-14T10:00:00Z',
    tool_call_count: 1,
    success_count: 1,
    failure_count: 0,
    unknown_count: 0,
    summary_complete: true,
    tools: [
      { name: 'read_support_case', count: 1, success_count: 1, failure_count: 0, unknown_count: 0 },
    ],
  },
  content: {
    mode: 'redacted_local',
    redaction_version: 1,
    title: {
      text: 'Summarize customer case',
      source: 'google_adk.request.title',
      redacted: false,
      truncated: false,
    },
    prompts: [
      {
        id: 'prompt-1',
        timestamp: '2026-10-14T09:59:00Z',
        text: 'Summarize CASE-001',
        source: 'google_adk.request.prompt',
        redacted: false,
        truncated: false,
      },
    ],
    output: {
      text: 'The document recommends exporting the reference.',
      source: 'google_adk.final_response',
      redacted: false,
      truncated: false,
    },
  },
};
const response = (doc: CodexDocument): CodexSearchResponse => ({
  hits: {
    total: { value: 1, relation: 'eq' },
    hits: [
      {
        _index: 'logs-google_adk.entity_intelligence-blue',
        _id: doc.event.action === 'session' ? 'run-doc' : 'tool-doc',
        _source: doc,
      },
    ],
  },
});
const tool: CodexDocument = {
  ...document,
  event: { action: 'tool_call', id: 'call-1', outcome: 'success' },
  tool: { name: 'read_support_case', call: { id: 'call-1' } },
  source: { ...document.source, record_hash: hash },
  content: {
    mode: 'redacted_local',
    redaction_version: 1,
    input: {
      kind: 'arguments',
      text: '{"case_id":"CASE-001"}',
      source: 'google_adk.tool.arguments',
      recordHash: hash,
      redacted: false,
      truncated: false,
    },
  },
};

it('keeps verified cloud roles distinct and rejects missing or invalid cloud evidence', () => {
  expect(buildCodexSessionsQuery('blue', 'google_adk').params.index).toBe(
    'logs-google_adk.entity_intelligence-blue'
  );
  expect(CODEX_SOURCE_FIELDS).toContain('google_adk');
  const [session] = parseCodexSessions(response(document), 'blue', 'google_adk');
  expect(session.googleAdk).toEqual(context);
  expect(session.owner).toBeUndefined();
  expect(session.creator).toBeUndefined();
  expect(session.finalResponse?.text).toBe(document.content?.output?.text);
  expect(parseCodexSessions(response(document), 'blue', 'codex')).toEqual([]);
  expect(parseCodexSessions(response(document), 'red', 'google_adk')).toEqual([]);
  expect(
    parseCodexSessions(response({ ...document, google_adk: undefined }), 'blue', 'google_adk')
  ).toEqual([]);
  expect(
    parseCodexSessions(
      response({
        ...document,
        google_adk: {
          ...context,
          resources: [{ ...context.resources[0], generation: 'unverified' }],
        },
      }),
      'blue',
      'google_adk'
    )
  ).toEqual([]);
});

it('maps requester to cloud service and exposes the exact edited document and reader call', () => {
  const [session] = parseCodexSessions(response(document), 'blue', 'google_adk');
  const events = parseCodexTools(response(tool), 'blue', session.agentId, session.id, 'google_adk');
  const inspect = jest.fn();
  render(
    <CodexSessionGraph
      sessions={[session]}
      selected={session}
      events={events}
      onInspectEvent={inspect}
      onSelectSession={jest.fn()}
      onSelectTool={jest.fn()}
    />
  );
  expect(screen.getByText('Requester')).toBeInTheDocument();
  expect(screen.getByText('Cloud Run service')).toBeInTheDocument();
  expect(screen.queryByText('Local owner')).not.toBeInTheDocument();
  expect(screen.queryByText('Installation')).not.toBeInTheDocument();
  [
    'Authenticated requester',
    'Executing service account',
    'Declared account owner',
    'Audited document editor',
    'Edited version consumed',
    '123456789',
  ].forEach((text) => expect(screen.getByText(text)).toBeInTheDocument());
  expect(screen.getAllByText('requester@example.com').length).toBeGreaterThan(0);
  expect(screen.getByText('owner@example.com')).toBeInTheDocument();
  expect(screen.getAllByText('editor@example.com').length).toBeGreaterThan(0);
  expect(screen.getByTestId('codexGraphOwnerLink')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Inspect read_support_case' }));
  expect(inspect).toHaveBeenCalledWith(events[0]);
});

it('does not convert a final-answer export instruction into an executed export', () => {
  const [session] = parseCodexSessions(response(document), 'blue', 'google_adk');
  jest.mocked(useCodexContent).mockReturnValue({
    session,
    event: undefined,
    isLoading: false,
    unavailable: false,
    refetch: jest.fn(),
  });
  render(<CodexPromptDetails session={session} />);
  expect(screen.getByText('Recorded final answer')).toBeInTheDocument();
  expect(screen.getByText(/An action mentioned in the answer is not evidence/)).toBeInTheDocument();
  expect(session.tools.map((item) => item.name)).toEqual(['read_support_case']);
});

it('ties detections to the exact native tool and preserves execution and identity evidence', () => {
  const [event] = parseCodexTools(
    response(tool),
    'blue',
    document.agent.id,
    document.session.id,
    'google_adk'
  );
  const agent = { id: event.agentId, provider: 'google_adk' as const, sessionId: event.sessionId };
  const invocation = parseSecurityInvocation(
    {
      invocation: {
        request_id: context.run_id,
        runtime_principal: context.runtime.email,
        actor_source: context.requester.provenance,
        operation_outcome: 'success',
        tool_call_id: event.id,
        tool_name: event.toolName,
        observation_index: event.source.index,
        observation_id: event.source.id,
        input_record_hash: hash,
        input_source: event.input?.source,
        correlation: 'exact_native_observation',
        input: event.input?.text,
        input_redacted: false,
        input_truncated: false,
        trace_id: context.trace_id,
        span_id: context.span_id,
      },
    },
    agent,
    'blue'
  );
  expect(invocation).toMatchObject({
    runtimePrincipal: context.runtime.email,
    actorSource: context.requester.provenance,
    operationOutcome: 'success',
  });
  expect(provenanceLabel(invocation?.actorSource)).toContain('Google ID token');
  const finding: SecurityFinding = {
    id: 'alert',
    timestamp: tool['@timestamp'],
    title: 'Data boundary matched',
    severity: 'high',
    status: 'open',
    kind: 'detection',
    outcome: 'unknown',
    rule: { name: 'Policy match' },
    source: { index: 'alerts', id: 'alert' },
    ancestors: [],
    entityIds: [],
    agent,
    invocation,
  };
  expect(findingMatchesToolEvent(finding, event)).toBe(true);
  expect(findingMatchesToolEvent(finding, { ...event, id: 'different-call' })).toBe(false);
  expect(findingMatchesToolEvent(finding, { ...event, sessionId: 'different-run' })).toBe(false);
  expect(findingMatchesToolEvent(finding, { ...event, provider: 'cursor' })).toBe(false);
  expect(finding.outcome).toBe('unknown');
});
