/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseArgs } from 'util';
import { Client } from '@elastic/elasticsearch';
import { z } from '@kbn/zod/v4';
import {
  AI_POLICIES_URL,
  AI_POLICY_STATUS_URL,
  MAX_AI_POLICIES,
  aiPolicyInputSchema,
} from '../../common/entity_intelligence/ai_policies';
import type {
  AiPolicy,
  AiPolicyDetectorSource,
  AiPolicyProvider,
} from '../../common/entity_intelligence/ai_policies';
import { securityEventsIndex } from '../../common/entity_intelligence/security_events';
import { validateCodexTarget } from './codex_index';
import { SECURITY_STORY_MAPPING, buildAiPolicyDetectionRules } from './security_detection_rules';
import {
  evaluateAiPolicy,
  parseAgentBuilderPolicyObservations,
  parseGoogleAdkPolicyObservation,
  parseLocalPolicyObservation,
  resolveAiPolicyConversationActor,
} from './ai_policy_evaluator';
import type {
  AiPolicyObservation,
  AiPolicyConversationAuthorEvidence,
  NativeAiPolicyEvent,
  NativePolicyAgent,
  NativePolicyDocument,
  NativePolicyHit,
} from './ai_policy_evaluator';

const MAX_OBSERVATIONS = 5000;
const providers: readonly AiPolicyProvider[] = [
  'cursor',
  'agent_builder',
  'codex',
  'claude_desktop',
  'google_adk',
];
const policySchema = z.strictObject({
  ...aiPolicyInputSchema.shape,
  id: z.string().uuid().max(36),
  version: z.number().int().min(1),
  createdAt: z.string().datetime().max(40),
  updatedAt: z.string().datetime().max(40),
  effectiveFrom: z.string().datetime().max(40),
  createdBy: z.string().max(256),
  updatedBy: z.string().max(256),
});
const policiesSchema = z.object({
  policies: z.array(policySchema).max(MAX_AI_POLICIES),
  total: z.number().int().max(MAX_AI_POLICIES),
});
const ruleIdentitySchema = z.object({
  id: z.string().min(1).max(256),
  rule_id: z.string().min(1).max(256),
  tags: z.array(z.string().max(256)).max(100),
});
const agentsSchema = z.object({
  results: z.array(z.object({ id: z.string().max(256), name: z.string().max(256) })).max(1000),
});

const localFields = [
  '@timestamp',
  'agent',
  'event',
  'session.id',
  'tool',
  'turn.id',
  'process.exit_code',
  'owner',
  'content.input',
  'source.record_hash',
  'source.kind',
  'source.observation_type',
  'kibana.space_id',
];
const googleAdkFields = [...localFields, 'google_adk'];
const traceFields = [
  '@timestamp',
  'trace_id',
  'span_id',
  'parent_span_id',
  'status.code',
  'attributes.gen_ai.operation.name',
  'attributes.gen_ai.agent.id',
  'attributes.elastic.inference.span.kind',
  'attributes.gen_ai.tool.name',
  'attributes.gen_ai.tool.call.id',
  'attributes.gen_ai.tool.call.arguments',
  'attributes.gen_ai.conversation.id',
  'attributes.user.id',
  'attributes.user.name',
  'attributes.user.hash',
  'attributes.elastic.agent_builder.initiating_actor.id',
  'attributes.elastic.agent_builder.initiating_actor.name',
  'attributes.elastic.agent_builder.initiating_actor.hash',
  'attributes.elastic.agent_builder.initiating_actor.source',
  'attributes.elastic.agent_builder.attribution.status',
  'attributes.elastic.agent_builder.caller.principal.type',
  'attributes.elastic.agent_builder.caller.api_key.id',
  'attributes.elastic.agent_builder.caller.api_key.hash',
  'attributes.elastic.agent_builder.attribution.source',
];

interface SourceScan {
  observations: AiPolicyObservation[];
  status: AiPolicyDetectorSource;
}

/** Scans a bounded native-source window, explicitly reporting missing input, ancestry and failed shards. */
export const scanAiPolicySource = async (
  client: Client,
  provider: AiPolicyProvider,
  spaceId: string,
  policies: readonly AiPolicy[],
  agents: readonly NativePolicyAgent[],
  now: string
): Promise<SourceScan> => {
  const status: AiPolicyDetectorSource = {
    provider,
    status: 'healthy',
    observationsScanned: 0,
    findingsCreated: 0,
  };
  const active = policies.filter((policy) => policy.enabled && policy.providers.includes(provider));
  if (active.length === 0)
    return {
      observations: [],
      status: {
        ...status,
        status: 'unavailable',
        message: 'No enabled policies target this provider.',
      },
    };
  const index =
    provider === 'agent_builder'
      ? `traces-agent_builder.otel-${spaceId}`
      : `logs-${provider}.entity_intelligence-${spaceId}`;
  if (!(await client.indices.exists({ index })))
    return {
      observations: [],
      status: {
        ...status,
        status: 'unavailable',
        message:
          'Native observation index is unavailable. Enable tracing or run the session importer.',
      },
    };
  const since = new Date(
    Math.max(
      Date.parse(now) - 24 * 60 * 60 * 1000,
      Math.min(...active.map((policy) => Date.parse(policy.effectiveFrom)))
    )
  ).toISOString();
  const result = await client.search<NativePolicyDocument>({
    index,
    size: MAX_OBSERVATIONS,
    track_total_hits: true,
    _source:
      provider === 'agent_builder'
        ? traceFields
        : provider === 'google_adk'
        ? googleAdkFields
        : localFields,
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: since, lte: now } } },
          {
            term:
              provider === 'agent_builder'
                ? { 'attributes.gen_ai.operation.name': 'execute_tool' }
                : { 'event.action': 'tool_call' },
          },
        ],
      },
    },
    sort: [{ '@timestamp': 'desc' }],
  });
  const hits: NativePolicyHit[] = result.hits.hits.map((hit) => ({
    _index: hit._index,
    _id: hit._id ?? '',
    _source: hit._source,
  }));
  status.observationsScanned = hits.length;
  const total =
    typeof result.hits.total === 'number'
      ? result.hits.total
      : result.hits.total?.value ?? hits.length;
  let partial = result.timed_out || result._shards.failed > 0 || total > hits.length;
  let observations: AiPolicyObservation[];
  let unattributed = 0;
  if (provider === 'agent_builder') {
    const traceIds = [
      ...new Set(hits.flatMap((hit) => (hit._source?.trace_id ? [hit._source.trace_id] : []))),
    ];
    const ancestry = traceIds.length
      ? await client.search<NativePolicyDocument>({
          index,
          size: MAX_OBSERVATIONS,
          track_total_hits: true,
          _source: traceFields.filter((field) => field !== 'attributes.gen_ai.tool.call.arguments'),
          query: { terms: { trace_id: traceIds } },
          sort: [{ '@timestamp': 'desc' }],
        })
      : undefined;
    const ancestors: NativePolicyHit[] =
      ancestry?.hits.hits.map((hit) => ({
        _index: hit._index,
        _id: hit._id ?? '',
        _source: hit._source,
      })) ?? [];
    const ancestryTotal =
      typeof ancestry?.hits.total === 'number'
        ? ancestry.hits.total
        : ancestry?.hits.total?.value ?? ancestors.length;
    partial ||=
      ancestry?.timed_out === true ||
      (ancestry?._shards.failed ?? 0) > 0 ||
      ancestryTotal > ancestors.length;
    const parsed = parseAgentBuilderPolicyObservations(hits, ancestors, agents);
    observations = parsed.observations;
    unattributed = parsed.unattributed;
  } else {
    observations = hits.flatMap((hit) => {
      const parsed =
        provider === 'google_adk'
          ? parseGoogleAdkPolicyObservation(hit, spaceId)
          : parseLocalPolicyObservation(hit, provider, spaceId);
      return parsed ? [parsed] : [];
    });
    unattributed = hits.length - observations.length;
  }
  const missing = observations.filter((item) => item.input === undefined).length;
  const limited = observations.filter((item) => item.inputRedacted || item.inputTruncated).length;
  status.status = partial || unattributed > 0 || missing > 0 || limited > 0 ? 'partial' : 'healthy';
  status.lastSuccessAt = now;
  status.message = [
    'Evaluates the most recent 24 hours after policy activation.',
    partial ? 'Search bound or incomplete shards limit coverage.' : '',
    unattributed ? `${unattributed} calls lacked complete source identity or trace ancestry.` : '',
    missing
      ? `${missing} calls have no captured input; only tool-name conditions can evaluate them.`
      : '',
    limited
      ? `${limited} calls have redacted or truncated input; only visible text is evaluated.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  return { observations, status };
};

/** Creates immutable source events and treats conflicts as an already recorded policy revision match. */
export const publishAiPolicyEvents = async (
  client: Client,
  spaceId: string,
  events: readonly NativeAiPolicyEvent[]
): Promise<number> => {
  let created = 0;
  for (let offset = 0; offset < events.length; offset += 500) {
    const response = await client.bulk({
      operations: events
        .slice(offset, offset + 500)
        .flatMap((event) => [
          { create: { _index: securityEventsIndex(spaceId), _id: event.event.id } },
          event,
        ]),
      refresh: 'wait_for',
    });
    for (const item of response.items) {
      if (item.create?.status === 201) created++;
      else if (item.create?.status !== 409)
        throw new Error('Source event indexing failed. No alert documents were written.');
    }
  }
  return created;
};

type KibanaRequest = (path: string, method: string, body?: object) => Promise<Response>;
const conversationAuthorSchema = z.object({
  id: z.string().min(1).max(256),
  agent_id: z.string().min(1).max(256),
  rounds: z
    .array(
      z.object({
        id: z.string().min(1).max(256),
        trace_id: z.union([z.string().max(256), z.array(z.string().max(256)).max(100)]).optional(),
        origin: z.object({ type: z.string().max(256) }).optional(),
        author: z
          .object({
            id: z.string().min(1).max(256),
            username: z.string().max(256).optional(),
            full_name: z.string().max(256).optional(),
          })
          .optional(),
      })
    )
    .max(1000),
});

const loadConversationAuthor = async (
  request: KibanaRequest,
  conversationId: string
): Promise<AiPolicyConversationAuthorEvidence | undefined> => {
  try {
    const response = await request(
      `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`,
      'GET'
    );
    if (!response.ok || !response.body) return undefined;
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let bytes = 0;
    let complete = false;
    while (!complete) {
      const part = await reader.read();
      complete = part.done;
      if (part.value) {
        bytes += part.value.byteLength;
        if (bytes > 2 * 1024 * 1024) {
          await reader.cancel();
          return undefined;
        }
        parts.push(part.value);
      }
    }
    // Immediately project away prompts, responses and all other conversation content.
    return conversationAuthorSchema.parse(JSON.parse(Buffer.concat(parts).toString('utf8')));
  } catch {
    return undefined;
  }
};

const loadPolicies = async (request: KibanaRequest): Promise<AiPolicy[]> => {
  const response = await request(AI_POLICIES_URL, 'GET');
  if (!response.ok) throw new Error('Managed policy API is unavailable.');
  return policiesSchema.parse(await response.json()).policies;
};

const installRules = async (request: KibanaRequest, spaceId: string): Promise<string[]> => {
  const ids: string[] = [];
  for (const rule of buildAiPolicyDetectionRules(spaceId)) {
    const existing = await request(
      `/api/detection_engine/rules?rule_id=${encodeURIComponent(rule.rule_id)}`,
      'GET'
    );
    if (existing.status !== 404) {
      if (!existing.ok) throw new Error('Cannot inspect existing detection rules.');
      const current = ruleIdentitySchema.parse(await existing.json());
      if (
        current.rule_id !== rule.rule_id ||
        !current.tags.includes('Managed AI policy monitoring')
      )
        throw new Error('Detection rule ownership could not be verified.');
    }
    const response = await request(
      '/api/detection_engine/rules',
      existing.status === 404 ? 'POST' : 'PUT',
      rule
    );
    if (!response.ok) throw new Error('Could not install AI policy detection rules.');
    ids.push(ruleIdentitySchema.parse(await response.json()).id);
  }
  return ids;
};

const scheduleRules = async (request: KibanaRequest, ids: readonly string[]): Promise<void> => {
  for (const id of ids) {
    const response = await request(
      `/internal/alerting/rule/${encodeURIComponent(id)}/_run_soon`,
      'POST'
    );
    if (!response.ok) throw new Error('Could not schedule AI policy detection rules.');
  }
};

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    options: {
      'space-id': { type: 'string', default: 'default' },
      'es-url': { type: 'string' },
      'kibana-url': { type: 'string' },
      'interval-seconds': { type: 'string', default: '10' },
      watch: { type: 'boolean', default: false },
      once: { type: 'boolean', default: false },
    },
    strict: true,
  });
  if (values.watch && values.once) throw new Error('Choose either --watch or --once.');
  const intervalSeconds = Number(values['interval-seconds']);
  if (!Number.isInteger(intervalSeconds) || intervalSeconds < 10 || intervalSeconds > 600)
    throw new Error('Use an interval between 10 and 600 seconds.');
  const spaceId = values['space-id'];
  const index = securityEventsIndex(spaceId);
  const esUrl = validateCodexTarget(
    values['es-url'] ?? process.env.ES_URL ?? 'http://localhost:9200'
  );
  const kibanaUrl = validateCodexTarget(
    values['kibana-url'] ?? process.env.KIBANA_URL ?? 'http://localhost:5601'
  );
  const basic = process.env.ES_AUTH ?? 'elastic:changeme';
  const colon = basic.indexOf(':');
  const username = process.env.ES_USERNAME ?? basic.slice(0, colon);
  const password = process.env.ES_PASSWORD ?? basic.slice(colon + 1);
  const client = new Client({
    node: esUrl.toString(),
    auth: process.env.ES_API_KEY ? { apiKey: process.env.ES_API_KEY } : { username, password },
    requestTimeout: 30_000,
  });
  const authorization = process.env.KIBANA_API_KEY
    ? `ApiKey ${process.env.KIBANA_API_KEY}`
    : `Basic ${Buffer.from(
        `${process.env.KIBANA_USERNAME ?? username}:${process.env.KIBANA_PASSWORD ?? password}`
      ).toString('base64')}`;
  const basePath = spaceId === 'default' ? '' : `/s/${encodeURIComponent(spaceId)}`;
  const request: KibanaRequest = (path, method, body) =>
    fetch(new URL(`${basePath}${path}`, kibanaUrl), {
      method,
      headers: {
        authorization,
        'content-type': 'application/json',
        'kbn-xsrf': 'entity-intelligence-ai-policy',
        'elastic-api-version': path.startsWith(AI_POLICIES_URL) ? '1' : '2023-10-31',
        'x-elastic-internal-origin': 'Kibana',
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
  try {
    await client.indices.putIndexTemplate({
      name: `entity-intelligence-security-${spaceId}`,
      index_patterns: [index],
      priority: 501,
      template: { mappings: SECURITY_STORY_MAPPING },
    });
    if (await client.indices.exists({ index }))
      await client.indices.putMapping({ index, ...SECURITY_STORY_MAPPING });
    else await client.indices.create({ index });
    const ruleIds = await installRules(request, spaceId);
    await scheduleRules(request, ruleIds);
    do {
      const runStartedAt = new Date().toISOString();
      let policies: AiPolicy[] = [];
      const sources: AiPolicyDetectorSource[] = [];
      try {
        policies = await loadPolicies(request);
        let agents: NativePolicyAgent[] = [];
        if (
          policies.some((policy) => policy.enabled && policy.providers.includes('agent_builder'))
        ) {
          const response = await request('/api/agent_builder/agents', 'GET');
          if (response.ok) agents = agentsSchema.parse(await response.json()).results;
        }
        for (const provider of providers) {
          try {
            const scan = await scanAiPolicySource(
              client,
              provider,
              spaceId,
              policies,
              agents,
              runStartedAt
            );
            // Do not publish a stale version that was disabled or edited during this scan.
            const current = await loadPolicies(request);
            const unchanged = policies.filter((policy) =>
              current.some(
                (item) => item.enabled && item.id === policy.id && item.version === policy.version
              )
            );
            const events: NativeAiPolicyEvent[] = [];
            const authorEvidence = new Map<
              string,
              AiPolicyConversationAuthorEvidence | undefined
            >();
            for (const observation of scan.observations) {
              const matching = unchanged.filter((policy) =>
                evaluateAiPolicy(policy, observation, spaceId)
              );
              let resolved = observation;
              if (
                matching.length > 0 &&
                observation.provider === 'agent_builder' &&
                observation.conversationId &&
                !observation.actor
              ) {
                if (!authorEvidence.has(observation.conversationId) && authorEvidence.size < 50) {
                  authorEvidence.set(
                    observation.conversationId,
                    await loadConversationAuthor(request, observation.conversationId)
                  );
                }
                const conversation = authorEvidence.get(observation.conversationId);
                if (conversation)
                  resolved = resolveAiPolicyConversationActor(observation, conversation);
              }
              for (const policy of matching) {
                const event = evaluateAiPolicy(policy, resolved, spaceId);
                if (event) events.push(event);
                if (events.length >= MAX_OBSERVATIONS) break;
              }
              if (events.length >= MAX_OBSERVATIONS) break;
            }
            if (events.length >= MAX_OBSERVATIONS) {
              scan.status.status = 'partial';
              scan.status.message =
                'The 5,000 policy-match limit was reached; this pass does not cover every source observation.';
            }
            scan.status.findingsCreated = await publishAiPolicyEvents(client, spaceId, events);
            if (scan.status.findingsCreated > 0) await scheduleRules(request, ruleIds);
            sources.push(scan.status);
          } catch {
            sources.push({
              provider,
              status: 'error',
              observationsScanned: 0,
              findingsCreated: 0,
              message:
                'Evaluation, source publication or rule scheduling failed. Check permissions and service availability; private response bodies are not logged.',
            });
          }
        }
      } catch {
        sources.push(
          ...providers.map(
            (provider): AiPolicyDetectorSource => ({
              provider,
              status: 'error',
              observationsScanned: 0,
              findingsCreated: 0,
              message:
                'Policies or agent definitions could not be loaded; this pass did not evaluate tool calls.',
            })
          )
        );
      }
      const heartbeat = {
        collectorId: 'local-ai-policy-monitor',
        runStartedAt,
        runCompletedAt: new Date().toISOString(),
        intervalSeconds,
        policiesLoaded: policies.length,
        sources,
      };
      try {
        const response = await request(AI_POLICY_STATUS_URL, 'POST', heartbeat);
        if (!response.ok) throw new Error('Detector heartbeat could not be recorded.');
        process.stdout.write(`${JSON.stringify(heartbeat)}\n`);
      } catch {
        if (!values.watch) throw new Error('Detector heartbeat could not be recorded.');
        process.stderr.write('Detector heartbeat unavailable; retrying next pass.\n');
      }
      if (values.watch)
        await new Promise<void>((resolve) => setTimeout(resolve, intervalSeconds * 1000));
      else if (sources.some((source) => source.status === 'error')) process.exitCode = 1;
    } while (values.watch);
  } finally {
    await client.close();
  }
};

if (require.main === module)
  main().catch(() => {
    process.stderr.write(
      'AI policy monitor failed. Check local Elasticsearch/Kibana connectivity and permissions; no private source or credentials were logged.\n'
    );
    process.exitCode = 1;
  });
