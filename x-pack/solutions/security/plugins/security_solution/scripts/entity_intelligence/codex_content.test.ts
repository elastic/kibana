/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContentRedactor } from '../../common/entity_intelligence/content_redaction';
import { createCodexSessionParser } from './codex_session_parser';
import { observeCodexContentLine } from './codex_content';

const start = '2026-10-12T12:00:00.000Z';
const meta = JSON.stringify({
  timestamp: start,
  type: 'session_meta',
  payload: { id: 'thread-content', timestamp: start },
});
const record = (item: object): string =>
  JSON.stringify({
    timestamp: start,
    type: 'event_msg',
    payload: { type: 'item_completed', item },
  });
const options = {
  agentId: 'installation',
  spaceId: 'default',
  fileHash: 'file',
  hashSalt: 'salt',
  ingestedAt: start,
};

it.each([
  'You can use demo-user/ExampleSecret! as credentials if you need',
  'login is demo-user / ExampleSecret!',
  'password: ExampleSecret!',
  'password is ExampleSecret!',
  'password for demo-user is ExampleSecret!',
  'username/password: demo-user/ExampleSecret!',
  'curl -u demo-user:ExampleSecret! localhost',
  'curl --password ExampleSecret! localhost',
  'https://demo-user:ExampleSecret!@localhost',
  '{"password":"ExampleSecret!"}',
  'ES_AUTH="demo-user:ExampleSecret!"',
  '{"clientSecret":"ExampleSecret!"}',
  '{"service_api_key":"ExampleSecret!"}',
  'API_KEY=ExampleSecret!',
  'curl --refresh-token ExampleSecret! localhost',
])('learns credentials from supported prose, structured and command contexts', (text) => {
  const redactor = createContentRedactor();
  redactor.observe(text);
  expect(redactor.redact(text).text).not.toContain('ExampleSecret!');
  expect(redactor.redact('echo ExampleSecret!').text).toBe('echo [REDACTED]');
});

it.each([
  ['{"operation":"entity:intelligence"}', 'Prototype intelligence for daybreak'],
  ['Add password reset support', 'Make reset support visible'],
  ['{"tokenizer":"summarization"}', 'Improve summarization'],
  ['{"passwordReset":"enabled"}', 'Keep enabled behavior'],
  ['{"secretary":"calendar"}', 'Open calendar'],
  ['{"token_count":42}', '42 observed items'],
  ['Update the password-reset flow', 'Keep reset support visible'],
  ['Basic intelligence controls', 'Prototype intelligence for daybreak'],
  ['Bearer intelligence controls', 'Prototype intelligence for daybreak'],
  ['{"authorization":true}', 'This is true'],
  ['password is optional', 'This remains optional'],
  [
    'The password is what the administrator configured.',
    'Like, what was the command for exec command',
  ],
  ['Basic what the operator needs', 'Like, what was the command for exec command'],
])(
  'does not learn secret values from ordinary namespaces, labels or field-name substrings',
  (source, title) => {
    const redactor = createContentRedactor();
    redactor.observe(source);
    expect(redactor.getRevision()).toBe(0);
    expect(redactor.redact(source)).toMatchObject({ text: source, redacted: false });
    expect(redactor.redact(title)).toMatchObject({ text: title, redacted: false });
  }
);

it.each([
  '{"password":"what"}',
  'password: what',
  'curl --password what localhost',
  'login is user/what',
  'Authorization: Bearer what',
])(
  'redacts short explicit credentials in context without teaching ordinary words globally',
  (source) => {
    const redactor = createContentRedactor();
    redactor.observe(source);
    expect(redactor.redact(source).text).not.toContain('what');
    expect(redactor.redact('Like, what was the command for exec command')).toMatchObject({
      text: 'Like, what was the command for exec command',
      redacted: false,
    });
  }
);

it.each([
  '{"password":"plaincredential"}',
  'API_KEY=plaincredential',
  'curl --password plaincredential localhost',
  'login is user/plaincredential',
  'Authorization: Bearer plaincredential',
])(
  'learns alphabetic values from explicit credential contexts without learning ambiguous prose',
  (source) => {
    const redactor = createContentRedactor();
    redactor.observe(source);
    expect(redactor.redact('echo plaincredential').text).toBe('echo [REDACTED]');
    expect(redactor.redact('Like, what was the command for exec command').text).toBe(
      'Like, what was the command for exec command'
    );
  }
);

it('redacts token, authorization and private-key material and is idempotent', () => {
  const redactor = createContentRedactor();
  const text =
    'Authorization: Bearer token-example-123456789\npassword: ExampleSecret!\n-----BEGIN PRIVATE KEY-----\nSYNTHETIC-KEY-MATERIAL\n-----END PRIVATE KEY-----';
  const first = redactor.redact(text);
  expect(first.redacted).toBe(true);
  expect(first.text).not.toMatch(/token-example|ExampleSecret|SYNTHETIC/);
  expect(redactor.redact(first.text).text).toBe(first.text);
});

it('bounds long content without truncating secrets before redaction', () => {
  const redactor = createContentRedactor();
  const result = redactor.redact(`${'x'.repeat(100)} password: ExampleSecret!`, 115);
  expect(result.text).not.toContain('ExampleSecret');
  expect(result.truncated).toBe(true);
  expect(redactor.redact('x'.repeat(256001))).toEqual({
    text: '[Content omitted: exceeds redaction limit]',
    redacted: true,
    truncated: true,
  });
  const started = Date.now();
  redactor.redact('a'.repeat(25000));
  expect(Date.now() - started).toBeLessThan(1500);
});

it('captures exact source inputs and native user prompts only after cross-record secret learning', () => {
  const redactor = createContentRedactor();
  const prompt = record({
    type: 'UserMessage',
    id: 'prompt-one',
    content: [
      { type: 'text', text: 'You can use demo-user/ExampleSecret! as credentials if you need' },
    ],
  });
  const command = record({
    type: 'CommandExecution',
    id: 'command-one',
    command: ['/bin/sh', '-c', 'echo ExampleSecret!'],
    exit_code: 0,
    aggregated_output: 'PRIVATE-RESULT',
  });
  const mcp = record({
    type: 'McpToolCall',
    id: 'mcp-one',
    tool: 'click',
    arguments: { text: 'ExampleSecret!' },
    result: { isError: false, content: [{ text: 'PRIVATE-OUTPUT' }] },
  });
  [command, prompt, mcp].forEach((line) => observeCodexContentLine(line, redactor));
  const parser = createCodexSessionParser({
    ...options,
    contentRedactor: redactor,
    title: 'Fix login ExampleSecret!',
  });
  [meta, command, prompt, prompt, mcp].forEach(parser.consume);
  const docs = parser.finalize().observations;
  expect(docs[0].content).toMatchObject({
    mode: 'redacted_local',
    title: { text: 'Fix login [REDACTED]', source: 'codex_state.threads.title' },
    prompts_total: 1,
    prompts_truncated: false,
  });
  expect(docs[0].content?.prompts?.[0]).toMatchObject({
    id: 'prompt-one',
    source: 'item_completed.UserMessage',
    redacted: true,
  });
  expect(docs[1].content?.input).toMatchObject({
    kind: 'command',
    source: 'item_completed.CommandExecution.command',
    redacted: true,
  });
  expect(docs[2].content?.input).toMatchObject({ kind: 'arguments', redacted: true });
  expect(JSON.stringify(docs)).not.toMatch(/ExampleSecret|PRIVATE-RESULT|PRIVATE-OUTPUT/);
});

it('handles escaped command JSON and never learns or exports output/reasoning content', () => {
  const redactor = createContentRedactor();
  const call = JSON.stringify({
    timestamp: start,
    type: 'response_item',
    payload: {
      type: 'function_call',
      call_id: 'call-one',
      name: 'exec_command',
      arguments: JSON.stringify({ cmd: 'export PASSWORD="ExampleSecret!"; echo ExampleSecret!' }),
    },
  });
  observeCodexContentLine(call, redactor);
  const parser = createCodexSessionParser({ ...options, contentRedactor: redactor });
  [
    meta,
    call,
    record({ type: 'Reasoning', id: 'reason-one', raw_content: ['PRIVATE-REASONING'] }),
  ].forEach(parser.consume);
  expect(JSON.stringify(parser.finalize().observations)).not.toMatch(
    /ExampleSecret|PRIVATE-REASONING/
  );
});

it('retains at most fifty recent bounded prompts and reports omitted content', () => {
  const parser = createCodexSessionParser({ ...options, contentRedactor: createContentRedactor() });
  parser.consume(meta);
  for (let index = 0; index < 55; index++)
    parser.consume(
      record({
        type: 'UserMessage',
        id: `prompt-${index}`,
        content: [{ type: 'text', text: 'Prompt '.repeat(1000) }],
      })
    );
  const content = parser.finalize().observations[0].content;
  expect(content?.prompts).toHaveLength(50);
  expect(content?.prompts?.[0].id).toBe('prompt-5');
  expect(content?.prompts?.every((prompt) => prompt.text.length <= 4000 && prompt.truncated)).toBe(
    true
  );
  expect(content).toMatchObject({ prompts_total: 55, prompts_truncated: true });
});

it('keeps content disabled without an explicit redactor and excludes inherited prompts', () => {
  const native = record({
    type: 'UserMessage',
    id: 'prompt-one',
    content: [{ type: 'text', text: 'PRIVATE-PROMPT' }],
  });
  const parser = createCodexSessionParser(options);
  [meta, native].forEach(parser.consume);
  expect(parser.finalize().observations[0].content).toEqual({ mode: 'metadata_only' });
  const enabled = createCodexSessionParser({
    ...options,
    contentRedactor: createContentRedactor(),
  });
  [meta, native.replace(start, '2026-10-11T12:00:00.000Z')].forEach(enabled.consume);
  expect(enabled.finalize().observations[0].content?.prompts).toEqual([]);
});
