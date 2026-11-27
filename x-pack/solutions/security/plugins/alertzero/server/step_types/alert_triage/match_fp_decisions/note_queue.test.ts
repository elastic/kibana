/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNoteQueue } from './note_queue';

const decision = { id: 'fp-decision-0123456789abcdef', kind: 'false_positive' as const };

const queueOf = (limit: number, known = true) =>
  createNoteQueue({
    limit,
    decisionOf: (id) => (known && id === decision.id ? decision : undefined),
  });

const apiWith = () => ({
  callKibanaApi: jest.fn().mockResolvedValue({ status: 200, headers: {}, body: {} }),
});

describe('createNoteQueue', () => {
  it('offers only as many alerts as the allowance has notes left for', () => {
    const queue = queueOf(2);

    expect(queue.take(['a', 'b', 'c'])).toEqual(['a', 'b']);
  });

  it('spends the allowance as notes are queued, and reports the alerts that got none', () => {
    const queue = queueOf(3);

    expect(queue.add(decision.id, ['a', 'b'], 'closed')).toBe(0);
    expect(queue.take(['c', 'd'])).toEqual(['c']);
    expect(queue.add(decision.id, ['c', 'd'], 'skipped')).toBe(1);
    expect(queue.take(['e'])).toEqual([]);
  });

  it('queues no note for a decision it does not know, because the note says who decided', () => {
    const queue = queueOf(5, false);

    expect(queue.add(decision.id, ['a', 'b'], 'closed')).toBe(2);
    expect(queue.take(['c'])).toEqual(['c']);
  });

  it('writes one note per queued alert when flushed, and reports none missing', async () => {
    const queue = queueOf(5);
    const api = apiWith();
    queue.add(decision.id, ['a', 'b'], 'closed');

    const missing = await queue.flush(api, { concurrency: 2, deadline: Date.now() + 60_000 });

    expect(missing).toBe(0);
    const written = api.callKibanaApi.mock.calls.map(([{ body }]) => body.note.eventId);
    expect(written.sort()).toEqual(['a', 'b']);
  });
});
