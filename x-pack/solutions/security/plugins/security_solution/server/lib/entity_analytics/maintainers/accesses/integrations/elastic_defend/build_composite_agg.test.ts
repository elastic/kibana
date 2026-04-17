/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCompositeAggQuery } from './build_composite_agg';

describe('Elastic Defend buildCompositeAggQuery', () => {
  it('filters for log_on action', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({ term: { 'event.action': 'log_on' } });
  });

  it('filters for RemoteInteractive, Interactive, and Network logon types', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({
      terms: {
        'process.Ext.session_info.logon_type': ['RemoteInteractive', 'Interactive', 'Network'],
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
    expect(moduleFilter).toBeUndefined();
  });
});
