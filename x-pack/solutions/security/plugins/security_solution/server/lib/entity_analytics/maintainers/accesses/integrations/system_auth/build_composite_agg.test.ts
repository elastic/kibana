/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCompositeAggQuery } from './build_composite_agg';

describe('System Auth buildCompositeAggQuery', () => {
  it('filters for authentication or session event category', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter;
    const categoryFilter = filters.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => f.bool?.should
    );
    expect(categoryFilter).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const should = (categoryFilter as any).bool.should;
    expect(should).toContainEqual({ term: { 'event.category': 'authentication' } });
    expect(should).toContainEqual({ term: { 'event.category': 'session' } });
  });

  it('filters for ssh_login action', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({ term: { 'event.action': 'ssh_login' } });
  });

  it('does not filter on event.module or logon_type', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter;
    const moduleFilter = filters.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => f.term?.['event.module']
    );
    const logonTypeFilter = filters.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => f.terms?.['process.Ext.session_info.logon_type']
    );
    expect(moduleFilter).toBeUndefined();
    expect(logonTypeFilter).toBeUndefined();
  });
});
