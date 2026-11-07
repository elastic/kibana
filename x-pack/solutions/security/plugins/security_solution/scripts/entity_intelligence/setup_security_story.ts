/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { constants } from 'fs';
import { open } from 'fs/promises';
import { parseArgs } from 'util';
import { Client } from '@elastic/elasticsearch';
import { z } from '@kbn/zod';
import type { SecurityActivityEvent } from '../../common/entity_intelligence/security_events';
import { securityEventsIndex } from '../../common/entity_intelligence/security_events';
import { validateCodexTarget } from './codex_index';
import { buildSecurityDetectionRules, SECURITY_STORY_MAPPING } from './security_detection_rules';
import { buildGeneratedEntityStory } from './security_story';

const identifier = z.string().min(1).max(256);
const identity = z.object({ id: identifier, name: z.string().min(1).max(256) }).strict();
const provider = z.enum(['codex', 'cursor', 'agent_builder']);
const policyClause = z
  .object({
    id: identifier,
    name: identifier,
    condition: z.string().min(1).max(2048),
    expected: z.enum(['deny', 'allow']),
  })
  .strict();
const invocation = z
  .object({
    request_id: z.string().uuid(),
    tool_call_id: identifier,
    tool_name: identifier,
    turn_id: identifier.optional(),
    observation_index: identifier,
    observation_id: identifier,
    input_record_hash: z.string().regex(/^[a-f0-9]{64}$/),
    input_source: identifier,
    correlation: z.literal('exact_request_id'),
    input: z.string().min(1).max(8000),
    input_redacted: z.boolean(),
    input_truncated: z.boolean(),
    process_exit_code: z.number().int().min(0).max(255),
  })
  .strict();
const securityEventSchema = z
  .object({
    '@timestamp': z.string().datetime(),
    event: z
      .object({
        id: identifier,
        kind: z.literal('event'),
        dataset: z.literal('entity_intelligence.security'),
        action: identifier,
        category: z
          .array(z.enum(['file', 'network', 'iam', 'authentication']))
          .min(1)
          .max(4),
        type: z
          .array(z.enum(['access', 'change', 'creation', 'start', 'allowed', 'denied']))
          .min(1)
          .max(6),
        outcome: z.enum(['success', 'failure', 'unknown']),
      })
      .strict(),
    user: identity,
    host: identity,
    agent: identity.extend({ type: provider }).strict().optional(),
    session: z.object({ id: identifier }).strict().optional(),
    entity: z
      .object({ id: z.array(identifier).min(1).max(8) })
      .strict()
      .optional(),
    kibana: z.object({ space_id: identifier }).strict(),
    entity_intelligence: z
      .object({
        schema_version: z.literal(1),
        request_id: z.string().uuid().optional(),
        invocation: invocation.optional(),
        actor_provenance: z.enum(['local_os_account', 'generated']),
        agent: identity.extend({ provider, session_id: identifier.optional() }).strict().optional(),
        activity: z
          .object({
            type: z.enum([
              'protected_file_access',
              'unapproved_export',
              'privilege_change',
              'suspicious_authentication',
            ]),
            target: z.string().min(1).max(1024),
          })
          .strict(),
        control: z
          .object({
            id: identifier,
            name: identifier,
            version: identifier,
            engine: identifier,
            mode: z.enum(['enforce', 'monitor']),
            decision: z.enum(['deny', 'allow']),
            outcome: z.enum(['blocked', 'allowed', 'unknown']),
            reason: z.string().min(1).max(2048),
            clause: policyClause.optional(),
            policy_sha256: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
            definition: z
              .object({
                description: z.string().min(1).max(2048),
                scope: z.string().min(1).max(2048),
                clauses: z.array(policyClause).min(1).max(16),
              })
              .strict()
              .optional(),
          })
          .strict()
          .optional(),
        scenario: z
          .object({
            id: identifier,
            step: z.number().int().min(1).max(100),
            kind: z.enum(['controlled', 'generated']),
          })
          .strict()
          .optional(),
      })
      .strict(),
  })
  .strict();

/** Parses bounded structured exercise events without accepting arbitrary source content. */
export const parseSecurityEvents = (contents: string, spaceId: string): SecurityActivityEvent[] => {
  securityEventsIndex(spaceId);
  if (Buffer.byteLength(contents) > 1024 * 1024)
    throw new Error('Security events exceed the 1 MiB bound.');
  const lines = contents.split('\n').filter((line) => line.trim());
  if (lines.length === 0 || lines.length > 100)
    throw new Error('Supply between 1 and 100 security events.');
  const events = lines.map((line) => {
    if (Buffer.byteLength(line) > 65536)
      throw new Error('Security event exceeds the record bound.');
    let event: SecurityActivityEvent;
    try {
      event = securityEventSchema.parse(JSON.parse(line));
    } catch {
      throw new Error(
        'Security events contain an invalid record; source contents were not logged.'
      );
    }
    if (event.kibana.space_id !== spaceId)
      throw new Error('Security events must belong to the target space.');
    const metadata = event.entity_intelligence.agent;
    if (
      Boolean(event.agent) !== Boolean(metadata) ||
      (event.session !== undefined && metadata === undefined) ||
      (metadata &&
        (event.agent?.id !== metadata.id ||
          event.agent.type !== metadata.provider ||
          event.agent.name !== metadata.name ||
          event.session?.id !== metadata.session_id))
    )
      throw new Error('Security event agent and session identities must agree.');
    const control = event.entity_intelligence.control;
    if (control && (control.clause || control.definition || control.policy_sha256)) {
      if (
        !control.clause ||
        !control.definition ||
        !control.policy_sha256 ||
        createHash('sha256').update(JSON.stringify(control.definition)).digest('hex') !==
          control.policy_sha256 ||
        new Set(control.definition.clauses.map(({ id }) => id)).size !==
          control.definition.clauses.length ||
        !control.definition.clauses.some(
          (clause) => JSON.stringify(clause) === JSON.stringify(control.clause)
        ) ||
        control.clause.expected !== control.decision
      )
        throw new Error(
          'Policy evidence must include a consistent immutable definition and matched clause.'
        );
    }
    const bound = event.entity_intelligence.invocation;
    if (
      bound &&
      (!metadata ||
        metadata.provider !== 'codex' ||
        !metadata.session_id ||
        bound.request_id !== event.entity_intelligence.request_id ||
        bound.observation_index !== `logs-codex.entity_intelligence-${spaceId}` ||
        bound.tool_name !== 'exec_command' ||
        bound.input_truncated ||
        !control ||
        control.outcome === 'unknown' ||
        bound.process_exit_code !== (control.outcome === 'blocked' ? 77 : 0))
    )
      throw new Error(
        'Invocation evidence must agree with the source request and recorded result.'
      );
    const scenario = event.entity_intelligence.scenario;
    if (
      scenario &&
      (scenario.kind === 'generated') !==
        (event.entity_intelligence.actor_provenance === 'generated')
    )
      throw new Error('Security event provenance must agree with the scenario kind.');
    return event;
  });
  if (new Set(events.map((event) => event.event.id)).size !== events.length)
    throw new Error('Security event IDs must be unique.');
  return events;
};

export const readSecurityEvents = async (
  path: string,
  spaceId: string
): Promise<SecurityActivityEvent[]> => {
  const file = await open(path, constants.O_RDONLY + constants.O_NOFOLLOW);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > 1024 * 1024)
      throw new Error('Use a bounded regular NDJSON event file.');
    const buffer = Buffer.alloc(info.size + 1);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead !== info.size) throw new Error('Security event file changed while reading.');
    return parseSecurityEvents(buffer.subarray(0, bytesRead).toString('utf8'), spaceId);
  } finally {
    await file.close();
  }
};

interface RuleIdentity {
  id: string;
  rule_id: string;
  tags: string[];
}
const ruleIdentity = z.object({
  id: identifier,
  rule_id: identifier,
  tags: z.array(z.string().max(256)).max(100),
});

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    options: {
      events: { type: 'string' },
      'space-id': { type: 'string', default: 'default' },
      'es-url': { type: 'string' },
      'kibana-url': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      'entity-user-name': { type: 'string' },
      'entity-user-id': { type: 'string' },
      'entity-host-name': { type: 'string' },
      'entity-host-id': { type: 'string' },
      'entity-host-entity-id': { type: 'string' },
    },
    strict: true,
  });
  if (!values.events) throw new Error('Supply --events with the gateway NDJSON file.');
  const spaceId = values['space-id'];
  const index = securityEventsIndex(spaceId);
  const events = await readSecurityEvents(values.events, spaceId);
  const entityArgs = [
    'entity-user-name',
    'entity-user-id',
    'entity-host-name',
    'entity-host-id',
    'entity-host-entity-id',
  ] as const;
  if (entityArgs.some((key) => values[key] !== undefined)) {
    const userName = values['entity-user-name'];
    const userEntityId = values['entity-user-id'];
    const hostName = values['entity-host-name'];
    const hostId = values['entity-host-id'];
    const hostEntityId = values['entity-host-entity-id'];
    if (!userName || !userEntityId || !hostName || !hostId || !hostEntityId)
      throw new Error('Supply all five entity identity flags for generated entity observations.');
    const first = events[0];
    events.push(
      ...buildGeneratedEntityStory({
        spaceId,
        scenarioId: `${first.entity_intelligence.scenario?.id ?? first.event.id}-entities`,
        startedAt: first['@timestamp'],
        user: { id: `generated:${userName}`, name: userName, entityId: userEntityId },
        host: { id: hostId, name: hostName, entityId: hostEntityId },
      })
    );
  }
  const rules = buildSecurityDetectionRules(spaceId);
  const esUrl = validateCodexTarget(
    values['es-url'] ?? process.env.ES_URL ?? 'http://localhost:9200',
    false
  );
  const kibanaUrl = validateCodexTarget(
    values['kibana-url'] ?? process.env.KIBANA_URL ?? 'http://localhost:5601',
    false
  );
  if (values['dry-run']) {
    process.stdout.write(
      `${JSON.stringify({
        dryRun: true,
        index,
        events: events.length,
        rules: rules.map((rule) => rule.name),
      })}\n`
    );
    return;
  }
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
  const request = async (path: string, method: string, body?: object): Promise<Response> =>
    fetch(new URL(`${basePath}${path}`, kibanaUrl), {
      method,
      headers: {
        authorization,
        'content-type': 'application/json',
        'kbn-xsrf': 'entity-intelligence-security',
        'elastic-api-version': '2023-10-31',
        'x-elastic-internal-origin': 'Kibana',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
      redirect: 'error',
    });
  let stage = 'source index setup';
  try {
    await client.indices.putIndexTemplate({
      name: `entity-intelligence-security-${spaceId}`,
      index_patterns: [index],
      priority: 501,
      template: { mappings: SECURITY_STORY_MAPPING },
      _meta: {
        description: 'Structured security policy observations; generated provenance is preserved.',
      },
    });
    if (await client.indices.exists({ index }))
      await client.indices.putMapping({ index, ...SECURITY_STORY_MAPPING });
    else await client.indices.create({ index });
    stage = 'source event indexing';
    const response = await client.bulk({
      operations: events.flatMap((event) => [
        { index: { _index: index, _id: event.event.id } },
        event,
      ]),
      refresh: 'wait_for',
    });
    if (response.errors) throw new Error('Source event indexing failed.');
    stage = 'detection rule setup';
    const installed: RuleIdentity[] = [];
    for (const rule of rules) {
      const existing = await request(
        `/api/detection_engine/rules?rule_id=${encodeURIComponent(rule.rule_id)}`,
        'GET'
      );
      if (existing.status !== 404) {
        if (!existing.ok) throw new Error('Cannot inspect existing rules.');
        const current = ruleIdentity.parse(await existing.json());
        if (
          current.rule_id !== rule.rule_id ||
          !current.tags.includes('Structured security evidence')
        )
          throw new Error('Rule ownership could not be verified.');
      }
      const saved = await request(
        '/api/detection_engine/rules',
        existing.status === 404 ? 'POST' : 'PUT',
        rule
      );
      if (!saved.ok) throw new Error(`Detection rule request returned HTTP ${saved.status}.`);
      installed.push(ruleIdentity.parse(await saved.json()));
    }
    stage = 'detection scheduling';
    for (const rule of installed) {
      const scheduled = await request(
        `/internal/alerting/rule/${encodeURIComponent(rule.id)}/_run_soon`,
        'POST'
      );
      if (!scheduled.ok) throw new Error('Cannot schedule the installed detection rules.');
    }
    process.stdout.write(
      `${JSON.stringify({
        index,
        indexed: events.length,
        generated: events.filter(
          (event) => event.entity_intelligence.scenario?.kind === 'generated'
        ).length,
        rules: installed.map((rule) => ({ id: rule.id, rule_id: rule.rule_id })),
        status: 'Rules scheduled; verify emitted alerts before claiming detection success.',
      })}\n`
    );
  } catch {
    throw new Error(
      `Local security story failed during ${stage}; private response bodies and credentials were not logged.`
    );
  } finally {
    await client.close();
  }
};

if (require.main === module) {
  main().catch((error: Error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
