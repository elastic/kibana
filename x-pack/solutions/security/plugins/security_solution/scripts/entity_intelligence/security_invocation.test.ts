/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtemp, realpath, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { SecurityActivityEvent } from '../../common/entity_intelligence/security_events';
import type { CodexObservation } from './codex_session_types';
import { runSecurityPolicyExercise } from './security_policy_gateway';
import { bindSecurityInvocation, SECURITY_GATEWAY_SCRIPT } from './security_invocation';
import { parseSecurityEvents } from './setup_security_story';

const requestId = '2ad4ccf1-6171-400a-9df7-6e6507b1fe82';
const recordHash = 'a'.repeat(64);
let parent: string;
let event: SecurityActivityEvent;
let source: CodexObservation;
let command: string;
const hit = (observation = source) => ({
  _index: 'logs-codex.entity_intelligence-default',
  _id: 'observation-id',
  _source: observation,
});
const withCommand = (text: string): CodexObservation => ({
  ...source,
  content: {
    mode: 'redacted_local',
    input: {
      text: JSON.stringify(['/bin/zsh', '-lc', text]),
      kind: 'command',
      source: 'item_completed.CommandExecution.command',
      recordHash,
      redacted: false,
      truncated: false,
    },
  },
});

beforeAll(async () => {
  parent = await mkdtemp(join(await realpath(tmpdir()), 'entity-invocation-'));
  const sandbox = join(parent, 'request');
  const result = await runSecurityPolicyExercise({
    sandboxDirectory: sandbox,
    spaceId: 'default',
    agent: { id: 'codex-installation', provider: 'codex', sessionId: 'thread-one' },
    action: 'read_protected_fixture',
    mode: 'enforce',
    requestId,
  });
  event = result.events[0];
  command = `/Users/example/node/bin/node -r @kbn/setup-node-env ${SECURITY_GATEWAY_SCRIPT} --sandbox ${sandbox} --provider codex --agent-id codex-installation --session-id thread-one --action read_protected_fixture --mode enforce --request-id ${requestId}`;
  source = {
    '@timestamp': event['@timestamp'],
    event: {
      id: 'observation-id',
      action: 'tool_call',
      dataset: 'codex.session',
      ingested: event['@timestamp'],
      outcome: 'failure',
    },
    agent: { id: 'codex-installation', name: 'Codex', type: 'codex' },
    session: { id: 'thread-one' },
    tool: { name: 'exec_command', type: 'CommandExecution', call: { id: 'actual-native-item' } },
    turn: { id: 'actual-turn' },
    process: { exit_code: 77 },
    source: {
      kind: 'codex_local_session',
      file_hash: 'b'.repeat(64),
      record_hash: recordHash,
      observation_type: 'native_tool_completion',
      id_kind: 'item',
      schema_version: 1,
    },
    kibana: { space_id: 'default' },
  };
  source = withCommand(command);
});
afterAll(async () => {
  await rm(parent, { recursive: true, force: true });
});

it('binds the policy decision to actual native call and turn IDs with immutable input/result references', () => {
  const bound = bindSecurityInvocation(event, [hit()]);
  expect(bound.entity_intelligence.invocation).toEqual({
    request_id: requestId,
    tool_call_id: 'actual-native-item',
    tool_name: 'exec_command',
    turn_id: 'actual-turn',
    observation_index: 'logs-codex.entity_intelligence-default',
    observation_id: 'observation-id',
    input_record_hash: recordHash,
    input_source: 'item_completed.CommandExecution.command',
    correlation: 'exact_request_id',
    input: source.content?.input?.text,
    input_redacted: false,
    input_truncated: false,
    process_exit_code: 77,
  });
  expect(parseSecurityEvents(JSON.stringify(bound), 'default')).toEqual([bound]);
  expect(event.entity_intelligence.invocation).toBeUndefined();
});

it('accepts native direct argv and explicit safe quoting, without requiring shell wrapping', () => {
  const direct = structuredClone(source);
  if (direct.content?.input) direct.content.input.text = JSON.stringify(command.split(' '));
  expect(
    bindSecurityInvocation(event, [hit(direct)]).entity_intelligence.invocation?.tool_call_id
  ).toBe('actual-native-item');
  expect(
    bindSecurityInvocation(event, [
      hit(withCommand(command.replace(`--request-id ${requestId}`, `--request-id '${requestId}'`))),
    ]).entity_intelligence.invocation?.tool_call_id
  ).toBe('actual-native-item');
});

it.each([
  ['echoed text', () => `echo '${command}'`],
  ['compound command', () => `${command} && echo complete`],
  ['command substitution', () => `${command} --output $(echo result.ndjson)`],
  ['wrong script', () => command.replace('security_policy_gateway.ts', 'other.ts')],
  ['wrong request', () => command.replace(requestId, '3ad4ccf1-6171-400a-9df7-6e6507b1fe82')],
  ['wrong action', () => command.replace('read_protected_fixture', 'read_public_fixture')],
  ['wrong mode', () => command.replace('--mode enforce', '--mode monitor')],
  ['wrong installation', () => command.replace('codex-installation', 'codex-other')],
  ['wrong session', () => command.replace('thread-one', 'thread-two')],
  ['wrong space', () => `${command} --space-id other`],
  ['duplicate flag', () => `${command} --request-id ${requestId}`],
  ['unrecognized flag', () => `${command} --help yes`],
  ['different fixture path', () => command.replace('/request ', '/another-request ')],
])('rejects %s even with a matching request token nearby', (_, change) => {
  expect(() => bindSecurityInvocation(event, [hit(withCommand(change()))])).toThrow('Exactly one');
});

it.each([
  [
    'model wrapper',
    (doc: CodexObservation) => {
      doc.source.observation_type = 'model_tool_call';
    },
  ],
  [
    'another session',
    (doc: CodexObservation) => {
      doc.session.id = 'another';
    },
  ],
  [
    'another installation',
    (doc: CodexObservation) => {
      doc.agent.id = 'another';
    },
  ],
  [
    'another space',
    (doc: CodexObservation) => {
      doc.kibana.space_id = 'another';
    },
  ],
  [
    'wrong exit result',
    (doc: CodexObservation) => {
      doc.process = { exit_code: 0 };
    },
  ],
  [
    'mismatched source hash',
    (doc: CodexObservation) => {
      doc.source.record_hash = 'b'.repeat(64);
    },
  ],
  [
    'truncated input',
    (doc: CodexObservation) => {
      if (doc.content?.input) doc.content.input.truncated = true;
    },
  ],
  [
    'missing input',
    (doc: CodexObservation) => {
      doc.content = { mode: 'metadata_only' };
    },
  ],
])('rejects %s rather than assigning a plausible native call', (_, mutate) => {
  const changed = structuredClone(source);
  mutate(changed);
  expect(() => bindSecurityInvocation(event, [hit(changed)])).toThrow('Exactly one');
});

it('rejects zero and ambiguous candidates and already bound records', () => {
  expect(() => bindSecurityInvocation(event, [])).toThrow('Exactly one');
  expect(() => bindSecurityInvocation(event, [hit(), hit()])).toThrow('Exactly one');
  expect(() => bindSecurityInvocation(bindSecurityInvocation(event, [hit()]), [hit()])).toThrow(
    'cannot be rebound'
  );
});

it('does not create a turn ID when native completion did not record one', () => {
  const changed = structuredClone(source);
  delete changed.turn;
  expect(
    bindSecurityInvocation(event, [hit(changed)]).entity_intelligence.invocation?.turn_id
  ).toBeUndefined();
});

it.each([
  ['engine', 'Codex native guardrail'],
  ['name', 'Native sandbox policy'],
  ['reason', 'Blocked by the provider sandbox'],
] as const)(
  'rejects a misrepresented policy %s when binding local gateway evidence',
  (field, value) => {
    const changed = structuredClone(event);
    if (changed.entity_intelligence.control) changed.entity_intelligence.control[field] = value;
    expect(() => bindSecurityInvocation(changed, [hit()])).toThrow('Exactly one');
  }
);

it.each(['id', 'name', 'condition', 'expected'] as const)(
  'rejects a changed matched clause %s when binding local gateway evidence',
  (field) => {
    const changed = structuredClone(event);
    const clause = changed.entity_intelligence.control?.clause;
    if (clause) {
      if (field === 'expected') clause.expected = 'allow';
      else clause[field] = 'different';
    }
    expect(() => bindSecurityInvocation(changed, [hit()])).toThrow('Exactly one');
  }
);

it('rejects tampered or partial policy snapshots and contradictory call outcomes at ingestion', () => {
  const bound = bindSecurityInvocation(event, [hit()]);
  const changed = structuredClone(bound);
  if (changed.entity_intelligence.control?.definition)
    changed.entity_intelligence.control.definition.description = 'changed';
  expect(() => parseSecurityEvents(JSON.stringify(changed), 'default')).toThrow(
    'consistent immutable'
  );
  const missing = structuredClone(bound);
  if (missing.entity_intelligence.control) delete missing.entity_intelligence.control.clause;
  expect(() => parseSecurityEvents(JSON.stringify(missing), 'default')).toThrow(
    'consistent immutable'
  );
  const contradiction = structuredClone(bound);
  if (contradiction.entity_intelligence.invocation)
    contradiction.entity_intelligence.invocation.process_exit_code = 0;
  expect(() => parseSecurityEvents(JSON.stringify(contradiction), 'default')).toThrow(
    'recorded result'
  );
});
