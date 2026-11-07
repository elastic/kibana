/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { codexHash, createCodexSessionParser } from './codex_session_parser';
import { codexIndexName, validateCodexTarget } from './codex_index';

const start = '2026-10-12T10:00:00.000Z';
const later = '2026-10-12T10:00:01.000Z';
const options = {
  agentId: 'codex-installation',
  spaceId: 'default',
  fileHash: 'salted-file-hash',
  hashSalt: 'local-salt',
  ingestedAt: later,
};
const meta = JSON.stringify({
  timestamp: start,
  type: 'session_meta',
  payload: {
    id: 'thread-1',
    session_id: 'runtime-1',
    timestamp: start,
    cli_version: '0.136.0',
    cwd: '/private/secret-path',
    base_instructions: 'PRIVATE-PROMPT',
  },
});
const context = JSON.stringify({
  timestamp: start,
  type: 'turn_context',
  payload: {
    turn_id: 'turn-1',
    model: 'gpt-test',
    sandbox_policy: { type: 'workspace-write', writable_roots: ['/private/secret-path'] },
    approval_policy: 'on-request',
    instructions: 'PRIVATE-INSTRUCTION',
  },
});
const command = (id: string, exit: number, timestamp = later): string =>
  JSON.stringify({
    timestamp,
    type: 'event_msg',
    payload: {
      type: 'item_completed',
      thread_id: 'thread-1',
      item: {
        id,
        type: 'CommandExecution',
        command: ['PRIVATE-CODE'],
        aggregated_output: 'PRIVATE-OUTPUT Error: misleading prose',
        exit_code: exit,
        status: 'completed',
        duration: { secs: 1, nanos: 250_000_000 },
      },
    },
  });

const parse = (lines: string[]) => {
  const parser = createCodexSessionParser(options);
  lines.forEach(parser.consume);
  return parser.finalize();
};

describe('Codex session metadata projection', () => {
  it('keeps the verified local owner separate from the explicitly recorded session creator', () => {
    const owner = {
      id: 'local-os:installation-owner',
      name: 'james',
      provenance: 'local_os_account' as const,
    };
    const parser = createCodexSessionParser({ ...options, owner });
    parser.consume(
      JSON.stringify({
        timestamp: start,
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          creator_user_id: 'user-RecordedOpaqueId',
          creator_account_id: 'account-RecordedOpaqueId',
          agent_nickname: 'Hilbert',
          thread_source: 'subagent',
          agent_path: '/root/identity_readiness',
          owner: { name: 'PRIVATE-SPOOFED-OWNER' },
          creator_display_name: 'PRIVATE-INFERRED-NAME',
          base_instructions: 'PRIVATE-PROMPT',
        },
      })
    );
    parser.consume(command('actual', 0));
    const docs = parser.finalize().observations;
    expect(docs).toHaveLength(2);
    for (const document of docs) {
      expect(document.owner).toEqual(owner);
      expect(document.creator).toEqual({
        id: 'user-RecordedOpaqueId',
        account_id: 'account-RecordedOpaqueId',
        provenance: 'codex_session_creator',
      });
      expect(document.session).toMatchObject({
        nickname: 'Hilbert',
        role: 'subagent',
        agent_path: '/root/identity_readiness',
      });
      expect(document).not.toHaveProperty('actor');
      expect(document).not.toHaveProperty('user');
    }
    expect(JSON.stringify(docs)).not.toMatch(/PRIVATE|creator_display_name/);
    expect(docs.map((document) => document.event.id)).toEqual(
      parse([meta, command('actual', 0)]).observations.map((document) => document.event.id)
    );
  });

  it('does not derive a creator or local owner from arbitrary source identity fields', () => {
    const result = parse([
      JSON.stringify({
        timestamp: start,
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          user: { id: 'PRIVATE-USER', name: 'PRIVATE-NAME' },
          owner: { id: 'PRIVATE-OWNER', name: 'PRIVATE-NAME', provenance: 'local_os_account' },
          actor: { id: 'PRIVATE-ACTOR' },
          creator_account_id: 'PRIVATE-ACCOUNT-WITHOUT-USER',
        },
      }),
      JSON.stringify({
        timestamp: later,
        type: 'turn_context',
        payload: { creator_user_id: 'PRIVATE-TURN-CREATOR' },
      }),
    ]);
    expect(result.observations[0].owner).toBeUndefined();
    expect(result.observations[0].creator).toBeUndefined();
    expect(JSON.stringify(result.observations)).not.toContain('PRIVATE');
  });

  it('rejects unbounded labels and filesystem paths while preserving recognized source roles', () => {
    const result = parse([
      JSON.stringify({
        timestamp: start,
        type: 'session_meta',
        payload: {
          id: 'thread-1',
          agent_nickname: 'PRIVATE-PROMPT\ncontent',
          agent_path: '/Users/james/private-folder',
          thread_source: 'guardian_review',
        },
      }),
    ]);
    expect(result.observations[0].session).toMatchObject({ role: 'guardian_review' });
    expect(result.observations[0].session.nickname).toBeUndefined();
    expect(result.observations[0].session.agent_path).toBeUndefined();
    expect(JSON.stringify(result.observations)).not.toMatch(/PRIVATE|private-folder/);
  });

  it('does not replace accepted identity metadata with inherited or repeated headers', () => {
    const identityHeader = (id: string, creator: string): string =>
      JSON.stringify({
        timestamp: start,
        type: 'session_meta',
        payload: { id, creator_user_id: creator, thread_source: 'user' },
      });
    const result = parse([
      identityHeader('thread-1', 'user-actual'),
      identityHeader('thread-parent', 'user-inherited'),
      identityHeader('thread-1', 'user-repeated'),
    ]);
    expect(result.observations[0].creator?.id).toBe('user-actual');
    expect(JSON.stringify(result.observations)).not.toMatch(/user-inherited|user-repeated/);
  });

  it('exports only permitted metadata and explicit exit-code outcomes, never source content', () => {
    const result = parse([meta, context, command('process-1', 0), command('process-2', 7)]);
    const [summary, success, failure] = result.observations;
    expect(success.event.outcome).toBe('success');
    expect(failure.event.outcome).toBe('failure');
    expect(failure.process?.exit_code).toBe(7);
    expect(success.duration_ms).toBe(1250);
    expect(summary.session).toMatchObject({
      id: 'thread-1',
      runtime_id: 'runtime-1',
      tool_call_count: 2,
      success_count: 1,
      failure_count: 1,
      unknown_count: 0,
      summary_complete: true,
      completed: false,
      completion_known: false,
      models: ['gpt-test'],
    });
    expect(summary.session.tools).toEqual([
      { name: 'exec_command', count: 2, success_count: 1, failure_count: 1, unknown_count: 0 },
    ]);
    expect(success.source.record_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result.observations)).not.toMatch(
      /PRIVATE|secret-path|writable_roots|aggregated_output|base_instructions/
    );
  });

  it('uses typed MCP errors and ignores result content and arguments', () => {
    const mcp = (id: string, isError: boolean): string =>
      JSON.stringify({
        timestamp: later,
        type: 'event_msg',
        payload: {
          type: 'item_completed',
          item: {
            type: 'McpToolCall',
            id,
            server: 'browser',
            tool: 'click',
            arguments: { token: 'PRIVATE-TOKEN' },
            result: { isError, content: [{ text: 'PRIVATE-RESULT' }] },
          },
        },
      });
    const result = parse([meta, mcp('mcp-1', false), mcp('mcp-2', true)]);
    expect(result.observations.slice(1).map((doc) => doc.event.outcome)).toEqual([
      'success',
      'failure',
    ]);
    expect(JSON.stringify(result.observations)).not.toContain('PRIVATE');
  });

  it('keeps untyped tool output unknown even when its text claims success or failure', () => {
    const result = parse([
      meta,
      JSON.stringify({
        timestamp: start,
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'shell',
          call_id: 'call-1',
          arguments: 'PRIVATE-INPUT',
        },
      }),
      JSON.stringify({
        timestamp: later,
        type: 'response_item',
        payload: {
          type: 'function_call_output',
          call_id: 'call-1',
          output: 'Process exited with code 0. Error PRIVATE-OUTPUT',
        },
      }),
    ]);
    expect(result.observations[1].event.outcome).toBe('unknown');
    expect(result.observations[1].duration_ms).toBeUndefined();
    expect(result.observations[0].session.unknown_count).toBe(1);
    expect(JSON.stringify(result.observations)).not.toContain('PRIVATE');
  });

  it('merges matching native and response call IDs and creates deterministic replay IDs', () => {
    const response = JSON.stringify({
      timestamp: start,
      type: 'response_item',
      payload: { type: 'function_call', call_id: 'call-1', name: 'browser.click' },
    });
    const completed = JSON.stringify({
      timestamp: later,
      type: 'event_msg',
      payload: {
        type: 'item_completed',
        item: {
          type: 'McpToolCall',
          id: 'call-1',
          server: 'browser',
          tool: 'click',
          result: { isError: false },
        },
      },
    });
    const result = parse([meta, response, completed, completed]);
    expect(result.observations).toHaveLength(2);
    expect(result.observations[1].source.id_kind).toBe('call');
    expect(result.observations[1].event.outcome).toBe('success');
    expect(result.observations.map((doc) => doc.event.id)).toEqual(
      parse([meta, response, completed]).observations.map((doc) => doc.event.id)
    );
  });

  it('distinguishes model orchestration from runtime observations without inventing parent joins', () => {
    const response = JSON.stringify({
      timestamp: start,
      type: 'response_item',
      payload: {
        type: 'custom_tool_call',
        call_id: 'model-call',
        name: 'exec',
        input: 'PRIVATE-CODE',
      },
    });
    const result = parse([meta, response, command('native-command-item', 0)]);
    expect(result.observations[0].session).toMatchObject({
      tool_call_count: 2,
      model_tool_call_count: 1,
      native_tool_completion_count: 1,
    });
    expect(result.observations[1].source.observation_type).toBe('model_tool_call');
    expect(result.observations[2].source.observation_type).toBe('native_tool_completion');
    expect(result.observations[1].tool?.call.id).not.toBe(result.observations[2].tool?.call.id);
  });

  it('retains native completion provenance when a duplicate model request appears later', () => {
    const response = JSON.stringify({
      timestamp: start,
      type: 'response_item',
      payload: { type: 'function_call', call_id: 'same-id', name: 'shell' },
    });
    const completion = command('same-id', 0);
    const result = parse([meta, completion, response]);
    expect(result.observations[0].session).toMatchObject({
      tool_call_count: 1,
      model_tool_call_count: 0,
      native_tool_completion_count: 1,
    });
    expect(result.observations[1].source.record_hash).toBe(codexHash(options.hashSalt, completion));
    expect(result.observations[1].source.observation_type).toBe('native_tool_completion');
  });

  it('timestamps merged failure evidence at native completion instead of the earlier model request', () => {
    const response = JSON.stringify({
      timestamp: '2026-10-12T12:00:00.000Z',
      type: 'response_item',
      payload: { type: 'function_call', call_id: 'long-call', name: 'exec_command' },
    });
    const completion = command('long-call', 1, '2026-10-12T12:10:00.000Z');
    const result = parse([meta, response, completion]);
    expect(result.observations).toHaveLength(2);
    expect(result.observations[1]['@timestamp']).toBe('2026-10-12T12:10:00.000Z');
    expect(result.observations[1].event.outcome).toBe('failure');
    expect(result.observations[1].source.record_hash).toBe(codexHash(options.hashSalt, completion));
    expect(result.observations[1].source.observation_type).toBe('native_tool_completion');
  });

  it('snapshots tool context and records the last known session configuration', () => {
    const changed = JSON.stringify({
      timestamp: later,
      type: 'turn_context',
      payload: {
        model: 'gpt-next',
        sandbox_policy: { type: 'read-only' },
        approval_policy: 'never',
      },
    });
    const result = parse([meta, context, command('before', 0), changed, command('after', 0)]);
    expect(result.observations[1].model).toBe('gpt-test');
    expect(result.observations[2].model).toBe('gpt-next');
    expect(result.observations[0].model).toBe('gpt-next');
    expect(result.observations[0].session.models).toEqual(['gpt-next', 'gpt-test']);
  });

  it('excludes inherited fork records and foreign thread events', () => {
    const oldCommand = command('inherited', 0, '2026-10-11T10:00:00.000Z');
    const foreignMeta = JSON.stringify({
      timestamp: later,
      type: 'session_meta',
      payload: { id: 'parent-thread', timestamp: start },
    });
    const foreignEvent = command('foreign', 0).replace('thread-1', 'parent-thread');
    const result = parse([meta, oldCommand, foreignMeta, foreignEvent, command('actual', 0)]);
    expect(result.observations).toHaveLength(2);
    expect(result.excludedInheritedRecords).toBe(3);
    expect(result.observations[1].tool?.call.id).toBe('actual');
  });

  it('counts completed and aborted turns without inventing session completion or duration', () => {
    const task = (type: string, turnId: string): string =>
      JSON.stringify({
        timestamp: later,
        type: 'event_msg',
        payload: { type, turn_id: turnId, last_agent_message: 'PRIVATE-ANSWER' },
      });
    const result = parse([
      meta,
      task('task_complete', 'one'),
      task('task_complete', 'one'),
      task('turn_aborted', 'two'),
    ]);
    expect(result.observations[0].session).toMatchObject({
      completed_turn_count: 1,
      aborted_turn_count: 1,
      completion_known: false,
    });
    expect(result.observations[0].duration_ms).toBeUndefined();
    expect(result.observations[0].event.outcome).toBe('unknown');
  });

  it('marks malformed and truncated inputs incomplete while retaining valid evidence', () => {
    const result = parse([meta, command('valid', 0), '{"payload":']);
    expect(result.observations[0].session.summary_complete).toBe(false);
    expect(result.malformedLines).toBe(1);
    expect(result.observations).toHaveLength(2);
  });

  it('marks tool-count truncation incomplete and never exceeds its bound', () => {
    const parser = createCodexSessionParser({ ...options, maxToolCalls: 1 });
    [meta, command('one', 0), command('two', 1)].forEach(parser.consume);
    expect(parser.finalize().observations[0].session).toMatchObject({
      tool_call_count: 1,
      summary_complete: false,
    });
  });
});

describe('Codex import destination', () => {
  it.each(['http://localhost:9200', 'http://127.0.0.1:9200', 'http://[::1]:9200'])(
    'allows loopback %s',
    (url) => {
      expect(validateCodexTarget(url)).toBeInstanceOf(URL);
    }
  );
  it.each([
    'http://localhost.attacker.test:9200',
    'https://remote.example',
    'file:///tmp/elastic',
    'http://elastic:private@localhost:9200',
  ])('rejects unsafe defaults %s', (url) => {
    expect(() => validateCodexTarget(url)).toThrow();
  });
  it('permits remote export only by explicit option', () => {
    expect(validateCodexTarget('https://example.test', true).hostname).toBe('example.test');
  });
  it('uses the exact separate index and rejects unsafe space names', () => {
    expect(codexIndexName('default')).toBe('logs-codex.entity_intelligence-default');
    expect(() => codexIndexName('default,*')).toThrow();
  });
});
