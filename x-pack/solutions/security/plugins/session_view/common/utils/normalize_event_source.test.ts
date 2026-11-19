/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessEvent } from '../types/v1';
import { normalizeEventSource } from './normalize_event_source';

// shape returned by a logsdb (stored _source) index
const nestedSource: ProcessEvent = {
  '@timestamp': '2026-11-18T20:13:18.125Z',
  event: { kind: 'event', action: ['exec'], category: ['process'], type: ['start'] },
  host: { name: 'host-1', ip: ['10.0.0.1'], mac: ['00-00-00-00-00-01'] },
  process: {
    entity_id: 'abc',
    args: ['at'],
    start: '2026-11-18T20:13:18.125674669Z',
    parent: { entity_id: 'xyz', args: ['bash'] },
    entry_leader: { entity_id: 'root1', args: ['sshd'] },
    previous: [{ args: ['bash'], executable: '/bin/bash' }],
  },
  orchestrator: { resource: { name: 'pod', labels: ['app:a'], annotations: ['note:b'] } },
};

// the same document as returned by a logsdb_columnar index
const columnarSource = {
  '@timestamp': '2026-11-18T20:13:18.125Z',
  'event.kind': 'event',
  'event.action': 'exec',
  'event.category': 'process',
  'event.type': 'start',
  'host.name': 'host-1',
  'host.ip': '10.0.0.1',
  'host.mac': '00-00-00-00-00-01',
  'process.entity_id': 'abc',
  'process.args': 'at',
  'process.start': '2026-11-18T20:13:18.125674669Z',
  'process.parent.entity_id': 'xyz',
  'process.parent.args': 'bash',
  'process.entry_leader.entity_id': 'root1',
  'process.entry_leader.args': 'sshd',
  'process.previous': { args: 'bash', executable: '/bin/bash' },
  'orchestrator.resource.name': 'pod',
  'orchestrator.resource.labels': 'app:a',
  'orchestrator.resource.annotations': 'note:b',
};

describe('normalizeEventSource', () => {
  it('expands a columnar (flat) source into the nested, array-typed shape', () => {
    expect(normalizeEventSource(columnarSource)).toStrictEqual(nestedSource);
  });

  it('leaves an already nested source unchanged (idempotent)', () => {
    expect(normalizeEventSource(nestedSource)).toStrictEqual(nestedSource);
    expect(normalizeEventSource(normalizeEventSource(columnarSource))).toStrictEqual(nestedSource);
  });

  it('does not mutate the input', () => {
    const input = structuredClone(columnarSource);
    const result = normalizeEventSource(input);

    expect(input).toStrictEqual(columnarSource);
    expect(result?.process?.previous).not.toBe(input['process.previous']);
  });

  it('returns undefined for a missing source', () => {
    expect(normalizeEventSource(undefined)).toBeUndefined();
  });

  it('keeps multi-value arrays in their original order', () => {
    const result = normalizeEventSource({
      'process.entity_id': 'abc',
      'process.args': ['b', 'a', 'b', 'c'],
      'host.ip': ['10.0.0.1', '10.0.0.2'],
    });

    expect(result?.process?.args).toEqual(['b', 'a', 'b', 'c']);
    expect(result?.host?.ip).toEqual(['10.0.0.1', '10.0.0.2']);
  });

  it('coerces a scalar event.action so includes() is an array lookup, not a substring match', () => {
    const result = normalizeEventSource({ 'event.action': 'executed' });

    expect(result?.event?.action).toEqual(['executed']);
    expect(result?.event?.action?.includes('exec')).toBe(false);
  });

  it('defaults missing process.args to an empty array', () => {
    expect(normalizeEventSource({ 'process.entity_id': 'abc' })?.process?.args).toEqual([]);
  });

  it('does not add fields that are absent', () => {
    expect(normalizeEventSource({ '@timestamp': '2026-11-18T20:13:18.125Z' })).toStrictEqual({
      '@timestamp': '2026-11-18T20:13:18.125Z',
    });
  });

  describe('process.previous', () => {
    it('normalizes an array of entries from a nested mapping', () => {
      const result = normalizeEventSource({
        'process.entity_id': 'abc',
        'process.previous': [
          { args: 'sh', executable: '/bin/sh' },
          { args: ['bash', '-c'], executable: '/bin/bash' },
        ],
      });

      expect(result?.process?.previous).toEqual([
        { args: ['sh'], executable: '/bin/sh' },
        { args: ['bash', '-c'], executable: '/bin/bash' },
      ]);
    });

    it('keeps only executables when a non-nested mapping flattened entries into parallel arrays', () => {
      const result = normalizeEventSource({
        'process.entity_id': 'abc',
        'process.previous.args': ['sh', 'bash', '-c'],
        'process.previous.executable': ['/bin/sh', '/bin/bash'],
      });

      expect(result?.process?.previous).toEqual([
        { executable: '/bin/sh' },
        { executable: '/bin/bash' },
      ]);
    });

    it('keeps args paired when a non-nested mapping holds a single entry', () => {
      const result = normalizeEventSource({
        'process.entity_id': 'abc',
        'process.previous.args': ['bash', '-c'],
        'process.previous.executable': '/bin/bash',
      });

      expect(result?.process?.previous).toEqual([
        { args: ['bash', '-c'], executable: '/bin/bash' },
      ]);
    });
  });

  it('normalizes a flat alert source', () => {
    const result = normalizeEventSource({
      'event.kind': 'signal',
      'event.category': 'file',
      'kibana.alert.uuid': 'alert-1',
      'kibana.alert.original_event.action': 'open',
      'process.entity_id': 'abc',
    });

    expect(result?.event?.category).toEqual(['file']);
    expect(result?.kibana?.alert?.uuid).toBe('alert-1');
    expect(result?.kibana?.alert?.original_event?.action).toEqual(['open']);
  });
});
