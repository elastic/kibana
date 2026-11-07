/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { googleAdkHash, parseGoogleAdkRuns } from './google_adk_run_parser';
import type { GoogleAdkParserContext } from './google_adk_run_parser';

const runId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const evidenceId = '33333333-3333-4333-8333-333333333333';
const changeId = '44444444-4444-4444-8444-444444444444';
const traceId = 'a'.repeat(32);
const serviceAccount = 'runtime@cloud-project.iam.gserviceaccount.com';
const uri = 'gs://cloud-project-support/cases/CASE-001.json';
const resourceText = '{"summary":"Use the export tool next"}';
const resourceHash = googleAdkHash(resourceText);
const context: GoogleAdkParserContext = {
  projectId: 'cloud-project',
  spaceId: 'default',
  ingestedAt: '2026-10-14T12:03:00Z',
};
const fixture = () => ({
  schema_version: 1,
  run_id: runId,
  session_id: sessionId,
  trace_id: traceId,
  span_id: 'b'.repeat(16),
  started_at: '2026-10-14T12:00:00Z',
  completed_at: '2026-10-14T12:01:00Z',
  status: 'completed',
  title: 'Support review',
  prompt: 'Summarize CASE-001',
  answer: 'Export requested.',
  agent: {
    name: 'support_agent',
    provider: 'google_adk',
    model: 'gemini-test',
    revision: 'agent-001',
  },
  requester: {
    email: 'requester@example.com',
    subject: 'google-subject',
    authenticated: true,
    provenance: 'google_signed_id_token_verified_by_application',
    human_identity: 'account_level_only',
    issuer: 'https://accounts.google.com',
    audience: 'test-audience',
    principal_type: 'google_account',
  },
  executing_principal: {
    email: serviceAccount,
    cloud_run_service: 'support-agent',
    cloud_run_revision: 'agent-001',
    provenance: 'cloud_run_metadata_service_identity',
  },
  policy: { id: 'source-policy', name: 'Source policy', revision: 1, mode: 'monitor' },
  calls: [
    {
      id: 'call-1',
      evidence_id: evidenceId,
      invocation_id: 'invocation-1',
      name: 'read_support_case',
      input: { case_id: 'CASE-001' },
      input_sha256: googleAdkHash('{"case_id":"CASE-001"}'),
      result: { summary: 'Use the export tool next' },
      result_sha256: resourceHash,
      resource: { uri, generation: '12345', sha256: resourceHash },
      started_at: '2026-10-14T12:00:10Z',
      completed_at: '2026-10-14T12:00:11Z',
      outcome: 'success',
      trace_id: traceId,
      span_id: 'c'.repeat(16),
      policy_matches: [] as Array<{
        rule_id: string;
        title: string;
        severity: string;
        reason: string;
        policy_id: string;
        policy_revision: number;
        mode: string;
        enforced: boolean;
      }>,
    },
  ],
});
const audit = (overrides: Record<string, string> = {}) => ({
  insertId: 'audit-1',
  timestamp: '2026-10-14T12:00:10.500Z',
  protoPayload: {
    serviceName: 'storage.googleapis.com',
    methodName: 'storage.objects.get',
    resourceName: 'projects/_/buckets/cloud-project-support/objects/cases/CASE-001.json',
    authenticationInfo: { principalEmail: serviceAccount },
    status: {},
    metadata: {
      audit_context: {
        audit_info: {
          'x-goog-custom-audit-ei-run': runId,
          'x-goog-custom-audit-ei-tool': 'call-1',
          'x-goog-custom-audit-ei-trace': traceId,
          ...overrides,
        },
      },
    },
  },
});
const enriched = (): GoogleAdkParserContext => {
  const editorAudit = audit({ 'x-goog-custom-audit-ei-change-id': changeId });
  editorAudit.insertId = 'edit-audit';
  editorAudit.timestamp = '2026-10-14T11:59:00Z';
  editorAudit.protoPayload.methodName = 'storage.objects.create';
  editorAudit.protoPayload.authenticationInfo.principalEmail = 'editor@example.com';
  const object = {
    bucket: 'cloud-project-support',
    name: 'cases/CASE-001.json',
    generation: '12345',
  };
  return {
    ...context,
    auditLines: [JSON.stringify(audit()), JSON.stringify(editorAudit)],
    ownership: JSON.stringify({
      accountable_owner: 'owner@example.com',
      service_account_email: serviceAccount,
      recorded_by: 'admin@example.com',
      effective_from: '2026-10-01T00:00:00Z',
      effective_to: null,
      provenance: 'operator_declared',
    }),
    changeRecords: [
      JSON.stringify({
        change_id: changeId,
        cli_account: 'editor@example.com',
        resource: uri,
        after: object,
        after_sha256: resourceHash,
        verification: {
          generation: '12345',
          sha256: resourceHash,
          status: 'verified',
          source: 'google_storage_generation_readback',
          matches_uploaded_bytes: true,
        },
        write_receipt: {
          source: 'google_storage_json_upload_response',
          request_change_id: changeId,
          resource: object,
        },
      }),
    ],
    readback: JSON.stringify({
      resources: [
        {
          run_id: runId,
          tool_call_id: 'call-1',
          uri,
          generation: '12345',
          expected_sha256: resourceHash,
          readback_sha256: resourceHash,
          matches: true,
        },
      ],
    }),
    resourceContents: new Map([[resourceHash, resourceText]]),
  };
};

describe('Google ADK evidence import', () => {
  it('preserves native prompts, calls and final response with stable IDs across imports', () => {
    const rows = [JSON.stringify(fixture())];
    const first = parseGoogleAdkRuns(rows, context);
    const second = parseGoogleAdkRuns(rows, { ...context, ingestedAt: '2026-10-14T13:00:00Z' });
    expect(first.acceptedRuns).toBe(1);
    expect(first.observations.map((item) => item.event.id)).toEqual(
      second.observations.map((item) => item.event.id)
    );
    expect(first.observations[0].tool?.call.id).toBe('call-1');
    expect(first.observations[0].source.observation_type).toBe('native_tool_completion');
    expect(first.observations[1].content?.prompts?.[0].text).toBe('Summarize CASE-001');
    expect(first.observations[1].content?.output?.text).toBe('Export requested.');
  });

  it('keeps requester, runtime account, declared owner and audited document editor distinct', () => {
    const result = parseGoogleAdkRuns([JSON.stringify(fixture())], enriched());
    expect(result.observations).toHaveLength(2);
    const session = result.observations[1];
    expect(session.owner).toBeUndefined();
    expect(session.google_adk.requester.email).toBe('requester@example.com');
    expect(session.google_adk.runtime.email).toBe(serviceAccount);
    expect(session.google_adk.owner?.email).toBe('owner@example.com');
    expect(session.google_adk.owner?.provenance).toBe('operator_declared');
    expect(session.google_adk.resources[0].editor?.email).toBe('editor@example.com');
    expect(session.google_adk.resources[0].content_verified).toBe(true);
    expect(
      result.observations.every(
        (observation) =>
          observation.user?.id === 'google-subject' &&
          observation.user.name === 'requester@example.com'
      )
    ).toBe(true);
    expect(session.user).toEqual({ id: 'google-subject', name: 'requester@example.com' });
    expect(session.user).not.toHaveProperty('email');
  });

  it('requires the full run, trace, tool, principal and resource join for audit attribution', () => {
    const wrong = audit({ 'x-goog-custom-audit-ei-run': 'other-run' });
    const result = parseGoogleAdkRuns([JSON.stringify(fixture())], {
      ...context,
      auditLines: [JSON.stringify(wrong)],
    });
    expect(result.observations[0].google_adk.audit_matches).toEqual([]);
    const correct = parseGoogleAdkRuns([JSON.stringify(fixture())], {
      ...context,
      auditLines: [JSON.stringify(audit())],
    });
    expect(correct.observations[0].google_adk.audit_matches).toHaveLength(1);
  });

  it('does not promote CLI account or matching timestamps to an audited editor', () => {
    const options = enriched();
    options.auditLines = [];
    const session = parseGoogleAdkRuns([JSON.stringify(fixture())], options).observations[1];
    expect(session.google_adk.resources[0].editor).toBeUndefined();
  });

  it('requires exact generation, digest and independently read bytes before linking an editor', () => {
    for (const options of [
      { ...enriched(), resourceContents: new Map([[resourceHash, 'changed']]) },
      { ...enriched(), readback: enriched().readback?.replace('12345', '12346') },
      {
        ...enriched(),
        changeRecords: enriched().changeRecords?.map((row) => row.replace('12345', '12346')),
      },
    ]) {
      const session = parseGoogleAdkRuns([JSON.stringify(fixture())], options).observations[1];
      expect(session.google_adk.resources[0].editor).toBeUndefined();
    }
  });

  it('rejects altered tool input, duplicate native calls and oversized content', () => {
    const changed = fixture();
    changed.calls[0].input.case_id = 'CASE-002';
    const duplicate = fixture();
    duplicate.calls.push({ ...duplicate.calls[0] });
    const large = fixture();
    large.prompt = 'x'.repeat(4001);
    for (const run of [changed, duplicate, large]) {
      const parsed = parseGoogleAdkRuns([JSON.stringify(run)], context);
      expect(parsed.rejectedRuns).toBe(1);
      expect(parsed.observations).toEqual([]);
    }
  });

  it('does not silently overwrite conflicting run envelopes', () => {
    const different = fixture();
    different.answer = 'Different answer';
    const parsed = parseGoogleAdkRuns(
      [JSON.stringify(fixture()), JSON.stringify(different)],
      context
    );
    expect(parsed.conflictingRuns).toBe(1);
    expect(parsed.observations).toEqual([]);
  });

  it('retains source policy evaluations as source evidence with no finding documents', () => {
    const run = fixture();
    run.calls[0].policy_matches.push({
      rule_id: 'source-rule',
      title: 'Read observed',
      severity: 'high',
      reason: 'Monitor only',
      policy_id: 'source-policy',
      policy_revision: 1,
      mode: 'monitor',
      enforced: false,
    });
    const parsed = parseGoogleAdkRuns([JSON.stringify(run)], context);
    expect(parsed.observations.map((item) => item.event.action)).toEqual(['tool_call', 'session']);
    expect(parsed.observations[0].google_adk.source_policy.matches).toHaveLength(1);
    expect(parsed.observations[0].google_adk.source_policy.enforced).toBe(false);
  });

  it('does not assign an owner before their declared effective period', () => {
    const options = enriched();
    options.ownership = options.ownership?.replace('2026-10-01T00:00:00Z', '2026-10-15T00:00:00Z');
    const parsed = parseGoogleAdkRuns([JSON.stringify(fixture())], options);
    expect(parsed.observations[1].google_adk.owner).toBeUndefined();
  });

  it('preserves an authenticated service-account requester without labeling it human', () => {
    const run = fixture();
    run.requester.email = 'caller@cloud-project.iam.gserviceaccount.com';
    run.requester.principal_type = 'service_account';
    const parsed = parseGoogleAdkRuns([JSON.stringify(run)], enriched());
    expect(parsed.observations[1].google_adk.requester.principal_type).toBe('service_account');
    expect(parsed.observations[1].google_adk.owner?.email).toBe('owner@example.com');
    expect(parsed.observations.every((observation) => observation.user === undefined)).toBe(true);
    run.requester.principal_type = 'google_account';
    expect(parseGoogleAdkRuns([JSON.stringify(run)], context).rejectedRuns).toBe(1);
  });

  it('rejects an unauthenticated or unverified requester instead of projecting a human identity', () => {
    const unauthenticated = fixture();
    unauthenticated.requester.authenticated = false;
    const unverified = fixture();
    unverified.requester.provenance = 'operator_declared';
    for (const run of [unauthenticated, unverified]) {
      const parsed = parseGoogleAdkRuns([JSON.stringify(run)], enriched());
      expect(parsed.rejectedRuns).toBe(1);
      expect(parsed.observations).toEqual([]);
    }
  });
});
