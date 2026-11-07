/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { basename, dirname, isAbsolute, join, resolve } from 'path';
import { z } from '@kbn/zod';
import type { SecurityActivityEvent } from '../../common/entity_intelligence/security_events';
import type { CodexObservation } from './codex_session_types';
import { codexIndexName } from './codex_index';
import { evaluateSecurityPolicy } from './security_policy_gateway';

export const SECURITY_GATEWAY_SCRIPT =
  'x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/security_policy_gateway.ts';

export interface SecurityInvocationObservation {
  _index: string;
  _id: string;
  _source?: CodexObservation;
}

const identifier = z.string().min(1).max(256);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const observationSchema = z.object({
  _index: identifier,
  _id: identifier,
  _source: z.object({
    agent: z.object({ id: identifier, type: z.literal('codex') }),
    session: z.object({ id: identifier }),
    kibana: z.object({ space_id: identifier }),
    event: z.object({ action: z.literal('tool_call'), id: identifier }),
    tool: z.object({
      name: z.literal('exec_command'),
      type: z.literal('CommandExecution'),
      call: z.object({ id: identifier }),
    }),
    turn: z.object({ id: identifier }).optional(),
    process: z.object({ exit_code: z.number().int().min(0).max(255) }),
    source: z.object({ observation_type: z.literal('native_tool_completion'), record_hash: hash }),
    content: z.object({
      mode: z.literal('redacted_local'),
      input: z.object({
        text: z.string().min(1).max(8000),
        source: z.literal('item_completed.CommandExecution.command'),
        kind: z.literal('command'),
        recordHash: hash,
        redacted: z.boolean(),
        truncated: z.literal(false),
      }),
    }),
  }),
});

const commandSchema = z
  .object({
    sandbox: z.string().min(1).max(1024),
    provider: z.literal('codex'),
    'agent-id': identifier,
    'session-id': identifier,
    'space-id': identifier.default('default'),
    'request-id': z.string().uuid(),
    action: z.enum(['read_public_fixture', 'read_protected_fixture', 'export_protected_fixture']),
    mode: z.enum(['enforce', 'monitor']),
    'scenario-id': identifier.optional(),
    output: z.string().min(1).max(1280).optional(),
  })
  .strict();

const literalTokens = (command: string): string[] | undefined => {
  const tokens: string[] = [];
  let remaining = command.trim();
  while (remaining) {
    const match =
      /^(?:'([A-Za-z0-9_./:@=-]+)'|"([A-Za-z0-9_./:@=-]+)"|([A-Za-z0-9_./:@=-]+))(?:\s+|$)/.exec(
        remaining
      );
    if (!match) return undefined;
    tokens.push(match[1] ?? match[2] ?? match[3]);
    remaining = remaining.slice(match[0].length);
  }
  return tokens;
};

const parseGatewayCommand = (input: string): z.infer<typeof commandSchema> | undefined => {
  let argv: string[];
  try {
    argv = z.array(z.string().min(1).max(8000)).min(1).max(64).parse(JSON.parse(input));
  } catch {
    return undefined;
  }
  if (
    argv.length === 3 &&
    ['/bin/zsh', '/bin/bash', '/bin/sh'].includes(argv[0]) &&
    ['-lc', '-c'].includes(argv[1])
  ) {
    const parsed = literalTokens(argv[2]);
    if (!parsed) return undefined;
    argv = parsed;
  }
  const [executable, preload, setup, script, ...flags] = argv;
  if (
    !executable ||
    (executable !== 'node' &&
      (!isAbsolute(executable) ||
        executable !== resolve(executable) ||
        basename(executable) !== 'node')) ||
    preload !== '-r' ||
    setup !== '@kbn/setup-node-env' ||
    (script !== SECURITY_GATEWAY_SCRIPT && script !== resolve(SECURITY_GATEWAY_SCRIPT)) ||
    flags.length % 2 !== 0
  )
    return undefined;
  const values: Record<string, string> = {};
  for (let index = 0; index < flags.length; index += 2) {
    const flag = flags[index];
    if (!flag.startsWith('--') || flag.slice(2) in values) return undefined;
    values[flag.slice(2)] = flags[index + 1];
  }
  const result = commandSchema.safeParse(values);
  if (!result.success) return undefined;
  const command = result.data;
  if (
    !isAbsolute(command.sandbox) ||
    command.sandbox !== resolve(command.sandbox) ||
    (command.output && dirname(command.output) !== command.sandbox)
  )
    return undefined;
  return command;
};

/** Binds one policy result only to the single native call that contains its complete literal request. */
export const bindSecurityInvocation = (
  event: SecurityActivityEvent,
  observations: readonly SecurityInvocationObservation[]
): SecurityActivityEvent => {
  const evidence = event.entity_intelligence;
  const requestId = evidence.request_id;
  const metadata = evidence.agent;
  const control = evidence.control;
  if (
    !requestId ||
    !metadata ||
    metadata.provider !== 'codex' ||
    !metadata.session_id ||
    !control ||
    control.outcome === 'unknown'
  ) {
    throw new Error(
      'Binding requires a Codex single-operation request with an explicit recorded result.'
    );
  }
  if (evidence.invocation) throw new Error('Already bound source events cannot be rebound.');
  const expectedExit = control.outcome === 'blocked' ? 77 : 0;
  const candidates = observations.flatMap((hit) => {
    const parsed = observationSchema.safeParse(hit);
    if (!parsed.success) return [];
    const { _source: source } = parsed.data;
    if (
      hit._index !== codexIndexName(event.kibana.space_id) ||
      hit._id !== source.event.id ||
      source.agent.id !== metadata.id ||
      source.session.id !== metadata.session_id ||
      source.kibana.space_id !== event.kibana.space_id ||
      source.process.exit_code !== expectedExit ||
      source.source.record_hash !== source.content.input.recordHash
    )
      return [];
    const command = parseGatewayCommand(source.content.input.text);
    if (
      !command ||
      command['request-id'] !== requestId ||
      command.action !== event.event.action ||
      command.mode !== control.mode ||
      command['agent-id'] !== metadata.id ||
      command['session-id'] !== metadata.session_id ||
      command['space-id'] !== event.kibana.space_id ||
      (command['scenario-id'] && command['scenario-id'] !== evidence.scenario?.id)
    )
      return [];
    const expectedTarget =
      command.action === 'export_protected_fixture'
        ? join(command.sandbox, 'sink', 'monitored_fixture.txt')
        : command.action === 'read_protected_fixture'
        ? join(command.sandbox, 'protected', 'inert_fixture.txt')
        : join(command.sandbox, 'public', 'public_fixture.txt');
    const policy = evaluateSecurityPolicy(command.action, command.mode);
    if (
      expectedTarget !== evidence.activity.target ||
      policy.id !== control.id ||
      policy.version !== control.version ||
      policy.engine !== control.engine ||
      policy.name !== control.name ||
      policy.reason !== control.reason ||
      policy.policy_sha256 !== control.policy_sha256 ||
      policy.clause?.id !== control.clause?.id ||
      policy.clause?.name !== control.clause?.name ||
      policy.clause?.condition !== control.clause?.condition ||
      policy.clause?.expected !== control.clause?.expected ||
      policy.decision !== control.decision ||
      policy.outcome !== control.outcome
    )
      return [];
    return [parsed.data];
  });
  if (candidates.length !== 1)
    throw new Error(
      'Exactly one matching completed native gateway call is required; no invocation was inferred.'
    );
  const { _index: index, _id: id, _source: source } = candidates[0];
  const input = source.content.input;
  return {
    ...event,
    entity_intelligence: {
      ...evidence,
      invocation: {
        request_id: requestId,
        tool_call_id: source.tool.call.id,
        tool_name: source.tool.name,
        ...(source.turn ? { turn_id: source.turn.id } : {}),
        observation_index: index,
        observation_id: id,
        input_record_hash: input.recordHash,
        input_source: input.source,
        correlation: 'exact_request_id',
        input: input.text,
        input_redacted: input.redacted,
        input_truncated: input.truncated,
        process_exit_code: source.process.exit_code,
      },
    },
  };
};
