/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryKeys } from './query_keys';

describe('queryKeys', () => {
  it('namespaces every key under pnd so nothing collides with another plugin', () => {
    const roots = Object.values(queryKeys).map((namespace) => namespace.all[0]);

    expect(new Set(roots)).toEqual(new Set(['pnd']));
  });

  it('gives every namespace a distinct root', () => {
    const roots = Object.values(queryKeys).map((namespace) => namespace.all.join('/'));

    expect(new Set(roots).size).toBe(roots.length);
  });

  it('exposes the proposals namespace', () => {
    expect(queryKeys.proposals.all).toEqual(['pnd', 'proposals']);
  });

  it('keys the proposals list', () => {
    expect(queryKeys.proposals.list()).toEqual(['pnd', 'proposals', 'list']);
  });

  it('keys the 24h activity series', () => {
    expect(queryKeys.proposals.activity()).toEqual(['pnd', 'proposals', 'activity']);
  });

  /**
   * The sparkline series and the queue are different metrics from different routes: sharing a key
   * would hand whichever hook mounted first a body the other cannot parse.
   */
  it('keys the activity series apart from the queue', () => {
    expect(queryKeys.proposals.activity()).not.toEqual(queryKeys.proposals.list());
  });

  it('exposes the discovery context namespace', () => {
    expect(queryKeys.discoveryContext.all).toEqual(['pnd', 'discoveryContext']);
  });

  /**
   * The ids are part of the key because the response is: enriching another set of discoveries is
   * another request, and reusing one body for a different queue would draw a blast radius the
   * proposals on screen never contributed to.
   */
  it('keys the discovery context read by the discoveries it enriches', () => {
    expect(queryKeys.discoveryContext.list(['ad-1', 'ad-2'])).toEqual([
      'pnd',
      'discoveryContext',
      'list',
      ['ad-1', 'ad-2'],
    ]);
  });

  /** A derived surface never shares the queue's key, so a failed enrichment cannot evict the queue. */
  it('keys the discovery context read apart from the queue', () => {
    expect(queryKeys.discoveryContext.all).not.toEqual(queryKeys.proposals.all);
  });

  it('exposes the runs namespace', () => {
    expect(queryKeys.runs.all).toEqual(['pnd', 'runs']);
  });

  it('keys a runs list scoped to one watch', () => {
    expect(queryKeys.runs.list({ watchId: 'system-security-watch-deep' })).toEqual([
      'pnd',
      'runs',
      'list',
      { size: undefined, watchId: 'system-security-watch-deep' },
    ]);
  });

  it('keys an unscoped runs list', () => {
    expect(queryKeys.runs.list()).toEqual([
      'pnd',
      'runs',
      'list',
      { size: undefined, watchId: undefined },
    ]);
  });

  it('exposes the executions namespace', () => {
    expect(queryKeys.executions.all).toEqual(['pnd', 'executions']);
  });

  it('keys one execution projection by attack discovery alert id', () => {
    expect(queryKeys.executions.detail('alert-1')).toEqual([
      'pnd',
      'executions',
      'detail',
      'alert-1',
    ]);
  });

  it('exposes the conversations namespace', () => {
    expect(queryKeys.conversations.all).toEqual(['pnd', 'conversations']);
  });

  it('keys the conversations list', () => {
    expect(queryKeys.conversations.list()).toEqual([
      'pnd',
      'conversations',
      'list',
      { kind: undefined, page: undefined, perPage: undefined },
    ]);
  });

  it('keys a paged conversations list apart from the unfiltered projection', () => {
    expect(queryKeys.conversations.list({ kind: 'incident', page: 1, perPage: 10 })).toEqual([
      'pnd',
      'conversations',
      'list',
      { kind: 'incident', page: 1, perPage: 10 },
    ]);
  });

  it('exposes the autonomy namespace', () => {
    expect(queryKeys.autonomy.all).toEqual(['pnd', 'autonomy']);
  });

  it('keys autonomy per watch, because the level is stored per watch', () => {
    expect(queryKeys.autonomy.detail('system-security-watch-deep')).toEqual([
      'pnd',
      'autonomy',
      'detail',
      'system-security-watch-deep',
    ]);
  });

  it('keeps the watches namespace', () => {
    expect(queryKeys.watches.list()).toEqual(['pnd', 'watches', 'list']);
  });

  describe('the investigations namespace restored for #284440 (register #45)', () => {
    it('keys the list, the detail and the per-investigation proposals', () => {
      expect(queryKeys.investigations.list()).toEqual(['pnd', 'investigations', 'list']);
      expect(queryKeys.investigations.detail('inv-1')).toEqual([
        'pnd',
        'investigations',
        'detail',
        'inv-1',
      ]);
      expect(queryKeys.investigations.proposals('inv-1')).toEqual([
        'pnd',
        'investigations',
        'proposals',
        'inv-1',
      ]);
    });

    it('stays disjoint from the real proposals queue, so a fixture read cannot evict it', () => {
      // The reason epic 2 deleted this namespace was that two sources answered one question. The
      // namespaces are what keep the answers from overwriting each other while `kibana-phf4.29`
      // collapses them onto one contract.
      expect(queryKeys.investigations.proposals('inv-1')).not.toEqual(queryKeys.proposals.list());
      expect(queryKeys.investigations.all).not.toEqual(queryKeys.proposals.all);
    });
  });
});
