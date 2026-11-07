/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { AiPolicy, AiPolicyProvider } from '../../common/entity_intelligence/ai_policies';
import { createContentRedactor } from '../../common/entity_intelligence/content_redaction';
import { googleAdkContextSchema } from '../../common/entity_intelligence/google_adk';
import type { GoogleAdkContext } from '../../common/entity_intelligence/google_adk';
import type {
  SecurityActivityEvent,
  SecurityInvocationContext,
  SecurityPolicyDefinition,
} from '../../common/entity_intelligence/security_events';

export interface NativePolicyDocument {
  '@timestamp'?: string;
  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  status?: { code?: string | number };
  attributes?: Record<string, string | number | boolean>;
  agent?: { id?: string; name?: string; type?: string };
  event?: { action?: string; outcome?: string };
  session?: { id?: string };
  tool?: { name?: string; call?: { id?: string } };
  turn?: { id?: string };
  process?: { exit_code?: number };
  owner?: { id?: string; name?: string; provenance?: string };
  content?: {
    input?: {
      text?: string;
      source?: string;
      redacted?: boolean;
      truncated?: boolean;
    };
  };
  source?: { record_hash?: string; kind?: string; observation_type?: string };
  google_adk?: GoogleAdkContext;
  kibana?: { space_id?: string };
}

export interface NativePolicyHit {
  _index: string;
  _id: string;
  _source?: NativePolicyDocument;
}

export interface NativePolicyAgent {
  id: string;
  name: string;
}

export interface AiPolicyObservation {
  provider: AiPolicyProvider;
  timestamp: string;
  agent: { id: string; name: string };
  sessionId: string;
  actor?: { id: string; name: string };
  actorProvenance: SecurityActivityEvent['entity_intelligence']['actor_provenance'];
  actorEvidence?: {
    id?: string;
    hash?: string;
    source?: string;
    status?: string;
    callerType?: string;
    hasApiKey: boolean;
    roundId?: string;
  };
  toolName: string;
  toolCallId: string;
  turnId?: string;
  traceId?: string;
  spanId?: string;
  invocationSpanId?: string;
  requestId?: string;
  runtimePrincipal?: string;
  actorSource?: SecurityInvocationContext['actor_source'];
  resourceUri?: string;
  conversationId?: string;
  source: { index: string; id: string };
  input?: string;
  inputSource: string;
  inputHash: string;
  inputRedacted: boolean;
  inputTruncated: boolean;
  outcome: 'success' | 'failure' | 'unknown';
  processExitCode?: number;
}

export type NativeAiPolicyEvent = Omit<SecurityActivityEvent, 'user' | 'host'> & {
  user?: { id?: string; name?: string; hash?: string };
  host?: SecurityActivityEvent['host'];
};

const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
const text = (value?: string | number | boolean): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;
const timestamp = (value?: string): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
const outcome = (value?: string | number): AiPolicyObservation['outcome'] => {
  if (['success', 'Ok', 'OK', 1, '1'].includes(value ?? '')) return 'success';
  if (['failure', 'Error', 'ERROR', 2, '2'].includes(value ?? '')) return 'failure';
  return 'unknown';
};
const capturedInput = (
  raw: string | undefined,
  source: string,
  redacted = false,
  truncated = false
): Pick<
  AiPolicyObservation,
  'input' | 'inputSource' | 'inputHash' | 'inputRedacted' | 'inputTruncated'
> => {
  const safe = raw === undefined ? undefined : createContentRedactor().redact(raw, 8000);
  return {
    input: safe?.text,
    inputSource: source,
    inputHash: digest(raw ?? ''),
    inputRedacted: redacted || safe?.redacted === true,
    inputTruncated: truncated || safe?.truncated === true,
  };
};

/** Reads native local-agent evidence without treating local ownership as an authenticated caller. */
export const parseLocalPolicyObservation = (
  hit: NativePolicyHit,
  provider: 'cursor' | 'codex' | 'claude_desktop',
  spaceId: string
): AiPolicyObservation | undefined => {
  const doc = hit._source;
  if (
    hit._index !== `logs-${provider}.entity_intelligence-${spaceId}` ||
    doc?.kibana?.space_id !== spaceId ||
    doc.event?.action !== 'tool_call' ||
    doc.agent?.type !== provider ||
    !doc.agent.id ||
    !doc.session?.id ||
    !doc.tool?.name ||
    !doc.tool.call?.id ||
    !timestamp(doc['@timestamp'])
  )
    return undefined;
  const owner = doc.owner;
  const actor =
    owner?.id && owner.name && owner.provenance === 'local_os_account'
      ? { id: owner.id, name: owner.name }
      : undefined;
  const captured = doc.content?.input;
  return {
    provider,
    timestamp: doc['@timestamp'],
    agent: { id: doc.agent.id, name: doc.agent.name ?? provider },
    sessionId: doc.session.id,
    actor,
    actorProvenance: actor ? 'local_os_account' : 'unknown',
    toolName: doc.tool.name,
    toolCallId: doc.tool.call.id,
    turnId: doc.turn?.id,
    source: { index: hit._index, id: hit._id },
    ...capturedInput(
      typeof captured?.text === 'string' ? captured.text : undefined,
      captured?.source ?? 'content.input.text unavailable',
      captured?.redacted,
      captured?.truncated
    ),
    ...(doc.source?.record_hash ? { inputHash: doc.source.record_hash } : {}),
    outcome: outcome(doc.event.outcome),
    processExitCode: doc.process?.exit_code,
  };
};

/** Reads completed ADK tools and keeps the authenticated requester distinct from service-account ownership. */
export const parseGoogleAdkPolicyObservation = (
  hit: NativePolicyHit,
  spaceId: string
): AiPolicyObservation | undefined => {
  const doc = hit._source;
  if (
    hit._index !== `logs-google_adk.entity_intelligence-${spaceId}` ||
    !hit._id ||
    doc?.kibana?.space_id !== spaceId ||
    doc.source?.kind !== 'google_adk_cloud_run' ||
    doc.source.observation_type !== 'native_tool_completion' ||
    doc.event?.action !== 'tool_call' ||
    doc.agent?.type !== 'google_adk' ||
    !doc.agent.id ||
    !doc.session?.id ||
    !doc.tool?.name ||
    !doc.tool.call?.id ||
    !timestamp(doc['@timestamp'])
  )
    return undefined;
  const parsed = googleAdkContextSchema.safeParse(doc.google_adk);
  if (!parsed.success) return undefined;
  const context = parsed.data;
  const captured = doc.content?.input;
  const resources = context.resources.filter(
    (resource) => resource.tool_call_id === doc.tool?.call?.id
  );
  return {
    provider: 'google_adk',
    timestamp: doc['@timestamp'],
    agent: { id: doc.agent.id, name: doc.agent.name ?? 'Google ADK' },
    sessionId: doc.session.id,
    actor: { id: context.requester.subject, name: context.requester.email },
    actorProvenance:
      context.requester.principal_type === 'google_account' &&
      !context.requester.email.endsWith('.gserviceaccount.com')
        ? 'authenticated_user'
        : 'source_identity',
    actorSource: context.requester.provenance,
    requestId: context.run_id,
    runtimePrincipal: context.runtime.email,
    toolName: doc.tool.name,
    toolCallId: doc.tool.call.id,
    turnId: doc.turn?.id,
    traceId: context.trace_id,
    spanId: context.span_id,
    resourceUri: resources.length === 1 ? resources[0].uri : undefined,
    source: { index: hit._index, id: hit._id },
    ...capturedInput(
      captured?.text,
      captured?.source ?? 'content.input.text unavailable',
      captured?.redacted,
      captured?.truncated
    ),
    ...(doc.source.record_hash ? { inputHash: doc.source.record_hash } : {}),
    outcome: outcome(doc.event.outcome),
  };
};

const spanKey = (doc: NativePolicyDocument): string => `${doc.trace_id}:${doc.span_id}`;
const isAgentSpan = (doc: NativePolicyDocument): boolean =>
  doc.attributes?.['gen_ai.operation.name'] === 'invoke_agent' &&
  doc.attributes?.['elastic.inference.span.kind'] === 'AGENT';

const getActor = (
  documents: NativePolicyDocument[]
): Pick<AiPolicyObservation, 'actor' | 'actorProvenance' | 'actorEvidence'> => {
  for (const doc of documents) {
    const attrs = doc.attributes ?? {};
    const name = text(attrs['elastic.agent_builder.initiating_actor.name']);
    const id = text(attrs['elastic.agent_builder.initiating_actor.id']);
    const hash = text(attrs['elastic.agent_builder.initiating_actor.hash']);
    const actorEvidence = {
      id,
      hash,
      source: text(attrs['elastic.agent_builder.initiating_actor.source']),
      status: text(attrs['elastic.agent_builder.attribution.status']),
      callerType: text(attrs['elastic.agent_builder.caller.principal.type']),
      hasApiKey:
        attrs['elastic.agent_builder.caller.api_key.id'] !== undefined ||
        attrs['elastic.agent_builder.caller.api_key.hash'] !== undefined,
    };
    if (name && attrs['elastic.agent_builder.attribution.source'] === 'kibana_authc')
      return {
        actor: { id: id ?? name, name },
        actorProvenance: 'authenticated_user',
        actorEvidence,
      };
    if ((id || hash) && attrs['elastic.agent_builder.attribution.source'] === 'kibana_authc')
      return { actorProvenance: 'source_identity', actorEvidence };
  }
  for (const doc of documents) {
    const attrs = doc.attributes ?? {};
    const id = text(attrs['user.id']) ?? text(attrs['user.hash']);
    const name = text(attrs['user.name']);
    if (id || name)
      return {
        actor: { id: id ?? name ?? '', name: name ?? id ?? '' },
        actorProvenance: 'source_identity',
      };
  }
  return { actorProvenance: 'unknown' };
};

/** Binds each tool only to its nearest real agent ancestor, never to a sibling or another trace. */
export const parseAgentBuilderPolicyObservations = (
  toolHits: readonly NativePolicyHit[],
  traceHits: readonly NativePolicyHit[],
  agents: readonly NativePolicyAgent[]
): { observations: AiPolicyObservation[]; unattributed: number } => {
  const spans = new Map<string, NativePolicyDocument>();
  const ambiguous = new Set<string>();
  [...traceHits, ...toolHits].forEach((hit) => {
    const doc = hit._source;
    if (!doc?.trace_id || !doc.span_id) return;
    const key = spanKey(doc);
    const existing = spans.get(key);
    if (
      existing &&
      (existing.parent_span_id !== doc.parent_span_id ||
        existing.attributes?.['gen_ai.agent.id'] !== doc.attributes?.['gen_ai.agent.id'])
    )
      ambiguous.add(key);
    spans.set(key, doc);
  });
  const agentAliases = new Map<string, NativePolicyAgent>();
  for (const agent of agents) {
    agentAliases.set(agent.id, agent);
    agentAliases.set(`custom-${digest(agent.id).slice(0, 16)}`, agent);
  }
  const observations: AiPolicyObservation[] = [];
  let unattributed = 0;
  toolHits.forEach((hit) => {
    const doc = hit._source;
    if (
      !doc?.trace_id ||
      !doc.span_id ||
      !timestamp(doc['@timestamp']) ||
      doc.attributes?.['gen_ai.operation.name'] !== 'execute_tool'
    )
      return;
    const ancestors: NativePolicyDocument[] = [];
    const visited = new Set([spanKey(doc)]);
    let parentId = doc.parent_span_id;
    while (parentId) {
      const key = `${doc.trace_id}:${parentId}`;
      if (visited.has(key) || ambiguous.has(key)) break;
      visited.add(key);
      const parent = spans.get(key);
      if (!parent) break;
      ancestors.push(parent);
      parentId = parent.parent_span_id;
    }
    const invocation = ancestors.find(isAgentSpan);
    const agentId = text(invocation?.attributes?.['gen_ai.agent.id']);
    const toolName = text(doc.attributes['gen_ai.tool.name']);
    if (!invocation?.span_id || !agentId || !toolName || toolName === 'custom') {
      unattributed++;
      return;
    }
    const agent = agentAliases.get(agentId) ?? { id: agentId, name: agentId };
    const input = text(doc.attributes['gen_ai.tool.call.arguments']);
    observations.push({
      provider: 'agent_builder',
      timestamp: doc['@timestamp'],
      agent,
      sessionId: `${doc.trace_id}:${invocation.span_id}`,
      ...getActor([doc, ...ancestors]),
      toolName,
      toolCallId: text(doc.attributes['gen_ai.tool.call.id']) ?? doc.span_id,
      traceId: doc.trace_id,
      spanId: doc.span_id,
      invocationSpanId: invocation.span_id,
      conversationId: [doc, ...ancestors]
        .map((span) => text(span.attributes?.['gen_ai.conversation.id']))
        .find(Boolean),
      source: { index: hit._index, id: hit._id },
      ...capturedInput(input, 'attributes.gen_ai.tool.call.arguments'),
      outcome: outcome(doc.status?.code),
    });
  });
  return { observations, unattributed };
};

/** Evaluates literal monitor conditions against visible input and records immutable native evidence. */
export const evaluateAiPolicy = (
  policy: AiPolicy,
  observation: AiPolicyObservation,
  spaceId: string
): NativeAiPolicyEvent | undefined => {
  if (
    !policy.enabled ||
    policy.mode !== 'monitor' ||
    !policy.providers.includes(observation.provider) ||
    !timestamp(policy.effectiveFrom) ||
    Date.parse(observation.timestamp) < Date.parse(policy.effectiveFrom) ||
    (policy.toolNames.length === 0 && policy.inputContains.length === 0) ||
    (policy.toolNames.length > 0 && !policy.toolNames.includes(observation.toolName)) ||
    (policy.inputContains.length > 0 &&
      !observation.input
        ?.toLocaleLowerCase('en-US')
        .includes(policy.inputContains.toLocaleLowerCase('en-US')))
  )
    return undefined;
  const condition = [
    policy.toolNames.length > 0
      ? `Tool name equals one of ${JSON.stringify(policy.toolNames)}`
      : '',
    policy.inputContains
      ? `Recorded input contains ${JSON.stringify(policy.inputContains)} (case-insensitive literal)`
      : '',
  ]
    .filter(Boolean)
    .join(' AND ');
  const clause = {
    id: 'native-tool-match',
    name: 'Recorded tool call condition',
    condition,
    expected: 'deny' as const,
  };
  const definition: SecurityPolicyDefinition = {
    policy_id: policy.id,
    policy_version: policy.version,
    description: policy.description || policy.name,
    scope: `Detection only; providers: ${policy.providers.join(', ')}; severity: ${
      policy.severity
    }; activity: ${policy.activityType}; effective from ${policy.effectiveFrom}.`,
    clauses: [clause],
  };
  const id = digest(
    JSON.stringify([
      spaceId,
      policy.id,
      policy.version,
      observation.source.index,
      observation.source.id,
    ])
  );
  return {
    '@timestamp': observation.timestamp,
    event: {
      id,
      kind: 'event',
      dataset: 'entity_intelligence.security',
      action: 'ai_policy_match',
      category: [
        policy.activityType === 'protected_file_access'
          ? 'file'
          : policy.activityType === 'unapproved_export'
          ? 'network'
          : 'iam',
      ],
      type: ['access'],
      outcome: observation.outcome,
    },
    ...(observation.actor || observation.actorEvidence?.hash
      ? {
          user: {
            ...observation.actor,
            ...(observation.actorEvidence?.hash ? { hash: observation.actorEvidence.hash } : {}),
          },
        }
      : {}),
    agent: { ...observation.agent, type: observation.provider },
    session: { id: observation.sessionId },
    ...(observation.traceId ? { trace: { id: observation.traceId } } : {}),
    kibana: { space_id: spaceId },
    entity_intelligence: {
      schema_version: 1,
      actor_provenance: observation.actorProvenance,
      agent: {
        ...observation.agent,
        provider: observation.provider,
        session_id: observation.sessionId,
      },
      activity: {
        type: policy.activityType,
        target: observation.resourceUri || policy.inputContains || observation.toolName,
      },
      control: {
        id: policy.id,
        name: policy.name,
        version: String(policy.version),
        engine: 'entity_intelligence.ai_policy_monitor',
        mode: 'monitor',
        decision: 'deny',
        outcome: 'unknown',
        severity: policy.severity,
        reason: `Recorded tool call matched policy ${policy.name} revision ${
          policy.version
        }. This monitor did not block the call; input matching does not establish successful access or export.${
          observation.inputRedacted || observation.inputTruncated
            ? ' Only the visible redacted/bounded input was evaluated.'
            : ''
        }`,
        clause,
        policy_sha256: digest(JSON.stringify(definition)),
        definition,
      },
      invocation: {
        request_id: observation.requestId,
        runtime_principal: observation.runtimePrincipal,
        operation_outcome: observation.outcome,
        tool_call_id: observation.toolCallId,
        tool_name: observation.toolName,
        turn_id: observation.turnId,
        trace_id: observation.traceId,
        span_id: observation.spanId,
        invocation_span_id: observation.invocationSpanId,
        conversation_id: observation.conversationId,
        actor_hash: observation.actorEvidence?.hash,
        actor_round_id: observation.actorEvidence?.roundId,
        actor_source:
          observation.actorSource ??
          (observation.actorEvidence
            ? observation.actorEvidence.roundId
              ? 'conversation_round_author'
              : 'native_trace'
            : undefined),
        observation_index: observation.source.index,
        observation_id: observation.source.id,
        correlation: 'exact_native_observation',
        input: observation.input ?? '',
        input_source: observation.inputSource,
        input_record_hash: observation.inputHash,
        input_redacted: observation.inputRedacted,
        input_truncated: observation.inputTruncated,
        process_exit_code: observation.processExitCode,
      },
    },
  };
};

export interface AiPolicyConversationAuthorEvidence {
  id: string;
  agent_id: string;
  rounds: Array<{
    id: string;
    trace_id?: string | string[];
    origin?: { type: string };
    author?: { id: string; username?: string; full_name?: string };
  }>;
}

/** Resolves a pseudonymous initiating user only against the author of the exact accessible conversation round. */
export const resolveAiPolicyConversationActor = (
  observation: AiPolicyObservation,
  conversation: AiPolicyConversationAuthorEvidence
): AiPolicyObservation => {
  const evidence = observation.actorEvidence;
  if (
    observation.provider !== 'agent_builder' ||
    observation.actor ||
    !observation.traceId ||
    !observation.conversationId ||
    observation.conversationId !== conversation.id ||
    observation.agent.id !== conversation.agent_id ||
    evidence?.source !== 'kibana_authc' ||
    evidence.status !== 'partial' ||
    evidence.callerType !== 'user' ||
    evidence.hasApiKey ||
    (!evidence.id && !evidence.hash)
  )
    return observation;
  const rounds = conversation.rounds.filter((round) =>
    (Array.isArray(round.trace_id) ? round.trace_id : [round.trace_id]).includes(
      observation.traceId
    )
  );
  if (rounds.length !== 1) return observation;
  const [round] = rounds;
  const author = round.author;
  if (
    round.origin !== undefined ||
    !round.id.trim() ||
    !author?.id.trim() ||
    (evidence.id && evidence.id !== author.id) ||
    (evidence.hash && evidence.hash !== digest(author.id).slice(0, 16))
  )
    return observation;
  const name = author.full_name?.trim() || author.username?.trim();
  if (!name) return observation;
  return {
    ...observation,
    actor: { id: author.id, name },
    actorProvenance: 'authenticated_user',
    actorEvidence: { ...evidence, roundId: round.id },
  };
};
