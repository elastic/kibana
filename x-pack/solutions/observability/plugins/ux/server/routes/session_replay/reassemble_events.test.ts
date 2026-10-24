/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deflateSync } from 'zlib';
import {
  MAX_REPLAY_CHUNKS,
  MAX_REPLAY_INFLATE_BYTES,
  reassembleReplayEvents,
  reassembleReplayEventsWithCursor,
} from './reassemble_events';

describe('reassembleReplayEvents', () => {
  it('reassembles single-chunk events in sort order', () => {
    const events = reassembleReplayEvents([
      {
        body: JSON.stringify({ type: 3, timestamp: 2, data: { source: 2 } }),
        attributes: {
          'rr-web.event': 2,
          'rr-web.chunk': 1,
          'rr-web.total-chunks': 1,
        },
      },
      {
        body: JSON.stringify({ type: 2, timestamp: 1, data: { node: {} } }),
        attributes: {
          'rr-web.event': 1,
          'rr-web.chunk': 1,
          'rr-web.total-chunks': 1,
        },
      },
    ]);

    expect(events).toEqual([
      { type: 2, timestamp: 1, data: { node: {} } },
      { type: 3, timestamp: 2, data: { source: 2 } },
    ]);
  });

  it('joins multi-chunk bodies and supports body.text', () => {
    const events = reassembleReplayEvents([
      {
        body: { text: '{"type":2,"timestamp":1,' },
        attributes: {
          'rr-web.event': 5,
          'rr-web.chunk': 1,
          'rr-web.total-chunks': 2,
        },
      },
      {
        body: { text: '"data":{"ok":true}}' },
        attributes: {
          'rr-web.event': 5,
          'rr-web.chunk': 2,
          'rr-web.total-chunks': 2,
        },
      },
    ]);

    expect(events).toEqual([{ type: 2, timestamp: 1, data: { ok: true } }]);
  });

  it('skips incomplete chunk sets and malformed JSON', () => {
    const events = reassembleReplayEvents([
      {
        body: '{"partial"',
        attributes: {
          'rr-web.event': 1,
          'rr-web.chunk': 1,
          'rr-web.total-chunks': 2,
        },
      },
      {
        body: 'not-json',
        attributes: {
          'rr-web.event': 2,
          'rr-web.chunk': 1,
          'rr-web.total-chunks': 1,
        },
      },
    ]);

    expect(events).toEqual([]);
  });

  it('returns the last complete event key and ignores trailing incomplete chunks', () => {
    const assembled = reassembleReplayEventsWithCursor([
      {
        body: JSON.stringify({ type: 4, timestamp: 1 }),
        attributes: { 'rr-web.event': 1, 'rr-web.chunk': 1, 'rr-web.total-chunks': 1 },
      },
      {
        body: JSON.stringify({ type: 2, timestamp: 2 }),
        attributes: { 'rr-web.event': 2, 'rr-web.chunk': 1, 'rr-web.total-chunks': 1 },
      },
      {
        body: '{"partial"',
        attributes: { 'rr-web.event': 3, 'rr-web.chunk': 1, 'rr-web.total-chunks': 2 },
      },
    ]);

    expect(assembled.events).toEqual([
      { type: 4, timestamp: 1 },
      { type: 2, timestamp: 2 },
    ]);
    expect(assembled.lastCompleteEvent).toBe(2);
  });

  it('reads nested rr-web attribute objects', () => {
    const events = reassembleReplayEvents([
      {
        body: '{"type":4,"timestamp":10}',
        attributes: {
          'rr-web': { event: 1, chunk: 1, 'total-chunks': 1 },
        },
      },
    ]);

    expect(events).toEqual([{ type: 4, timestamp: 10 }]);
  });
});

describe('packed replay events', () => {
  it('inflates rrweb packer payloads', () => {
    const event = { type: 2, timestamp: 1, data: { packed: true } };
    const packed = deflateSync(Buffer.from(JSON.stringify(event), 'utf8')).toString('latin1');

    const events = reassembleReplayEvents([
      {
        body: JSON.stringify(packed),
        attributes: {
          'rr-web.event': 1,
          'rr-web.chunk': 1,
          'rr-web.total-chunks': 1,
          'rrweb.packed': 1,
        },
      },
    ]);

    expect(events).toEqual([event]);
  });

  it('skips events that claim more chunks than the cap', () => {
    const events = reassembleReplayEvents([
      {
        body: JSON.stringify({ type: 2, timestamp: 1 }),
        attributes: {
          'rr-web.event': 1,
          'rr-web.chunk': 1,
          'rr-web.total-chunks': MAX_REPLAY_CHUNKS + 1,
        },
      },
    ]);

    expect(events).toEqual([]);
  });

  it('skips packed payloads that inflate past the byte cap', () => {
    const packed = deflateSync(Buffer.alloc(MAX_REPLAY_INFLATE_BYTES + 1, 97)).toString('latin1');

    const events = reassembleReplayEvents([
      {
        body: JSON.stringify(packed),
        attributes: {
          'rr-web.event': 1,
          'rr-web.chunk': 1,
          'rr-web.total-chunks': 1,
          'rrweb.packed': 1,
        },
      },
    ]);

    expect(events).toEqual([]);
  });
});
