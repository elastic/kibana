/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Watch, WatchCallableRef } from '@kbn/pnd-common';
import { buildCallableRows } from './callables_table';

const makeCallable = (overrides: Partial<WatchCallableRef> = {}): WatchCallableRef => ({
  id: 'shared-skill',
  name: 'Shared skill',
  kind: 'skill',
  summary: 'Does a thing',
  gated: false,
  enabled: true,
  lastRun: null,
  ...overrides,
});

const makeWatch = (overrides: Partial<Watch> = {}): Watch =>
  ({
    id: 'system-security-watch-floor',
    name: 'Watch Floor',
    color: '#000',
    callables: [],
    ...overrides,
  } as unknown as Watch);

describe('buildCallableRows', () => {
  it('filters to only the requested callable kind', () => {
    const watches = [
      makeWatch({
        callables: [
          makeCallable({ id: 'wf-1', kind: 'workflow' }),
          makeCallable({ id: 'skill-1', kind: 'skill' }),
        ],
      }),
    ];

    const workflowRows = buildCallableRows(watches, 'workflow');
    const skillRows = buildCallableRows(watches, 'skill');

    expect(workflowRows.map((r) => r.callable.id)).toEqual(['wf-1']);
    expect(skillRows.map((r) => r.callable.id)).toEqual(['skill-1']);
  });

  it('dedupes a callable referenced by multiple watches into one row listing every watch', () => {
    const shared = makeCallable({ id: 'shared-skill', name: 'Shared skill' });
    const watches = [
      makeWatch({ id: 'watch-a', name: 'Watch A', callables: [shared] }),
      makeWatch({ id: 'watch-b', name: 'Watch B', callables: [shared] }),
    ];

    const rows = buildCallableRows(watches, 'skill');

    expect(rows).toHaveLength(1);
    expect(rows[0].watches.map((w) => w.id)).toEqual(['watch-a', 'watch-b']);
  });

  it('treats a shared callable as enabled if enabled on any referencing watch', () => {
    const watches = [
      makeWatch({
        id: 'watch-a',
        callables: [makeCallable({ id: 'shared', enabled: false })],
      }),
      makeWatch({
        id: 'watch-b',
        callables: [makeCallable({ id: 'shared', enabled: true })],
      }),
    ];

    const rows = buildCallableRows(watches, 'skill');

    expect(rows[0].callable.enabled).toBe(true);
  });

  it('keeps the most recent lastRun across watches referencing the same callable', () => {
    const watches = [
      makeWatch({
        id: 'watch-a',
        callables: [makeCallable({ id: 'shared', lastRun: '2026-07-20T00:00:00.000Z' })],
      }),
      makeWatch({
        id: 'watch-b',
        callables: [makeCallable({ id: 'shared', lastRun: '2026-07-25T00:00:00.000Z' })],
      }),
    ];

    const rows = buildCallableRows(watches, 'skill');

    expect(rows[0].callable.lastRun).toBe('2026-07-25T00:00:00.000Z');
  });

  it('sorts rows alphabetically by callable name', () => {
    const watches = [
      makeWatch({
        callables: [
          makeCallable({ id: 'z', name: 'Zebra skill' }),
          makeCallable({ id: 'a', name: 'Alpha skill' }),
        ],
      }),
    ];

    const rows = buildCallableRows(watches, 'skill');

    expect(rows.map((r) => r.callable.name)).toEqual(['Alpha skill', 'Zebra skill']);
  });

  it('returns an empty array when no watch references any callable of the requested kind', () => {
    const watches = [makeWatch({ callables: [] })];

    expect(buildCallableRows(watches, 'workflow')).toEqual([]);
  });
});
