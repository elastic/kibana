/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeRuntimePin } from './runtime_pin';

const PINNED = `agent:
  internal:
    runtime:
      default: process
      osquerybeat:
        default: process
        osquery: process
`;

const expectOk = (result: ReturnType<typeof mergeRuntimePin>) => {
  if (!result.ok) throw new Error(`expected ok, got refusal: ${result.message}`);
  return result;
};

describe('mergeRuntimePin', () => {
  it.each([
    ['empty string', ''],
    ['undefined', undefined],
    ['null', null],
  ])('builds the full block from %s', (_, input) => {
    const result = expectOk(mergeRuntimePin(input));
    expect(result.after).toBe(PINNED);
    expect(result.changed).toBe(true);
    expect(result.conflicts).toEqual([]);
  });

  it('appends the block after unrelated top-level keys', () => {
    expect(expectOk(mergeRuntimePin('foo: bar\n')).after).toBe(`foo: bar\n${PINNED}`);
  });

  it('keeps comments and unrelated keys, and overwrites a conflicting value in place', () => {
    const input = `# top comment: keep me
agent:
  internal:
    # runtime comment
    runtime:
      default: otel   # inline comment on a conflicting value
      filebeat:
        default: otel
    other_setting: 42 # unrelated sibling under internal
unrelated:
  key: value # unrelated top-level key
`;
    const result = expectOk(mergeRuntimePin(input));
    expect(result.after).toBe(`# top comment: keep me
agent:
  internal:
    # runtime comment
    runtime:
      default: process # inline comment on a conflicting value
      filebeat:
        default: otel
      osquerybeat:
        default: process
        osquery: process
    other_setting: 42 # unrelated sibling under internal
unrelated:
  key: value # unrelated top-level key
`);
    expect(result.conflicts).toEqual([
      { key: 'agent.internal.runtime.default', from: 'otel', to: 'process' },
    ]);
  });

  it('overwrites every one of the three keys when all conflict', () => {
    const input = `agent:
  internal:
    runtime:
      default: otel
      osquerybeat:
        default: otel
        osquery: otel
`;
    const result = expectOk(mergeRuntimePin(input));
    expect(result.after).toBe(PINNED);
    expect(result.conflicts.map(({ key }) => key)).toEqual([
      'agent.internal.runtime.default',
      'agent.internal.runtime.osquerybeat.default',
      'agent.internal.runtime.osquerybeat.osquery',
    ]);
  });

  it('is byte-identical on a second application', () => {
    const first = expectOk(mergeRuntimePin('# keep\nfoo: bar\n'));
    const second = expectOk(mergeRuntimePin(first.after));
    expect(second.after).toBe(first.after);
    expect(second.changed).toBe(false);
    expect(second.conflicts).toEqual([]);
  });

  it.each([
    ['a scalar agent', 'agent: foo\n', 'agent.internal.runtime.default'],
    ['a null internal', 'agent:\n  internal: null\n', 'agent.internal.runtime.default'],
    [
      'a scalar runtime',
      'agent:\n  internal:\n    runtime: otel\n',
      'agent.internal.runtime.default',
    ],
  ])('refuses %s and names the key', (_, input, key) => {
    const result = mergeRuntimePin(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(key);
      expect(result.before).toBe(input);
    }
  });

  it('keeps the machine code out of the human message', () => {
    const result = mergeRuntimePin('agent: [unclosed\n  x: : y\n');
    expect(result).toMatchObject({ ok: false, code: 'yaml_parse_error' });
    if (!result.ok) {
      expect(result.message).not.toContain('yaml_parse_error');
      expect(result.message).toContain('the YAML cannot be parsed');
    }
  });

  it('refuses invalid YAML', () => {
    const result = mergeRuntimePin('agent: [unclosed\n  x: : y\n');
    expect(result).toMatchObject({ ok: false, code: 'yaml_parse_error' });
  });

  it('refuses a non-mapping document', () => {
    expect(mergeRuntimePin('- a\n- b\n')).toMatchObject({
      ok: false,
      key: 'agent',
      code: 'not_mapping',
    });
  });
});
