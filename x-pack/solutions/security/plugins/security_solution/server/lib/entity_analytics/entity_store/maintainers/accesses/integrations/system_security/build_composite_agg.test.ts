/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCompositeAggQuery } from './build_composite_agg';

describe('System Security buildCompositeAggQuery', () => {
  it('filters for logged-in and logged-in-explicit actions', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({
      terms: { 'event.action': ['logged-in', 'logged-in-explicit'] },
    });
  });

  it('filters for event.code 4624 and 4648', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({
      terms: { 'event.code': ['4624', '4648'] },
    });
  });

  it('filters for Interactive, RemoteInteractive, and CachedInteractive logon types', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({
      terms: {
        'winlog.logon.type': ['Interactive', 'RemoteInteractive', 'CachedInteractive'],
      },
    });
  });

  it('excludes service and system accounts', () => {
    const query = buildCompositeAggQuery();
    const exclusionFilter = query.query.bool.filter.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => f.bool?.must_not
    );
    expect(exclusionFilter).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mustNot = (exclusionFilter as any).bool.must_not;
    expect(mustNot).toContainEqual({
      terms: {
        'user.name': ['SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE', 'ANONYMOUS LOGON'],
      },
    });
  });

  it('does not filter on event.module or event.category', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter;
    const moduleFilter = filters.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => f.term?.['event.module']
    );
    const categoryFilter = filters.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => f.term?.['event.category']
    );
    expect(moduleFilter).toBeUndefined();
    expect(categoryFilter).toBeUndefined();
  });
});
