/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reassembleReplayEvents } from './reassemble_events';

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
