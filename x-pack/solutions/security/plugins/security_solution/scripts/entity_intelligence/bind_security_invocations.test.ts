/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lstat, mkdtemp, readFile, realpath, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { runBindSecurityInvocationsCli } from './bind_security_invocations';
import { runSecurityPolicyExercise } from './security_policy_gateway';
import { SECURITY_GATEWAY_SCRIPT } from './security_invocation';

const mockSearch = jest.fn();
const mockClose = jest.fn();
jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({ search: mockSearch, close: mockClose })),
}));

let parent: string;
let input: string;
let output: string;
let request: object;
const requestId = '2ad4ccf1-6171-400a-9df7-6e6507b1fe82';

beforeEach(async () => {
  mockSearch.mockReset();
  mockClose.mockReset();
  parent = await mkdtemp(join(await realpath(tmpdir()), 'entity-bind-cli-'));
  const sandbox = join(parent, 'request');
  input = join(sandbox, 'event.ndjson');
  output = join(parent, 'bound.ndjson');
  const result = await runSecurityPolicyExercise({
    sandboxDirectory: sandbox,
    spaceId: 'default',
    agent: { id: 'codex-one', provider: 'codex', sessionId: 'thread-one' },
    action: 'read_public_fixture',
    mode: 'enforce',
    requestId,
    outputFile: input,
  });
  const command = [
    'node',
    '-r',
    '@kbn/setup-node-env',
    SECURITY_GATEWAY_SCRIPT,
    '--sandbox',
    sandbox,
    '--provider',
    'codex',
    '--agent-id',
    'codex-one',
    '--session-id',
    'thread-one',
    '--action',
    'read_public_fixture',
    '--mode',
    'enforce',
    '--request-id',
    requestId,
    '--output',
    input,
  ];
  request = {
    _index: 'logs-codex.entity_intelligence-default',
    _id: 'observed-one',
    _source: {
      '@timestamp': result.events[0]['@timestamp'],
      agent: { id: 'codex-one', type: 'codex' },
      session: { id: 'thread-one' },
      kibana: { space_id: 'default' },
      event: { action: 'tool_call', id: 'observed-one' },
      tool: { name: 'exec_command', type: 'CommandExecution', call: { id: 'actual-call' } },
      process: { exit_code: 0 },
      source: { observation_type: 'native_tool_completion', record_hash: 'a'.repeat(64) },
      content: {
        mode: 'redacted_local',
        input: {
          text: JSON.stringify(command),
          source: 'item_completed.CommandExecution.command',
          kind: 'command',
          recordHash: 'a'.repeat(64),
          redacted: false,
          truncated: false,
        },
      },
    },
  };
  mockSearch.mockResolvedValue({
    hits: { total: { value: 1, relation: 'eq' }, hits: [request] },
    timed_out: false,
    _shards: { failed: 0 },
  });
});
afterEach(async () => {
  await rm(parent, { recursive: true, force: true });
});

it('queries only native calls in the exact installation/session/space and writes a new owner-only evidence file', async () => {
  const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  try {
    await runBindSecurityInvocationsCli(['--events', input, '--output', output]);
    const bound = JSON.parse(await readFile(output, 'utf8'));
    expect(bound.entity_intelligence.invocation).toMatchObject({
      tool_call_id: 'actual-call',
      process_exit_code: 0,
      correlation: 'exact_request_id',
    });
    expect((await lstat(output)).mode % 0o1000).toBe(0o600);
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-codex.entity_intelligence-default',
        query: {
          bool: {
            filter: expect.arrayContaining([
              { term: { 'agent.id': 'codex-one' } },
              { term: { 'session.id': 'thread-one' } },
              { term: { 'kibana.space_id': 'default' } },
              { term: { 'source.observation_type': 'native_tool_completion' } },
            ]),
          },
        },
      })
    );
    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining('"indexed":false'));
    const original = await readFile(output, 'utf8');
    await expect(
      runBindSecurityInvocationsCli(['--events', input, '--output', output])
    ).rejects.toThrow();
    expect(await readFile(output, 'utf8')).toBe(original);
  } finally {
    stdout.mockRestore();
  }
});

it.each([
  { total: { value: 1001, relation: 'eq' }, timedOut: false, failed: 0 },
  { total: { value: 1000, relation: 'gte' }, timedOut: false, failed: 0 },
  { total: { value: 1, relation: 'eq' }, timedOut: true, failed: 0 },
  { total: { value: 1, relation: 'eq' }, timedOut: false, failed: 1 },
])('rejects capped or partial query evidence %#', async ({ total, timedOut, failed }) => {
  mockSearch.mockResolvedValue({
    hits: { total, hits: [request] },
    timed_out: timedOut,
    _shards: { failed },
  });
  await expect(
    runBindSecurityInvocationsCli(['--events', input, '--output', output])
  ).rejects.toThrow('incomplete');
  await expect(lstat(output)).rejects.toThrow();
  expect(mockClose).toHaveBeenCalledTimes(1);
});

it('rejects incomplete arguments and remote endpoints before querying private observations', async () => {
  await expect(runBindSecurityInvocationsCli([])).rejects.toThrow('Supply');
  await expect(
    runBindSecurityInvocationsCli([
      '--events',
      input,
      '--output',
      output,
      '--es-url',
      'https://example.com',
    ])
  ).rejects.toThrow('loopback');
  expect(mockSearch).not.toHaveBeenCalled();
});
