/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { z } from '@kbn/zod';
import { createContentRedactor } from '../../common/entity_intelligence/content_redaction';
import { googleAdkContextSchema } from '../../common/entity_intelligence/google_adk';
import type { GoogleAdkContext } from '../../common/entity_intelligence/google_adk';
import type { CodexObservation, CodexToolSummary } from './codex_session_types';

const id = z.string().min(1).max(256);
const hash = z
  .string()
  .max(64)
  .regex(/^[a-f0-9]{64}$/);
const date = z
  .string()
  .max(40)
  .refine((value) => Number.isFinite(Date.parse(value)));
const email = z.string().max(320).email();
const scalar = z.union([z.string().max(16_384), z.number().finite(), z.boolean(), z.null()]);
const values = z
  .record(z.string().max(128), scalar)
  .refine((value) => Object.keys(value).length <= 64);
const resourceSchema = z.object({
  uri: z
    .string()
    .max(2048)
    .regex(/^gs:\/\/[a-z0-9][a-z0-9._-]+\/.+/),
  generation: z
    .string()
    .max(30)
    .regex(/^[0-9]+$/),
  sha256: hash,
  operation: z.literal('created').optional(),
});
const policyMatchSchema = z.object({
  rule_id: id,
  title: z.string().max(512),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  reason: z.string().max(2048),
  policy_id: id,
  policy_revision: z.number().int().min(1).max(1_000_000),
  mode: z.literal('monitor'),
  enforced: z.literal(false),
});
const callSchema = z.object({
  id,
  evidence_id: z.string().max(36).uuid(),
  invocation_id: id,
  name: z.enum(['read_support_case', 'read_customer_reference', 'export_case_summary']),
  input: values,
  input_sha256: hash,
  result: values,
  result_sha256: hash,
  resource: resourceSchema.optional(),
  started_at: date,
  completed_at: date,
  outcome: z.enum(['success', 'failure']),
  trace_id: z
    .string()
    .max(32)
    .regex(/^[a-f0-9]{32}$/),
  span_id: z
    .string()
    .max(16)
    .regex(/^[a-f0-9]{16}$/),
  policy_matches: z.array(policyMatchSchema).max(4),
});
const runSchema = z.object({
  schema_version: z.literal(1),
  run_id: z.string().max(36).uuid(),
  session_id: z.string().max(36).uuid(),
  trace_id: z
    .string()
    .max(32)
    .regex(/^[a-f0-9]{32}$/),
  span_id: z
    .string()
    .max(16)
    .regex(/^[a-f0-9]{16}$/),
  started_at: date,
  completed_at: date,
  status: z.enum(['completed', 'failed', 'error', 'timeout']),
  title: z.string().max(120),
  prompt: z.string().max(4000),
  answer: z.string().max(32_000),
  agent: z.object({
    name: id,
    provider: z.literal('google_adk'),
    model: id,
    revision: id,
  }),
  requester: googleAdkContextSchema.shape.requester
    .extend({
      principal_type: z.enum(['google_account', 'service_account']),
    })
    .strip(),
  executing_principal: z.object({
    email,
    cloud_run_service: id,
    cloud_run_revision: id,
    provenance: z.literal('cloud_run_metadata_service_identity'),
  }),
  policy: z.object({
    id,
    name: z.string().max(256),
    revision: z.number().int().min(1).max(1_000_000),
    mode: z.literal('monitor'),
  }),
  calls: z.array(callSchema).max(20),
});
const auditSchema = z.object({
  insertId: id,
  timestamp: date,
  protoPayload: z.object({
    serviceName: z.literal('storage.googleapis.com'),
    methodName: z.enum(['storage.objects.get', 'storage.objects.create']),
    resourceName: z.string().max(2300),
    authenticationInfo: z.object({ principalEmail: email }),
    status: z.object({ code: z.number().int().optional() }).optional(),
    metadata: z.object({
      audit_context: z.object({
        audit_info: z.record(z.string().max(100), z.string().max(256)),
      }),
    }),
  }),
});
const objectVersionSchema = z.object({
  bucket: z.string().max(256),
  name: z.string().max(2048),
  generation: z
    .string()
    .max(30)
    .regex(/^[0-9]+$/),
});
const changeSchema = z.object({
  change_id: z.string().max(36).uuid(),
  cli_account: email,
  resource: z.string().max(2048),
  after_sha256: hash,
  after: objectVersionSchema,
  verification: z.object({
    generation: z.string().max(30),
    sha256: hash,
    status: z.literal('verified'),
    source: z.literal('google_storage_generation_readback'),
    matches_uploaded_bytes: z.literal(true),
  }),
  write_receipt: z.object({
    source: z.literal('google_storage_json_upload_response'),
    request_change_id: z.string().max(36).uuid(),
    resource: objectVersionSchema,
  }),
});
const ownershipSchema = z.object({
  accountable_owner: email,
  service_account_email: email,
  recorded_by: email,
  effective_from: date,
  effective_to: date.nullable(),
  provenance: z.literal('operator_declared'),
});
const readbackSchema = z.object({
  resources: z
    .array(
      z.object({
        run_id: id,
        tool_call_id: id,
        uri: z.string().max(2048),
        generation: z.string().max(30),
        expected_sha256: hash,
        readback_sha256: hash,
        matches: z.boolean(),
      })
    )
    .max(2000),
});

export type GoogleAdkObservation = Omit<
  CodexObservation,
  'agent' | 'event' | 'session' | 'source'
> & {
  agent: { id: string; name: string; type: 'google_adk'; version: string };
  user?: { id: string; name: string };
  event: Omit<CodexObservation['event'], 'dataset'> & {
    dataset: 'google_adk.session';
    completed_at: string;
  };
  session: Omit<CodexObservation['session'], 'completed' | 'completion_known'> & {
    completed?: boolean;
    completion_known?: boolean;
    kind: 'agent_run';
    is_chat_session: true;
  };
  source: Omit<CodexObservation['source'], 'kind'> & {
    kind: 'google_adk_cloud_run';
    native_event_id?: string;
    input_sha256?: string;
    result_sha256?: string;
  };
  google_adk: GoogleAdkContext;
};
export interface GoogleAdkParserContext {
  projectId: string;
  spaceId: string;
  ingestedAt: string;
  auditLines?: readonly string[];
  changeRecords?: readonly string[];
  ownership?: string;
  readback?: string;
  resourceContents?: ReadonlyMap<string, string>;
}
export interface GoogleAdkParseResult {
  observations: GoogleAdkObservation[];
  acceptedRuns: number;
  rejectedRuns: number;
  duplicateRuns: number;
  conflictingRuns: number;
}

export const googleAdkHash = (value: string): string =>
  createHash('sha256').update(value).digest('hex');
export const googleAdkAgentId = (project: string, service: string): string =>
  `google-adk-${googleAdkHash(`${project}:${service}`).slice(0, 32)}`;
const canonicalValues = (value: z.infer<typeof values>): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, value[key]])
    )
  );
const auditResource = (uri: string): string =>
  uri.replace(/^gs:\/\/([^/]+)\//, 'projects/_/buckets/$1/objects/');
const parseJson = (text: string): object | undefined => {
  if (text.length > 1024 * 1024) return;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** Joins native runs to exact cloud audit correlation IDs without equating ownership, requesting and document editing. */
export const parseGoogleAdkRuns = (
  records: readonly string[],
  context: GoogleAdkParserContext
): GoogleAdkParseResult => {
  const result: GoogleAdkParseResult = {
    observations: [],
    acceptedRuns: 0,
    rejectedRuns: 0,
    duplicateRuns: 0,
    conflictingRuns: 0,
  };
  const audits = (context.auditLines ?? []).slice(0, 5000).flatMap((line) => {
    const parsed = auditSchema.safeParse(parseJson(line));
    return parsed.success && !parsed.data.protoPayload.status?.code ? [parsed.data] : [];
  });
  const changes = (context.changeRecords ?? []).slice(0, 500).flatMap((text) => {
    const parsed = changeSchema.safeParse(parseJson(text));
    return parsed.success ? [parsed.data] : [];
  });
  const owner = ownershipSchema.safeParse(parseJson(context.ownership ?? ''));
  const readback = readbackSchema.safeParse(parseJson(context.readback ?? ''));
  const grouped = new Map<string, { run: z.infer<typeof runSchema>; text: string }>();
  const conflicts = new Set<string>();
  records.forEach((text) => {
    const parsed = runSchema.safeParse(parseJson(text));
    if (!parsed.success) {
      result.rejectedRuns++;
      return;
    }
    const run = parsed.data;
    const uniqueCalls = new Set(run.calls.map((call) => call.id));
    if (
      !/^[a-z][a-z0-9-]{4,62}$/.test(context.projectId) ||
      !run.executing_principal.email.endsWith(`@${context.projectId}.iam.gserviceaccount.com`) ||
      run.requester.email.endsWith('.gserviceaccount.com') !==
        (run.requester.principal_type === 'service_account') ||
      run.agent.revision !== run.executing_principal.cloud_run_revision ||
      Date.parse(run.completed_at) < Date.parse(run.started_at) ||
      uniqueCalls.size !== run.calls.length ||
      run.calls.some(
        (call) =>
          call.trace_id !== run.trace_id ||
          googleAdkHash(canonicalValues(call.input)) !== call.input_sha256 ||
          googleAdkHash(canonicalValues(call.result)) !== call.result_sha256 ||
          Date.parse(call.started_at) < Date.parse(run.started_at) ||
          Date.parse(call.completed_at) < Date.parse(call.started_at) ||
          Date.parse(call.completed_at) > Date.parse(run.completed_at) ||
          call.policy_matches.some(
            (match) =>
              match.policy_id !== run.policy.id || match.policy_revision !== run.policy.revision
          )
      )
    ) {
      result.rejectedRuns++;
      return;
    }
    const previous = grouped.get(run.run_id);
    if (previous) {
      if (JSON.stringify(previous.run) === JSON.stringify(run)) result.duplicateRuns++;
      else {
        conflicts.add(run.run_id);
        result.conflictingRuns++;
      }
    } else grouped.set(run.run_id, { run, text });
  });
  const accepted = [...grouped.values()].filter(({ run }) => !conflicts.has(run.run_id));
  for (const { run, text } of accepted) {
    const redactor = createContentRedactor();
    redactor.observe(text);
    const resources: GoogleAdkContext['resources'] = run.calls.flatMap((call) => {
      if (!call.resource) return [];
      const resource = call.resource;
      const contentVerified = Boolean(
        readback.success &&
          readback.data.resources.some(
            (item) =>
              item.run_id === run.run_id &&
              item.tool_call_id === call.id &&
              item.uri === resource.uri &&
              item.generation === resource.generation &&
              item.matches &&
              item.expected_sha256 === resource.sha256 &&
              item.readback_sha256 === resource.sha256 &&
              context.resourceContents?.has(resource.sha256) &&
              googleAdkHash(context.resourceContents.get(resource.sha256) ?? '') === resource.sha256
          )
      );
      let editor: GoogleAdkContext['resources'][number]['editor'];
      if (contentVerified) {
        const matchingChanges = changes.filter(
          (change) =>
            change.resource === resource.uri &&
            change.after.generation === resource.generation &&
            `gs://${change.after.bucket}/${change.after.name}` === resource.uri &&
            change.after_sha256 === resource.sha256 &&
            change.verification.generation === resource.generation &&
            change.verification.sha256 === resource.sha256 &&
            change.write_receipt.request_change_id === change.change_id &&
            change.write_receipt.resource.generation === resource.generation &&
            `gs://${change.write_receipt.resource.bucket}/${change.write_receipt.resource.name}` ===
              resource.uri
        );
        const editors = matchingChanges.flatMap((change) =>
          audits
            .filter(
              (audit) =>
                audit.protoPayload.methodName === 'storage.objects.create' &&
                audit.protoPayload.resourceName === auditResource(resource.uri) &&
                audit.protoPayload.authenticationInfo.principalEmail === change.cli_account &&
                audit.protoPayload.metadata.audit_context.audit_info[
                  'x-goog-custom-audit-ei-change-id'
                ] === change.change_id &&
                Date.parse(audit.timestamp) <= Date.parse(call.started_at)
            )
            .map((audit) => ({
              email: audit.protoPayload.authenticationInfo.principalEmail,
              audit_id: audit.insertId,
              timestamp: audit.timestamp,
              change_id: change.change_id,
              provenance: 'cloud_audit_write_receipt_generation_hash' as const,
            }))
        );
        if (editors.length === 1) editor = editors[0];
      }
      return [
        {
          uri: resource.uri,
          generation: resource.generation,
          sha256: resource.sha256,
          tool_call_id: call.id,
          content_verified: contentVerified,
          editor,
        },
      ];
    });
    const auditMatches: GoogleAdkContext['audit_matches'] = run.calls
      .flatMap((call) =>
        audits
          .filter((audit) => {
            const payload = audit.protoPayload;
            const correlation = payload.metadata.audit_context.audit_info;
            return (
              call.resource &&
              payload.resourceName === auditResource(call.resource.uri) &&
              payload.authenticationInfo.principalEmail === run.executing_principal.email &&
              payload.methodName ===
                (call.resource.operation === 'created'
                  ? 'storage.objects.create'
                  : 'storage.objects.get') &&
              correlation['x-goog-custom-audit-ei-run'] === run.run_id &&
              correlation['x-goog-custom-audit-ei-tool'] === call.id &&
              correlation['x-goog-custom-audit-ei-trace'] === run.trace_id
            );
          })
          .map((audit) => ({
            tool_call_id: call.id,
            audit_id: audit.insertId,
            principal: audit.protoPayload.authenticationInfo.principalEmail,
            method: audit.protoPayload.methodName,
            timestamp: audit.timestamp,
          }))
      )
      .slice(0, 80);
    const ownership =
      owner.success &&
      owner.data.service_account_email === run.executing_principal.email &&
      Date.parse(owner.data.effective_from) <= Date.parse(run.started_at) &&
      (!owner.data.effective_to || Date.parse(owner.data.effective_to) > Date.parse(run.started_at))
        ? {
            email: owner.data.accountable_owner,
            recorded_by: owner.data.recorded_by,
            effective_from: owner.data.effective_from,
            effective_to: owner.data.effective_to ?? undefined,
            provenance: owner.data.provenance,
          }
        : undefined;
    const cloud = googleAdkContextSchema.parse({
      project_id: context.projectId,
      service_name: run.executing_principal.cloud_run_service,
      revision: run.agent.revision,
      run_id: run.run_id,
      trace_id: run.trace_id,
      span_id: run.span_id,
      requester: run.requester,
      runtime: {
        email: run.executing_principal.email,
        provenance: run.executing_principal.provenance,
      },
      owner: ownership,
      resources,
      audit_matches: auditMatches,
      source_policy: {
        ...run.policy,
        enforced: false,
        matches: run.calls.flatMap((call) =>
          call.policy_matches.map((match) => ({
            tool_call_id: call.id,
            rule_id: match.rule_id,
            title: redactor.redact(match.title, 512).text,
            severity: match.severity,
            reason: redactor.redact(match.reason, 2048).text,
          }))
        ),
      },
    });
    const base = {
      ...(cloud.requester.principal_type === 'google_account'
        ? { user: { id: cloud.requester.subject, name: cloud.requester.email } }
        : {}),
      agent: {
        id: googleAdkAgentId(context.projectId, cloud.service_name),
        name: 'Google ADK',
        type: 'google_adk' as const,
        version: run.agent.revision,
      },
      session: {
        id: run.session_id,
        runtime_id: run.run_id,
        kind: 'agent_run' as const,
        is_chat_session: true as const,
      },
      model: run.agent.model,
      kibana: { space_id: context.spaceId },
    };
    const source = {
      kind: 'google_adk_cloud_run' as const,
      schema_version: 1 as const,
      file_hash: googleAdkHash(text),
    };
    const tools = new Map<string, CodexToolSummary>();
    for (const call of run.calls) {
      const summary = tools.get(call.name) ?? {
        name: call.name,
        count: 0,
        success_count: 0,
        failure_count: 0,
        unknown_count: 0,
      };
      summary.count++;
      summary[`${call.outcome}_count`]++;
      tools.set(call.name, summary);
      result.observations.push({
        ...base,
        '@timestamp': call.started_at,
        event: {
          id: googleAdkHash(`${base.agent.id}:${run.session_id}:${call.evidence_id}`),
          dataset: 'google_adk.session',
          action: 'tool_call',
          outcome: call.outcome,
          ingested: context.ingestedAt,
          completed_at: call.completed_at,
        },
        tool: { name: call.name, call: { id: call.id }, type: 'google_adk_function_tool' },
        duration_ms: Date.parse(call.completed_at) - Date.parse(call.started_at),
        content: {
          mode: 'redacted_local',
          redaction_version: 1,
          input: {
            ...redactor.redact(JSON.stringify(call.input)),
            source: 'google_adk.function_call.arguments',
            kind: 'arguments',
            recordHash: call.input_sha256,
          },
          output: {
            ...redactor.redact(JSON.stringify(call.result)),
            source: 'google_adk.function_call.result',
            recordHash: call.result_sha256,
          },
        },
        google_adk: {
          ...cloud,
          span_id: call.span_id,
          invocation_id: call.invocation_id,
          resources: cloud.resources.filter((item) => item.tool_call_id === call.id),
          audit_matches: cloud.audit_matches.filter((item) => item.tool_call_id === call.id),
          source_policy: {
            ...cloud.source_policy,
            matches: cloud.source_policy.matches.filter((item) => item.tool_call_id === call.id),
          },
        },
        source: {
          ...source,
          record_hash: googleAdkHash(JSON.stringify(call)),
          native_event_id: call.evidence_id,
          input_sha256: call.input_sha256,
          result_sha256: call.result_sha256,
          id_kind: 'call',
          observation_type: 'native_tool_completion',
        },
      });
    }
    const summaries = [...tools.values()];
    result.observations.push({
      ...base,
      '@timestamp': run.completed_at,
      event: {
        id: googleAdkHash(`${base.agent.id}:${run.session_id}:session`),
        dataset: 'google_adk.session',
        action: 'session',
        outcome: run.status === 'completed' ? 'success' : 'failure',
        ingested: context.ingestedAt,
        completed_at: run.completed_at,
      },
      session: {
        ...base.session,
        start: run.started_at,
        last_seen: run.completed_at,
        completed: run.status === 'completed',
        completion_known: true,
        summary_complete: true,
        tool_call_count: run.calls.length,
        model_tool_call_count: run.calls.length,
        native_tool_completion_count: run.calls.length,
        success_count: summaries.reduce((sum, tool) => sum + tool.success_count, 0),
        failure_count: summaries.reduce((sum, tool) => sum + tool.failure_count, 0),
        unknown_count: 0,
        tools: summaries,
        models: [run.agent.model],
      },
      content: {
        mode: 'redacted_local',
        redaction_version: 1,
        title: { ...redactor.redact(run.title, 120), source: 'google_adk.run.title' },
        prompts: [
          {
            ...redactor.redact(run.prompt, 4000),
            source: 'google_adk.run.prompt',
            id: googleAdkHash(`${run.run_id}:prompt`),
            timestamp: run.started_at,
          },
        ],
        prompts_total: 1,
        prompts_truncated: false,
        output: { ...redactor.redact(run.answer, 32_000), source: 'google_adk.run.answer' },
      },
      google_adk: cloud,
      source,
    });
    result.acceptedRuns++;
  }
  return result;
};
